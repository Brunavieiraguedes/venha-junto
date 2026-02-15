import { locaisMock, getFavoritos, setFavoritos, escapeHtml } from "./shared.js";

function qs(id){ return document.getElementById(id); }

function bindMobileMenu(){
  const btn = document.getElementById("btnMenu");
  const sidebar = document.getElementById("sidebar");
  if(!btn || !sidebar) return;

  btn.addEventListener("click", ()=>{
    const open = sidebar.getAttribute("data-open")==="true";
    sidebar.setAttribute("data-open", String(!open));
    btn.setAttribute("aria-expanded", String(!open));
  });
}

function getIdFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function main(){
  bindMobileMenu();

  const id = getIdFromUrl();
  const local = locaisMock.find(x => x.id === id) || locaisMock[0];

  qs("titulo").textContent = local ? local.nome : "Detalhes";
  qs("sub").textContent = `${local.tipo} • ${local.bairro}, ${local.cidade} • Nota ${Number(local.nota||0).toFixed(1)}`;

  const box = qs("conteudoDetalhes");
  box.innerHTML = `
    <p style="margin:0; color:var(--muted); font-weight:700">${escapeHtml(local.descricao || "")}</p>
    <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap">
      ${local.acessivel ? `<span class="badge badge--ok">♿ Acessível</span>` : `<span class="badge">Acessibilidade: não informada</span>`}
      ${local.verificado ? `<span class="badge badge--ver">✔ Verificado</span>` : `<span class="badge">Não verificado</span>`}
      <span class="badge">⭐ ${Number(local.nota || 0).toFixed(1)}</span>
    </div>
    ${local.recursos?.length ? `
      <h4 style="margin:14px 0 8px">Recursos de acessibilidade</h4>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        ${local.recursos.map(r=>`<span class="badge badge--ok">${escapeHtml(r)}</span>`).join("")}
      </div>
    ` : ``}
  `;

  const btnFav = qs("btnFav");
  const fav = new Set(getFavoritos());
  const updateBtn = () => btnFav.textContent = fav.has(local.id) ? "✅ Remover dos Favoritos" : "⭐ Favoritar";
  updateBtn();

  btnFav.addEventListener("click", ()=>{
    if(fav.has(local.id)) fav.delete(local.id);
    else fav.add(local.id);
    setFavoritos(Array.from(fav));
    updateBtn();
  });
}
main();
