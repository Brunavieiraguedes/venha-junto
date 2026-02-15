from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Response, Request, Header
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime, timezone
import uuid
import io
import os

from PIL import Image, ImageOps
import numpy as np
import cv2

# NudeNet (detecção de nudez)
from nudenet import NudeDetector

from app.db.session import get_db
from app.models.user import User

# Reaproveita seu auth (cookie + get_current_user)
from app.routes.auth import get_current_user, COOKIE_NAME

router = APIRouter(prefix="/users/me", tags=["Avatar"])

# ✅ pasta fora do "public" (mais seguro)
AVATAR_DIR = Path("storage/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

MAX_SIZE = 2 * 1024 * 1024  # 2MB
MAX_W, MAX_H = 1024, 1024
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}

detector = NudeDetector()  # carrega modelo uma vez


# ====== Auth helper (igual seu users.py) ======
def _get_token(request: Request, authorization: str | None):
    token = None

    # 1) Bearer (se vier)
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    # 2) Cookie HttpOnly
    if not token:
        token = request.cookies.get(COOKIE_NAME)

    return token


# ====== Helpers de segurança ======
def sniff_magic(data: bytes) -> str:
    if data.startswith(b"\xFF\xD8\xFF"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


def sanitize_and_reencode(raw: bytes) -> bytes:
    """
    - valida se abre como imagem
    - limita dimensões
    - remove EXIF/metadados
    - re-encode para JPEG seguro
    """
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()  # valida estrutura
    except Exception:
        raise HTTPException(status_code=400, detail="Arquivo não é uma imagem válida.")

    # reabrir após verify
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img)  # corrige rotação sem manter EXIF

    w, h = img.size
    # “anti-bomba”: evita imagens absurdas
    if w > 6000 or h > 6000:
        raise HTTPException(status_code=400, detail="Dimensões inválidas (muito grande).")

    img.thumbnail((MAX_W, MAX_H))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    out = io.BytesIO()
    # ✅ JPEG “sanitiza”: remove transparência e metadados
    img.save(out, format="JPEG", quality=88, optimize=True, progressive=True)
    return out.getvalue()


def is_explicit_nudenet(image_jpeg_bytes: bytes) -> bool:
    """
    NudeNet retorna lista de detecções com label + score.
    Bloqueia se detectar labels de nudez/sexual com score >= 0.60
    """
    np_arr = np.frombuffer(image_jpeg_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Imagem inválida (decode falhou).")

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    detections = detector.detect(rgb)

    blocked_labels = {
        "EXPOSED_BREAST_F", "EXPOSED_BREAST_M",
        "EXPOSED_GENITALIA_F", "EXPOSED_GENITALIA_M",
        "EXPOSED_BUTTOCKS", "EXPOSED_ANUS",
    }

    for d in detections or []:
        label = (d.get("class") or "").upper()
        score = float(d.get("score") or 0.0)
        if label in blocked_labels and score >= 0.60:
            return True

    return False


def safe_filename() -> str:
    return f"{uuid.uuid4().hex}.jpg"


def _remove_file_safely(path: Path) -> None:
    try:
        if path.exists() and path.is_file():
            path.unlink()
    except Exception:
        # não derruba a request se falhar para apagar
        pass


# ====== Endpoints ======
@router.post("/avatar")
async def upload_avatar(
    request: Request,
    authorization: str | None = Header(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ✅ pega usuário logado (seu auth real)
    token = _get_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    user: User = get_current_user(token, db)

    # valida content-type declarado
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Formato inválido. Use JPG, PNG ou WEBP.")

    raw = await file.read()

    # limite de tamanho
    if len(raw) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 2MB.")

    # valida assinatura real (anti “trocar extensão”)
    real_mime = sniff_magic(raw)
    if real_mime not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Arquivo inválido (assinatura não confere).")

    # ✅ sanitiza e re-encode (vira JPG seguro)
    cleaned_jpg = sanitize_and_reencode(raw)

    # ✅ bloqueia explícito
    if is_explicit_nudenet(cleaned_jpg):
        raise HTTPException(status_code=422, detail="Imagem rejeitada por conteúdo impróprio.")

    # ✅ salvar em disco com nome seguro
    new_filename = safe_filename()
    new_path = AVATAR_DIR / new_filename
    new_path.write_bytes(cleaned_jpg)

    # ✅ remove avatar antigo (se existir)
    old_filename = getattr(user, "avatar_filename", None)
    if old_filename:
        _remove_file_safely(AVATAR_DIR / old_filename)

    # ✅ grava no banco
    user.avatar_filename = new_filename
    user.avatar_updated_at = datetime.now(timezone.utc)

    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ URL padrão do seu GET
    return {"ok": True, "avatar_url": "/users/me/avatar"}


@router.get("/avatar")
def get_my_avatar(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _get_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    user: User = get_current_user(token, db)

    filename = getattr(user, "avatar_filename", None)
    if not filename:
        raise HTTPException(status_code=404, detail="Usuário sem avatar.")

    path = AVATAR_DIR / filename
    if not path.exists():
        # DB diz que tem, mas arquivo sumiu -> limpa DB
        user.avatar_filename = None
        user.avatar_updated_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()
        raise HTTPException(status_code=404, detail="Avatar não encontrado.")

    data = path.read_bytes()
    return Response(content=data, media_type="image/jpeg")


@router.delete("/avatar")
def delete_my_avatar(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _get_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    user: User = get_current_user(token, db)

    filename = getattr(user, "avatar_filename", None)
    if filename:
        _remove_file_safely(AVATAR_DIR / filename)

    user.avatar_filename = None
    user.avatar_updated_at = datetime.now(timezone.utc)

    db.add(user)
    db.commit()

    return {"ok": True}
