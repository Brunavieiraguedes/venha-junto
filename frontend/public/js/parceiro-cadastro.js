// ====== STEP FLOW ======
let current = 1;
const steps = document.querySelectorAll(".step");
const panels = document.querySelectorAll(".panel");
const btnVoltar = document.getElementById("btnVoltar");
const btnProximo = document.getElementById("btnProximo");

function setStep(n){
  current = n;
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === current));
  panels.forEach(p => p.classList.toggle("active", Number(p.dataset.panel) === current));

  btnVoltar.style.visibility = current === 1 ? "hidden" : "visible";
  btnProximo.textContent = current === 3 ? "Enviar para análise" : "Próximo";
}

btnVoltar.addEventListener("click", () => setStep(Math.max(1, current - 1)));

btnProximo.addEventListener("click", async () => {
  if(!validateStep(current)) return;

  if(current < 3){
    setStep(current + 1);
  } else {
    // "Enviar para análise"
    try {
      btnProximo.disabled = true;
      btnProximo.textContent = "Enviando...";

      const result = await saveCadastro(); // agora salva + envia pro backend

      // (Opcional) se quiser ir direto pra status
      window.location.href = "./parceiro-status.html";
    } catch (err) {
      alert(err?.message || "Erro ao enviar cadastro.");
    } finally {
      btnProximo.disabled = false;
      btnProximo.textContent = "Enviar para análise";
    }
  }
});

function validateStep(step){
  // valida apenas campos required do painel atual
  const panel = document.querySelector(`.panel[data-panel="${step}"]`);
  const required = panel.querySelectorAll("[required]");
  let ok = true;

  required.forEach(el => {
    const val = (el.value || "").trim();
    if(!val){
      ok = false;
      el.focus();
      el.style.borderColor = "#ef4444";
      setTimeout(() => (el.style.borderColor = ""), 900);
    }
  });

  // regra extra: descrição >= 100
  if(step === 1){
    const desc = document.getElementById("descricao");
    if(desc.value.trim().length < 100){
      ok = false;
      desc.focus();
      alert("A descrição precisa ter no mínimo 100 caracteres.");
    }

    const lat = document.getElementById("lat").value.trim();
    const lng = document.getElementById("lng").value.trim();
    if(!lat || !lng){
      ok = false;
      alert("Selecione a localização no mapa para continuar.");
    }
  }

  return ok;
}

async function saveCadastro(){
  const form = document.getElementById("formCadastro");
  const fd = new FormData(form);

  const acc = [];
  form.querySelectorAll('input[name="acc"]:checked').forEach(c => acc.push(c.value));

  const data = {
    nome: fd.get("nome"),
    tipo: fd.get("tipo"),
    descricao: fd.get("descricao"),
    endereco: fd.get("endereco"),
    bairro: fd.get("bairro"),
    cep: fd.get("cep"),
    cidade: fd.get("cidade"),
    lat: fd.get("lat"),
    lng: fd.get("lng"),
    cnpj: fd.get("cnpj") || "",
    responsavel: fd.get("responsavel"),
    telefone: fd.get("telefone"),
    emailContato: fd.get("emailContato"),
    acessibilidade: acc,
    status: "EM_ANALISE",
    submittedAt: new Date().toISOString()
  };

  // ✅ mantém seu draft local
  localStorage.setItem("vj_estabelecimento_draft", JSON.stringify(data));

  // ✅ monta payload que o backend espera (PlaceCreateRequest)
  // O backend /partner/places aceita:
  // nome, tipo, cidade, bairro, endereco, cep, descricao, cover_image, features
  const payload = {
    nome: data.nome,
    tipo: (data.tipo || "").toLowerCase(), // ex: "Hotel" -> "hotel" (se quiser)
    cidade: data.cidade,
    bairro: data.bairro,
    endereco: data.endereco,
    cep: data.cep,
    descricao: data.descricao,
    cover_image: null,
    features: acc.map(x => normalizeFeature(x))
  };

  // ✅ cria place no backend
  const created = await window.apiPartnerCreatePlace(payload);
  // created = { place_id, status }

  // ✅ (opcional) já envia para análise (PENDING_REVIEW)
  // Se você quer que o botão "Enviar para análise" realmente mude o status:
  try {
    await window.apiPartnerSubmitPlace(created.place_id);
  } catch (e) {
    // se não existir rota ou falhar, não bloqueia, mas avisa
    console.warn("Falha ao enviar para análise:", e);
  }

  return created;
}

