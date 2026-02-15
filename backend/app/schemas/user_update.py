from pydantic import BaseModel
from typing import Optional

class UserUpdateRequest(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
