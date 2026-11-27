// /JS/login.js
import {
  autenticarUsuario,
  autenticarComGoogle,
  cadastrarUsuario,
  observarSessao,
  auth
} from "/APIS/Firebase&Gemini/FirebaseGemini.js";

// =========================================================================
// 50 PALETAS MONOCROMÁTICAS (13 AZUL + 13 VERDE + 12 AMARELO + 12 VERMELHO)
// =========================================================================
const PALETAS_MONOCOLOR = [
  // --- AZUL (1 a 13) ---
  { id: 1, familia: "azul", nome: "Azul Royal Clássico", main: "#2563eb", dark: "#1d4ed8", contrast: "#ffffff" },
  { id: 2, familia: "azul", nome: "Azul Cobalto", main: "#1d4ed8", dark: "#1e40af", contrast: "#ffffff" },
  { id: 3, familia: "azul", nome: "Azul Safira", main: "#0f52ba", dark: "#0a3b87", contrast: "#ffffff" },
  { id: 4, familia: "azul", nome: "Azul Celeste", main: "#0284c7", dark: "#0369a1", contrast: "#ffffff" },
  { id: 5, familia: "azul", nome: "Azul Marinho", main: "#1e3a8a", dark: "#172554", contrast: "#ffffff" },
  { id: 6, familia: "azul", nome: "Azul Turquesa", main: "#0e7490", dark: "#155e75", contrast: "#ffffff" },
  { id: 7, familia: "azul", nome: "Azul Índigo", main: "#4338ca", dark: "#3730a3", contrast: "#ffffff" },
  { id: 8, familia: "azul", nome: "Azul Petróleo", main: "#155e75", dark: "#164e63", contrast: "#ffffff" },
  { id: 9, familia: "azul", nome: "Azul Elétrico", main: "#3b82f6", dark: "#2563eb", contrast: "#ffffff" },
  { id: 10, familia: "azul", nome: "Azul Glacial", main: "#0369a1", dark: "#075985", contrast: "#ffffff" },
  { id: 11, familia: "azul", nome: "Azul Aço", main: "#475569", dark: "#334155", contrast: "#ffffff" },
  { id: 12, familia: "azul", nome: "Azul Ultramar", main: "#1d4ed8", dark: "#1e40af", contrast: "#ffffff" },
  { id: 13, familia: "azul", nome: "Azul Ciano Intenso", main: "#0891b2", dark: "#0e7490", contrast: "#ffffff" },

  // --- VERDE (14 a 26) ---
  { id: 14, familia: "verde", nome: "Verde Esmeralda", main: "#059669", dark: "#047857", contrast: "#ffffff" },
  { id: 15, familia: "verde", nome: "Verde Floresta", main: "#166534", dark: "#14532d", contrast: "#ffffff" },
  { id: 16, familia: "verde", nome: "Verde Agro", main: "#15803d", dark: "#166534", contrast: "#ffffff" },
  { id: 17, familia: "verde", nome: "Verde Jade", main: "#0d9488", dark: "#0f766e", contrast: "#ffffff" },
  { id: 18, familia: "verde", nome: "Verde Musgo", main: "#4d7c0f", dark: "#3f6212", contrast: "#ffffff" },
  { id: 19, familia: "verde", nome: "Verde Menta Escuro", main: "#047857", dark: "#065f46", contrast: "#ffffff" },
  { id: 20, familia: "verde", nome: "Verde Oliva", main: "#65a30d", dark: "#4d7c0f", contrast: "#ffffff" },
  { id: 21, familia: "verde", nome: "Verde Pinho", main: "#14532d", dark: "#052e16", contrast: "#ffffff" },
  { id: 22, familia: "verde", nome: "Verde Limão Intenso", main: "#65a30d", dark: "#4d7c0f", contrast: "#ffffff" },
  { id: 23, familia: "verde", nome: "Verde Folha", main: "#16a34a", dark: "#15803d", contrast: "#ffffff" },
  { id: 24, familia: "verde", nome: "Verde Abacate", main: "#3f6212", dark: "#365314", contrast: "#ffffff" },
  { id: 25, familia: "verde", nome: "Verde Água Profundo", main: "#115e59", dark: "#134e4a", contrast: "#ffffff" },
  { id: 26, familia: "verde", nome: "Verde Selva", main: "#065f46", dark: "#064e3b", contrast: "#ffffff" },

  // --- AMARELO (27 a 38) ---
  { id: 27, familia: "amarelo", nome: "Amarelo Ouro", main: "#ca8a04", dark: "#a16207", contrast: "#ffffff" },
  { id: 28, familia: "amarelo", nome: "Amarelo Âmbar", main: "#d97706", dark: "#b45309", contrast: "#ffffff" },
  { id: 29, familia: "amarelo", nome: "Amarelo Solar", main: "#eab308", dark: "#ca8a04", contrast: "#0f172a" },
  { id: 30, familia: "amarelo", nome: "Amarelo Mostarda", main: "#a16207", dark: "#854d0e", contrast: "#ffffff" },
  { id: 31, familia: "amarelo", nome: "Amarelo Mel", main: "#b45309", dark: "#92400e", contrast: "#ffffff" },
  { id: 32, familia: "amarelo", nome: "Amarelo Açafrão", main: "#ea580c", dark: "#c2410c", contrast: "#ffffff" },
  { id: 33, familia: "amarelo", nome: "Amarelo Ocre", main: "#854d0e", dark: "#713f12", contrast: "#ffffff" },
  { id: 34, familia: "amarelo", nome: "Amarelo Girassol", main: "#f59e0b", dark: "#d97706", contrast: "#0f172a" },
  { id: 35, familia: "amarelo", nome: "Amarelo Bronze", main: "#92400e", dark: "#78350f", contrast: "#ffffff" },
  { id: 36, familia: "amarelo", nome: "Amarelo Citrino", main: "#84cc16", dark: "#65a30d", contrast: "#0f172a" },
  { id: 37, familia: "amarelo", nome: "Amarelo Topázio", main: "#c2410c", dark: "#9a3412", contrast: "#ffffff" },
  { id: 38, familia: "amarelo", nome: "Amarelo Dourado Real", main: "#713f12", dark: "#422006", contrast: "#ffffff" },

  // --- VERMELHO (39 a 50) ---
  { id: 39, familia: "vermelho", nome: "Vermelho Rubi", main: "#dc2626", dark: "#b91c1c", contrast: "#ffffff" },
  { id: 40, familia: "vermelho", nome: "Vermelho Carmesim", main: "#be123c", dark: "#9f1239", contrast: "#ffffff" },
  { id: 41, familia: "vermelho", nome: "Vermelho Borgonha", main: "#881337", dark: "#4c0519", contrast: "#ffffff" },
  { id: 42, familia: "vermelho", nome: "Vermelho Escarlate", main: "#e11d48", dark: "#be123c", contrast: "#ffffff" },
  { id: 43, familia: "vermelho", nome: "Vermelho Terracota", main: "#b91c1c", dark: "#991b1b", contrast: "#ffffff" },
  { id: 44, familia: "vermelho", nome: "Vermelho Vinho", main: "#7f1d1d", dark: "#450a0a", contrast: "#ffffff" },
  { id: 45, familia: "vermelho", nome: "Vermelho Coral", main: "#ef4444", dark: "#dc2626", contrast: "#ffffff" },
  { id: 46, familia: "vermelho", nome: "Vermelho Cereja", main: "#9f1239", dark: "#881337", contrast: "#ffffff" },
  { id: 47, familia: "vermelho", nome: "Vermelho Granada", main: "#991b1b", dark: "#7f1d1d", contrast: "#ffffff" },
  { id: 48, familia: "vermelho", nome: "Vermelho Rosa Escuro", main: "#be185d", dark: "#9d174d", contrast: "#ffffff" },
  { id: 49, familia: "vermelho", nome: "Vermelho Tijolo", main: "#9a3412", dark: "#7c2d12", contrast: "#ffffff" },
  { id: 50, familia: "vermelho", nome: "Vermelho Sangue Real", main: "#500724", dark: "#3b071a", contrast: "#ffffff" }
];

