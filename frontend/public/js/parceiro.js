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

bindMobileMenu();