// converte os textos do checkbox para keys simples do backend
function normalizeFeature(label) {
  const v = (label || "").trim().toLowerCase();

  if (v.includes("rampa")) return "rampa";
  if (v.includes("banheiro")) return "banheiro_adaptado";
  if (v.includes("elevador")) return "elevador";
  if (v.includes("piso")) return "piso_tatil";
  if (v.includes("cardápio") || v.includes("cardapio")) return "cardapio_acessivel";
  if (v.includes("atendimento")) return "atendimento_inclusivo";

  // fallback
  return v
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

// ====== MAPA (Leaflet + OSM) ======
const map = L.map("map", { zoomControl:true }).setView([-23.55052, -46.633308], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

let marker = L.marker([-23.55052, -46.633308], { draggable:true }).addTo(map);

function updateLatLng(lat, lng){
  document.getElementById("lat").value = lat.toFixed(6);
  document.getElementById("lng").value = lng.toFixed(6);
}

marker.on("dragend", () => {
  const p = marker.getLatLng();
  updateLatLng(p.lat, p.lng);
});
map.on("click", (e) => {
  marker.setLatLng(e.latlng);
  updateLatLng(e.latlng.lat, e.latlng.lng);
});

updateLatLng(-23.55052, -46.633308);

// Buscar endereço via Nominatim (OSM)
async function geocode(query){
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "Accept":"application/json" }
  });
  if(!res.ok) throw new Error("Falha ao buscar endereço");
  const data = await res.json();
  if(!data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

document.getElementById("btnBuscarEndereco").addEventListener("click", async () => {
  const end = document.getElementById("endereco").value.trim();
  const cidade = document.getElementById("cidade").value.trim();
  const bairro = document.getElementById("bairro").value.trim();
  const cep = document.getElementById("cep").value.trim();

  const query = [end, bairro, cidade, cep, "Brasil"].filter(Boolean).join(", ");
  if(!query || query.length < 6){
    alert("Preencha o endereço/bairro/cidade para buscar no mapa.");
    return;
  }

  try{
    const r = await geocode(query);
    if(!r){
      alert("Não encontrei esse endereço. Ajuste o texto e tente novamente.");
      return;
    }
    map.setView([r.lat, r.lng], 16);
    marker.setLatLng([r.lat, r.lng]);
    updateLatLng(r.lat, r.lng);
  }catch(err){
    alert("Não foi possível buscar o endereço agora. Você pode clicar no mapa para definir a posição.");
  }
});

// Minha localização (GPS do navegador)
document.getElementById("btnMinhaLocalizacao").addEventListener("click", () => {
  if(!navigator.geolocation){
    alert("Seu navegador não suporta geolocalização.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 16);
      marker.setLatLng([lat, lng]);
      updateLatLng(lat, lng);
    },
    () => alert("Não consegui acessar sua localização. Libere a permissão ou selecione no mapa."),
    { enableHighAccuracy:true, timeout:8000 }
  );
});

// ====== Proteção de rota + carregar parceiro do backend ======
async function bootstrapPartner() {
  // se não tem token -> manda pro login
  const token = localStorage.getItem("vj_partner_token");
  if (!token) {
    window.location.href = "./parceiro-login.html";
    return;
  }

  // busca dados do parceiro do backend
  try {
    const me = await window.apiPartnerMe();
    const emailEl = document.getElementById("partnerEmail");
    if (emailEl && me?.email) emailEl.textContent = me.email;
  } catch (e) {
    // token inválido/expirado -> limpa e manda pro login
    localStorage.removeItem("vj_partner_token");
    window.location.href = "./parceiro-login.html";
  }
}

setStep(1);
bootstrapPartner();
