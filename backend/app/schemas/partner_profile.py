from pydantic import BaseModel

class PartnerProfileOut(BaseModel):
    empresa_nome: str | None = None
    cnpj: str | None = None
    plano: str
    status: str

    class Config:
        from_attributes = True

class PartnerProfileUpdate(BaseModel):
    empresa_nome: str | None = None
    cnpj: str | None = None
    plano: str | None = None
    status: str | None = None
