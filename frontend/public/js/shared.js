// frontend/public/js/shared.js
// ✅ ES Module
// ✅ Sem localStorage
// ✅ Exporta buildCard para ser usado no home.js

const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

/** Tenta descobrir se existe usuário logado via cookie HttpOnly */
async function isLoggedIn() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function formatTipo(tipo) {
  if (!tipo) return "";
  return String(tipo);
}

function safeText(v) {
  return v == null ? "" : String(v);
}

function chip(text) {
  const el = document.createElement("span");
  el.className = "chip";
  el.textContent = text;
  return el;
}

/**
 * ✅ Card padrão para Home/Explorar
 * Espera objeto do backend /public/places:
 * { id, nome, tipo, cidade, bairro, cover_image, features, avg_rating, reviews_count, verified }
 */
export function buildCard(place) {
  const p = place || {};

  const card = document.createElement("article");
  card.className = "place-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Ver detalhes de ${safeText(p.nome)}`);

  // imagem
  const imgWrap = document.createElement("div");
  imgWrap.className = "place-card__img";

  const img = document.createElement("img");
  img.alt = safeText(p.nome) || "Local";
  img.loading = "lazy";

  // se não tiver imagem, usa fallback simples
  img.src =
    p.cover_image && String(p.cover_image).trim()
      ? String(p.cover_image)
      : "./assets/img/placeholder-place.png";

  imgWrap.appendChild(img);

  // conteúdo
  const body = document.createElement("div");
  body.className = "place-card__body";

  const title = document.createElement("h3");
  title.className = "place-card__title";
  title.textContent = safeText(p.nome) || "Estabelecimento";

  const meta = document.createElement("div");
  meta.className = "place-card__meta";
  meta.textContent = `${formatTipo(p.tipo)} • ${safeText(p.cidade)}${
    p.bairro ? ` • ${safeText(p.bairro)}` : ""
  }`;

  const chips = document.createElement("div");
  chips.className = "place-card__chips";

  // verificado
  if (p.verified === true) chips.appendChild(chip("✅ Verificado"));

  // recursos (pega até 3)
  const feats = Array.isArray(p.features) ? p.features : [];
  feats.slice(0, 3).forEach((f) => {
    if (f) chips.appendChild(chip(safeText(f)));
  });

  // rating
  const rating = document.createElement("div");
  rating.className = "place-card__rating";

  const avg = p.avg_rating == null ? null : Number(p.avg_rating);
  const cnt = p.reviews_count == null ? 0 : Number(p.reviews_count);

  if (avg == null || Number.isNaN(avg)) {
    rating.textContent = "Sem avaliações";
  } else {
    rating.textContent = `⭐ ${avg.toFixed(1)} (${cnt})`;
  }

  // botão
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "place-card__btn";
  btn.textContent = "Ver detalhes";

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(chips);
  body.appendChild(rating);
  body.appendChild(btn);

  card.appendChild(imgWrap);
  card.appendChild(body);

  // navegação / modal
  async function go() {
    const detailsUrl = `./local-detalhes.html?id=${encodeURIComponent(p.id)}`;
    const ok = await isLoggedIn();

    if (!ok) {
      // abre seu modal sem localStorage (você já tem VJ_openAuthModal no index)
      if (typeof window.VJ_openAuthModal === "function") {
        const returnUrl =
          window.location.pathname + window.location.search + window.location.hash;
        window.VJ_openAuthModal(returnUrl || detailsUrl);
      } else {
        // fallback: manda pro login com returnUrl
        window.location.href = `./usuario-login.html?returnUrl=${encodeURIComponent(
          detailsUrl
        )}`;
      }
      return;
    }

    window.location.href = detailsUrl;
  }

  card.addEventListener("click", go);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });

  // se clicar no botão, também
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    go();
  });

  return card;
}