// Referências DOM
const heroProjectName = document.getElementById("hero-project-name");
const brandAccentName = document.getElementById("brand-accent-name");
const mobileProjectName = document.getElementById("mobile-project-name");

const btnTogglePalette = document.getElementById("btn-toggle-palette");
const palettePanel = document.getElementById("palette-panel");
const paletteGrid = document.getElementById("palette-grid");
const currentSwatchDot = document.getElementById("current-swatch-dot");
const currentPaletteLabel = document.getElementById("current-palette-label");
const tabButtons = document.querySelectorAll(".tab-btn");

const authForm = document.getElementById("auth-form");
const inputUsuario = document.getElementById("input-usuario");
const inputSenha = document.getElementById("input-senha");
const btnToggleSenha = document.getElementById("btn-toggle-senha");
const iconEyeOff = document.getElementById("icon-eye-off");
const iconEyeOn = document.getElementById("icon-eye-on");
const btnSubmit = document.getElementById("btn-submit");
const btnSubmitText = document.getElementById("btn-submit-text");
const btnGoogleLogin = document.getElementById("btn-google-login");
const btnGoogleText = document.getElementById("btn-google-text");
const btnToggleMode = document.getElementById("btn-toggle-mode");
const formSubtitle = document.getElementById("form-subtitle");
const authFeedback = document.getElementById("auth-feedback");

