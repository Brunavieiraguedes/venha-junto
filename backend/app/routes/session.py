from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/session", tags=["Session"])

@router.post("/login")
def login(email: str, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    response.set_cookie(
        key="user_id",
        value=str(user.id),
        httponly=True,
        samesite="lax",
        secure=False,   # local
        path="/",
        max_age=60 * 60 * 24 * 30,
    )

    return {"ok": True, "user_id": user.id}
