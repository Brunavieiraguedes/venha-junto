from typing import Optional, List
from pydantic import BaseModel, Field


# ============================
# CRIAÇÃO DE ESTABELECIMENTO
# ============================
class PlaceCreateRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=140)
    tipo: str = Field(min_length=1, max_length=40)
    cidade: str = Field(min_length=1, max_length=60)
    bairro: Optional[str] = Field(default=None, max_length=80)
    endereco: Optional[str] = Field(default=None, max_length=180)
    cep: Optional[str] = Field(default=None, max_length=12)
    descricao: Optional[str] = None
    cover_image: Optional[str] = None
    features: List[str] = Field(default_factory=list)


# ============================
# SUBMISSÃO PARA ANÁLISE
# ============================
class PlaceSubmitResponse(BaseModel):
    place_id: int
    status: str


# ============================
# APROVAÇÃO (ADMIN)
# ============================
class PlaceApproveRequest(BaseModel):
    # ⚠️ agora é opcional, vem do token
    admin_user_id: Optional[int] = None


# ============================
# REPROVAÇÃO (ADMIN)
# ============================
class PlaceRejectRequest(BaseModel):
    # ⚠️ agora é opcional, vem do token
    admin_user_id: Optional[int] = None
    reason: Optional[str] = None
