from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    cnpj = Column(String(18), unique=True, index=True, nullable=False)   # XX.XXX.XXX/XXXX-XX
    cnpj_raiz = Column(String(8), index=True, nullable=False)             # first 8 digits
    nome = Column(String, nullable=False)
    municipio = Column(String, nullable=True)
    uf = Column(String(2), nullable=True)
    data_abertura = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    declaracoes = relationship("SimplesDeclaracao", back_populates="client", cascade="all, delete-orphan")
    das_documents = relationship("DasDocument", back_populates="client", cascade="all, delete-orphan")
