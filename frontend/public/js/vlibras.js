(function () {
  if (document.querySelector("[vw]")) return; // evita duplicar

  const root = document.createElement("div");
  root.setAttribute("vw", "");
  root.className = "enabled";
  root.innerHTML = `
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  `;
  document.body.appendChild(root);

  const s = document.createElement("script");
  s.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
  s.onload = () => new window.VLibras.Widget("https://vlibras.gov.br/app");
  document.body.appendChild(s);
})();
