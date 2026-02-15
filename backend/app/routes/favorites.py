from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db  # ✅ usar o get_db do session.py
from app.models.favorite import Favorite
from app.models.place import Place
from app.dependencies import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("/")
def list_favorites(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = (
        db.query(Place)
        .join(Favorite, Favorite.place_id == Place.id)
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    return q.all()


@router.get("/ids")
def list_favorite_ids(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(Favorite.place_id)
        .filter(Favorite.user_id == current_user.id)
        .all()
    )
    return [r[0] for r in rows]


@router.post("/{place_id}", status_code=201)
def add_favorite(
    place_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    exists = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.place_id == place_id)
        .first()
    )
    if exists:
        return {"ok": True, "favorited": True}

    fav = Favorite(user_id=current_user.id, place_id=place_id)
    db.add(fav)
    db.commit()
    return {"ok": True, "favorited": True}


@router.delete("/{place_id}")
def remove_favorite(
    place_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.place_id == place_id)
        .first()
    )
    if not fav:
        return {"ok": True, "favorited": False}

    db.delete(fav)
    db.commit()
    return {"ok": True, "favorited": False}
