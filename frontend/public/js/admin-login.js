(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  const LOGIN_PATH = "/auth/login";
  const ME_PATH = "/auth/me";

  const form = document.getElementById("formAdminLogin");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const toastEl = document.getElementById("toast");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.hidden = true), 3500);
  }

  function getReturnUrl() {
    const p = new URLSearchParams(window.location.search);
    return p.get("returnUrl") || "./admin-dashboard.html";
  }

  async function apiFetch(path, options = {}) {
    const resp = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "include",
    });

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await resp.json() : await resp.text();

    if (!resp.ok) {
      const msg = (data && data.detail) ? JSON.stringify(data.detail) : JSON.stringify(data);
      throw new Error(msg);
    }

    return data;
  }

  async function doLogin(email, senha) {
    // ✅ Seu LoginRequest usa "senha"
    await apiFetch(LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });

    const me = await apiFetch(ME_PATH, { method: "GET" });

    const role = String(me?.role || "").toLowerCase();
    if (role !== "admin") {
      throw new Error("Seu usuário não é admin.");
    }

    return me;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim();
    const senha = passEl.value;

    if (!email || !email.includes("@")) return showToast("Informe um e-mail válido.");
    if (!senha || senha.length < 4) return showToast("Informe sua senha.");

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    try {
      await doLogin(email, senha);
      window.location.href = getReturnUrl();
    } catch (err) {
      console.error(err);
      showToast("Falha no login. Verifique e-mail/senha e tente novamente.");
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
    }
  });
})();
