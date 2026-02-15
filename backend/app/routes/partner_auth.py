# app/routes/partner_auth.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.partner_profile import PartnerProfile

from app.schemas.partner import (
    PartnerRegisterRequest,
    PartnerLoginRequest,
    PartnerMeResponse,
    PartnerUpdateRequest,
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter(prefix="/partner-auth", tags=["Partner Auth"])

COOKIE_NAME = "vj_partner_token"


def set_partner_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # em produção HTTPS: True
        path="/",
        max_age=60 * 60 * 24 * 7,  # 7 dias
    )


def clear_partner_cookie(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


def extract_token(request: Request, authorization: str | None) -> str | None:
    # 1) Bearer (para Swagger/Postman)
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()

    # 2) Cookie (para Front sem localStorage)
    return request.cookies.get(COOKIE_NAME)


def get_current_partner_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = extract_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    payload = decode_access_token(token)
    user_id = payload.get("uid") or payload.get("sub")  # aceita uid/sub
    role = payload.get("role")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    if role != "partner":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para parceiro")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_partner(payload: PartnerRegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    user = User(
        nome=payload.nome,
        email=payload.email.lower().strip(),
        telefone=payload.telefone,
        password_hash=hash_password(payload.senha),
        role="partner",
    )
    db.add(user)
    db.flush()

    profile = PartnerProfile(
        user_id=user.id,
        empresa_nome=payload.empresa_nome,
        cnpj=payload.cnpj,
        plano="free",
        status="pendente",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {"ok": True, "user_id": user.id, "partner_profile_id": profile.id}


@router.post("/login")
def login_partner(payload: PartnerLoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or user.role != "partner":
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not verify_password(payload.senha, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # ✅ token separado do usuário normal: cookie próprio
    token = create_access_token({"uid": str(user.id), "role": "partner"})

    set_partner_cookie(response, token)

    # ainda retorna token para Swagger, mas no front você ignora
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=PartnerMeResponse)
def me(current: User = Depends(get_current_partner_user), db: Session = Depends(get_db)):
    profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == current.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de parceiro não encontrado")

    return {
        "id": current.id,
        "nome": current.nome,
        "email": current.email,
        "telefone": current.telefone,
        "role": current.role,
        "empresa_nome": profile.empresa_nome,
        "cnpj": profile.cnpj,
        "plano": profile.plano,
        "status": profile.status,
    }


@router.patch("/me", response_model=PartnerMeResponse)
def update_me(
    payload: PartnerUpdateRequest,
    current: User = Depends(get_current_partner_user),
    db: Session = Depends(get_db),
):
    profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == current.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de parceiro não encontrado")

    if payload.nome is not None:
        current.nome = payload.nome
    if payload.telefone is not None:
        current.telefone = payload.telefone

    if payload.empresa_nome is not None:
        profile.empresa_nome = payload.empresa_nome
    if payload.cnpj is not None:
        profile.cnpj = payload.cnpj

    db.commit()
    db.refresh(current)
    db.refresh(profile)

    return {
        "id": current.id,
        "nome": current.nome,
        "email": current.email,
        "telefone": current.telefone,
        "role": current.role,
        "empresa_nome": profile.empresa_nome,
        "cnpj": profile.cnpj,
        "plano": profile.plano,
        "status": profile.status,
    }


@router.post("/logout")
def logout_partner(response: Response):
    clear_partner_cookie(response)
    return {"ok": True}
