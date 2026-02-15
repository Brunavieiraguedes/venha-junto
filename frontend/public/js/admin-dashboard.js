// frontend/public/js/admin-dashboard.js
import { apiFetch, requireAdmin } from "./auth.js";

(function () {
  const listEl = document.getElementById("list");
  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("searchInput");
  const btnReload = document.getElementById("btnReload");
  const toastEl = document.getElementById("toast");

  const adminNomeEl = document.getElementById("adminNome");
  const adminEmailEl = document.getElementById("adminEmail");

  // ---------------------------
  // Toast
  // ---------------------------
  let toastTimer = null;
  function toast(msg, type = "info") {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = msg;

    if (type === "error") toastEl.style.background = "#b91c1c";
    else toastEl.style.background = "#111827";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2500);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // API (cookie HttpOnly)
  // ---------------------------
  async function apiAdminPing() {
    return apiFetch("/admin/ping");
  }

  async function apiListPlaces(status) {
    return apiFetch(`/admin/places?status=${encodeURIComponent(status)}`);
  }

  async function apiApprove(placeId) {
    return apiFetch(`/admin/places/${placeId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  async function apiReject(placeId) {
    return apiFetch(`/admin/places/${placeId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  // ---------------------------
  // UI rendering
  // ---------------------------
  function makeCard(p) {
    const id = p.id;
    const nome = escapeHtml(p.nome || "(sem nome)");
    const tipo = escapeHtml(p.tipo || "-");
    const cidade = escapeHtml(p.cidade || "-");
    const bairro = escapeHtml(p.bairro || "-");
    const status = escapeHtml(p.status || "-");
    const verified = String(!!p.verified);

    const createdAt = p.created_at ? escapeHtml(String(p.created_at)) : "-";
    const verifiedAt = p.verified_at ? escapeHtml(String(p.verified_at)) : "-";

    const canApprove = p.status === "PENDING_REVIEW";
    const canReject = p.status === "PENDING_REVIEW";

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="row">
        <div>
          <div style="font-size:16px;"><strong>#${id}</strong> • <strong>${nome}</strong></div>
          <div class="small">${tipo}</div>
        </div>

        <div class="actions">
          <button class="primary" type="button" data-act="approve" ${canApprove ? "" : "disabled"}>Aprovar</button>
          <button class="danger" type="button" data-act="reject" ${canReject ? "" : "disabled"}>Reprovar</button>
        </div>
      </div>

      <div class="meta" style="margin-top:12px;">
        <span>Cidade: <strong>${cidade}</strong></span>
        <span>Bairro: <strong>${bairro}</strong></span>
        <span>Status: <strong>${status}</strong></span>
        <span>Verified: <strong>${verified}</strong></span>
      </div>

      <div class="small" style="margin-top:10px;">
        Criado em: ${createdAt} • Verificado em: ${verifiedAt}
      </div>
    `;

    const btnApprove = div.querySelector('[data-act="approve"]');
    const btnReject = div.querySelector('[data-act="reject"]');

    if (btnApprove) {
      btnApprove.addEventListener("click", async () => {
        try {
          btnApprove.disabled = true;
          toast(`Aprovando #${id}...`);
          await apiApprove(id);
          toast(`✅ Aprovado #${id}`, "success");
          await load();
        } catch (e) {
          toast(`❌ ${e.message}`, "error");
          btnApprove.disabled = false;
        }
      });
    }

    if (btnReject) {
      btnReject.addEventListener("click", async () => {
        try {
          btnReject.disabled = true;
          toast(`Reprovando #${id}...`);
          await apiReject(id);
          toast(`✅ Reprovado #${id}`, "success");
          await load();
        } catch (e) {
          toast(`❌ ${e.message}`, "error");
          btnReject.disabled = false;
        }
      });
    }

    return div;
  }

  function renderEmpty(text) {
    listEl.innerHTML = `<div class="empty">${escapeHtml(text)}</div>`;
  }

  function applySearchFilter(items) {
    const term = (searchInput?.value || "").trim().toLowerCase();
    if (!term) return items;

    return items.filter((p) => {
      const nome = String(p.nome || "").toLowerCase();
      const cidade = String(p.cidade || "").toLowerCase();
      const bairro = String(p.bairro || "").toLowerCase();
      return nome.includes(term) || cidade.includes(term) || bairro.includes(term);
    });
  }

  // ---------------------------
  // Main load
  // ---------------------------
  async function load() {
    if (!listEl) return;

    btnReload && (btnReload.disabled = true);
    renderEmpty("Carregando...");

    try {
      // ✅ 0) exige admin e já devolve nome/email
      const admin = await requireAdmin();
      if (!admin) return;

      if (adminNomeEl) adminNomeEl.textContent = admin.nome || "Admin";
      if (adminEmailEl) adminEmailEl.textContent = admin.email || "-";

      // ✅ 1) ping admin
      await apiAdminPing();

      // ✅ 2) lista por status
      const status = statusFilter?.value || "PENDING_REVIEW";
      const items = await apiListPlaces(status);

      // ✅ 3) aplica busca
      const filtered = applySearchFilter(items);

      if (!filtered || filtered.length === 0) {
        renderEmpty("Nenhum estabelecimento encontrado para esse filtro.");
        btnReload && (btnReload.disabled = false);
        return;
      }

      // ✅ 4) renderiza
      listEl.innerHTML = "";
      filtered.forEach((p) => listEl.appendChild(makeCard(p)));

      btnReload && (btnReload.disabled = false);
    } catch (e) {
      btnReload && (btnReload.disabled = false);

      renderEmpty(
        `Erro: ${e.message}\n\nDica: confirme se seu usuário tem role=admin e faça login novamente.`
      );
      toast(`❌ ${e.message}`, "error");
    }
  }

  // ---------------------------
  // Events
  // ---------------------------
  btnReload && btnReload.addEventListener("click", load);
  statusFilter && statusFilter.addEventListener("change", load);
  searchInput && searchInput.addEventListener("input", load);

  // start
  load();
})();
