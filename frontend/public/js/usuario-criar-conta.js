(function () {
  const form = document.getElementById("formCriarConta");
  const msg = document.getElementById("vjMsg");

  function showMessage(text, type = "info") {
    if (!msg) return;
    msg.style.display = "block";
    msg.textContent = text;

    if (type === "error") {
      msg.style.background = "rgba(239,68,68,0.08)";
      msg.style.borderColor = "rgba(239,68,68,0.25)";
      msg.style.color = "#991b1b";
    } else if (type === "success") {
      msg.style.background = "rgba(34,197,94,0.10)";
      msg.style.borderColor = "rgba(34,197,94,0.25)";
      msg.style.color = "#14532d";
    } else {
      msg.style.background = "rgba(2,6,23,0.03)";
      msg.style.borderColor = "rgba(15,23,42,0.12)";
      msg.style.color = "#0f172a";
    }
  }

  function getReturnUrl() {
    // volta para Home se não tiver returnUrl
    return "./index.html";
  }

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmarSenha").value;
    const aceite = document.getElementById("aceite").checked;

    if (!nome) return showMessage("Informe seu nome completo.", "error");
    if (!email) return showMessage("Informe seu e-mail.", "error");
    if (senha.length < 6)
      return showMessage("A senha precisa ter pelo menos 6 caracteres.", "error");
    if (senha !== confirmar)
      return showMessage("As senhas não conferem. Verifique e tente novamente.", "error");
    if (!aceite)
      return showMessage("Você precisa aceitar os Termos e a Política de Privacidade.", "error");

    try {
      // chama backend para registrar
      await window.apiRegister({ nome, email, telefone, senha });
      // login automático após cadastro
      await window.apiLogin({ email, senha });

      showMessage("Conta criada com sucesso! Redirecionando…", "success");

      setTimeout(() => {
        window.location.href = getReturnUrl();
      }, 650);
    } catch (err) {
      showMessage(err.message || "Erro ao criar conta.", "error");
    }
  });
})();
