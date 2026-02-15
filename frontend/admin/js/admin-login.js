// Login mock (sem backend). Depois você troca por chamada da API.
document.getElementById("formLogin").addEventListener("submit", (e)=>{
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const msg = document.getElementById("msg");

  msg.textContent = "";

  if(!email || !senha){
    msg.textContent = "Preencha e-mail e senha.";
    return;
  }

  // Exemplo: aceita qualquer login
  sessionStorage.setItem("vj_admin_logged", "1");
  window.location.href = "./dashboard.html";
});
