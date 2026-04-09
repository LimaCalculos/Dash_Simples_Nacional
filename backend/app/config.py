from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/simples.db"
    SECRET_KEY: str = "dev-secret-key-troque-em-producao"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    GOOGLE_DRIVE_CREDENTIALS_FILE: str = "./credentials.json"
    GOOGLE_DRIVE_TOKEN_FILE: str = "./token.json"
    DRIVE_ROOT_FOLDER_ID: str = ""
    DRIVE_POLL_INTERVAL_MINUTES: int = 5

    ALLOWED_EMAILS: str = ""  # comma-separated
    CORS_ORIGINS: str = "http://localhost:5174"

    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    @property
    def allowed_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_EMAILS.split(",") if e.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
