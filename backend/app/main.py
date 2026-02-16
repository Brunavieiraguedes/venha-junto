# app/main.py

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db.session import Base, engine

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.partner_auth import router as partner_auth_router
from app.routes.partner import router as partner_router
from app.routes.admin import router as admin_router
from app.routes.public import router as public_router
from app.routes import session
from app.routes import favorites
from app.routes.chat import router as chat_router



# ✅ rota de avatar (uma vez só)
from app.routes.avatar import router as avatar_router

# garante que os models sejam importados
import app.models.user  # noqa: F401
from app.models import place, place_accessibility, place_photo, review  # noqa: F401

app = FastAPI(title="Venha Junto API", version="0.1.0")

# ✅ CORS: necessário para cookies HTTPOnly funcionarem no fetch com credentials: "include"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:8000",
        "http://localhost:8000",

        #A URL DO SEU FRONT NO RENDER AQUI:
       "https://venha-junto-acessivel.onrender.com",
      
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# =====================================================
# ✅ 1) SERVIR FRONTEND PELO BACKEND
# =====================================================
FRONT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")
)

if os.path.isdir(FRONT_DIR):
    app.mount("/static", StaticFiles(directory=FRONT_DIR), name="static")

    @app.get("/")
    def home():
        return FileResponse(os.path.join(FRONT_DIR, "index.html"))
else:
    @app.get("/")
    def home():
        return {"message": "Frontend não encontrado. Verifique se existe: frontend/public"}

# =====================================================
# ✅ 2) SERVIR UPLOADS (IMAGENS DO BANCO) EM /media
# =====================================================
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "static", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/media/uploads", StaticFiles(directory=UPLOAD_DIR), name="media_uploads")

# =====================================================
# ✅ ROTAS DA API
# =====================================================
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)

# ✅ avatar (uma vez só)
app.include_router(avatar_router)

app.include_router(partner_auth_router)
app.include_router(partner_router)
app.include_router(admin_router)
app.include_router(public_router)
app.include_router(favorites.router)
app.include_router(session.router)
app.include_router(chat_router, tags=["Chat"])
