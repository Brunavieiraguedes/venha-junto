(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  const pill = document.getElementById("statusPill");
  const title = document.getElementById("title");
  const desc = document.getElementById("desc");
  const trial = document.getElementById("trial");

  const btnAprovar = document.getElementById("btnAprovar");
  const btnReprovar = document.getElementById("btnReprovar");
  const emailEl = document.getElementById("partnerEmail");

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function currentReturnUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function goLogin() {
    window.location.href =
      "./parceiro-login.html?returnUrl=" + encodeURIComponent(currentReturnUrl());
  }

  async function apiFetch(path, options = {}) {
    const resp = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "include",
    });

    if (resp.status === 401) {
      goLogin();
      throw new Error("Não autenticado");
    }

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await resp.json() : await resp.text();

    if (!resp.ok) {
      const msg = (data && data.detail) ? JSON.stringify(data.detail) : JSON.stringify(data);
      throw new Error(msg);
    }

    return data;
  }

  function setStatusUI(status) {
    const s = String(status || "").toUpperCase();

    if (s === "APPROVED") {
      pill.textContent = "Aprovado";
      title.textContent = "Cadastro Aprovado";
      desc.textContent =
        "Seu estabelecimento foi aprovado. Seu período gratuito de 30 dias foi iniciado.";
      trial.hidden = false;
      return;
    }

    if (s === "REJECTED") {
      pill.textContent = "Reprovado";
      title.textContent = "Cadastro Reprovado";
      desc.textContent =
        "Identificamos pendências. Volte ao cadastro para ajustar as informações e reenviar.";
      trial.hidden = true;
      return;
    }

    // default
    pill.textContent = "Em análise";
    title.textContent = "Cadastro em Análise";
    desc.textContent =
      "Nossa equipe está analisando seu cadastro. Você receberá um e-mail com o resultado.";
    trial.hidden = true;
  }

  async function init() {
    setStatusUI("PENDING_REVIEW");

    // parceiro logado
    const me = await apiFetch("/partner-auth/me", { method: "GET" });
    if (emailEl) emailEl.textContent = me?.email || "Parceiro";

    // você recebe placeId na URL, mas como não existe GET no backend,
    // a tela só usa isso para “saber que veio do submit”.
    const placeId = getQueryParam("placeId");
    if (placeId) {
      setStatusUI("PENDING_REVIEW");
    }

    // Simulação TCC
    if (btnAprovar) btnAprovar.addEventListener("click", () => setStatusUI("APPROVED"));
    if (btnReprovar) btnReprovar.addEventListener("click", () => setStatusUI("REJECTED"));
  }

  init().catch((e) => {
    console.error(e);
    setStatusUI("PENDING_REVIEW");
  });
})();
