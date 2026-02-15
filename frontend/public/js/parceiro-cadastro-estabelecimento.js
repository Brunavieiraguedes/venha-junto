(function () {
  const API_BASE = window.VJ_API_BASE || "http://127.0.0.1:8000";

  // DOM
  const steps = Array.from(document.querySelectorAll(".step"));
  const lines = Array.from(document.querySelectorAll(".line"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  const cardTitle = document.getElementById("cardTitle");
  const cardSubtitle = document.getElementById("cardSubtitle");

  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");
  const form = document.getElementById("formCadastro");

  const partnerEmailEl = document.getElementById("partnerEmail");
  const statusPill = document.getElementById("statusPill");

  // Fields
  const nome = document.getElementById("nome");
  const tipo = document.getElementById("tipo");
  const descricao = document.getElementById("descricao");
  const endereco = document.getElementById("endereco");
  const bairro = document.getElementById("bairro");
  const cep = document.getElementById("cep");
  const cidade = document.getElementById("cidade");
  const lat = document.getElementById("lat");
  const lng = document.getElementById("lng");

  const cnpj = document.getElementById("cnpj");
  const responsavel = document.getElementById("responsavel");
  const telefone = document.getElementById("telefone");
  const emailContato = document.getElementById("emailContato");

  // Upload
  const fotos = document.getElementById("fotos");
  const doc = document.getElementById("doc");

  const btnBuscarEndereco = document.getElementById("btnBuscarEndereco");
  const btnMinhaLocalizacao = document.getElementById("btnMinhaLocalizacao");

  function toast(msg) {
    alert(msg);
  }

  function currentReturnUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function goLogin() {
    window.location.href =
      "./parceiro-login.html?returnUrl=" + encodeURIComponent(currentReturnUrl());
  }

  // ---------- FETCH HELPERS ----------
  async function apiFetchJson(path, options = {}) {
    const url = API_BASE + path;

    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    const resp = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (resp.status === 401) {
      goLogin();
      throw new Error("Não autenticado");
    }

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await resp.json().catch(() => ({}))
      : await resp.text().catch(() => "");

    if (!resp.ok) {
      const msg =
        (data && data.detail && (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))) ||
        (data && typeof data === "object" ? JSON.stringify(data) : String(data)) ||
        `Erro HTTP ${resp.status}`;
      throw new Error(msg);
    }

    return data;
  }

  async function apiFetchForm(path, formData, options = {}) {
    const url = API_BASE + path;

    // ⚠️ NÃO setar Content-Type aqui. O browser coloca o boundary certo.
    const resp = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      ...options,
    });

    if (resp.status === 401) {
      goLogin();
      throw new Error("Não autenticado");
    }

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await resp.json().catch(() => ({}))
      : await resp.text().catch(() => "");

    if (!resp.ok) {
      const msg =
        (data && data.detail && (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))) ||
        (data && typeof data === "object" ? JSON.stringify(data) : String(data)) ||
        `Erro HTTP ${resp.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // ---------- STEP CONTROL ----------
  let step = 1;

  const stepMeta = {
    1: { title: "Informações Básicas", sub: "Conte-nos sobre seu estabelecimento" },
    2: { title: "Documentação", sub: "Dados para validação" },
    3: { title: "Fotos & Acessibilidade", sub: "Recursos e evidências" },
  };

  function setStep(n) {
    step = n;

    panels.forEach((p) => {
      const id = Number(p.getAttribute("data-panel"));
      p.classList.toggle("active", id === step);
    });

    steps.forEach((s) => {
      const id = Number(s.getAttribute("data-step"));
      s.classList.toggle("active", id === step);
      s.classList.toggle("done", id < step);
    });

    lines.forEach((ln, idx) => {
      ln.classList.toggle("done", idx + 1 < step);
    });

    if (cardTitle) cardTitle.textContent = stepMeta[step].title;
    if (cardSubtitle) cardSubtitle.textContent = stepMeta[step].sub;

    if (statusPill) statusPill.textContent = step === 3 ? "Finalizando" : "Em cadastro";

    btnVoltar.disabled = step === 1;
    btnProximo.textContent = step === 3 ? "Enviar para análise" : "Próximo";
  }

  // ---------- MASKS ----------
  function onlyDigits(v) {
    return (v || "").replace(/\D/g, "");
  }
  function maskPhone(v) {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  function maskCEP(v) {
    const d = onlyDigits(v).slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }
  function maskCNPJ(v) {
    const d = onlyDigits(v).slice(0, 14);
    let out = d;
    if (d.length > 2) out = d.slice(0, 2) + "." + d.slice(2);
    if (d.length > 5) out = out.slice(0, 6) + "." + out.slice(6);
    if (d.length > 8) out = out.slice(0, 10) + "/" + out.slice(10);
    if (d.length > 12) out = out.slice(0, 15) + "-" + out.slice(15);
    return out;
  }

  if (cep) cep.addEventListener("input", () => (cep.value = maskCEP(cep.value)));
  if (telefone) telefone.addEventListener("input", () => (telefone.value = maskPhone(telefone.value)));
  if (cnpj) cnpj.addEventListener("input", () => (cnpj.value = maskCNPJ(cnpj.value)));

  function anyAccChecked() {
    return Array.from(document.querySelectorAll('input[name="acc"]:checked')).length > 0;
  }

  // ---------- VALIDATIONS ----------
  function validateStep1() {
    if (!nome.value.trim()) return toast("Informe o nome do estabelecimento."), false;
    if (!tipo.value.trim()) return toast("Selecione o tipo do estabelecimento."), false;

    const desc = descricao.value.trim();
    if (!desc || desc.length < 100) return toast("A descrição deve ter no mínimo 100 caracteres."), false;

    if (!endereco.value.trim()) return toast("Informe o endereço completo."), false;
    if (!bairro.value.trim()) return toast("Informe o bairro."), false;
    if (onlyDigits(cep.value).length !== 8) return toast("Informe um CEP válido (8 dígitos)."), false;
    if (!cidade.value.trim()) return toast("Selecione a cidade."), false;
    if (!lat.value || !lng.value) return toast("Defina a localização no mapa (lat/lng)."), false;

    return true;
  }

  function validateStep2() {
    const cnpjDigits = onlyDigits(cnpj.value);
    if (cnpj.value.trim() && cnpjDigits.length !== 14) return toast("CNPJ inválido (14 dígitos)."), false;

    if (!responsavel.value.trim()) return toast("Informe o responsável."), false;
    if (onlyDigits(telefone.value).length < 10) return toast("Informe um telefone válido."), false;

    const em = emailContato.value.trim();
    if (!em || !em.includes("@")) return toast("Informe um e-mail de contato válido."), false;

    return true;
  }

  function validateSelectedFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return "Selecione pelo menos 1 foto do local.";

    const MAX_MB = 6; // ajuste se quiser
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    for (const f of files) {
      if (!allowed.includes(f.type)) return "Formato inválido. Use JPG, PNG ou WEBP.";
      if (f.size > MAX_MB * 1024 * 1024) return `A imagem "${f.name}" é grande demais (máx ${MAX_MB}MB).`;
    }
    return null;
  }

  function validateStep3() {
    if (!anyAccChecked()) return toast("Selecione ao menos 1 recurso de acessibilidade."), false;

    const err = validateSelectedFiles(fotos?.files);
    if (err) return toast(err), false;

    return true;
  }

  // ---------- MAP (Leaflet) ----------
  let map, marker;

  function setLatLng(a, b) {
    lat.value = String(a);
    lng.value = String(b);
  }

  function initMap() {
    const startLat = -23.5617;
    const startLng = -46.6560;

    map = L.map("map").setView([startLat, startLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

    setLatLng(startLat, startLng);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setLatLng(pos.lat.toFixed(6), pos.lng.toFixed(6));
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      setLatLng(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    });
  }

  async function geocodeEndereco(query) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(query);

    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  }

  if (btnBuscarEndereco) {
    btnBuscarEndereco.addEventListener("click", async () => {
      const q = `${endereco.value} ${bairro.value} ${cidade.value} ${cep.value}`.trim();
      if (!q || q.length < 6) return toast("Preencha endereço/bairro/cidade/CEP antes de buscar.");

      try {
        const pos = await geocodeEndereco(q);
        if (!pos) return toast("Não encontrei esse endereço. Ajuste e tente novamente.");

        map.setView([pos.lat, pos.lng], 16);
        marker.setLatLng([pos.lat, pos.lng]);
        setLatLng(pos.lat.toFixed(6), pos.lng.toFixed(6));
      } catch {
        toast("Falha ao buscar endereço.");
      }
    });
  }

  if (btnMinhaLocalizacao) {
    btnMinhaLocalizacao.addEventListener("click", () => {
      if (!navigator.geolocation) return toast("Seu navegador não suporta geolocalização.");

      navigator.geolocation.getCurrentPosition(
        (p) => {
          const a = p.coords.latitude;
          const b = p.coords.longitude;
          map.setView([a, b], 16);
          marker.setLatLng([a, b]);
          setLatLng(a.toFixed(6), b.toFixed(6));
        },
        () => toast("Não foi possível obter sua localização."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ---------- BACKEND PAYLOAD ----------
  function buildPayload() {
    const features = Array.from(document.querySelectorAll('input[name="acc"]:checked')).map(
      (i) => i.value
    );

    return {
      nome: nome.value.trim(),
      tipo: tipo.value.trim(),
      cidade: cidade.value.trim(),
      bairro: bairro.value.trim() || null,
      endereco: endereco.value.trim() || null,
      cep: cep.value.trim() || null,
      descricao: descricao.value.trim() || null,

      // Opção B (upload): não manda cover_image por URL
      cover_image: null,

      features,
    };
  }

  async function uploadPhotos(placeId) {
    const files = Array.from(fotos.files || []);
    if (files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      const fd = new FormData();
      fd.append("file", f);

      // regra: primeira foto vira capa
      const isCover = i === 0;
      fd.append("is_cover", String(isCover)); // FastAPI aceita "true"/"false" ou "True"/"False" em geral

      await apiFetchForm(`/partner/places/${placeId}/photos`, fd);
    }
  }

  async function handleFinalSubmit() {
    // 1) cria lugar
    const payload = buildPayload();
    const created = await apiFetchJson("/partner/places", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const placeId = created?.place_id;
    if (!placeId) throw new Error("Backend não retornou place_id.");

    // 2) upload fotos (multipart)
    await uploadPhotos(placeId);

    // 3) submit
    await apiFetchJson(`/partner/places/${placeId}/submit`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    window.location.href = `./parceiro-status.html?placeId=${encodeURIComponent(placeId)}`;
  }

  // ---------- INIT ----------
  async function init() {
    const me = await apiFetchJson("/partner-auth/me", { method: "GET" });
    if (partnerEmailEl) partnerEmailEl.textContent = me?.email || "Parceiro";

    initMap();
    setStep(1);
  }

  btnVoltar.addEventListener("click", () => {
    if (step > 1) setStep(step - 1);
  });

  btnProximo.addEventListener("click", async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }

    if (!validateStep3()) return;

    btnProximo.disabled = true;
    btnProximo.textContent = "Enviando...";
    try {
      await handleFinalSubmit();
    } catch (e) {
      toast(`Erro ao enviar: ${e.message || e}`);
      btnProximo.disabled = false;
      btnProximo.textContent = "Enviar para análise";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    btnProximo.click();
  });

  init().catch((e) => console.error(e));
})();
