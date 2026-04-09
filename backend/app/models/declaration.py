from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class SimplesDeclaracao(Base):
    """
    PGDAS-D declaration parsed from PDF.
    Filename pattern: PGDASD-DECLARACAO-{cnpj_raiz}{YYYY}{MM}{seq}.pdf
    """
    __tablename__ = "simples_declaracoes"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    # Identification
    competencia = Column(String(7), nullable=False, index=True)  # YYYY-MM
    num_declaracao = Column(String(20), unique=True, index=True)
    num_recibo = Column(String(30), nullable=True)
    autenticacao = Column(String(30), nullable=True)
    data_transmissao = Column(DateTime, nullable=True)

    # Receitas
    receita_bruta_pa = Column(Float, default=0.0)       # RPA — receita do período
    rbt12 = Column(Float, default=0.0)                  # acumulada 12 meses anteriores
    rba = Column(Float, default=0.0)                    # acumulada ano corrente
    rbaa = Column(Float, default=0.0)                   # acumulada ano anterior

    # Tributos (Total Geral da Empresa — seção 2.8, débito exigível)
    valor_total = Column(Float, default=0.0)
    irpj = Column(Float, default=0.0)
    csll = Column(Float, default=0.0)
    cofins = Column(Float, default=0.0)
    pis = Column(Float, default=0.0)
    cpp = Column(Float, default=0.0)       # INSS/CPP
    icms = Column(Float, default=0.0)
    ipi = Column(Float, default=0.0)
    iss = Column(Float, default=0.0)

    # Alíquota efetiva calculada: valor_total / receita_bruta_pa * 100
    aliquota_efetiva = Column(Float, default=0.0)

    # Drive metadata
    drive_file_id = Column(String, unique=True, nullable=False)
    drive_file_name = Column(String, nullable=False)
    drive_folder = Column(String, nullable=True)   # ex: "2026-03"

    # Raw PDF text for debugging / re-parsing
    raw_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="declaracoes")
    das = relationship("DasDocument", back_populates="declaracao", uselist=False)


class DasDocument(Base):
    """
    DAS (guia de arrecadação) linked to a PGDAS-D declaration.
    Stored now as metadata only; full parsing implemented in future automation.
    """
    __tablename__ = "das_documents"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    declaracao_id = Column(Integer, ForeignKey("simples_declaracoes.id"), nullable=True)

    competencia = Column(String(7), nullable=False, index=True)  # YYYY-MM

    # Parsed fields (populated when DAS parsing is implemented)
    valor = Column(Float, nullable=True)
    vencimento = Column(Date, nullable=True)
    codigo_barras = Column(String, nullable=True)
    numero_das = Column(String, nullable=True)
    situacao = Column(String(20), default="PENDENTE")  # PENDENTE / PAGO / VENCIDO

    # Drive metadata
    drive_file_id = Column(String, unique=True, nullable=False)
    drive_file_name = Column(String, nullable=False)
    drive_folder = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="das_documents")
    declaracao = relationship("SimplesDeclaracao", back_populates="das")
