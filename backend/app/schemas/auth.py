from pydantic import BaseModel
from typing import Optional


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_email: str
    user_picture: Optional[str] = None
    is_admin: bool = False
