(function(){
  if(sessionStorage.getItem("vj_admin_logged") !== "1"){
    window.location.href = "./login.html";
  }
})();

const lista = [];
const elLista = document.getElementById("lista");
const msg = document.getElementById("msg");

function render(){
  elLista.innerHTML = "";
  if(lista.length === 0){
    const p = document.createElement("p");
    p.style.color = "var(--muted)";
    p.style.fontWeight = "800";
    p.textContent = "Nenhum estabelecimento cadastrado ainda.";
    elLista.appendChild(p);
    return;
  }

  lista.forEach((l, idx)=>{
    const card = document.createElement("div");
    card.className = "admin-card";
    card.style.boxShadow = "none";
    card.style.border = "1px solid var(--line)";
    card.innerHTML = `
      <strong>${l.nome}</strong>
      <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap">
        <span class="badge">${l.tipo}</span>
        <span class="badge">📍 ${l.bairro}, ${l.cidade}</span>
        ${l.acessivel ? `<span class="badge badge--ok">♿ Acessível</span>` : ``}
        ${l.verificado ? `<span class="badge badge--ver">✔ Verificado</span>` : ``}
      </div>
      <div style="margin-top:10px; display:flex; gap:10px">
        <button class="btn btn--ghost" type="button" data-del="${idx}">Excluir</button>
      </div>
    `;
    elLista.appendChild(card);
  });

  elLista.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const i = Number(btn.getAttribute("data-del"));
      lista.splice(i,1);
      render();
    });
  });
}

document.getElementById("formLocal").addEventListener("submit", (e)=>{
  e.preventDefault();
  const l = {
    nome: document.getElementById("nome").value.trim(),
    tipo: document.getElementById("tipo").value,
    cidade: document.getElementById("cidade").value.trim(),
    bairro: document.getElementById("bairro").value.trim() || "—",
    acessivel: document.getElementById("acessivel").checked,
    verificado: document.getElementById("verificado").checked
  };
  lista.push(l);
  msg.textContent = "Salvo! (mock)";
  e.target.reset();
  document.getElementById("cidade").value = "São Paulo";
  render();
});
render();
