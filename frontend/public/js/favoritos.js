// frontend/public/js/favoritos.js
(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  function qs(id) {
    return document.getElementById(id);
  }

  function openCloseSidebar() {
    const sidebar = qs("sidebar");
    const btn = qs("btnMenu");
    if (!sidebar || !btn) return;

    const open = sidebar.getAttribute("data-open") === "true";
    const next = !open;
    sidebar.setAttribute("data-open", String(next));
    btn.setAttribute("aria-expanded", String(next));
  }

  function bindMobileMenu() {
    const btn = qs("btnMenu");
    if (!btn) return;

    btn.addEventListener("click", openCloseSidebar);

    document.addEventListener("click", (e) => {
      const sidebar = qs("sidebar");
      if (!sidebar) return;

      const isMobile = window.matchMedia("(max-width: 860px)").matches;
      if (!isMobile) return;

      const open = sidebar.getAttribute("data-open") === "true";
      if (!open) return;

      const clickedInside = sidebar.contains(e.target) || btn.contains(e.target);
      if (!clickedInside) {
        sidebar.setAttribute("data-open", "false");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: { ...(opts.headers || {}) },
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const data = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

    if (!res.ok) {
      const detail =
        data && typeof data === "object" && data.detail
          ? data.detail
          : typeof data === "string"
          ? data
          : `HTTP ${res.status}`;
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function apiFavoritesList() {
    return apiFetch("/favorites");
  }

  async function apiRemoveFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, { method: "DELETE" });
  }

  function safeText(v) {
    return (v ?? "").toString();
  }

  function normalizeImageUrl(url) {
    const u = safeText(url).trim();
    if (!u) return "";
    if (u.startsWith("/")) return API_BASE + u;
    return u;
  }

  function setCount(n) {
    const el = qs("countFavoritos");
    if (el) el.textContent = String(n);
  }

  function showEmpty(show) {
    const empty = qs("emptyState");
    const list = qs("listaFavoritos");
    if (empty) empty.hidden = !show;
    if (list) list.hidden = show;
  }

  function buildCard(place) {
    const a = document.createElement("a");
    a.className = "local-card";
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}`;

    const cover = normalizeImageUrl(place.cover_image);
    if (cover) {
      const img = document.createElement("img");
      img.alt = safeText(place.nome) || "Local";
      img.loading = "lazy";
      img.src = cover;
      a.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "imgEmpty";
      empty.textContent = "Sem imagem";
      a.appendChild(empty);
    }

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-btn is-active";
    favBtn.setAttribute("aria-label", "Remover dos favoritos");

    const favIcon = document.createElement("span");
    favIcon.className = "fav-icon";
    favIcon.textContent = "❤";
    favBtn.appendChild(favIcon);

    favBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        await apiRemoveFavorite(place.id);
        a.remove();

        const grid = qs("gridFavoritos");
        const remaining = grid ? grid.querySelectorAll(".local-card").length : 0;
        setCount(remaining);
        if (remaining === 0) showEmpty(true);
      } catch (err) {
        alert(err.message || "Erro ao remover favorito");
      }
    });

    a.appendChild(favBtn);

    const body = document.createElement("div");
    body.className = "body";

    const h3 = document.createElement("h3");
    h3.textContent = safeText(place.nome) || "Estabelecimento";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${safeText(place.tipo)} • ${safeText(place.cidade)}${
      place.bairro ? " • " + safeText(place.bairro) : ""
    }`;

    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = safeText(place.descricao || "");

    body.appendChild(h3);
    body.appendChild(meta);
    body.appendChild(desc);

    const footer = document.createElement("div");
    footer.className = "footer";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Ver detalhes";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = a.href;
    });

    footer.appendChild(btn);

    a.appendChild(body);
    a.appendChild(footer);

    return a;
  }

  function render(lista) {
    const grid = qs("gridFavoritos"); // ✅ aqui!
    if (!grid) return;

    grid.innerHTML = "";

    const arr = Array.isArray(lista) ? lista : [];
    setCount(arr.length);

    if (arr.length === 0) {
      showEmpty(true);
      return;
    }

    showEmpty(false);
    arr.forEach((p) => grid.appendChild(buildCard(p)));
  }

  async function main() {
    bindMobileMenu();

    qs("btnExplorar")?.addEventListener("click", () => (window.location.href = "./explorar.html"));
    qs("btnVoltar")?.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "./index.html";
    });

    try {
      const lista = await apiFavoritesList();
      render(lista);
    } catch (e) {
      if (e.status === 401) {
        window.location.href = "./usuario-login.html";
        return;
      }
      const grid = qs("gridFavoritos");
      if (grid) grid.innerHTML = `<div class="vj-error">Erro: ${String(e.message || e)}</div>`;
      console.error(e);
    }
  }

  main();
})();
