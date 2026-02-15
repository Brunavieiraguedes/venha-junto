// ./js/usuario-auth-ui.js
(function () {
  function qs(id) { return document.getElementById(id); }

  /* =========================
     ✅ MÁSCARA DE TELEFONE
     Formato: (11) 98765-4321
     - não trava ao apagar o "-"
  ========================= */
  const telefoneInput = qs("telefone");
  if (telefoneInput) {
    const formatPhone = (digits) => {
      const d = String(digits || "").replace(/\D/g, "").slice(0, 11);

      const ddd = d.slice(0, 2);
      const rest = d.slice(2);

      if (!ddd) return "";
      if (!rest) return `(${ddd})`;

      const isMobile = rest.length > 8;
      const firstLen = isMobile ? 5 : 4;

      const first = rest.slice(0, firstLen);
      const last = rest.slice(firstLen, firstLen + 4);

      return last ? `(${ddd}) ${first}-${last}` : `(${ddd}) ${first}`;
    };

    telefoneInput.addEventListener("input", (e) => {
      const el = e.target;
      const start = el.selectionStart ?? el.value.length;

      const digitsBeforeCursor = el.value.slice(0, start).replace(/\D/g, "").length;

      el.value = formatPhone(el.value);

      let pos = 0;
      let seenDigits = 0;
      while (pos < el.value.length && seenDigits < digitsBeforeCursor) {
        if (/\d/.test(el.value[pos])) seenDigits++;
        pos++;
      }
      el.setSelectionRange(pos, pos);
    });

    telefoneInput.addEventListener("paste", () => {
      setTimeout(() => {
        telefoneInput.value = formatPhone(telefoneInput.value);
      }, 0);
    });
  }

  // Mostrar/ocultar senha (olhinho)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-eye]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-eye");
    const input = document.getElementById(targetId);
    if (!input) return;

    input.type = (input.type === "password") ? "text" : "password";
  });

  function getReturnUrl() {
    const url = new URL(window.location.href);
    return url.searchParams.get("returnUrl") || "./index.html";
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function addFieldErrorClass(fieldId) {
    const input = qs(fieldId);
    if (!input) return;

    // compat: se você tiver CSS antigo ou novo, aplico os dois
    input.classList.add("vj-input-error");
    const wrap = input.closest(".vj-input");
    if (wrap) wrap.classList.add("vj-input--error");
  }

  function clearFieldErrorClass(fieldId) {
    const input = qs(fieldId);
    if (!input) return;

    input.classList.remove("vj-input-error");
    const wrap = input.closest(".vj-input");
    if (wrap) wrap.classList.remove("vj-input--error");
  }

  async function doLogin(email, senha) {
    await window.apiLogin({ email, senha });
    return await window.apiMe();
  }

  // =========================
  // LOGIN (✅ SEM POPUP)
  // =========================
  const formLogin = qs("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = qs("email")?.value?.trim();
      const senha = qs("senha")?.value || "";

      const emailError = qs("emailError");
      const senhaError = qs("senhaError");

      // limpar erros
      if (emailError) emailError.textContent = "";
      if (senhaError) senhaError.textContent = "";
      clearFieldErrorClass("email");
      clearFieldErrorClass("senha");

      // validar
      if (!email) {
        if (emailError) emailError.textContent = "Informe seu e-mail.";
        addFieldErrorClass("email");
        return;
      }

      if (!isEmail(email)) {
        if (emailError) emailError.textContent = "E-mail inválido.";
        addFieldErrorClass("email");
        return;
      }

      if (!senha) {
        if (senhaError) senhaError.textContent = "Informe sua senha.";
        addFieldErrorClass("senha");
        return;
      }

      try {
        await doLogin(email, senha);
        window.location.href = getReturnUrl();
      } catch (err) {
        const raw = String(
          typeof err === "string"
            ? err
            : (err?.message || err?.detail || "Erro ao entrar.")
        );

        const friendly =
          raw.includes("Failed to fetch")
            ? "Não foi possível conectar ao servidor. Verifique se o backend está rodando (127.0.0.1:8000)."
            : "E-mail ou senha inválidos.";

        // mostra no campo senha (fica mais natural)
        if (senhaError) senhaError.textContent = friendly;
        addFieldErrorClass("senha");
      }
    });
  }

  // =========================
  // SIGNUP (o seu igual)
  // =========================
  const formSignup = qs("formSignup");
  if (formSignup) {
    formSignup.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = qs("nome")?.value?.trim();
      const email = qs("email")?.value?.trim();
      const telefone = qs("telefone")?.value?.trim();
      const senha = qs("senha")?.value || "";
      const confirmar = qs("confirmar")?.value || "";
      const aceite = !!qs("aceite")?.checked;

      const nomeError = qs("nomeError");
      const emailError = qs("emailError");
      const senhaError = qs("senhaError");
      const confirmarError = qs("confirmarError");

      function clearErrors() {
        [nomeError, emailError, senhaError, confirmarError].forEach(el => {
          if (el) el.textContent = "";
        });

        ["nome", "email", "senha", "confirmar"].forEach(id => {
          clearFieldErrorClass(id);
        });
      }

      function setError(fieldId, element, message) {
        if (element) element.textContent = message;
        addFieldErrorClass(fieldId);
      }

      clearErrors();

      if (window.SignupValidation && typeof window.SignupValidation.validateSignupForm === "function") {
        const result = window.SignupValidation.validateSignupForm({
          nome,
          email,
          telefone,
          senha,
          confirmar,
          aceite,
          minPasswordLength: 6,
        });

        if (!result.ok) {
          if (result.field === "nome") setError("nome", nomeError, result.error);
          else if (result.field === "email") setError("email", emailError, result.error);
          else if (result.field === "senha") setError("senha", senhaError, result.error);
          else if (result.field === "confirmar") setError("confirmar", confirmarError, result.error);
          else setError("senha", senhaError, result.error);
          return;
        }
      } else {
        if (!nome) return setError("nome", nomeError, "Informe seu nome.");
        if (!email) return setError("email", emailError, "Informe seu e-mail.");
        if (!senha) return setError("senha", senhaError, "Informe sua senha.");
        if (senha.length < 6) return setError("senha", senhaError, "Sua senha deve ter no mínimo 6 caracteres.");
        if (senha !== confirmar) return setError("confirmar", confirmarError, "As senhas não conferem.");
        if (!aceite) return setError("senha", senhaError, "Você deve aceitar os termos.");
      }

      try {
        await window.apiRegister({ nome, email, telefone: telefone || null, senha });
        await doLogin(email, senha);
        window.location.href = getReturnUrl();
      } catch (err) {
        const msg = String(
          typeof err === "string"
            ? err
            : (err?.message || err?.detail || "Erro ao criar conta.")
        );

        const friendly =
          (msg.includes("not a valid email") || msg.includes("email address must have an @"))
            ? "E-mail inválido."
            : (msg.includes("already registered") || msg.includes("already exists"))
              ? "Este e-mail já está cadastrado. Tente entrar ou use outro e-mail."
              : msg;

        setError("email", emailError, friendly);
      }
    });
  }
})();
