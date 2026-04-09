from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class DriveSync(Base):
    __tablename__ = "drive_sync"

    id = Column(Integer, primary_key=True)
    folder_id = Column(String, nullable=True)
    ultima_verificacao = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="idle")   # idle / running / error
    last_error = Column(Text, nullable=True)
    arquivos_processados = Column(Integer, default=0)
    arquivos_novos_ultima_sync = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
