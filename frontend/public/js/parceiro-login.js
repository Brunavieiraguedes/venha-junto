(function () {
  const form = document.getElementById("formLogin");
  const emailEl = document.getElementById("email");
  const senhaEl = document.getElementById("senha");
  const toggleBtn = document.getElementById("togglePwd");

  const API_BASE = "http://127.0.0.1:8000";

  // 👁️ Mostrar / esconder senha
  if (toggleBtn && senhaEl) {
    toggleBtn.addEventListener("click", () => {
      senhaEl.type = senhaEl.type === "password" ? "text" : "password";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (emailEl?.value || "").trim().toLowerCase();
    const senha = senhaEl?.value || "";

    if (!email || !email.includes("@")) {
      alert("Digite um e-mail válido.");
      return;
    }

    if (!senha) {
      alert("Digite sua senha.");
      return;
    }

    try {
      // ============================
      // LOGIN DO PARCEIRO (COOKIE)
      // ============================
      const res = await fetch(`${API_BASE}/partner-auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ ESSENCIAL (cookie HTTPOnly)
        body: JSON.stringify({ email, senha }),
      });

      if (!res.ok) {
        throw new Error("E-mail ou senha inválidos.");
      }

      // ============================
      // CONFERE SE ESTÁ LOGADO
      // ============================
      const meRes = await fetch(`${API_BASE}/partner-auth/me`, {
        credentials: "include",
      });

      if (meRes.status === 401) {
        throw new Error("Falha ao autenticar parceiro.");
      }

      // ============================
      // REDIRECIONA
      // ============================
      window.location.href = "./parceiro-pos-cadastro.html";
      // se quiser ir direto para o cadastro do estabelecimento:
      // window.location.href = "./parceiro-cadastro-estabelecimento.html";

    } catch (err) {
      console.error(err);
      alert(err?.message || "Erro ao entrar como parceiro.");
    }
  });
})();
