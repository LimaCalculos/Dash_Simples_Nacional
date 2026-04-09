"""
Google OAuth2 login for employees.
Flow: frontend sends Google ID token → backend verifies → returns JWT.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from ..database import get_db
from ..models.user import User
from ..schemas.auth import GoogleLoginRequest, TokenResponse
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

ALGORITHM = "HS256"


def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return user


@router.post("/google", response_model=TokenResponse)
def login_with_google(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verify Google ID token and return a JWT."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID não configurado no .env")

    try:
        id_info = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token Google inválido: {e}")

    email = id_info.get("email", "").lower()
    google_id = id_info.get("sub", "")
    name = id_info.get("name", email)
    picture = id_info.get("picture")

    # Email whitelist check
    allowed = settings.allowed_emails_list
    if allowed and email not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para este e-mail.",
        )

    # Upsert user
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.picture = picture
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": email})
    return TokenResponse(
        access_token=token,
        user_name=user.name,
        user_email=user.email,
        user_picture=user.picture,
        is_admin=user.is_admin,
    )


@router.post("/google-access-token", response_model=TokenResponse)
def login_with_google_access_token(
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Alternative login using Google access_token + profile info.
    Used by frontend @react-oauth/google implicit flow.
    """
    email = body.get("email", "").lower()
    google_sub = body.get("google_sub", "")
    name = body.get("name", email)
    picture = body.get("picture")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Dados de autenticação incompletos.")

    allowed = settings.allowed_emails_list
    if allowed and email not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado para este e-mail.")

    user = db.query(User).filter(User.google_id == google_sub).first()
    if not user:
        user = User(google_id=google_sub, email=email, name=name, picture=picture)
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.picture = picture
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": email})
    return TokenResponse(
        access_token=token,
        user_name=user.name,
        user_email=user.email,
        user_picture=user.picture,
        is_admin=user.is_admin,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "is_admin": current_user.is_admin,
    }
