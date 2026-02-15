# app/routes/partner.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Cookie,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session
from pathlib import Path
import uuid

from app.db.session import get_db
from app.core.security import decode_access_token

from app.models.user import User
from app.models.partner_profile import PartnerProfile
from app.models.place import Place
from app.models.place_accessibility import PlaceAccessibility
from app.models.place_photo import PlacePhoto

from app.schemas.place import PlaceCreateRequest

router = APIRouter(prefix="/partner", tags=["Partner"])


# =====================================================
# CONTEXTO DO PARCEIRO (AUTH VIA COOKIE)
# =====================================================
def get_partner_context(
    vj_partner_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not vj_partner_token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    payload = decode_access_token(vj_partner_token)

    user_ref = payload.get("uid") or payload.get("sub")
    role = payload.get("role")

    if not user_ref:
        raise HTTPException(status_code=401, detail="Token inválido")

    if role != "partner":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para parceiro")

    if isinstance(user_ref, str) and "@" in user_ref:
        user = db.query(User).filter(User.email == user_ref).first()
    else:
        try:
            user_id = int(user_ref)
        except Exception:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    profile = (
        db.query(PartnerProfile)
        .filter(PartnerProfile.user_id == user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de parceiro não encontrado")

    return user, profile


def _clean_str(s: str | None) -> str | None:
    if not s:
        return None
    s = str(s).strip()
    return s if s else None


def _validate_cover_image(url: str | None):
    if not url:
        return
    low = url.lower().strip()
    if low.startswith("data:"):
        raise HTTPException(status_code=400, detail="Imagem inválida (base64 não permitido)")
    if "javascript:" in low:
        raise HTTPException(status_code=400, detail="Imagem inválida")
    if not (low.startswith("http://") or low.startswith("https://")):
        raise HTTPException(status_code=400, detail="cover_image deve ser URL http/https")


# =====================================================
# CRIAR ESTABELECIMENTO (DRAFT)
# =====================================================
@router.post("/places", status_code=status.HTTP_201_CREATED)
def create_place(
    payload: PlaceCreateRequest,
    ctx=Depends(get_partner_context),
    db: Session = Depends(get_db),
):
    user, profile = ctx

    cover = _clean_str(payload.cover_image)
    _validate_cover_image(cover)

    place = Place(
        partner_id=user.id,
        nome=payload.nome,
        tipo=payload.tipo,
        cidade=payload.cidade,
        bairro=payload.bairro,
        endereco=payload.endereco,
        cep=payload.cep,
        descricao=payload.descricao,
        cover_image=cover,
        status="DRAFT",
    )

    db.add(place)
    db.flush()

    if cover:
        db.add(
            PlacePhoto(
                place_id=place.id,
                url=cover,
                is_cover=True,
            )
        )

    if payload.features:
        for feature in payload.features:
            db.add(
                PlaceAccessibility(
                    place_id=place.id,
                    feature_key=feature,
                )
            )

    db.commit()
    db.refresh(place)

    return {
        "place_id": place.id,
        "status": place.status,
    }


# =====================================================
# UPLOAD REAL DE FOTO
# =====================================================
@router.post("/places/{place_id}/photos", status_code=status.HTTP_201_CREATED)
def upload_place_photo(
    place_id: int,
    file: UploadFile = File(...),
    is_cover: bool = Form(False),
    ctx=Depends(get_partner_context),
    db: Session = Depends(get_db),
):
    user, profile = ctx

    place = (
        db.query(Place)
        .filter(Place.id == place_id, Place.partner_id == user.id)
        .first()
    )
    if not place:
        raise HTTPException(status_code=404, detail="Local não encontrado")

    allowed_types = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Use JPG, PNG ou WEBP.",
        )

    content = file.file.read()

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Imagem maior que 5MB",
        )

    ext = allowed_types[file.content_type]

    base_dir = Path(__file__).resolve().parents[1]  # app/
    upload_dir = base_dir / "static" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = upload_dir / filename

    with open(filepath, "wb") as f:
        f.write(content)

    url = f"http://127.0.0.1:8000/media/uploads/{filename}"

    if is_cover:
        db.query(PlacePhoto).filter(
            PlacePhoto.place_id == place_id,
            PlacePhoto.is_cover == True,
        ).update({"is_cover": False})

        place.cover_image = url

    photo = PlacePhoto(
        place_id=place_id,
        url=url,
        is_cover=is_cover,
    )

    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {
        "photo_id": photo.id,
        "url": url,
        "is_cover": is_cover,
    }


# =====================================================
# ENVIAR PARA ANÁLISE
# =====================================================
@router.post("/places/{place_id}/submit")
def submit_place(
    place_id: int,
    ctx=Depends(get_partner_context),
    db: Session = Depends(get_db),
):
    user, profile = ctx

    place = (
        db.query(Place)
        .filter(Place.id == place_id, Place.partner_id == user.id)
        .first()
    )
    if not place:
        raise HTTPException(status_code=404, detail="Local não encontrado")

    if place.status not in ("DRAFT", "REJECTED"):
        raise HTTPException(status_code=400, detail="Status inválido para envio")

    place.status = "PENDING_REVIEW"
    db.commit()

    return {
        "place_id": place.id,
        "status": place.status,
    }


# =====================================================
# CONSULTAR ESTABELECIMENTO
# =====================================================
@router.get("/places/{place_id}")
def get_place(
    place_id: int,
    ctx=Depends(get_partner_context),
    db: Session = Depends(get_db),
):
    user, profile = ctx

    place = (
        db.query(Place)
        .filter(Place.id == place_id, Place.partner_id == user.id)
        .first()
    )
    if not place:
        raise HTTPException(status_code=404, detail="Local não encontrado")

    return {
        "place_id": place.id,
        "status": place.status,
        "nome": place.nome,
        "tipo": place.tipo,
        "cidade": place.cidade,
        "bairro": place.bairro,
        "endereco": place.endereco,
        "cep": place.cep,
        "descricao": place.descricao,
        "cover_image": place.cover_image,
    }
