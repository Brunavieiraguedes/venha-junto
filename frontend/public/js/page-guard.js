// ./js/page-guard.js
(function () {
  // =========================
  // Helpers
  // =========================
  async function getMeSafe() {
    try {
      const me = await window.apiMe();
      return me; // {id,nome,email,...}
    } catch {
      return null;
    }
  }

  function setUserBox({ nome, email } = {}) {
    const nameEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");

    if (nameEl) nameEl.textContent = nome || "Visitante";
    if (emailEl) emailEl.textContent = email || "visitante@venhajunto.com";
  }

  async function hydrateUserBox() {
    // se a página nem tem userbox, não faz nada
    const hasBox =
      document.getElementById("userName") || document.getElementById("userEmail");
    if (!hasBox) return;

    // coloca estado inicial (evita “piscada” errada)
    setUserBox({ nome: "Carregando...", email: "..." });

    const me = await getMeSafe();
    if (me && me.email) {
      setUserBox({ nome: me.nome || "Usuário", email: me.email });
      // cache opcional (só para UX)
      localStorage.setItem("vj_last_user_name", me.nome || "");
      localStorage.setItem("vj_last_user_email", me.email || "");
    } else {
      setUserBox(); // Visitante
    }
  }

  async function isLoggedIn() {
    const me = await getMeSafe();
    return !!(me && me.email);
  }

  function openAuthModal(returnUrl) {
    if (typeof window.VJ_openAuthModal === "function") {
      window.VJ_openAuthModal(returnUrl);
      return;
    }
    window.location.href = `./usuario-login.html?returnUrl=${encodeURIComponent(
      returnUrl
    )}`;
  }

  // =========================
  // 1) FORÇA login em páginas protegidas
  // =========================
  async function guardThisPageIfRequired() {
    const required =
      document.body &&
      document.body.dataset &&
      document.body.dataset.auth === "required";
    if (!required) return;

    const ok = await isLoggedIn();
    if (ok) return;

    const returnUrl =
      window.location.pathname + window.location.search + window.location.hash;

    openAuthModal(returnUrl);
  }

  // =========================
  // 2) Intercepta cliques no menu
  // =========================
  const protectedLinks = new Set([
    "./explorar.html",
    "./favoritos.html",
    "./detalhes.html",
  ]);

  async function interceptLinks(e) {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    // não bloquear externos/âncoras/parceiro/admin
    if (
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.includes("parceiro") ||
      href.includes("../admin")
    ) {
      return;
    }

    if (!protectedLinks.has(href)) return;

    const ok = await isLoggedIn();
    if (ok) return;

    e.preventDefault();
    openAuthModal(href);
  }

  // =========================
  // Boot
  // =========================
  async function boot() {
    // ✅ primeiro tenta preencher userbox
    await hydrateUserBox();

    // ✅ depois protege a página se necessário
    await guardThisPageIfRequired();

    // intercepta cliques
    document.addEventListener("click", interceptLinks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
