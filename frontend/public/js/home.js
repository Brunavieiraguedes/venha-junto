// frontend/public/js/home.js
// ✅ Sem mock
// ✅ Sem localStorage
// ✅ Busca do backend: GET /public/places
// ✅ Filtro garantido no front (caso backend não filtre)

(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  function qs(id) {
    return document.getElementById(id);
  }

  /* =========================
     MENU MOBILE / SIDEBAR
  ========================= */
  function openCloseSidebar() {
    const sidebar = document.getElementById("sidebar");
    const btn = document.getElementById("btnMenu");
    if (!sidebar || !btn) return;

    const open = sidebar.getAttribute("data-open") === "true";
    const next = !open;
    sidebar.setAttribute("data-open", String(next));
    btn.setAttribute("aria-expanded", String(next));
  }

  function bindMobileMenu() {
    const btn = document.getElementById("btnMenu");
    if (!btn) return;

    btn.addEventListener("click", openCloseSidebar);

    document.addEventListener("click", (e) => {
      const sidebar = document.getElementById("sidebar");
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
     HTTP helpers
  ========================= */
  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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

  async function apiMe() {
    return apiFetch("/auth/me");
  }

  async function apiPublicPlaces({ cidade, tipo, verified_first } = {}) {
    const params = new URLSearchParams();
    if (cidade) params.set("cidade", cidade);
    if (tipo && String(tipo).toLowerCase() !== "todos") params.set("tipo", tipo);
    if (typeof verified_first === "boolean")
      params.set("verified_first", String(verified_first));

    const q = params.toString();
    const url = q ? `/public/places?${q}` : "/public/places";
    return apiFetch(url);
  }

  /* =========================
     Normalização (GARANTE filtro)
  ========================= */
  function normalizeText(s) {
    return (s || "")
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .toLowerCase();
  }

  function normalizeTipoToApi(tipoUi) {
    const t = normalizeText(tipoUi);

    if (!t || t === "todos") return "Todos";
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

  /* =========================
     UI helpers
  ========================= */
  function safeText(v) {
    return (v ?? "").toString();
  }

  function buildCard(place) {
    const a = document.createElement("a");
    a.className = "local-card";
    a.href = `./local-detalhes.html?id=${encodeURIComponent(place.id)}`;

    if (place.cover_image) {
      const img = document.createElement("img");
      img.alt = safeText(place.nome) || "Local";
      img.loading = "lazy";
      img.src = place.cover_image;
      a.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "imgEmpty";
      empty.textContent = "Sem imagem";
      a.appendChild(empty);
    }

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
    desc.textContent = safeText(place.descricao || "") || "";

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

    if (!lista || lista.length === 0) {
      container.innerHTML =
        `<div class="vj-empty">Nenhum estabelecimento encontrado.</div>`;
      return;
    }

    lista.forEach((p) => container.appendChild(buildCard(p)));
  }

  async function loadUserHeader() {
    const userEmail = document.getElementById("userEmail");
    if (!userEmail) return;

    try {
      const me = await apiMe();
      userEmail.textContent = me?.email || "visitante@venhajunto.com";
    } catch {
      userEmail.textContent = "visitante@venhajunto.com";
    }
  }

  async function aplicarFiltros() {
    const cidade = qs("cidade")?.value || "";
    const tipoUi = qs("tipoLocal")?.value || "Todos";
    const priorizar = !!qs("toggleAcessiveis")?.checked;

    const tipoApi = normalizeTipoToApi(tipoUi);
    const verified_first = priorizar ? true : false;

    const container = qs("listaLocais");
    if (container) container.innerHTML = `<div class="vj-empty">Carregando...</div>`;

    try {
      // 1) tenta filtrado no backend
      let lista = await apiPublicPlaces({
        cidade: cidade || undefined,
        tipo: tipoApi || undefined,
        verified_first,
      });

      // 2) GARANTIA: filtra no front também
      if (tipoApi && normalizeText(tipoApi) !== "todos") {
        lista = (Array.isArray(lista) ? lista : []).filter((p) =>
          matchesTipo(p?.tipo, tipoApi)
        );
      }

      render(lista);
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="vj-error">Erro ao carregar locais: ${String(
          e.message
        )}</div>`;
      }
      console.error(e);
    }
  }

  async function main() {
    bindMobileMenu();
    await loadUserHeader();
    await aplicarFiltros();

    // Botão Buscar
    const btnBuscar = qs("btnBuscar");
    if (btnBuscar) btnBuscar.addEventListener("click", aplicarFiltros);

    // Aplica na hora que mudar os filtros
    const cidadeEl = qs("cidade");
    const tipoEl = qs("tipoLocal");
    const toggleEl = qs("toggleAcessiveis");

    if (cidadeEl) cidadeEl.addEventListener("change", aplicarFiltros);
    if (tipoEl) tipoEl.addEventListener("change", aplicarFiltros);
    if (toggleEl) toggleEl.addEventListener("change", aplicarFiltros);

    // Enter também funciona
    ["cidade", "tipoLocal"].forEach((id) => {
      const el = qs(id);
      if (!el) return;

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") aplicarFiltros();
      });
    });
  }

  main();
})();
