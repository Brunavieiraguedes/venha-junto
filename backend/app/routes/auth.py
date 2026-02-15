from fastapi import APIRouter, Depends, HTTPException, status, Header, Response, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserPublic
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import JWT_SECRET, JWT_ALG

router = APIRouter(prefix="/auth", tags=["Auth"])
routes = router  # alias de segurança

COOKIE_NAME = "vj_access_token"


# =====================================================
# FUNÇÃO ORIGINAL — USA sub = EMAIL
# =====================================================
def get_current_user(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não autorizado")

    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # em produção HTTPS: True
        path="/",
        max_age=60 * 60 * 24 * 7,  # 7 dias
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


# =====================================================
# REGISTER — USUÁRIO NORMAL
# =====================================================
@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    user = User(
        nome=data.nome.strip(),
        telefone=data.telefone.strip() if data.telefone else None,
        email=email,
        password_hash=hash_password(data.senha),
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =====================================================
# LOGIN — sub = EMAIL (NÃO QUEBRA O FRONT)
# =====================================================
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.senha, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # 🔴 FORMATO ORIGINAL — sub = email
    token = create_access_token(user.email)

    set_auth_cookie(response, token)
    return TokenResponse(access_token=token)


# =====================================================
# LOGOUT
# =====================================================
@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


# =====================================================
# ME — PERFIL DO USUÁRIO (FUNCIONA COMO ANTES)
# =====================================================
@router.get("/me", response_model=UserPublic)
def me(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = None

    # 1) Bearer token no header
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    # 2) Cookie
    if not token:
        token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    return get_current_user(token, db)
