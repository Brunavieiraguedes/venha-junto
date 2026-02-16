
const API_BASE =
  window.location.hostname === "http://127.0.0.1:8000" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"                  // DEV (local)
    : "https://venha-junto-h54n.onrender.com"; // PROD (Render)
/**
 * ✅ Converte qualquer tipo de erro em mensagem legível (string)
 * - suporta FastAPI: { detail: "..." } ou { detail: [...] } ou { detail: {..} }
 * - suporta { message: "..." }
 * - fallback para texto/JSON/string
 */
function extractErrorMessage(data, resStatus) {
  try {
    // 1) Se já veio string (ex: "erro qualquer")
    if (typeof data === "string" && data.trim()) return data.trim();

    // 2) Se veio objeto
    if (data && typeof data === "object") {
      // FastAPI comum: { detail: "..." }
      if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();

      // FastAPI validation: { detail: [ {msg: "..."} ] } ou array de strings
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0];

        if (typeof first === "string" && first.trim()) return first.trim();
        if (first && typeof first === "object") {
          if (typeof first.msg === "string" && first.msg.trim()) return first.msg.trim();
          // fallback: tenta juntar mensagens
          return JSON.stringify(data.detail);
        }
        return JSON.stringify(data.detail);
      }

      // Outros formatos comuns
      if (typeof data.message === "string" && data.message.trim()) return data.message.trim();

      // fallback: stringify no objeto inteiro
      return JSON.stringify(data);
    }

    // 3) Se veio null/undefined/qualquer outra coisa
    return `Erro ${resStatus}`;
  } catch (e) {
    return `Erro ${resStatus}`;
  }
}

/**
 * Request padrão:
 * - SEM localStorage
 * - SEM Bearer token
 * - COM cookies HTTPOnly (credentials: "include")
 */
async function request(path, { method = "GET", body = null } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
    credentials: "include", // ✅ cookies httpOnly para user/partner/admin
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = extractErrorMessage(data, res.status);
    throw new Error(msg);
  }

  return data;
}

/* =========================
   USER (cookie vj_access_token)
========================= */
window.apiRegister = (payload) =>
  request("/auth/register", { method: "POST", body: payload });

window.apiLogin = (payload) =>
  request("/auth/login", { method: "POST", body: payload });

window.apiMe = () =>
  request("/auth/me", { method: "GET" });

window.apiLogout = () =>
  request("/auth/logout", { method: "POST" });

window.apiUserMe = () =>
  request("/users/me", { method: "GET" });

window.apiUserUpdateMe = (payload) =>
  request("/users/me", { method: "PUT", body: payload });

/* =========================
   PARTNER AUTH (cookie vj_partner_token)
   ⚠️ IMPORTANTE:
   seu backend partner.py lê Cookie(vj_partner_token)
   então login do parceiro PRECISA setar esse cookie.
========================= */
window.apiPartnerRegister = (payload) =>
  request("/partner-auth/register", { method: "POST", body: payload });

window.apiPartnerLogin = (payload) =>
  request("/partner-auth/login", { method: "POST", body: payload });

window.apiPartnerMe = () =>
  request("/partner-auth/me", { method: "GET" });

window.apiPartnerUpdateMe = (payload) =>
  request("/partner-auth/me", { method: "PATCH", body: payload });

window.apiPartnerLogout = () =>
  request("/partner-auth/logout", { method: "POST" });

/* =========================
   PARTNER ROUTES (cookie vj_partner_token)
========================= */
window.apiPartnerCreatePlace = (payload) =>
  request("/partner/places", { method: "POST", body: payload });

window.apiPartnerSubmitPlace = (placeId) =>
  request(`/partner/places/${placeId}/submit`, { method: "POST" });

window.apiPartnerGetPlace = (placeId) =>
  request(`/partner/places/${placeId}`, { method: "GET" });

/* =========================
   ADMIN (cookie vj_access_token com role=admin)
========================= */
window.apiAdminPing = () =>
  request("/admin/ping", { method: "GET" });

window.apiAdminListPlaces = (status = "PENDING_REVIEW") =>
  request(`/admin/places?status=${encodeURIComponent(status)}`, { method: "GET" });

window.apiAdminApprovePlace = (placeId) =>
  request(`/admin/places/${placeId}/approve`, { method: "POST" });

window.apiAdminRejectPlace = (placeId) =>
  request(`/admin/places/${placeId}/reject`, { method: "POST" });

/* =========================
   PUBLIC (sem login)
========================= */
window.apiPublicPlaces = ({ cidade = null, tipo = null, verified_first = true } = {}) => {
  const qs = new URLSearchParams();
  if (cidade) qs.set("cidade", cidade);
  if (tipo && tipo !== "Todos") qs.set("tipo", tipo);
  qs.set("verified_first", String(verified_first));
  return request(`/public/places?${qs.toString()}`, { method: "GET" });
};

window.apiPublicPlaceDetails = (placeId) =>
  request(`/public/places/${placeId}`, { method: "GET" });
