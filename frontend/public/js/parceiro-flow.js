// js/parceiro-flow.js
(function () {
  const KEY_USER = "vj_partner_user";
  const KEY_STATUS = "vj_partner_status"; // "novo" | "em_analise" | "aprovado"

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(KEY_USER) || "null");
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(KEY_USER, JSON.stringify(user));
  }

  function getStatus() {
    return localStorage.getItem(KEY_STATUS) || "novo";
  }

  function setStatus(status) {
    localStorage.setItem(KEY_STATUS, status);
  }

  // Expondo utilitários (pra você usar em outras páginas se quiser)
  window.VJPartner = { getUser, setUser, getStatus, setStatus };
})();
