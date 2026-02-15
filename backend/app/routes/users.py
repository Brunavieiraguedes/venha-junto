from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserPublic
from app.schemas.user_update import UserUpdateRequest

# Reaproveita seu auth (cookie + get_current_user)
from app.routes.auth import get_current_user, COOKIE_NAME

router = APIRouter(prefix="/users", tags=["Users"])


def _get_token(request: Request, authorization: str | None):
    token = None

    # 1) Bearer (se vier)
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    # 2) Cookie HttpOnly
    if not token:
        token = request.cookies.get(COOKIE_NAME)

    return token


@router.get("/me", response_model=UserPublic)
def get_me(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _get_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    user = get_current_user(token, db)
    return user


@router.put("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdateRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _get_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    user: User = get_current_user(token, db)

    # Atualiza SOMENTE o que existe no seu model
    if payload.nome is not None:
        user.nome = payload.nome.strip() if payload.nome.strip() else None

    if payload.telefone is not None:
        user.telefone = payload.telefone.strip() if payload.telefone.strip() else None

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
