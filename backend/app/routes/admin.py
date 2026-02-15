from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Cookie
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_access_token

from app.models.user import User
from app.models.place import Place

from app.schemas.place import PlaceApproveRequest, PlaceRejectRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


# =====================================================
# CONTEXTO ADMIN (AUTH VIA COOKIE HTTPONLY)
# =====================================================
def get_admin_context(
    vj_access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not vj_access_token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    payload = decode_access_token(vj_access_token)

    # 🔐 aceita uid (id) ou sub (email)
    uid = payload.get("uid")
    sub = payload.get("sub")

    if not (uid or sub):
        raise HTTPException(status_code=401, detail="Token inválido")

    user = None

    # tenta localizar por ID
    if uid:
        try:
            user = db.query(User).filter(User.id == int(uid)).first()
        except Exception:
            user = None

    # tenta localizar por email
    if not user and sub:
        user = (
            db.query(User)
            .filter(User.email == str(sub).lower().strip())
            .first()
        )

    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    # ✅ VALIDAÇÃO REAL: role vem DO BANCO
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para admin"
        )

    return user  # admin autenticado


# ============================
# HEALTH / TESTE
# ============================
@router.get("/ping")
def ping(admin: User = Depends(get_admin_context)):
    return {"message": "admin ok"}


# ============================
# LISTAR ESTABELECIMENTOS
# ============================
@router.get("/places")
def list_places(
    status_filter: str = Query(default="PENDING_REVIEW", alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_context),
):
    places = (
        db.query(Place)
        .filter(Place.status == status_filter)
        .order_by(Place.created_at.desc())
        .all()
    )

    return [
        {
            "id": p.id,
            "nome": p.nome,
            "tipo": p.tipo,
            "cidade": p.cidade,
            "bairro": p.bairro,
            "status": p.status,
            "verified": getattr(p, "verified", None),
            "verified_by": getattr(p, "verified_by", None),
            "verified_at": getattr(p, "verified_at", None),
            "created_at": getattr(p, "created_at", None),
        }
        for p in places
    ]


# ============================
# APROVAR ESTABELECIMENTO
# ============================
@router.post("/places/{place_id}/approve")
def approve_place(
    place_id: int,
    payload: PlaceApproveRequest | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_context),
):
    place = db.query(Place).filter(Place.id == place_id).first()

    if not place:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    if place.status != "PENDING_REVIEW":
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível aprovar um local com status {place.status}",
        )

    place.status = "APPROVED"

    if hasattr(place, "verified"):
        place.verified = True

    if hasattr(place, "verified_by"):
        place.verified_by = admin.id

    if hasattr(place, "verified_at"):
        place.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(place)

    return {
        "message": "Estabelecimento aprovado com sucesso",
        "place_id": place.id,
        "status": place.status,
    }


# ============================
# REPROVAR ESTABELECIMENTO
# ============================
@router.post("/places/{place_id}/reject")
def reject_place(
    place_id: int,
    payload: PlaceRejectRequest | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_context),
):
    place = db.query(Place).filter(Place.id == place_id).first()

    if not place:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    if place.status != "PENDING_REVIEW":
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível reprovar um local com status {place.status}",
        )

    place.status = "REJECTED"

    if hasattr(place, "verified"):
        place.verified = False

    if hasattr(place, "verified_by"):
        place.verified_by = admin.id

    if hasattr(place, "verified_at"):
        place.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(place)

    return {
        "message": "Estabelecimento reprovado",
        "place_id": place.id,
        "status": place.status,
    }
