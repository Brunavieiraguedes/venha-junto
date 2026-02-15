(function () {
  const form = document.getElementById("formCriarConta");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome")?.value?.trim() || "";
    const email = (document.getElementById("email")?.value || "").trim().toLowerCase();
    const telefone = document.getElementById("telefone")?.value?.trim() || "";
    const senha = document.getElementById("senha")?.value || "";
    const confirmar = document.getElementById("confirmarSenha")?.value || "";
    const aceite = document.getElementById("aceite")?.checked;

    if (!nome) return alert("Informe seu nome completo.");
    if (!email || !email.includes("@")) return alert("Digite um e-mail válido.");
    if (!telefone) return alert("Informe seu telefone.");
    if (senha.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
    if (senha !== confirmar) return alert("As senhas não coincidem.");
    if (!aceite) return alert("Você precisa aceitar os Termos e a Política de Privacidade.");

    try {
      // ✅ cria usuário parceiro + partner_profile no backend
      await window.apiPartnerRegister({
        nome,
        email,
        telefone,
        senha
      });

      // ✅ fluxo correto: vai para login do parceiro
      window.location.href = "./parceiro-login.html";
    } catch (err) {
      alert(err?.message || "Erro ao criar conta de parceiro.");
    }
  });
})();
