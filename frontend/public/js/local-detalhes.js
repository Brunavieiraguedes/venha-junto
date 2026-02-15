// frontend/public/js/local-detalhes.js
(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  function getId() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    return id ? Number(id) : null;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const e = el(id);
    if (e) e.textContent = text;
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "";
    }
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
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

  async function apiMe() {
    return apiFetch("/auth/me");
  }

  async function getPlace(id) {
    return apiFetch(`/public/places/${id}`);
  }

  async function upsertReview(placeId, payload) {
    return apiFetch(`/public/places/${placeId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function renderStars(container, value, onChange) {
    if (!container) return;
    container.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("button");
      s.type = "button";
      s.className = "vj-star";
      s.textContent = "★";
      s.setAttribute("data-on", i <= value ? "true" : "false");
      s.setAttribute("aria-label", `Nota ${i}`);
      s.addEventListener("click", () => onChange(i));
      container.appendChild(s);
    }
  }

  function chip(text) {
    const c = document.createElement("span");
    c.className = "vj-chip";
    c.textContent = text;
    return c;
  }

  function renderReviews(list) {
    const box = el("reviews");
    if (!box) return;

    box.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = `<div class="vj-muted">Ainda não há avaliações para este local.</div>`;
      return;
    }

    list.forEach((r) => {
      const card = document.createElement("div");
      card.className = "vj-review";

      // header: nome + data
      const head = document.createElement("div");
      head.className = "vj-review__head";

      const left = document.createElement("div");
      left.className = "vj-review__left";

      const name = document.createElement("strong");
      name.className = "vj-review__name";
      name.textContent = r.user_name ? String(r.user_name) : "Usuário";

      const starsLine = document.createElement("div");
      starsLine.className = "vj-review__stars";
      const rating = Math.max(0, Math.min(5, Number(r.rating || 0)));
      const filled = "★".repeat(rating);
      const empty = "☆".repeat(5 - rating);
      starsLine.textContent = `${filled}${empty} (${rating}/5)`;

      left.appendChild(name);
      left.appendChild(starsLine);

      const date = document.createElement("span");
      date.className = "vj-review__date";
      date.textContent = formatDate(r.created_at);

      head.appendChild(left);
      if (date.textContent) head.appendChild(date);

      // comentário
      const p = document.createElement("p");
      p.className = "vj-review__comment";
      p.textContent = r.comment ? String(r.comment) : "Sem comentário.";

      card.appendChild(head);
      card.appendChild(p);

      box.appendChild(card);
    });
  }

  function setRatingLine(place) {
    const rc = Number(place.reviews_count || 0);
    const ar =
      place.avg_rating === null || place.avg_rating === undefined
        ? null
        : Number(place.avg_rating);

    setText(
      "ratingLine",
      rc > 0 && ar
        ? `★ ${ar.toFixed(1)} • ${rc} avaliação(ões)`
        : "Sem avaliações"
    );
    setText("reviewsCount", `${rc} avaliação(ões)`);
  }

  async function main() {
    const placeId = getId();
    if (!placeId) {
      alert("ID do local inválido.");
      return;
    }

    // elementos
    const btnAvaliar = el("btnAvaliar");
    const reviewBox = el("reviewBox");
    const starsBox = el("stars");
    const btnCancel = el("btnCancel");
    const btnSend = el("btnSend");
    const msg = el("msg");
    const comment = el("comment");

    function setMsg(t) {
      if (!msg) return;
      msg.textContent = t || "";
    }

    let rating = 0;
    renderStars(starsBox, rating, (v) => {
      rating = v;
      renderStars(starsBox, rating, (nv) => {
        rating = nv;
      });
    });

    // carregar local
    let place;
    try {
      place = await getPlace(placeId);
    } catch (e) {
      alert(`Erro ao abrir detalhes: ${e.message}`);
      return;
    }

    // imagem
    const imgWrap = el("imgWrap");
    if (imgWrap) {
      imgWrap.innerHTML = "";
      if (place.cover_image) {
        const img = document.createElement("img");
        img.src = place.cover_image;
        img.alt = place.nome || "Local";
        imgWrap.appendChild(img);
      } else {
        const empty = document.createElement("div");
        empty.className = "vj-hero__imgEmpty";
        empty.textContent = "Sem imagem";
        imgWrap.appendChild(empty);
      }
    }

    setText("nome", place.nome || "Local");
    setText(
      "meta",
      `${place.tipo || ""} • ${place.cidade || ""}${
        place.bairro ? " • " + place.bairro : ""
      }`
    );

    const verifiedBadge = el("verifiedBadge");
    if (verifiedBadge) {
      verifiedBadge.style.display = place.verified ? "inline-flex" : "none";
    }
    setText("tipoBadge", place.tipo || "Tipo");

    setText(
      "address",
      `${place.endereco ? "Endereço: " + place.endereco : ""}${
        place.cep ? " • CEP: " + place.cep : ""
      }`.trim() || "Endereço não informado"
    );

    setText("descricao", place.descricao || "Sem descrição.");

    // features
    const feats = el("features");
    if (feats) {
      feats.innerHTML = "";
      const list = Array.isArray(place.features) ? place.features : [];
      if (list.length === 0) {
        feats.innerHTML = `<div class="vj-muted">Nenhum recurso cadastrado.</div>`;
      } else {
        list.forEach((f) => feats.appendChild(chip(f)));
      }
    }

    setRatingLine(place);
    renderReviews(place.reviews || []);

    // abrir caixa de avaliação
    if (btnAvaliar) {
      btnAvaliar.addEventListener("click", async () => {
        try {
          await apiMe();
        } catch {
          const returnUrl =
            window.location.pathname +
            window.location.search +
            window.location.hash;
          window.VJ_openAuthModal && window.VJ_openAuthModal(returnUrl);
          return;
        }

        if (reviewBox) reviewBox.hidden = false;
        setMsg("");
        rating = 0;
        renderStars(starsBox, rating, (v) => (rating = v));
        if (comment) comment.value = "";
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      });
    }

    btnCancel &&
      btnCancel.addEventListener("click", () => {
        if (reviewBox) reviewBox.hidden = true;
        setMsg("");
      });

    btnSend &&
      btnSend.addEventListener("click", async () => {
        setMsg("");

        if (!rating || rating < 1 || rating > 5) {
          setMsg("Selecione uma nota de 1 a 5.");
          return;
        }

        let me;
        try {
          me = await apiMe();
        } catch {
          const returnUrl =
            window.location.pathname +
            window.location.search +
            window.location.hash;
          window.VJ_openAuthModal && window.VJ_openAuthModal(returnUrl);
          return;
        }

        try {
          await upsertReview(placeId, {
            user_id: me.id,
            rating,
            comment: comment ? comment.value : null,
          });

          setMsg("✅ Avaliação publicada com sucesso!");

          const updated = await getPlace(placeId);
          setRatingLine(updated);
          renderReviews(updated.reviews || []);

          setTimeout(() => {
            if (reviewBox) reviewBox.hidden = true;
            setMsg("");
          }, 900);
        } catch (e) {
          setMsg(`Erro ao publicar: ${e.message}`);
          console.error(e);
        }
      });
  }

  main();
})();
// Voltar: respeita de onde veio (explorar/index/etc)
(function () {
  const btn = document.getElementById("btnVoltar");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "explorar") {
      window.location.href = "./explorar.html";
      return;
    }

    // fallback seguro (caso abra detalhes direto pela URL)
    window.location.href = "./explorar.html";
  });
})();
