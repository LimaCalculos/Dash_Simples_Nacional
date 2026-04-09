from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.client import Client
from ..models.declaration import SimplesDeclaracao, DasDocument
from ..models.drive_sync import DriveSync
from ..schemas.dashboard import KpiGeralResponse, KpiMensalResponse, KpiClienteResponse, KpiGeral, EvolucaoMensalItem, MensalClienteItem
from ..routers.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

SUBLIMITE = 4_800_000.0


@router.get("/geral", response_model=KpiGeralResponse)
def get_dashboard_geral(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total_decl = db.query(SimplesDeclaracao).count()
    total_clientes = db.query(Client).count()

    competencias = db.query(SimplesDeclaracao.competencia).distinct().all()
    competencias_cobertas = len(competencias)

    totais = db.query(
        func.sum(SimplesDeclaracao.receita_bruta_pa),
        func.sum(SimplesDeclaracao.valor_total),
        func.sum(SimplesDeclaracao.irpj),
        func.sum(SimplesDeclaracao.csll),
        func.sum(SimplesDeclaracao.cofins),
        func.sum(SimplesDeclaracao.pis),
        func.sum(SimplesDeclaracao.cpp),
        func.sum(SimplesDeclaracao.icms),
        func.sum(SimplesDeclaracao.ipi),
        func.sum(SimplesDeclaracao.iss),
    ).first()

    receita_total = totais[0] or 0.0
    trib_total = totais[1] or 0.0
    aliquota_media = round((trib_total / receita_total * 100), 2) if receita_total else 0.0

    sync = db.query(DriveSync).first()
    ultima_sync = sync.ultima_verificacao.isoformat() if sync and sync.ultima_verificacao else None
    novos = sync.arquivos_novos_ultima_sync if sync else 0

    kpis = KpiGeral(
        total_declaracoes=total_decl,
        total_clientes=total_clientes,
        competencias_cobertas=competencias_cobertas,
        receita_bruta_total=receita_total,
        tributos_total=trib_total,
        aliquota_media=aliquota_media,
        irpj_total=totais[2] or 0.0,
        csll_total=totais[3] or 0.0,
        cofins_total=totais[4] or 0.0,
        pis_total=totais[5] or 0.0,
        cpp_total=totais[6] or 0.0,
        icms_total=totais[7] or 0.0,
        ipi_total=totais[8] or 0.0,
        iss_total=totais[9] or 0.0,
        ultima_sync=ultima_sync,
        novos_arquivos_ultima_sync=novos,
    )

    # Evolução mensal agregada
    rows = db.query(
        SimplesDeclaracao.competencia,
        func.sum(SimplesDeclaracao.receita_bruta_pa),
        func.sum(SimplesDeclaracao.valor_total),
        func.sum(SimplesDeclaracao.irpj),
        func.sum(SimplesDeclaracao.csll),
        func.sum(SimplesDeclaracao.cofins),
        func.sum(SimplesDeclaracao.pis),
        func.sum(SimplesDeclaracao.cpp),
        func.sum(SimplesDeclaracao.icms),
        func.sum(SimplesDeclaracao.ipi),
        func.sum(SimplesDeclaracao.iss),
        func.count(SimplesDeclaracao.id),
    ).group_by(SimplesDeclaracao.competencia).order_by(SimplesDeclaracao.competencia).all()

    evolucao = [
        EvolucaoMensalItem(
            competencia=r[0], receita_bruta=r[1] or 0, tributos=r[2] or 0,
            irpj=r[3] or 0, csll=r[4] or 0, cofins=r[5] or 0,
            pis=r[6] or 0, cpp=r[7] or 0, icms=r[8] or 0,
            ipi=r[9] or 0, iss=r[10] or 0, qtd_declaracoes=r[11],
        ) for r in rows
    ]

    return KpiGeralResponse(kpis=kpis, evolucao_mensal=evolucao)


@router.get("/mensal", response_model=KpiMensalResponse)
def get_dashboard_mensal(
    ano: int = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not ano:
        ano = datetime.now().year

    meses = [f"{ano}-{m:02d}" for m in range(1, 13)]
    now_month = datetime.now().strftime("%Y-%m")
    meses_ate_agora = [m for m in meses if m <= now_month]

    clientes = db.query(Client).order_by(Client.nome).all()
    result_clientes = []

    clientes_completos = 0
    total_esperado_geral = 0
    total_declarado_geral = 0

    for cliente in clientes:
        decls = db.query(SimplesDeclaracao.competencia).filter(
            SimplesDeclaracao.client_id == cliente.id,
            SimplesDeclaracao.competencia.in_(meses),
        ).all()
        decl_meses = {d[0] for d in decls}

        meses_dict = {m: (m in decl_meses) for m in meses}
        total_decl = len(decl_meses)
        total_esp = len(meses_ate_agora)
        cobertura = round(len([m for m in meses_ate_agora if m in decl_meses]) / total_esp * 100, 1) if total_esp else 0.0

        total_esperado_geral += total_esp
        total_declarado_geral += len([m for m in meses_ate_agora if m in decl_meses])

        if cobertura == 100.0:
            clientes_completos += 1

        result_clientes.append(MensalClienteItem(
            client_id=cliente.id,
            cnpj=cliente.cnpj,
            nome=cliente.nome,
            meses=meses_dict,
            total_declarado=total_decl,
            total_esperado=total_esp,
            cobertura_pct=cobertura,
        ))

    cobertura_geral = round(total_declarado_geral / total_esperado_geral * 100, 1) if total_esperado_geral else 0.0

    return KpiMensalResponse(
        ano=ano,
        meses=meses,
        clientes=result_clientes,
        cobertura_geral_pct=cobertura_geral,
        clientes_completos=clientes_completos,
        clientes_pendentes=len(clientes) - clientes_completos,
    )


@router.get("/cliente/{client_id}", response_model=KpiClienteResponse)
def get_dashboard_cliente(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cliente = db.query(Client).filter(Client.id == client_id).first()
    if not cliente:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    totais = db.query(
        func.count(SimplesDeclaracao.id),
        func.sum(SimplesDeclaracao.receita_bruta_pa),
        func.sum(SimplesDeclaracao.valor_total),
    ).filter(SimplesDeclaracao.client_id == client_id).first()

    receita_total = totais[1] or 0.0
    trib_total = totais[2] or 0.0
    aliquota_media = round((trib_total / receita_total * 100), 2) if receita_total else 0.0

    # Latest RBT12
    latest = db.query(SimplesDeclaracao).filter_by(client_id=client_id).order_by(
        SimplesDeclaracao.competencia.desc()
    ).first()
    rbt12_atual = latest.rbt12 if latest else 0.0
    alerta_sublimite = rbt12_atual > (SUBLIMITE * 0.8)

    rows = db.query(
        SimplesDeclaracao.competencia,
        func.sum(SimplesDeclaracao.receita_bruta_pa),
        func.sum(SimplesDeclaracao.valor_total),
        func.sum(SimplesDeclaracao.irpj),
        func.sum(SimplesDeclaracao.csll),
        func.sum(SimplesDeclaracao.cofins),
        func.sum(SimplesDeclaracao.pis),
        func.sum(SimplesDeclaracao.cpp),
        func.sum(SimplesDeclaracao.icms),
        func.sum(SimplesDeclaracao.ipi),
        func.sum(SimplesDeclaracao.iss),
        func.count(SimplesDeclaracao.id),
    ).filter(SimplesDeclaracao.client_id == client_id).group_by(
        SimplesDeclaracao.competencia
    ).order_by(SimplesDeclaracao.competencia).all()

    evolucao = [
        EvolucaoMensalItem(
            competencia=r[0], receita_bruta=r[1] or 0, tributos=r[2] or 0,
            irpj=r[3] or 0, csll=r[4] or 0, cofins=r[5] or 0,
            pis=r[6] or 0, cpp=r[7] or 0, icms=r[8] or 0,
            ipi=r[9] or 0, iss=r[10] or 0, qtd_declaracoes=r[11],
        ) for r in rows
    ]

    return KpiClienteResponse(
        client_id=cliente.id,
        cnpj=cliente.cnpj,
        nome=cliente.nome,
        municipio=cliente.municipio,
        uf=cliente.uf,
        competencias_declaradas=totais[0] or 0,
        receita_total=receita_total,
        tributos_total=trib_total,
        aliquota_media=aliquota_media,
        rbt12_atual=rbt12_atual,
        alerta_sublimite=alerta_sublimite,
        evolucao=evolucao,
    )
