from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    telefone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
