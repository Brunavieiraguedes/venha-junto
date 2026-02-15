from pydantic import BaseModel, EmailStr

class UserPublic(BaseModel):
    id: int
    nome: str | None = None
    telefone: str | None = None
    email: EmailStr
    role: str

    class Config:
        from_attributes = True
