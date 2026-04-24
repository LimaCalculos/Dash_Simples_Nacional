from sqlalchemy import Column, Integer, String
from ..database import Base


class SerproCreds(Base):
    __tablename__ = "serpro_creds"

    id              = Column(Integer, primary_key=True, default=1)
    consumer_key    = Column(String, nullable=False)
    consumer_secret = Column(String, nullable=False)
    cnpj_contador   = Column(String, nullable=True)
