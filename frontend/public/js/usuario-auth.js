function qs(id){ return document.getElementById(id); }

function showError(msg){
  const el = qs("msgErro");
  if(!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function clearError(){
  const el = qs("msgErro");
  if(!el) return;
  el.style.display = "none";
  el.textContent = "";
}

function isEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function goNextDefault(){
  // depois de login/criar conta, manda pra Home
  window.location.href = "./index.html";
}

/* =========================
   ✅ Validação de senha fraca
========================= */

// lista curta de senhas MUITO comuns (você pode adicionar mais)
const COMMON_PASSWORDS = new Set([
  "123456","1234567","12345678","123456789","1234567890",
  "senha","senha123","senha1234","senha2024","senha2025",
  "qwerty","qwerty123","asdfgh","asdfgh123",
  "admin","admin123","admin1234",
  "iloveyou","welcome","password","password123",
  "000000","111111","222222","333333","444444","555555",
  "666666","777777","888888","999999"
]);

function onlyDigits(str){
  return /^[0-9]+$/.test(str);
}

function onlyLetters(str){
  return /^[A-Za-z]+$/.test(str);
}

function hasLetterAndNumber(str){
  return /[A-Za-z]/.test(str) && /[0-9]/.test(str);
}

function allSameChar(str){
  if(!str) return false;
  return str.split("").every(ch => ch === str[0]);
}

function isSequentialDigits(str){
  // detecta sequências simples tipo 12345678 ou 87654321
  if(!onlyDigits(str) || str.length < 6) return false;

  let asc = true, desc = true;
  for(let i=1;i<str.length;i++){
    const prev = str.charCodeAt(i-1);
    const cur  = str.charCodeAt(i);
    if(cur !== prev + 1) asc = false;
    if(cur !== prev - 1) desc = false;
  }
  return asc || desc;
}

function validatePasswordStrength(pw, { minLen = 8 } = {}){
  const s = String(pw || "");

  if(s.length < minLen){
    return { ok:false, msg:`A senha deve ter pelo menos ${minLen} caracteres.` };
  }

  const normalized = s.trim().toLowerCase();

  // muito comum
  if(COMMON_PASSWORDS.has(normalized)){
    return { ok:false, msg:"Senha muito fraca. Evite senhas comuns (ex: 123456, senha123)." };
  }

  // só números ou só letras
  if(onlyDigits(s)){
    return { ok:false, msg:"Senha fraca. Use letras e números." };
  }
  if(onlyLetters(s)){
    return { ok:false, msg:"Senha fraca. Use letras e números." };
  }

  // precisa ter letra + número
  if(!hasLetterAndNumber(s)){
    return { ok:false, msg:"Senha fraca. Use pelo menos uma letra e um número." };
  }

  // repetição tipo aaaaaaaa ou 11111111
  if(allSameChar(s)){
    return { ok:false, msg:"Senha muito fraca. Evite repetir o mesmo caractere." };
  }

  // sequências numéricas
  if(isSequentialDigits(s)){
    return { ok:false, msg:"Senha fraca. Evite sequências como 12345678." };
  }

  return { ok:true };
}

function handleSignup(){
  const form = qs("formSignup");
  if(!form) return;

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearError();

    const nome = (qs("nome")?.value || "").trim();
    const telefone = (qs("telefone")?.value || "").trim();
    const email = (qs("email")?.value || "").trim().toLowerCase();
    const senha = qs("senha")?.value || "";
    const confirmar = qs("confirmar")?.value || "";
    const aceite = qs("aceite")?.checked;

    if(!nome) return showError("Informe seu nome completo.");
    if(!isEmail(email)) return showError("Informe um e-mail válido.");

    // ✅ aqui entra o teste de força
    const pwCheck = validatePasswordStrength(senha, { minLen: 8 });
    if(!pwCheck.ok) return showError(pwCheck.msg);

    if(senha !== confirmar) return showError("As senhas não conferem.");
    if(!aceite) return showError("Você precisa aceitar os Termos e a Política de Privacidade.");

    try {
      await window.apiRegister({ nome, email, telefone, senha });
      await window.apiLogin({ email, senha }); // backend já seta cookie
      goNextDefault();
    } catch (err) {
      showError(err?.message || "Erro ao criar conta.");
    }
  });
}

function handleLogin(){
  const form = qs("formLogin");
  if(!form) return;

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearError();

    const email = (qs("email")?.value || "").trim().toLowerCase();
    const senha = qs("senha")?.value || "";

    if(!isEmail(email)) return showError("Informe um e-mail válido.");
    if(!senha) return showError("Informe sua senha.");

    try {
      await window.apiLogin({ email, senha }); // backend já seta cookie
      goNextDefault();
    } catch (err) {
      showError(err?.message || "E-mail ou senha inválidos.");
    }
  });
}

handleSignup();
handleLogin();
