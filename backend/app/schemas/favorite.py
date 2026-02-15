from pydantic import BaseModel
from datetime import datetime


class FavoriteBase(BaseModel):
    place_id: int


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteOut(BaseModel):
    id: int
    place_id: int
    created_at: datetime

    class Config:
        from_attributes = True
