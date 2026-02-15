// frontend/public/js/auth.js
const API_BASE = "http://127.0.0.1:8000";

/**
 * Faz fetch com cookie HttpOnly (credentials: "include")
 */
export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      ...(opts.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && data.detail
        ? data.detail
        : typeof data === "string"
          ? data
          : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return data;
}

/**
 * Retorna o usuário logado via cookie (ou null se não logado)
 */
export async function getCurrentUser() {
  try {
    return await apiFetch("/auth/me");
  } catch {
    return null;
  }
}

/**
 * Exige login de admin e retorna o usuário (ou redireciona)
 */
export async function requireAdmin() {
  const me = await getCurrentUser();

  if (!me) {
    // não logado -> manda pro login admin
    window.location.href = "./admin-login.html";
    return null;
  }

  if (me.role !== "admin") {
    alert("Acesso permitido apenas para administradores.");
    window.location.href = "./index.html";
    return null;
  }

  return me;
}
