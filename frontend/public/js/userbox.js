(function () {
  function ensureAvatarElements() {
    const userBox = document.getElementById("userBox");
    if (!userBox) return null;

    const avatar = userBox.querySelector(".avatar");
    if (!avatar) return null;

    // cria <img> se não existir
    let img = avatar.querySelector("img#userAvatarImg");
    if (!img) {
      img = document.createElement("img");
      img.id = "userAvatarImg";
      img.alt = "Foto do usuário";
      img.decoding = "async";
      img.loading = "lazy";
      img.style.display = "none";
      avatar.appendChild(img);
    }

    // cria fallback <span> se não existir
    let fallback = avatar.querySelector("span#userAvatarFallback");
    if (!fallback) {
      // se já tinha texto tipo 👤, reaproveita
      const existingText = avatar.childNodes.length
        ? Array.from(avatar.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent)
            .join("")
            .trim()
        : "";

      fallback = document.createElement("span");
      fallback.id = "userAvatarFallback";
      fallback.textContent = existingText || "👤";
      avatar.appendChild(fallback);

      // limpa texto solto antigo (pra não duplicar)
      Array.from(avatar.childNodes).forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) n.textContent = "";
      });
    }

    return { img, fallback, avatar };
  }

  async function loadAvatarIntoUserBox() {
    const els = ensureAvatarElements();
    if (!els) return;

    const { img, fallback } = els;

    const url = "http://127.0.0.1:8000/users/me/avatar?t=" + Date.now();

    try {
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Sem avatar");

      img.src = url;
      img.style.display = "block";
      fallback.style.display = "none";
    } catch (e) {
      img.src = "";
      img.style.display = "none";
      fallback.style.display = "inline";
    }
  }

  async function updateUserBox() {
    const userBox = document.getElementById("userBox");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");

    if (!userBox || !userName || !userEmail) return;

    // garante estrutura do avatar em qualquer página
    ensureAvatarElements();

    try {
      const user = await window.apiMe();

      userName.textContent = user.nome || "Usuário";
      userEmail.textContent = user.email || "";

      await loadAvatarIntoUserBox();

      userBox.title = "Abrir perfil";
      userBox.onclick = () => {
        window.location.href = "./perfil.html";
      };
    } catch (e) {
      userName.textContent = "Visitante";
      userEmail.textContent = "visitante@venhajunto.com";

      const els = ensureAvatarElements();
      if (els) {
        els.img.src = "";
        els.img.style.display = "none";
        els.fallback.style.display = "inline";
      }

      userBox.title = "Fazer login";
      userBox.onclick = () => {
        window.location.href = "./usuario-login.html";
      };
    }
  }

  document.addEventListener("DOMContentLoaded", updateUserBox);
})();
