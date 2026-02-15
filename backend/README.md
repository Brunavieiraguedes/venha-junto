# Venha Junto (TCC) — Backend + Frontend

## Frontend (HTML/CSS/JS)
- `frontend/public/` = área pública (turista)
- `frontend/admin/` = área do parceiro (admin) — separado do público

## Backend (FastAPI)
Rodar:
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Docs:
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Como abrir o Frontend
Sem SPA: abra os HTML.
- `frontend/public/index.html`
- `frontend/admin/login.html`

Quando você integrar com o backend, o ideal é servir o frontend via um servidor (Nginx/Cloud) ou pelo próprio FastAPI.
