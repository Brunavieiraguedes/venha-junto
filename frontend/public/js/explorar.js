// frontend/public/js/explorar.js
// ✅ Sem mock
// ✅ Puxa do backend: GET /public/places
// ✅ Favoritos via BACKEND (sem cookie/localStorage no front)
// ✅ Coração no card + ao favoritar vai para favoritos.html
// ✅ Ajuste: cidade padrão = TODAS (não filtra por São Paulo)
// ✅ Ajuste: detalhes abre com &from=explorar

(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  function qs(id) {
    return document.getElementById(id);
  }

  /* =========================
     MENU MOBILE / SIDEBAR
  ========================= */
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

  /* =========================
     Painel de filtros
  ========================= */
  function bindFiltersPanel() {
    const btn = qs("btnFiltros");
    const panel = qs("painelFiltros");
    const close = qs("btnFecharFiltros");

    if (!btn || !panel) return;

    const openPanel = () => {
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    };
    const closePanel = () => {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      if (panel.hidden) openPanel();
      else closePanel();
    });
    if (close) close.addEventListener("click", closePanel);
  }

  function setCount(n) {
    const el = qs("countLocais");
    if (el) el.textContent = String(n);
  }

  /* =========================
     HTTP helpers
  ========================= */
  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: {
        ...(opts.headers || {}),
      },
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
      throw new Error(detail);
    }
    return data;
  }

  async function apiPublicPlaces({ cidade, tipo } = {}) {
    const params = new URLSearchParams();
    if (cidade) params.set("cidade", cidade);
    if (tipo && normalizeText(tipo) !== "todos") params.set("tipo", tipo);

    const q = params.toString();
    const url = q ? `/public/places?${q}` : "/public/places";
    return apiFetch(url);
  }

  // ✅ Favoritos via BACKEND
  async function apiFavoritesIds() {
    const data = await apiFetch("/favorites/ids");
    return Array.isArray(data) ? data.map(String) : [];
  }

  async function apiAddFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, { method: "POST" });
  }

  async function apiRemoveFavorite(placeId) {
    return apiFetch(`/favorites/${encodeURIComponent(placeId)}`, { method: "DELETE" });
  }

  /* =========================
     Normalização / filtros
  ========================= */
  function normalizeText(s) {
    return (s || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeTipoToApi(tipoUi) {
    const t = normalizeText(tipoUi);
    if (!t || t === "todos" || t === "todos os tipos") return "Todos";
    if (t === "hoteis" || t === "hotel") return "Hotel";
    if (t === "restaurantes" || t === "restaurante") return "Restaurante";
    if (t === "atracoes" || t === "atracao") return "Atracao";
    if (t === "passeios" || t === "passeio") return "Passeio";
    return tipoUi;
  }

  function matchesTipo(placeTipo, selectedTipoApi) {
    if (!selectedTipoApi || normalizeText(selectedTipoApi) === "todos") return true;

    const a = normalizeText(placeTipo);
    const b = normalizeText(selectedTipoApi);

    if (b === "hotel") return a.includes("hotel");
    if (b === "restaurante") return a.includes("restaurante");
    if (b === "atracao") return a.includes("atracao");
    if (b === "passeio") return a.includes("passeio");

    return a === b;
  }

  function matchesQuery(place, q) {
    if (!q) return true;
    const nq = normalizeText(q);

    const nome = normalizeText(place?.nome);
    const bairro = normalizeText(place?.bairro);
    const desc = normalizeText(place?.descricao);

    return nome.includes(nq) || bairro.includes(nq) || desc.includes(nq);
  }

  /* =========================
     UI / Cards
  ========================= */
  function safeText(v) {
    return (v ?? "").toString();
  }

  function normalizeImageUrl(url) {
    const u = safeText(url).trim();
    if (!u) return "";
    if (u.startsWith("/")) return API_BASE + u;
    return u;
  }

  // guarda em memória (somente runtime) quais ids são favoritos
  let favSet = new Set();

  async function refreshFavSet() {
    try {
      const ids = await apiFavoritesIds();
      favSet = new Set(ids.map(String));
    } catch (e) {
      favSet = new Set();
      console.warn("Não foi possível carregar favoritos (talvez não logado):", e.message || e);
    }
  }

  function buildCard(place) {
    const a = document.createElement("a");
    a.className = "local-card";
    // ✅ adiciona from=explorar
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}&from=explorar`;

    // Imagem
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

    // ✅ Coração (favoritar)
    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-btn";
    favBtn.setAttribute("aria-label", "Adicionar aos favoritos");

    const favIcon = document.createElement("span");
    favIcon.className = "fav-icon";
    favIcon.textContent = "❤";
    favBtn.appendChild(favIcon);

    const sid = String(place.id);
    if (favSet.has(sid)) favBtn.classList.add("is-active");

    favBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const currentlyFav = favBtn.classList.contains("is-active");

      try {
        if (currentlyFav) {
          await apiRemoveFavorite(place.id);
          favBtn.classList.remove("is-active");
          favSet.delete(sid);
        } else {
          await apiAddFavorite(place.id);
          favBtn.classList.add("is-active");
          favSet.add(sid);

          window.location.href = "./favoritos.html";
        }
      } catch (err) {
        alert(err.message || "Erro ao atualizar favorito");
      }
    });

    a.appendChild(favBtn);

    // Corpo
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
    const container = qs("listaLocais");
    if (!container) return;

    container.innerHTML = "";

    const arr = Array.isArray(lista) ? lista : [];
    setCount(arr.length);

    if (arr.length === 0) {
      container.innerHTML = `<div class="vj-empty">Nenhum estabelecimento encontrado.</div>`;
      return;
    }

    arr.forEach((p) => container.appendChild(buildCard(p)));
  }

  async function aplicarFiltros() {
    const q = qs("q")?.value || "";
    const tipoUi = qs("tipo")?.value || "Todos";
    // ✅ agora cidade padrão = TODAS (vazio)
    const cidade = qs("cidade")?.value || "";

    const tipoApi = normalizeTipoToApi(tipoUi);

    const container = qs("listaLocais");
    if (container) container.innerHTML = `<div class="vj-empty">Carregando...</div>`;
    setCount(0);

    try {
      await refreshFavSet();

      let lista = await apiPublicPlaces({
        cidade: cidade || undefined, // vazio => não envia filtro
        tipo: tipoApi || undefined,
      });

      lista = Array.isArray(lista) ? lista : [];

      if (tipoApi && normalizeText(tipoApi) !== "todos") {
        lista = lista.filter((p) => matchesTipo(p?.tipo, tipoApi));
      }

      if (q) {
        lista = lista.filter((p) => matchesQuery(p, q));
      }

      render(lista);
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="vj-error">Erro ao carregar locais: ${String(
          e.message || e
        )}</div>`;
      }
      console.error(e);
    }
  }

  function limpar() {
    if (qs("q")) qs("q").value = "";
    if (qs("tipo")) qs("tipo").value = "Todos";
    // ✅ limpar volta para TODAS
    if (qs("cidade")) qs("cidade").value = "";
    if (qs("estilo")) qs("estilo").value = "Qualquer";
    if (qs("orcamento")) qs("orcamento").value = "Qualquer";
    aplicarFiltros();
  }

  async function main() {
    bindMobileMenu();
    bindFiltersPanel();

    await aplicarFiltros();

    qs("filtrar")?.addEventListener("click", aplicarFiltros);
    qs("limpar")?.addEventListener("click", limpar);

    qs("q")?.addEventListener("input", () => aplicarFiltros());
    qs("tipo")?.addEventListener("change", aplicarFiltros);
    qs("cidade")?.addEventListener("change", aplicarFiltros);
  }

  main();
})();
