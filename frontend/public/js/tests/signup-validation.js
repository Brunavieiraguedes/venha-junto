// ./js/tests/signup-validation.js
(function () {
  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function isSequentialDigits(s) {
    // Ex: 123456, 654321
    const digits = onlyDigits(s);
    if (digits.length < 5) return false;

    let asc = true;
    let desc = true;

    for (let i = 1; i < digits.length; i++) {
      const prev = digits.charCodeAt(i - 1);
      const curr = digits.charCodeAt(i);
      if (curr !== prev + 1) asc = false;
      if (curr !== prev - 1) desc = false;
    }
    return asc || desc;
  }

  function isSequentialLetters(s) {
    // Ex: abcdef, fedcba (ignora não-letras)
    const letters = String(s || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    if (letters.length < 5) return false;

    let asc = true;
    let desc = true;

    for (let i = 1; i < letters.length; i++) {
      const prev = letters.charCodeAt(i - 1);
      const curr = letters.charCodeAt(i);
      if (curr !== prev + 1) asc = false;
      if (curr !== prev - 1) desc = false;
    }
    return asc || desc;
  }

  function allSameChar(s) {
    const str = String(s || "");
    if (!str) return false;
    return str.split("").every((ch) => ch === str[0]);
  }

  function validateSignupForm({ nome, email, telefone, senha, confirmar, aceite, minPasswordLength = 6 }) {
    // Nome
    if (!nome || nome.trim().length < 3) {
      return { ok: false, field: "nome", error: "Nome inválido." };
    }

    // Email
    if (!email || !isEmail(email)) {
      return { ok: false, field: "email", error: "E-mail inválido." };
    }

    // Senha - mínimo
    const pass = String(senha || "");
    if (!pass || pass.length < Number(minPasswordLength || 6)) {
      return {
        ok: false,
        field: "senha",
        error: `A senha deve ter no mínimo ${Number(minPasswordLength || 6)} caracteres.`,
      };
    }

    // Senha fraca (regras)
    const lower = pass.toLowerCase().trim();
    const common = new Set([
      "123456", "1234567", "12345678", "123456789",
      "senha", "senha123", "password", "qwerty",
      "111111", "000000", "abcdef", "abc123",
      "iloveyou", "admin", "welcome"
    ]);

    if (common.has(lower)) {
      return { ok: false, field: "senha", error: "Senha muito fraca. Evite senhas comuns." };
    }

    if (allSameChar(pass)) {
      return { ok: false, field: "senha", error: "Senha muito fraca. Evite repetir o mesmo caractere." };
    }

    if (isSequentialDigits(pass) || isSequentialLetters(pass)) {
      return { ok: false, field: "senha", error: "Senha fraca. Evite sequências (ex: 123456 / abcdef)." };
    }

    // Pelo menos 1 letra e 1 número
    const hasLetter = /[A-Za-zÀ-ÿ]/.test(pass);
    const hasNumber = /\d/.test(pass);
    if (!hasLetter || !hasNumber) {
      return { ok: false, field: "senha", error: "Senha fraca. Use letras e números." };
    }

    // Confirmar
    if (String(confirmar || "") !== pass) {
      return { ok: false, field: "confirmar", error: "As senhas não conferem." };
    }

    // Aceite
    if (!aceite) {
      return { ok: false, field: "aceite", error: "Aceite obrigatório." };
    }

    return { ok: true };
  }

  window.SignupValidation = { validateSignupForm };
  console.log("SignupValidation carregado ✅");
})();
