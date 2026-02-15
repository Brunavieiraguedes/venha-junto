from pydantic import BaseModel
from typing import Optional

class ReviewCreateRequest(BaseModel):
    user_id: int
    rating: int
    comment: Optional[str] = None
