function qs(id){ return document.getElementById(id); }

// ============================
// Sidebar (mobile)
// ============================
function openCloseSidebar(){
  const sidebar = qs("sidebar");
  const btn = qs("btnMenu");
  if(!sidebar || !btn) return;

  const open = sidebar.getAttribute("data-open") === "true";
  const next = !open;

  sidebar.setAttribute("data-open", String(next));
  btn.setAttribute("aria-expanded", String(next));
}

function bindMobileMenu(){
  const btn = qs("btnMenu");
  if(!btn) return;

  btn.addEventListener("click", openCloseSidebar);

  document.addEventListener("click", (e) => {
    const sidebar = qs("sidebar");
    if(!sidebar) return;

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    if(!isMobile) return;

    const open = sidebar.getAttribute("data-open") === "true";
    if(!open) return;

    const clickedInside = sidebar.contains(e.target) || btn.contains(e.target);
    if(!clickedInside){
      sidebar.setAttribute("data-open", "false");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

// ============================
// UI fill
// ============================
function fillUI(user){
  const email = user?.email || "";

  // Sidebar email
  const userEmail = qs("userEmail");
  if(userEmail) userEmail.textContent = email;

  // Card lateral
  const sideEmail = qs("sideEmail");
  const sideNome = qs("sideNome");
  if(sideEmail) sideEmail.textContent = email;
  if(sideNome) sideNome.textContent = user?.nome?.trim() ? user.nome.trim() : "Usuário";

  // Form
  const emailInput = qs("email");
  const nomeInput = qs("nome");
  const telInput  = qs("telefone");

  if(emailInput) emailInput.value = email;
  if(nomeInput)  nomeInput.value = user?.nome || "";
  if(telInput)   telInput.value = user?.telefone || "";
}

function collectForm(){
  return {
    nome: (qs("nome")?.value || "").trim(),
    telefone: (qs("telefone")?.value || "").trim()
  };
}

function setSavedFeedback(){
  const btn1 = qs("btnSalvar");
  const btn2 = qs("btnSalvarTopo");
  if(!btn1 || !btn2) return;

  const old1 = btn1.textContent;
  const old2 = btn2.textContent;

  btn1.textContent = "✅ Salvo!";
  btn2.textContent = "✅ Salvo!";

  setTimeout(()=>{
    btn1.textContent = old1;
    btn2.textContent = old2;
  }, 1200);
}

// ============================
// API load / save
// ============================
async function loadProfile(){
  try{
    const user = await window.apiUserMe();
    fillUI(user);
    return user;
  }catch(err){
    window.location.href = "./usuario-login.html?returnUrl=./perfil.html";
    return null;
  }
}

function bindActions(){
  async function onSave(){
    const data = collectForm();
    try{
      const updated = await window.apiUserUpdateMe(data);
      fillUI(updated);
      setSavedFeedback();
    }catch(err){
      alert(err?.message || "Erro ao salvar.");
    }
  }

  const btnSalvar = qs("btnSalvar");
  const btnSalvarTopo = qs("btnSalvarTopo");
  const btnSair = qs("btnSair");

  if(btnSalvar) btnSalvar.addEventListener("click", onSave);
  if(btnSalvarTopo) btnSalvarTopo.addEventListener("click", onSave);

  if(btnSair){
    btnSair.addEventListener("click", async () => {
      try{ await window.apiLogout(); } catch(e){}
      window.location.href = "./index.html";
    });
  }
}

// ============================
// Main
// ============================
async function main(){
  bindMobileMenu();
  await loadProfile();
  bindActions();
}

document.addEventListener("DOMContentLoaded", main);