let modoCadastro = false;
let familiaAtiva = "azul";
let paletaSelecionadaId = Number(localStorage.getItem("walkertech_monocolor_id")) || 1;

// =========================================================================
// CARREGAMENTO DINÂMICO DO PROJETO REAL
// =========================================================================
async function carregarMetadadosProjeto() {
  const projectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID || auth?.app?.options?.projectId || "";
  const nomeFormatado = projectId || "Firebase Workspace";

  if (heroProjectName) heroProjectName.textContent = nomeFormatado;
  if (brandAccentName) brandAccentName.textContent = nomeFormatado;
  if (mobileProjectName) mobileProjectName.textContent = nomeFormatado;
  document.title = `Login — ${nomeFormatado}`;

  try {
    const resp = await fetch("/api/status");
    if (!resp.ok) return;
    const status = await resp.json();

    if (!status.integracoesEnv?.firebaseConfigurado) {
      formSubtitle.textContent = "Configure VITE_FIREBASE_* no arquivo .env para autenticar.";
      authFeedback.textContent = "Credenciais do Firebase ausentes no .env do servidor.";
      authFeedback.className = "auth-feedback error";
      btnSubmit.disabled = true;
      btnGoogleLogin.disabled = true;
    } else {
      formSubtitle.textContent = "Preencha os dados do login ou entre com Google";
    }
  } catch {
    formSubtitle.textContent = "Preencha os dados do login ou entre com Google";
  }
}

// =========================================================================
// PALETAS MONOCROMÁTICAS PERSISTENTES + BRILHO RADIAL DINÂMICO
// =========================================================================
function hexParaRgba(hex, alpha) {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.substring(0, 2), 16);
  const g = parseInt(limpo.substring(2, 4), 16);
  const b = parseInt(limpo.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function aplicarPaletaMonocolor(paleta) {
  if (!paleta) return;
  paletaSelecionadaId = paleta.id;
  localStorage.setItem("walkertech_monocolor_id", String(paleta.id));
  localStorage.setItem("walkertech_monocolor_hex", paleta.main);
  localStorage.setItem("walkertech_theme_family", paleta.familia);

  const root = document.documentElement;
  root.style.setProperty("--mono-main", paleta.main);
  root.style.setProperty("--mono-dark", paleta.dark);
  root.style.setProperty("--mono-contrast", paleta.contrast);
  root.style.setProperty("--mono-soft", hexParaRgba(paleta.main, 0.16));
  root.style.setProperty("--mono-glow", hexParaRgba(paleta.main, 0.34));
  root.style.setProperty("--mono-glow-ambient", hexParaRgba(paleta.dark, 0.48));
  root.style.setProperty("--mono-glow-secondary", hexParaRgba(paleta.main, 0.18));

  currentSwatchDot.style.backgroundColor = paleta.main;
  currentPaletteLabel.textContent = `${paleta.nome} (${paleta.id}/50)`;

  renderizarGradePaletas(familiaAtiva);
}

function renderizarGradePaletas(familia) {
  familiaAtiva = familia;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.family === familia);
  });

  const filtradas = PALETAS_MONOCOLOR.filter((p) => p.familia === familia);
  paletteGrid.innerHTML = "";

  filtradas.forEach((paleta) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `palette-item ${paleta.id === paletaSelecionadaId ? "selected" : ""}`;
    item.innerHTML = `
      <span class="palette-item-color" style="background-color: ${paleta.main};"></span>
      <span>#${paleta.id} ${paleta.nome}</span>
    `;
    item.addEventListener("click", () => aplicarPaletaMonocolor(paleta));
    paletteGrid.appendChild(item);
  });
}

btnTogglePalette.addEventListener("click", (e) => {
  e.stopPropagation();
  const aberto = !palettePanel.hidden;
  palettePanel.hidden = aberto;
  btnTogglePalette.setAttribute("aria-expanded", String(!aberto));
});

