# app/routes/public.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.place import Place
from app.models.place_accessibility import PlaceAccessibility
from app.models.place_photo import PlacePhoto
from app.models.review import Review
from app.models.user import User  # ✅ ADICIONADO

router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/ping")
def ping():
    return {"message": "public ok"}


def _has_col(model, col_name: str) -> bool:
    return hasattr(model, col_name)


def _norm(s: str | None) -> str | None:
    if s is None:
        return None
    s = str(s).strip()
    return s if s else None


def _user_display_name(u: User, fallback_user_id: int | None = None) -> str:
    """
    Tenta achar um "nome" amigável pro usuário.
    - Se existir u.nome -> usa
    - Se existir u.name -> usa
    - Senão usa u.email
    - Senão "Usuário <id>"
    """
    nome = None

    if hasattr(u, "nome"):
        nome = getattr(u, "nome", None)
    if not nome and hasattr(u, "name"):
        nome = getattr(u, "name", None)

    nome = _norm(nome)
    if nome:
        return nome

    email = _norm(getattr(u, "email", None))
    if email:
        return email

    if fallback_user_id is not None:
        return f"Usuário {fallback_user_id}"

    return "Usuário"


# ============================
# HOME / EXPLORAR LOCAIS
# ============================
@router.get("/places")
def list_published_places(
    cidade: str | None = Query(default=None),
    tipo: str | None = Query(default=None),
    verified_first: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    """
    Retorna apenas estabelecimentos PUBLICADOS.
    Usado pela Home / Explorar Locais.

    Publicado = status APPROVED
    + (se existir coluna verified) verified=True
    """

    cidade = _norm(cidade)
    tipo = _norm(tipo)

    # ✅ Base: somente aprovados
    q = db.query(Place).filter(Place.status == "APPROVED")

    # ✅ Se existir coluna verified, exige True
    if _has_col(Place, "verified"):
        q = q.filter(getattr(Place, "verified").is_(True))

    # ✅ filtros (case-insensitive)
    if cidade:
        q = q.filter(func.lower(Place.cidade) == func.lower(cidade))

    if tipo and tipo.lower() != "todos":
        q = q.filter(func.lower(Place.tipo) == func.lower(tipo))

    # ✅ ordenação
    if verified_first and _has_col(Place, "verified"):
        q = q.order_by(getattr(Place, "verified").desc(), Place.created_at.desc())
    else:
        q = q.order_by(Place.created_at.desc())

    places = q.all()

    result = []
    for p in places:
        # Recursos acessíveis
        features = [
            f.feature_key
            for f in (
                db.query(PlaceAccessibility)
                .filter(PlaceAccessibility.place_id == p.id)
                .all()
            )
        ]

        # Foto capa
        cover = (
            db.query(PlacePhoto)
            .filter(PlacePhoto.place_id == p.id)
            .order_by(PlacePhoto.is_cover.desc(), PlacePhoto.created_at.desc())
            .first()
        )

        # Média e quantidade de avaliações
        avg_rating = (
            db.query(func.avg(Review.rating))
            .filter(Review.place_id == p.id)
            .scalar()
        )

        reviews_count = (
            db.query(func.count(Review.id))
            .filter(Review.place_id == p.id)
            .scalar()
        )

        result.append(
            {
                "id": p.id,
                "nome": p.nome,
                "tipo": p.tipo,
                "cidade": p.cidade,
                "bairro": p.bairro,
                "descricao": p.descricao,

                # se não existir coluna verified, assume True (porque já é APPROVED)
                "verified": bool(getattr(p, "verified", True)),

                "cover_image": cover.url if cover else p.cover_image,

                "features": features,
                "avg_rating": float(avg_rating) if avg_rating else None,
                "reviews_count": int(reviews_count) if reviews_count else 0,

                "created_at": p.created_at.isoformat() if getattr(p, "created_at", None) else None,
                "verified_at": getattr(p, "verified_at").isoformat() if getattr(p, "verified_at", None) else None,
            }
        )

    return result


# ============================
# DETALHES DO LOCAL
# ============================
@router.get("/places/{place_id}")
def get_place_details(place_id: int, db: Session = Depends(get_db)):
    """
    Detalhes de um local publicado + fotos + recursos + avaliações
    """
    place = db.query(Place).filter(Place.id == place_id).first()

    if not place:
        raise HTTPException(status_code=404, detail="Local não encontrado")

    # ✅ Só permite ver detalhes quando aprovado
    if place.status != "APPROVED":
        raise HTTPException(status_code=403, detail="Local não aprovado/publicado")

    # ✅ Se existir verified, exige True
    if _has_col(place, "verified") and not bool(getattr(place, "verified", False)):
        raise HTTPException(status_code=403, detail="Local não aprovado/publicado")

    features = [
        f.feature_key
        for f in (
            db.query(PlaceAccessibility)
            .filter(PlaceAccessibility.place_id == place.id)
            .all()
        )
    ]

    photos = (
        db.query(PlacePhoto)
        .filter(PlacePhoto.place_id == place.id)
        .order_by(PlacePhoto.is_cover.desc(), PlacePhoto.created_at.desc())
        .all()
    )

    # ✅ Reviews + nome do usuário (JOIN)
    review_rows = (
        db.query(Review, User)
        .join(User, User.id == Review.user_id)
        .filter(Review.place_id == place.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    avg_rating = (
        db.query(func.avg(Review.rating))
        .filter(Review.place_id == place.id)
        .scalar()
    )

    reviews_count = (
        db.query(func.count(Review.id))
        .filter(Review.place_id == place.id)
        .scalar()
    )

    return {
        "id": place.id,
        "nome": place.nome,
        "tipo": place.tipo,
        "cidade": place.cidade,
        "bairro": place.bairro,
        "endereco": place.endereco,
        "cep": place.cep,
        "descricao": place.descricao,

        "verified": bool(getattr(place, "verified", True)),
        "verified_at": getattr(place, "verified_at").isoformat() if getattr(place, "verified_at", None) else None,

        "cover_image": (photos[0].url if photos else place.cover_image),

        "features": features,
        "photos": [{"url": ph.url, "is_cover": bool(ph.is_cover)} for ph in photos],

        "avg_rating": float(avg_rating) if avg_rating else None,
        "reviews_count": int(reviews_count) if reviews_count else 0,

        # ✅ Agora devolve o nome de quem avaliou
        "reviews": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "user_name": _user_display_name(u, fallback_user_id=r.user_id),
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for (r, u) in review_rows
        ],
    }


# ============================
# CRIAR / ATUALIZAR AVALIAÇÃO
# ============================
@router.post("/places/{place_id}/reviews")
def upsert_review(place_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    Salva avaliação (rating + comentário).
    Um usuário pode ter 1 avaliação por local (upsert).
    Body esperado:
    {
      "user_id": 1,
      "rating": 5,
      "comment": "..."
    }
    """
    user_id = payload.get("user_id")
    rating = payload.get("rating")
    comment = payload.get("comment")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório")

    if rating is None:
        raise HTTPException(status_code=400, detail="rating é obrigatório")

    try:
        rating = int(rating)
    except Exception:
        raise HTTPException(status_code=400, detail="rating inválido")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="rating deve ser entre 1 e 5")

    place = db.query(Place).filter(Place.id == place_id).first()

    # ✅ Só pode avaliar se estiver aprovado
    if not place or place.status != "APPROVED":
        raise HTTPException(status_code=404, detail="Local não encontrado/publicado")

    # ✅ Se existir verified, exige True
    if place and _has_col(place, "verified") and not bool(getattr(place, "verified", False)):
        raise HTTPException(status_code=404, detail="Local não encontrado/publicado")

    review = (
        db.query(Review)
        .filter(Review.place_id == place_id, Review.user_id == user_id)
        .first()
    )

    if review:
        review.rating = rating
        review.comment = comment
    else:
        review = Review(
            place_id=place_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
        )
        db.add(review)

    db.commit()

    return {"message": "Avaliação salva com sucesso", "place_id": place_id, "user_id": user_id}
