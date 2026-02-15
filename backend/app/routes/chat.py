import re
import unicodedata
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.place import Place
from app.models.place_accessibility import PlaceAccessibility
from app.models.place_photo import PlacePhoto

from app.ollama_client import perguntar_ollama  # seu client do ollama (requests)

router = APIRouter()

class ChatIn(BaseModel):
    message: str
    session_id: str | None = None  # opcional (frontend pode mandar)

# Memória simples em RAM (para desenvolvimento)
STATE: dict[str, dict] = {}

TIPO_MAP = {
    "restaurante": ["restaurante", "restaurantes", "comida", "almoço", "jantar", "lanchonete", "café", "cafeteria"],
    "hotel": ["hotel", "hospedagem", "pousada", "hostel"],
    "museu": ["museu", "exposição"],
    "parque": ["parque", "praça", "natureza"],
    "cultura": ["teatro", "cinema", "show", "cultural", "cultura"],
}

def norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("utf-8")
    s = re.sub(r"\s+", " ", s)
    return s

def detectar_tipo(texto: str) -> str | None:
    t = norm(texto)
    for tipo, palavras in TIPO_MAP.items():
        if any(p in t for p in palavras):
            return tipo
    return None

def escolher_sessao(session_id: str | None) -> str:
    return session_id or "default"

def buscar_places(db: Session, tipo: str | None, bairro: str | None, cidade: str | None):
    q = db.query(Place)

    # Só lugares publicados (seu fluxo admin aprova -> published)
    q = q.filter(Place.status == "PUBLISHED")

    # Se quiser não travar cidade, deixe sem este filtro.
    # Como sua plataforma é SP, esse filtro ajuda:
    if cidade:
        q = q.filter(Place.cidade.ilike(f"%{cidade}%"))
    else:
        # tenta SP como padrão, mas sem ser rígido demais:
        # (não usa "sao paulo" fixo, usa o texto "São" também)
        q = q.filter(
            (Place.cidade.ilike("%São Paulo%")) | (Place.cidade.ilike("%Sao Paulo%"))
        )

    if tipo:
        q = q.filter(Place.tipo.ilike(f"%{tipo}%"))

    if bairro:
        q = q.filter(Place.bairro.ilike(f"%{bairro}%"))

    return q.order_by(Place.verified.desc(), Place.updated_at.desc()).limit(6).all()

def montar_payload(db: Session, places: list[Place]):
    ids = [p.id for p in places]

    acc_rows = (
        db.query(PlaceAccessibility.place_id, PlaceAccessibility.feature_key)
        .filter(PlaceAccessibility.place_id.in_(ids))
        .all()
    )
    acc_map: dict[int, list[str]] = {}
    for pid, key in acc_rows:
        acc_map.setdefault(pid, []).append(key)

    photo_rows = (
        db.query(PlacePhoto.place_id, PlacePhoto.url, PlacePhoto.is_cover)
        .filter(PlacePhoto.place_id.in_(ids))
        .all()
    )
    photo_map: dict[int, str] = {}
    # prioriza is_cover; se não tiver, pega a primeira
    for pid, url, is_cover in sorted(photo_rows, key=lambda x: (x[0], not x[2])):
        if pid not in photo_map or is_cover:
            photo_map[pid] = url

    out = []
    for p in places:
        out.append({
            "id": p.id,
            "nome": p.nome,
            "tipo": p.tipo,
            "cidade": p.cidade,
            "bairro": p.bairro,
            "endereco": p.endereco,
            "verified": bool(p.verified),
            "acessibilidade": acc_map.get(p.id, []),
            "foto": p.cover_image or photo_map.get(p.id),
        })
    return out