document.addEventListener("click", (e) => {
  if (!palettePanel.hidden && !palettePanel.contains(e.target) && e.target !== btnTogglePalette) {
    palettePanel.hidden = true;
    btnTogglePalette.setAttribute("aria-expanded", "false");
  }
});

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => renderizarGradePaletas(btn.dataset.family));
});

// =========================================================================
// AUTENTICAÇÃO VIA FIREBASE AUTH (E-MAIL/SENHA + GOOGLE)
// =========================================================================
function definirEstadoCarregamento(carregando, origem = "form") {
  btnSubmit.disabled = carregando;
  btnGoogleLogin.disabled = carregando;

  if (carregando) {
    if (origem === "google") {
      btnGoogleText.textContent = "Conectando com Google...";
    } else {
      btnSubmitText.textContent = modoCadastro ? "CRIANDO CONTA..." : "AUTENTICANDO...";
    }
  } else {
    btnGoogleText.textContent = "Continuar com Google";
    btnSubmitText.textContent = modoCadastro ? "CADASTRAR E ENTRAR" : "ENTRAR";
  }
}

function traduzirErroFirebase(erro) {
  switch (erro?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Usuário ou senha incorretos.";
    case "auth/user-not-found":
      return "Usuário não encontrado. Crie um acesso abaixo.";
    case "auth/email-already-in-use":
      return "Este usuário já está cadastrado. Faça login.";
    case "auth/popup-closed-by-user":
      return "Janela de login do Google fechada antes de concluir.";
    case "auth/popup-blocked":
      return "O navegador bloqueou o pop-up do Google. Permita pop-ups e tente novamente.";
    case "auth/unauthorized-domain":
      return "Domínio não autorizado no Firebase Authentication (Authorized domains).";
    case "auth/operation-not-allowed":
      return "Ative o provedor Google em Authentication > Sign-in method no Firebase.";
    default:
      return erro?.message || "Não foi possível autenticar. Verifique suas credenciais.";
  }
}

btnToggleSenha.addEventListener("click", () => {
  const mostrando = inputSenha.type === "text";
  inputSenha.type = mostrando ? "password" : "text";
  iconEyeOff.hidden = !mostrando;
  iconEyeOn.hidden = mostrando;
});

btnToggleMode.addEventListener("click", () => {
  modoCadastro = !modoCadastro;
  authFeedback.textContent = "";
  authFeedback.className = "auth-feedback";

  if (modoCadastro) {
    formSubtitle.textContent = "Crie sua credencial no Firebase Auth";
    btnSubmitText.textContent = "CADASTRAR E ENTRAR";
    btnToggleMode.textContent = "Já possui conta? Fazer Login";
  } else {
    formSubtitle.textContent = "Preencha os dados do login ou entre com Google";
    btnSubmitText.textContent = "ENTRAR";
    btnToggleMode.textContent = "Não tem conta? Criar acesso Firebase";
  }
});

observarSessao((user) => {
  if (user) {
    window.location.href = "/dashboard";
  }
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = inputUsuario.value.trim();
  const senha = inputSenha.value;

  if (!usuario || senha.length < 6) {
    authFeedback.textContent = "Informe o usuário e uma senha com pelo menos 6 caracteres.";
    authFeedback.className = "auth-feedback error";
    return;
  }

  definirEstadoCarregamento(true, "form");
  authFeedback.textContent = "";

  try {
    if (modoCadastro) {
      await cadastrarUsuario(usuario, senha);
    } else {
      await autenticarUsuario(usuario, senha);
    }

    authFeedback.textContent = "Sessão autenticada! Redirecionando...";
    authFeedback.className = "auth-feedback success";

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 350);
  } catch (erro) {
    authFeedback.textContent = traduzirErroFirebase(erro);
    authFeedback.className = "auth-feedback error";
    definirEstadoCarregamento(false);
  }
});

btnGoogleLogin.addEventListener("click", async () => {
  definirEstadoCarregamento(true, "google");
  authFeedback.textContent = "";

  try {
    await autenticarComGoogle();
    authFeedback.textContent = "Conta Google autenticada! Redirecionando...";
    authFeedback.className = "auth-feedback success";

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 350);
  } catch (erro) {
    authFeedback.textContent = traduzirErroFirebase(erro);
    authFeedback.className = "auth-feedback error";
    definirEstadoCarregamento(false);
  }
});

// Inicialização
const paletaInicial =
  PALETAS_MONOCOLOR.find((p) => p.id === paletaSelecionadaId) || PALETAS_MONOCOLOR[0];
familiaAtiva = paletaInicial.familia;
aplicarPaletaMonocolor(paletaInicial);
carregarMetadadosProjeto();