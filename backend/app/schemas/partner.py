# app/schemas/partner.py
from pydantic import BaseModel, EmailStr, Field


class PartnerRegisterRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    telefone: str | None = Field(default=None, max_length=30)
    senha: str = Field(min_length=6)

    empresa_nome: str | None = Field(default=None, max_length=160)
    cnpj: str | None = Field(default=None, max_length=18)


class PartnerRegisterResponse(BaseModel):
    ok: bool
    user_id: int
    partner_profile_id: int


class PartnerLoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PartnerMeResponse(BaseModel):
    id: int
    nome: str | None = None
    email: str
    telefone: str | None = None
    role: str

    empresa_nome: str | None = None
    cnpj: str | None = None
    plano: str
    status: str


class PartnerUpdateRequest(BaseModel):
    nome: str | None = Field(default=None, max_length=120)
    telefone: str | None = Field(default=None, max_length=30)

    empresa_nome: str | None = Field(default=None, max_length=160)
    cnpj: str | None = Field(default=None, max_length=18)


class OkResponse(BaseModel):
    ok: bool