def sugerir_bairros_reais(db: Session, cidade: str | None, limite: int = 6) -> list[str]:
    q = db.query(Place.bairro).filter(Place.status == "PUBLISHED")
    if cidade:
        q = q.filter(Place.cidade.ilike(f"%{cidade}%"))
    else:
        q = q.filter(
            (Place.cidade.ilike("%São Paulo%")) | (Place.cidade.ilike("%Sao Paulo%"))
        )

    q = q.filter(Place.bairro.isnot(None))
    rows = q.distinct().limit(50).all()

    # limpa, remove vazios e retorna alguns
    bairros = []
    seen = set()
    for (b,) in rows:
        b = (b or "").strip()
        if not b:
            continue
        key = norm(b)
        if key in seen:
            continue
        seen.add(key)
        bairros.append(b)
        if len(bairros) >= limite:
            break

    # fallback se banco não tiver bairros
    if not bairros:
        bairros = ["Paulista", "Centro", "Pinheiros", "Moema"]
    return bairros


@router.post("/chat")
def chat(payload: ChatIn, db: Session = Depends(get_db)):
    msg = (payload.message or "").strip()[:500]
    sid = escolher_sessao(payload.session_id)

    st = STATE.setdefault(sid, {"tipo": None, "bairro": None, "cidade": None})

    # 1) Atualiza estado com tipo
    tipo_now = detectar_tipo(msg)
    if tipo_now:
        st["tipo"] = tipo_now

    # 2) Se usuário digitou só "São Paulo" -> cidade
    m_norm = norm(msg)
    if m_norm in ["sao paulo", "sp", "sao paulo - sp"]:
        st["cidade"] = "São Paulo"
    else:
        # Se usuário digitou algo curto (ex: "vila olímpia", "grajaú"), trate como bairro
        # (isso melhora MUITO sua conversa)
        if len(m_norm) <= 40 and (" " in m_norm or len(m_norm) >= 4):
            # evita casos tipo "oi", "ok", etc.
            if m_norm not in ["oi", "ola", "olá", "ok", "tudo bem"]:
                st["bairro"] = msg

    # 3) Se ainda falta info básica, pergunta de forma amigável
    if not st["tipo"]:
        return {"answer": "Você procura hotel, restaurante, museu, parque ou cultura? 😊", "places": []}

    if not st["bairro"]:
        # sugere alguns bairros reais do seu banco
        sugestoes = sugerir_bairros_reais(db, st["cidade"])
        sugestoes_txt = " • ".join(sugestoes[:4])
        return {
            "answer": f"Em qual região/bairro de São Paulo você quer? 😊\nExemplos: {sugestoes_txt}",
            "places": []
        }

    # 4) Busca no DB
    places = buscar_places(db, st["tipo"], st["bairro"], st["cidade"])
    if not places:
        sugestoes = sugerir_bairros_reais(db, st["cidade"])
        sugestoes_txt = "\n".join([f"📍 {b}" for b in sugestoes[:4]])
        return {
            "answer": (
                f"Não encontrei {st['tipo']} acessíveis cadastrados na região “{st['bairro']}” no momento 😊\n\n"
                f"Quer tentar uma destas regiões?\n{sugestoes_txt}"
            ),
            "places": []
        }

    places_payload = montar_payload(db, places)

    # 5) Ollama só para redigir, SEM inventar
    lista = "\n".join([
        f"- {p['nome']} | {p.get('bairro') or ''} | {p.get('endereco') or 'endereço não informado'} | acessibilidade: {', '.join(p['acessibilidade']) or 'não informado'}"
        for p in places_payload
    ])

    prompt = f"""
Você é a Assistente Social do Venha Junto (turismo acessível em São Paulo).
Regra: só pode mencionar lugares que estiverem em RESULTADOS. Não invente nomes, endereços ou detalhes.

PERGUNTA:
{msg}

RESULTADOS:
{lista}

Responda em português, curto (2-5 linhas), acolhedor. Sugira os lugares e pergunte se a pessoa quer ver detalhes.
""".strip()

    answer = perguntar_ollama(prompt)

    return {"answer": answer.strip(), "places": places_payload}
