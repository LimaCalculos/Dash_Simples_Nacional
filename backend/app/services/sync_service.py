"""
Sync service — orchestrates Google Drive → PDF parse → database.

Flow:
  1. Connect to Drive
  2. List month subfolders (YYYY-MM) in root folder
  3. For each folder: list PDFs
  4. PGDAS files: parse → upsert Client + SimplesDeclaracao
  5. DAS files: store metadata in DasDocument (parsing reserved for future automation)
  6. Update DriveSync record
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models import Client, SimplesDeclaracao, DasDocument, DriveSync
from ..services.google_drive import get_drive_service, list_month_folders, list_pdfs_recursive, download_file
from ..services.pgdas_parser import parse_pgdas_pdf, is_pgdas_file, is_das_file
from ..config import settings

logger = logging.getLogger(__name__)


def _get_or_create_sync_record(db: Session) -> DriveSync:
    record = db.query(DriveSync).first()
    if not record:
        record = DriveSync(folder_id=settings.DRIVE_ROOT_FOLDER_ID)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def run_sync(db: Session) -> dict:
    """
    Main sync entry point.
    Returns summary: {new_pgdas, new_das, errors, duration_s}
    """
    started = datetime.now(timezone.utc)
    sync_record = _get_or_create_sync_record(db)
    sync_record.status = "running"
    sync_record.folder_id = settings.DRIVE_ROOT_FOLDER_ID
    db.commit()

    new_pgdas = 0
    new_das = 0
    errors = []

    try:
        service = get_drive_service()
        folders = list_month_folders(service, settings.DRIVE_ROOT_FOLDER_ID)
        logger.info(f"Found {len(folders)} month folders in Drive.")

        for folder in folders:
            folder_name = folder["name"]   # e.g. "2026-03"
            folder_id = folder["id"]

            # Busca PDFs na pasta do mês E em subpastas (extratos/, guias/, etc.)
            pdfs = list_pdfs_recursive(service, folder_id)
            logger.info(f"Folder {folder_name}: {len(pdfs)} PDFs encontrados (incluindo subpastas)")

            for pdf_meta in pdfs:
                file_id = pdf_meta["id"]
                file_name = pdf_meta["name"]
                subfolder = pdf_meta.get("subfolder", "")

                # drive_folder armazena "2026-03" ou "2026-03/extratos" ou "2026-03/guias"
                drive_folder_path = f"{folder_name}/{subfolder}" if subfolder else folder_name

                if is_pgdas_file(file_name):
                    existing = db.query(SimplesDeclaracao).filter_by(drive_file_id=file_id).first()
                    if existing:
                        continue

                    try:
                        pdf_bytes = download_file(service, file_id)
                        data = parse_pgdas_pdf(pdf_bytes, file_name)
                        if data:
                            _upsert_declaration(db, data, file_id, file_name, drive_folder_path, pdf_bytes)
                            new_pgdas += 1
                            logger.info(f"Processado PGDAS [{drive_folder_path}]: {file_name}")
                        else:
                            errors.append(f"Parse falhou: {file_name}")
                    except Exception as e:
                        errors.append(f"{file_name}: {e}")
                        logger.error(f"Erro ao processar {file_name}: {e}")

                elif is_das_file(file_name):
                    existing = db.query(DasDocument).filter_by(drive_file_id=file_id).first()
                    if existing:
                        continue

                    try:
                        _store_das_metadata(db, file_id, file_name, drive_folder_path)
                        new_das += 1
                        logger.info(f"DAS metadata salvo [{drive_folder_path}]: {file_name}")
                    except Exception as e:
                        errors.append(f"{file_name}: {e}")

        duration_s = (datetime.now(timezone.utc) - started).total_seconds()
        sync_record.status = "idle"
        sync_record.ultima_verificacao = datetime.now(timezone.utc)
        sync_record.arquivos_novos_ultima_sync = new_pgdas + new_das

    except Exception as e:
        duration_s = (datetime.now(timezone.utc) - started).total_seconds()
        sync_record.status = "error"
        sync_record.last_error = str(e)
        logger.error(f"Sync failed: {e}")
        errors.append(str(e))

    db.commit()
    return {"new_pgdas": new_pgdas, "new_das": new_das, "errors": errors, "duration_s": duration_s}


def _upsert_declaration(db: Session, data, file_id: str, file_name: str, folder_name: str, pdf_bytes: bytes):
    # Upsert client
    client = db.query(Client).filter_by(cnpj=data.cnpj).first()
    if not client:
        client = Client(
            cnpj=data.cnpj,
            cnpj_raiz=data.cnpj_raiz,
            nome=data.nome,
            municipio=data.municipio,
            uf=data.uf,
            data_abertura=data.data_abertura,
        )
        db.add(client)
        db.flush()
    else:
        # Update name in case it changed
        client.nome = data.nome
        if data.municipio:
            client.municipio = data.municipio
        if data.uf:
            client.uf = data.uf

    decl = SimplesDeclaracao(
        client_id=client.id,
        competencia=data.competencia,
        num_declaracao=data.num_declaracao,
        num_recibo=data.num_recibo,
        autenticacao=data.autenticacao,
        data_transmissao=data.data_transmissao,
        receita_bruta_pa=data.receita_bruta_pa,
        rbt12=data.rbt12,
        rba=data.rba,
        rbaa=data.rbaa,
        valor_total=data.valor_total,
        irpj=data.irpj,
        csll=data.csll,
        cofins=data.cofins,
        pis=data.pis,
        cpp=data.cpp,
        icms=data.icms,
        ipi=data.ipi,
        iss=data.iss,
        aliquota_efetiva=data.aliquota_efetiva,
        drive_file_id=file_id,
        drive_file_name=file_name,
        drive_folder=folder_name,
        raw_text=None,  # omit raw text to save space; re-enable for debug if needed
    )
    db.add(decl)
    db.commit()

    # Link DAS if one already exists for same client+competencia
    das = db.query(DasDocument).filter_by(client_id=client.id, competencia=data.competencia).first()
    if das and das.declaracao_id is None:
        das.declaracao_id = decl.id
        db.commit()


def _store_das_metadata(db: Session, file_id: str, file_name: str, folder_name: str):
    """
    Store DAS file metadata. Full parsing is reserved for future automation.
    Tries to link to existing Client + SimplesDeclaracao if possible.
    """
    # Extrai CNPJ raiz do padrão: PGDASD-DAS-{cnpj_raiz8}{YYYY}{MM}{seq}.pdf ou DAS-{cnpj_raiz...}.pdf
    import re
    cnpj_match = re.search(r'(?:PGDASD-DAS-|DAS[-_])(\d{8})', file_name, re.IGNORECASE)
    cnpj_raiz = cnpj_match.group(1) if cnpj_match else None

    # Extract competencia from folder name
    competencia = folder_name if re.match(r'^\d{4}-\d{2}$', folder_name) else "0000-00"

    client_id = None
    declaracao_id = None

    if cnpj_raiz:
        client = db.query(Client).filter_by(cnpj_raiz=cnpj_raiz).first()
        if client:
            client_id = client.id
            decl = db.query(SimplesDeclaracao).filter_by(
                client_id=client.id, competencia=competencia
            ).first()
            if decl:
                declaracao_id = decl.id

    das = DasDocument(
        client_id=client_id,
        declaracao_id=declaracao_id,
        competencia=competencia,
        situacao="PENDENTE",
        drive_file_id=file_id,
        drive_file_name=file_name,
        drive_folder=folder_name,
    )
    db.add(das)
    db.commit()
