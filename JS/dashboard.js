import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
  observarSessao,
  sairDaConta,
  enviarChatServidorStream,
  salvarMensagemFirestore,
  listarConversasUsuario,
  auth,
  db,
  GEMINI_DEFAULT_MODEL
} from "../APIS/Firebase&Gemini/FirebaseGemini.js";

import {
  listarModelosChatGratuitos,
  MODELO_PADRAO_UNOROUTER
} from "../APIS/Unorouter/UnoRouter.js";

import {
  LIGAS_POPULARES_ESPN,
  buscarPlacarLiga,
  buscarClassificacaoLiga,
  buscarNoticiasLiga,
  buscarEscalacaoPartida,
  coletarContextoEsportivoParaIA,
  formatarDataHoraBrasil
} from "../APIS/ESPN/espnapi.js";

import { buscarPluviometriaOpenMeteo } from "../APIS/OpenMeteo/openmeteo.js";

// =========================================================================
// CONSTANTES DE MARCA, TEMAS DE FUNDO (4 CORES) E PROMPTS MARKDOWN
// =========================================================================
const BRAND_NAME = "W3Labs WillIAn";
const SETTINGS_STORAGE_KEY = "w3labs_willian_settings_v8";
const MONOCOLOR_STORAGE_KEY = "walkertech_monocolor_hex";
const THEME_FAMILY_STORAGE_KEY = "walkertech_theme_family";

const TEMAS_FUNDO_DASHBOARD = {
  verde: {
    id: "verde",
    nome: "Verde",
    metaTheme: "#052116",
    accent: "#22c55e",
    chartColors: ["#22c55e", "#34d399", "#a3e635", "#fbbf24", "#38bdf8", "#f87171"],
    sliceBorder: "#082b1e"
  },
  amarelo: {
    id: "amarelo",
    nome: "Amarelo",
    metaTheme: "#241a05",
    accent: "#fbbf24",
    chartColors: ["#fbbf24", "#f59e0b", "#fde047", "#34d399", "#60a5fa", "#fb7185"],
    sliceBorder: "#2f2207"
  },
  azul: {
    id: "azul",
    nome: "Azul",
    metaTheme: "#07152e",
    accent: "#4ea8ff",
    chartColors: ["#4ea8ff", "#38bdf8", "#10b981", "#fbbf24", "#a855f7", "#fb7185"],
    sliceBorder: "#0a1b3b"
  },
  vermelho: {
    id: "vermelho",
    nome: "Vermelho",
    metaTheme: "#250810",
    accent: "#fb7185",
    chartColors: ["#fb7185", "#ef4444", "#f97316", "#fbbf24", "#38bdf8", "#a855f7"],
    sliceBorder: "#330b15"
  }
};

const INSTRUCAO_MARKDOWN_E_CHARTS = `
FORMATAÇÃO OBRIGATÓRIA EM MARKDOWN E GOOGLE CHARTS:
1. Formate TODAS as suas respostas exclusivamente em Markdown limpo e estruturado: use títulos (\`##\` e \`###\`), listas com marcadores ou numeradas, listas de tarefas (\`- [ ]\`), **negrito** para destaques, citações (\`>\`), tabelas Markdown (\`| Coluna 1 | Coluna 2 |\`) para comparações/dados e blocos de código (\`\`\`linguagem) quando aplicável.
2. Sempre que o usuário pedir um gráfico OU quando a resposta envolver comparação numérica, distribuição percentual, evolução temporal, estatísticas, pluviometria (mm), estoque, produção ou placares/estatísticas esportivas, inclua um bloco de gráfico Google Charts no formato exato abaixo:
\`\`\`chart
{
  "type": "PieChart",
  "title": "Título do Gráfico",
  "columns": [
    ["string", "Categoria"],
    ["number", "Valor"]
  ],
  "rows": [
    ["Item A", 10],
    ["Item B", 25]
  ]
}
\`\`\`
Tipos suportados em "type": "PieChart", "ColumnChart", "BarChart", "LineChart", "AreaChart".
Nunca coloque comentários dentro do JSON do bloco \`\`\`chart.`;

const SYSTEM_PROMPT_GERAL_GEMINI = `Você é o assistente inteligente do W3Labs WillIAn. Responda em Português do Brasil de forma clara, completa, precisa e direta ao ponto na primeira frase.
${INSTRUCAO_MARKDOWN_E_CHARTS}`;

const SYSTEM_PROMPT_VARZIA_GEMINI = `Você é a VarzIA, especialista em esportes do W3Labs WillIAn. Responda em Português do Brasil de forma natural, clara, completa, bem estruturada e objetiva.

Regras de resposta:
1. Responda qualquer pergunta sobre esportes (futebol brasileiro e mundial, campeonatos, jogos ao vivo, escalações, tabelas, regras, táticas, história, recordes, comparações entre jogadores/times, NBA, NFL, Fórmula 1, tênis, lutas, Olimpíadas, curiosidades, etc.) com clareza e profundidade, utilizando tabelas Markdown para classificações/estatísticas, títulos, negrito e listas.
2. Quando houver dados em tempo real da ESPN Brasil fornecidos abaixo e a pergunta envolver jogos atuais, placares, horários, escalações, classificação ou notícias recentes, incorpore essas informações de forma natural e precisa.
3. Quando a pergunta for sobre história dos esportes, regras, táticas ou opiniões técnicas que não dependem do placar de hoje, responda diretamente com seu conhecimento completo sem dizer que "não consta no feed".
4. Vá direto ao ponto na primeira frase, sem introduções robóticas.
${INSTRUCAO_MARKDOWN_E_CHARTS}`;

const SYSTEM_PROMPT_AGRO_GEMINI = `Você é o especialista Agro do W3Labs WillIAn, focado em agronomia, pecuária, agricultura de precisão e gestão integrada do agronegócio brasileiro e mundial. Responda em Português do Brasil de forma natural, prática, técnica e objetiva.

Regras de resposta:
1. Utilize obrigatoriamente os dados interligados do Firestore da fazenda fornecidos no contexto abaixo (Propriedades, Unidades/Talhões, Plantio, Colheita, Pluviômetro em mm via Open-Meteo, Estoque de Diesel, Inventário, Revisões de Máquinas, Porcentagem de Salário/Comissões e Manuais Técnicos) sempre que a pergunta envolver a operação, custos, saldos, planejamento, manutenção ou produtividade da propriedade.
2. Cruze as informações entre os módulos (ex: saldo de diesel vs consumo de máquinas, horas trabalhadas vs próximas revisões, produção colhida vs porcentagem de salário/comissão, chuva acumulada em mm vs janela de plantio/colheita, manuais cadastrados vs regulagem de equipamentos).
3. Estruture as respostas em Markdown completo com tabelas para balanços/inventário/chuvas, negrito para números e alertas críticos, e listas organizadas.
4. Sempre que recomendar defensivos, dosagens ou intervenções químicas/veterinárias, inclua de forma breve a validação com um engenheiro agrônomo ou médico veterinário conforme a realidade local.
5. Vá direto ao ponto na primeira frase, sem introduções robóticas.
${INSTRUCAO_MARKDOWN_E_CHARTS}`;

const SYSTEM_PROMPT_ROTINAS_GEMINI = `Você é o planejador de produtividade do W3Labs WillIAn. Organize as rotinas programadas do usuário em Português do Brasil com foco prático, priorização por horário e categoria (Agro, Estudos, Esportes, Geral) em Markdown completo com checkboxes, tabela de horários e gráfico quando pertinente.
${INSTRUCAO_MARKDOWN_E_CHARTS}`;

// =========================================================================
// CATÁLOGO BASE LOCAL DE MODELOS (GARANTE INICIALIZAÇÃO INSTANTÂNEA)
// =========================================================================
function construirCatalogoLocalBase() {
  const unoBase = listarModelosChatGratuitos().map((m) => ({
    id: m.id,
    nome: m.nome,
    provedor: "unorouter",
    subProvedor: "UnoRouter",
    contexto: m.contexto || "128K",
    descricao: `UnoRouter gratuito • Contexto ${m.contexto || "128K"}`,
    badge: ":free",
    gratuito: true,
    disponivel: true
  }));

  return [
    {
      id: "auto",
      nome: "Auto (Inteligente)",
      provedor: "auto",
      subProvedor: "Roteamento Dinâmico",
      contexto: "Dinâmico",
      descricao: "Escolhe o melhor modelo automaticamente conforme o prompt",
      badge: "Auto",
      gratuito: false,
      disponivel: true
    },
    {
      id: "4-hydrogen",
      nome: "4 Hydrogen",
      provedor: "gemini",
      subProvedor: "Google Gemini",
      contexto: "1M",
      descricao: "Principal • Rápido, preciso e otimizado para Markdown",
      badge: "Rápido",
      gratuito: false,
      disponivel: true
    },
    {
      id: "4-neon",
      nome: "4 Neon",
      provedor: "gemini",
      subProvedor: "Google Gemini",
      contexto: "1M",
      descricao: "Raciocínio avançado para código, Agro e análises complexas",
      badge: "Pro",
      gratuito: false,
      disponivel: true
    },
    {
      id: "gemini-2.5-flash",
      nome: "Gemini 2.5 Flash",
      provedor: "gemini",
      subProvedor: "Google Gemini",
      contexto: "1M",
      descricao: "Versátil e ideal para tarefas do dia a dia",
      badge: "1M",
      gratuito: false,
      disponivel: true
    },
    {
      id: "gemini-2.5-flash-lite",
      nome: "Gemini 2.5 Flash Lite",
      provedor: "gemini",
      subProvedor: "Google Gemini",
      contexto: "1M",
      descricao: "Baixíssima latência para respostas rápidas",
      badge: "Lite",
      gratuito: false,
      disponivel: true
    },
    {
      id: "gemini-2.5-pro",
      nome: "Gemini 2.5 Pro",
      provedor: "gemini",
      subProvedor: "Google Gemini",
      contexto: "1M",
      descricao: "Máxima profundidade analítica e raciocínio complexo",
      badge: "Pro",
      gratuito: false,
      disponivel: true
    },
    ...unoBase
  ];
}

// =========================================================================
// INTEGRAÇÃO GOOGLE CHARTS (NÃO BLOQUEANTE + TEMA DINÂMICO)
// =========================================================================
let googleChartsProntoPromise = null;

function garantirGoogleChartsCarregado(timeoutMs = 3500) {
  if (googleChartsProntoPromise) return googleChartsProntoPromise;

  googleChartsProntoPromise = new Promise((resolve) => {
    const inicio = Date.now();
    const iniciar = () => {
      if (window.google?.visualization?.DataTable) {
        resolve(window.google);
        return;
      }
      if (window.google?.charts) {
        try {
          window.google.charts.load("current", { packages: ["corechart"] });
          window.google.charts.setOnLoadCallback(() => resolve(window.google));
        } catch {
          resolve(null);
        }
        return;
      }
      if (Date.now() - inicio >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(iniciar, 140);
    };
    iniciar();
  });

  return googleChartsProntoPromise;
}

function obterTemaAtivoObj() {
  return TEMAS_FUNDO_DASHBOARD[configAtual?.themeColor] || TEMAS_FUNDO_DASHBOARD.azul;
}

function drawChart() {
  const container = document.getElementById("chart_div");
  if (!container || !window.google?.visualization) return;

  const tema = obterTemaAtivoObj();
  const data = new window.google.visualization.DataTable();
  data.addColumn("string", "Categoria");
  data.addColumn("number", "Distribuição");
  data.addRows([
    ["Chat & Código", 34],
    ["Agro & Clima", 28],
    ["VarzIA Esportes", 22],
    ["Estudos & Rotinas", 16]
  ]);

  const options = {
    title: "Distribuição Dinâmica do Workspace W3Labs WillIAn",
    width: Math.min(540, (container.parentElement?.clientWidth || 460) - 28),
    height: 300,
    backgroundColor: "transparent",
    colors: tema.chartColors,
    titleTextStyle: { color: "#f1f5f9", fontSize: 15, bold: true },
    legend: { position: "bottom", textStyle: { color: "#cbd5e1", fontSize: 12 } },
    pieSliceBorderColor: tema.sliceBorder
  };

  const chart = new window.google.visualization.PieChart(container);
  chart.draw(data, options);
}

window.drawChart = drawChart;

async function renderizarGraficoGoogleCharts(elementoAlvo, config) {
  if (!elementoAlvo || !config) return;
  const g = await garantirGoogleChartsCarregado();
  if (!g?.visualization?.DataTable) {
    elementoAlvo.innerHTML = `<p class="chart-error-msg">Biblioteca Google Charts indisponível no momento.</p>`;
    return;
  }

  try {
    const tema = obterTemaAtivoObj();
    const data = new window.google.visualization.DataTable();
    const colunas = Array.isArray(config.columns) ? config.columns : [];
    const linhas = Array.isArray(config.rows) ? config.rows : [];

    if (colunas.length === 0 || linhas.length === 0) {
      elementoAlvo.innerHTML = `<p class="chart-error-msg">Dados insuficientes para gerar o gráfico.</p>`;
      return;
    }

    colunas.forEach(([tipo, rotulo]) => {
      data.addColumn(tipo || "string", rotulo || "");
    });

    const linhasNormalizadas = linhas.map((row) =>
      row.map((celula, idx) => {
        const tipoCol = colunas[idx]?.[0];
        return tipoCol === "number" ? Number(celula) || 0 : String(celula ?? "");
      })
    );
    data.addRows(linhasNormalizadas);

    const larguraDisponivel = Math.max(
      260,
      Math.min(640, (elementoAlvo.parentElement?.clientWidth || 520) - 24)
    );

    const tipoGrafico = config.type || "PieChart";
    const options = {
      title: config.title || "Análise Gráfica",
      width: config.width || larguraDisponivel,
      height: config.height || 300,
      backgroundColor: "transparent",
      titleTextStyle: { color: "#f1f5f9", fontSize: 14, bold: true },
      legend: { position: "bottom", textStyle: { color: "#cbd5e1", fontSize: 12 } },
      hAxis: {
        textStyle: { color: "#94a3b8", fontSize: 11 },
        gridlines: { color: "rgba(255,255,255,0.08)" }
      },
      vAxis: {
        textStyle: { color: "#94a3b8", fontSize: 11 },
        gridlines: { color: "rgba(255,255,255,0.08)" }
      },
      colors: tema.chartColors,
      pieSliceBorderColor: tema.sliceBorder,
      ...(config.options || {})
    };

    const mapaVisualizacoes = {
      PieChart: window.google.visualization.PieChart,
      ColumnChart: window.google.visualization.ColumnChart,
      BarChart: window.google.visualization.BarChart,
      LineChart: window.google.visualization.LineChart,
      AreaChart: window.google.visualization.AreaChart
    };

    const ChartClass = mapaVisualizacoes[tipoGrafico] || window.google.visualization.PieChart;
    elementoAlvo.innerHTML = "";
    const chart = new ChartClass(elementoAlvo);
    chart.draw(data, options);
  } catch (erro) {
    console.warn("Erro ao desenhar Google Chart:", erro);
    elementoAlvo.innerHTML = `<p class="chart-error-msg">Não foi possível renderizar o gráfico: ${escaparHtml(erro.message)}</p>`;
  }
}

async function hidratarGraficosNoContainer(container) {
  if (!container) return;
  const slots = container.querySelectorAll(".ai-google-chart-slot[data-chart-json]");
  for (const slot of slots) {
    try {
      const jsonBruto = decodeURIComponent(slot.dataset.chartJson || "");
      const config = JSON.parse(jsonBruto);
      await renderizarGraficoGoogleCharts(slot, config);
    } catch {
      slot.innerHTML = `<p class="chart-error-msg">Formato de gráfico inválido.</p>`;
    }
  }
}

function rehidratarGraficosVisiveis() {
  document.querySelectorAll(".msg-bubble.model").forEach((balao) => {
    hidratarGraficosNoContainer(balao);
  });
  if (!document.getElementById("default-chart-wrapper")?.hidden) {
    drawChart();
  }
  if (telaAtual === "agro" && estadoAgro.pluviometriaAtual) {
    renderizarMiniGraficoPluviometriaAgro(estadoAgro.pluviometriaAtual);
  }
}

window.addEventListener("resize", rehidratarGraficosVisiveis);

// =========================================================================
// ELEMENTOS DA INTERFACE
// =========================================================================
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const btnMobileMenu = document.getElementById("btn-mobile-menu");
const btnCollapseSidebar = document.getElementById("btn-collapse-sidebar");
const btnNewChat = document.getElementById("btn-new-chat");
const btnBrandHome = document.getElementById("btn-brand-home");
const brandTitleText = document.getElementById("brand-title-text");
const btnLogout = document.getElementById("btn-logout");
const btnInstallApp = document.getElementById("btn-install-app");

// Topbar & Theme Switcher
const metaThemeColor = document.getElementById("meta-theme-color");
const topbarModeLabel = document.getElementById("topbar-mode-label");
const topbarActiveModelBadge = document.getElementById("topbar-active-model-badge");
const heroProvidersSummary = document.getElementById("hero-providers-summary");

// Busca e Histórico Lateral
const btnSearchChats = document.getElementById("btn-search-chats");
const sidebarSearchBox = document.getElementById("sidebar-search-box");
const sidebarSearchInput = document.getElementById("sidebar-search-input");
const btnToggleHistory = document.getElementById("btn-toggle-history");
const historyChevron = document.getElementById("history-chevron");
const historyList = document.getElementById("history-list");

// Perfil e Views
const userAvatar = document.getElementById("user-avatar");
const userDisplayName = document.getElementById("user-display-name");
const userStatusBadge = document.getElementById("user-status-badge");
const ambientGlow = document.getElementById("ambient-glow");
const viewChat = document.getElementById("view-chat");
const viewScheduled = document.getElementById("view-scheduled");
const viewStudies = document.getElementById("view-studies");
const viewSports = document.getElementById("view-sports");
const viewAgro = document.getElementById("view-agro");
const viewSettings = document.getElementById("view-settings");
const promptDock = document.getElementById("prompt-dock");
const promptWrapper = document.getElementById("prompt-wrapper");
const studyQuickChips = document.getElementById("study-quick-chips");

// Badges Sidebar
const navBadgeScheduled = document.getElementById("nav-badge-scheduled");
const navBadgeStudies = document.getElementById("nav-badge-studies");
const navBadgeAgro = document.getElementById("nav-badge-agro");

// Gráfico Exemplo (#chart_div)
const defaultChartWrapper = document.getElementById("default-chart-wrapper");
const btnCloseDefaultChart = document.getElementById("btn-close-default-chart");
const actionDemoGoogleChart = document.getElementById("action-demo-google-chart");

// Programado (Rotinas)
const scheduledForm = document.getElementById("scheduled-form");
const scheduledInputTitle = document.getElementById("scheduled-input-title");
const scheduledInputTime = document.getElementById("scheduled-input-time");
const scheduledInputCategory = document.getElementById("scheduled-input-category");
const scheduledInputPriority = document.getElementById("scheduled-input-priority");
const scheduledList = document.getElementById("scheduled-list");
const btnScheduledAiPlan = document.getElementById("btn-scheduled-ai-plan");
const schedKpiTotal = document.getElementById("sched-kpi-total");
const schedKpiPending = document.getElementById("sched-kpi-pending");
const schedKpiDone = document.getElementById("sched-kpi-done");

// Estudos e Notebooks
const btnOpenNewNotebook = document.getElementById("btn-open-new-notebook");
const newNotebookPanel = document.getElementById("new-notebook-panel");
const btnCancelNewNotebook = document.getElementById("btn-cancel-new-notebook");
const inputNotebookTitle = document.getElementById("input-notebook-title");
const inputNotebookTopic = document.getElementById("input-notebook-topic");
const notebooksList = document.getElementById("notebooks-list");

// VarzIA Hub + Chat
const varziaWelcomeBox = document.getElementById("varzia-welcome-box");
const varziaWelcomeTitle = document.getElementById("varzia-welcome-title");
const varziaLastSync = document.getElementById("varzia-last-sync");
const varziaLeaguesBar = document.getElementById("varzia-leagues-bar");
const varziaKpiLeague = document.getElementById("varzia-kpi-league");
const varziaKpiMatches = document.getElementById("varzia-kpi-matches");
const varziaKpiLive = document.getElementById("varzia-kpi-live");
const varziaKpiLeader = document.getElementById("varzia-kpi-leader");
const varziaGamesGrid = document.getElementById("varzia-games-grid");
const varziaStandingsWrap = document.getElementById("varzia-standings-wrap");
const varziaStandingsTitle = document.getElementById("varzia-standings-title");
const varziaNewsGrid = document.getElementById("varzia-news-grid");
const varziaPanelGames = document.getElementById("varzia-panel-games");
const varziaPanelStandings = document.getElementById("varzia-panel-standings");
const varziaPanelNews = document.getElementById("varzia-panel-news");
const btnVarziaRefresh = document.getElementById("btn-varzia-refresh");
const btnVarziaAiRound = document.getElementById("btn-varzia-ai-round");
const btnVarziaChartStandings = document.getElementById("btn-varzia-chart-standings");
const btnVarziaShowHub = document.getElementById("btn-varzia-show-hub");
const varziaChatToolbar = document.getElementById("varzia-chat-toolbar");
const varziaToolbarLeague = document.getElementById("varzia-toolbar-league");
const varziaChatFeed = document.getElementById("varzia-chat-feed");

// Agro Central + Modal Firestore
const agroWelcomeBox = document.getElementById("agro-welcome-box");
const agroWelcomeTitle = document.getElementById("agro-welcome-title");
const agroSyncSummary = document.getElementById("agro-sync-summary");
const agroCityInput = document.getElementById("agro-city-input");
const btnAgroUpdateWeather = document.getElementById("btn-agro-update-weather");
const btnAgroFullReport = document.getElementById("btn-agro-full-report");
const btnAgroAskWeather = document.getElementById("btn-agro-ask-weather");
const agroForecastStrip = document.getElementById("agro-forecast-strip");
const agroClimateLocation = document.getElementById("agro-climate-location");
const agroClimateSoil = document.getElementById("agro-climate-soil");
const agroMiniChart = document.getElementById("agro-mini-chart");
const agroChatFeed = document.getElementById("agro-chat-feed");
const agroChatToolbar = document.getElementById("agro-chat-toolbar");
const btnAgroShowCards = document.getElementById("btn-agro-show-cards");
const agroToolbarRain = document.getElementById("agro-toolbar-rain");

const agroModalBackdrop = document.getElementById("agro-modal-backdrop");
const agroModalTitle = document.getElementById("agro-modal-title");
const btnCloseAgroModal = document.getElementById("btn-close-agro-modal");
const agroModalForm = document.getElementById("agro-modal-form");
const agroModalFields = document.getElementById("agro-modal-fields");
const btnAgroAskAi = document.getElementById("btn-agro-ask-ai");
const agroModalRecordsCount = document.getElementById("agro-modal-records-count");
const agroModalRecordsList = document.getElementById("agro-modal-records-list");

// Chat & Prompt Principal
const heroWelcome = document.getElementById("hero-welcome");
const heroWelcomeTitle = document.getElementById("hero-welcome-title");
const chatFeed = document.getElementById("chat-feed");
const promptForm = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt-input");
const btnSendPrompt = document.getElementById("btn-send-prompt");
const btnVoiceInput = document.getElementById("btn-voice-input");

// Dropdowns da Barra (+ e Seletor Dinâmico de Modelos)
const btnAttach = document.getElementById("btn-attach");
const attachDropdown = document.getElementById("attach-dropdown");
const actionUploadFile = document.getElementById("action-upload-file");
const actionOpenScheduledFromTools = document.getElementById("action-open-scheduled-from-tools");
const actionOpenStudiesFromTools = document.getElementById("action-open-studies-from-tools");
const actionOpenSportsFromTools = document.getElementById("action-open-sports-from-tools");
const actionOpenAgroFromTools = document.getElementById("action-open-agro-from-tools");

const modelSelector = document.getElementById("model-selector");
const btnModelSelector = document.getElementById("btn-model-selector");
const modelDropdownMenu = document.getElementById("model-dropdown-menu");
const modelPrimaryOptions = document.getElementById("model-primary-options");
const modelTriggerName = document.getElementById("model-trigger-name");
const modelTriggerDot = document.getElementById("model-trigger-dot");
const modelTriggerLevel = document.getElementById("model-trigger-level");
const dynamicModelsList = document.getElementById("dynamic-models-list");
const modelSearchInput = document.getElementById("model-search-input");
const modelCountPill = document.getElementById("model-count-pill");
const btnRefreshModels = document.getElementById("btn-refresh-models");
const btnReasoningToggle = document.getElementById("btn-reasoning-toggle");
const reasoningSublist = document.getElementById("reasoning-sublist");
const reasoningBadgeLabel = document.getElementById("reasoning-badge-label");

// Configurações
const btnCloseSettings = document.getElementById("btn-close-settings");
const settingsActiveColorLabel = document.getElementById("settings-active-color-label");
const settingsAccentColor = document.getElementById("settings-accent-color");
const settingsGlowToggle = document.getElementById("settings-glow-toggle");
const settingsDefaultModel = document.getElementById("settings-default-model");
const settingsModelsCountBadge = document.getElementById("settings-models-count-badge");
const settingsDefaultReasoning = document.getElementById("settings-default-reasoning");
const settingsStreamToggle = document.getElementById("settings-stream-toggle");
const settingsVoiceLang = document.getElementById("settings-voice-lang");
const settingsVoiceAutosend = document.getElementById("settings-voice-autosend");
const settingsFirebaseBadge = document.getElementById("settings-firebase-badge");
const settingsIntegrationStatus = document.getElementById("settings-integration-status");
const settingsUserName = document.getElementById("settings-user-name");
const settingsUserEmail = document.getElementById("settings-user-email");
const btnExportMarkdown = document.getElementById("btn-export-markdown");
const btnExportHistory = document.getElementById("btn-export-history");
const btnResetSettings = document.getElementById("btn-reset-settings");

// =========================================================================
// ESTADO DA APLICAÇÃO E CONFIGURAÇÕES PERSISTENTES
// =========================================================================
const temaSalvoLogin = localStorage.getItem(THEME_FAMILY_STORAGE_KEY);
const temaInicial = TEMAS_FUNDO_DASHBOARD[temaSalvoLogin] ? temaSalvoLogin : "azul";

const configuracoesPadrao = {
  themeColor: temaInicial,
  accentColor:
    localStorage.getItem(MONOCOLOR_STORAGE_KEY) ||
    TEMAS_FUNDO_DASHBOARD[temaInicial].accent,
  ambientGlow: true,
  defaultModel: "4-hydrogen",
  reasoningLevel: "Alto",
  streaming: true,
  voiceLang: "pt-BR",
  voiceAutoSend: true
};

let configAtual = carregarConfiguracoes();
let catalogoModelos = construirCatalogoLocalBase();
let filtroProvedorModelos = "all";
let buscaModelosTermo = "";

let statusServidor = {
  firebaseConfigurado: false,
  geminiConfigurado: true,
  unoRouterConfigurado: true,
  envProtegido: true
};
let usuarioAtual = null;
let conversaAtualId = `chat_${Date.now()}`;
let notebookAtivoId = null;
let historicoMensagens = [];
let telaAtual = "chat";
let eventoInstalacaoPWA = null;
let reconhecimentoVozAtivo = null;
let ditandoVoz = false;

const estadoRotinas = {
  lista: [],
  filtro: "all"
};

const estadoVarzIA = {
  historicoAtual: [],
  processando: false,
  ligaAtiva: LIGAS_POPULARES_ESPN[0],
  abaAtiva: "games",
  eventos: [],
  classificacao: [],
  noticias: [],
  carregando: false,
  ultimaSincronizacao: null
};

const estadoAgro = {
  historicoAtual: [],
  processando: false,
  registros: [],
  categoriaModalAtiva: null,
  pluviometriaAtual: null
};

function carregarConfiguracoes() {
  try {
    const salvo = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    const combinado = { ...configuracoesPadrao, ...salvo };
    if (!TEMAS_FUNDO_DASHBOARD[combinado.themeColor]) {
      combinado.themeColor = "azul";
    }
    return combinado;
  } catch {
    return { ...configuracoesPadrao };
  }
}

function salvarConfiguracoes() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(configAtual));
  localStorage.setItem(THEME_FAMILY_STORAGE_KEY, configAtual.themeColor);
  localStorage.setItem(MONOCOLOR_STORAGE_KEY, configAtual.accentColor);
}

function selecionarCorDeFundoTema(corId, manterAccentCustom = false) {
  const tema = TEMAS_FUNDO_DASHBOARD[corId] || TEMAS_FUNDO_DASHBOARD.azul;
  configAtual.themeColor = tema.id;
  if (!manterAccentCustom) {
    configAtual.accentColor = tema.accent;
  }
  salvarConfiguracoes();
  aplicarConfiguracoesNaInterface();
  rehidratarGraficosVisiveis();
}

function atualizarModoTelaInicial() {
  const estaNaTelaInicialChat =
    telaAtual === "chat" &&
    historicoMensagens.length === 0 &&
    !heroWelcome.hidden &&
    Boolean(defaultChartWrapper?.hidden);
  const estaNaTelaInicialSports =
    telaAtual === "sports" &&
    estadoVarzIA.historicoAtual.length === 0 &&
    !varziaWelcomeBox?.hidden;
  const estaNaTelaInicialAgro =
    telaAtual === "agro" && !agroWelcomeBox?.hidden;

  document.body.classList.toggle("welcome-mode", estaNaTelaInicialChat);
  document.body.classList.toggle("sports-welcome-mode", estaNaTelaInicialSports);
  document.body.classList.toggle("agro-welcome-mode", estaNaTelaInicialAgro);
  document.body.classList.toggle("studies-mode", telaAtual === "studies");
  document.body.classList.toggle("scheduled-mode", telaAtual === "scheduled");
  document.body.classList.toggle("sports-mode", telaAtual === "sports");
  document.body.classList.toggle("agro-mode", telaAtual === "agro");
}

function aplicarConfiguracoesNaInterface() {
  const tema = obterTemaAtivoObj();
  document.title = BRAND_NAME;
  if (brandTitleText) brandTitleText.textContent = BRAND_NAME;

  document.body.setAttribute("data-theme-color", tema.id);
  document.documentElement.style.setProperty("--accent-blue", configAtual.accentColor || tema.accent);
  if (metaThemeColor) metaThemeColor.setAttribute("content", tema.metaTheme);
  if (ambientGlow) ambientGlow.hidden = !configAtual.ambientGlow;

  if (settingsActiveColorLabel) {
    settingsActiveColorLabel.textContent = `${tema.nome} (${(configAtual.accentColor || tema.accent).toUpperCase()})`;
  }
  if (settingsAccentColor) settingsAccentColor.value = configAtual.accentColor || tema.accent;
  if (settingsGlowToggle) settingsGlowToggle.checked = configAtual.ambientGlow;
  if (settingsDefaultReasoning) settingsDefaultReasoning.value = configAtual.reasoningLevel;
  if (settingsStreamToggle) settingsStreamToggle.checked = configAtual.streaming;
  if (settingsVoiceLang) settingsVoiceLang.value = configAtual.voiceLang;
  if (settingsVoiceAutosend) settingsVoiceAutosend.checked = configAtual.voiceAutoSend;

  document.querySelectorAll("[data-theme-bg]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeBg === tema.id);
  });

  document.querySelectorAll(".swatch-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.color?.toLowerCase() === (configAtual.accentColor || "").toLowerCase()
    );
  });

  atualizarNivelRaciocinio(configAtual.reasoningLevel, false);
}

// =========================================================================
// PARSER MARKDOWN COMPLETO + GOOGLE CHARTS + CÓPIA SEGURA
// =========================================================================
function escaparHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarInlineMarkdown(linhaEscapada) {
  const tokensInline = [];
  const guardarToken = (html) => {
    const idx = tokensInline.length;
    tokensInline.push(html);
    return `@@MD_INLINE_${idx}@@`;
  };

  // 1. Isola código inline primeiro para não corromper _ ou * dentro de identificadores
  let processado = String(linhaEscapada || "").replace(/`([^`]+)`/g, (_m, code) =>
    guardarToken(`<code class="md-inline-code">${code}</code>`)
  );

  // 2. Isola links Markdown [texto](https://...) para proteger underscores na URL
  processado = processado.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, texto, url) =>
      guardarToken(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${texto}</a>`
      )
  );

  // 3. Formata negrito, itálico e tachado
  processado = processado
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(^|[^a-zA-Z0-9])_([^_]+)_([^a-zA-Z0-9]|$)/g, "$1<em>$2</em>$3")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 4. Restaura tokens isolados
  return processado.replace(/@@MD_INLINE_(\d+)@@/g, (_m, idx) => tokensInline[Number(idx)] || "");
}

function extrairAlinhamentosTabela(linhaSeparadora) {
  return linhaSeparadora
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cel) => {
      const c = cel.trim();
      if (c.startsWith(":") && c.endsWith(":")) return "center";
      if (c.endsWith(":")) return "right";
      return "left";
    });
}

function renderizarTabelaMarkdown(linhasTabela) {
  const parseCelulas = (linha) =>
    linha
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => formatarInlineMarkdown(c.trim()));

  const cabecalhos = parseCelulas(linhasTabela[0]);
  const alinhamentos = extrairAlinhamentosTabela(linhasTabela[1] || "");
  const corpo = linhasTabela.slice(2).map(parseCelulas);

  const thead = `<thead><tr>${cabecalhos
    .map((h, idx) => `<th style="text-align:${alinhamentos[idx] || "left"}">${h}</th>`)
    .join("")}</tr></thead>`;

  const tbody = `<tbody>${corpo
    .map(
      (row) =>
        `<tr>${cabecalhos
          .map(
            (_, idx) =>
              `<td style="text-align:${alinhamentos[idx] || "left"}">${row[idx] ?? ""}</td>`
          )
          .join("")}</tr>`
    )
    .join("")}</tbody>`;

  return `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`;
}

function formatarTextoResposta(textoBruto, emStreaming = false) {
  const textoNormalizado = String(textoBruto || "").replace(/\r\n/g, "\n");

  const tokensBloco = [];
  const textoComPlaceholders = textoNormalizado.replace(
    /```([a-zA-Z0-9_-]*)[ \t]*\n([\s\S]*?)(?:```|$)/g,
    (matchCompleto, langRaw, conteudoRaw) => {
      const fechado = matchCompleto.endsWith("```");
      const lang = (langRaw || "").trim().toLowerCase();
      const idx = tokensBloco.length;

      if (lang === "chart" || lang === "googlechart" || lang === "google-charts") {
        if (!fechado && emStreaming) {
          tokensBloco.push(
            `<div class="ai-google-chart-card"><div class="chart-loading-state">Gerando gráfico interativo Google Charts...</div></div>`
          );
        } else {
          const encoded = encodeURIComponent(conteudoRaw.trim());
          tokensBloco.push(
            `<div class="ai-google-chart-card"><div class="ai-google-chart-slot" data-chart-json="${encoded}"></div></div>`
          );
        }
      } else {
        const tituloLang = lang ? escaparHtml(lang) : "código";
        const codigoLimpo = conteudoRaw.replace(/\n$/, "");
        tokensBloco.push(
          `<pre class="md-code-block"><div class="md-code-header"><span>${tituloLang}</span><button type="button" class="md-copy-code-btn">Copiar</button></div><code>${escaparHtml(
            codigoLimpo
          )}</code></pre>`
        );
      }

      return `\n@@MD_BLOCK_${idx}@@\n`;
    }
  );

  const escapado = escaparHtml(textoComPlaceholders);
  const linhas = escapado.split("\n");
  const blocos = [];
  let listaAtual = null;
  let listaTask = false;
  let blockquoteBuffer = [];

  const fecharLista = () => {
    if (listaAtual) {
      blocos.push(`</${listaAtual}>`);
      listaAtual = null;
      listaTask = false;
    }
  };

  const fecharBlockquote = () => {
    if (blockquoteBuffer.length > 0) {
      blocos.push(
        `<blockquote class="md-blockquote">${blockquoteBuffer
          .map((l) => formatarInlineMarkdown(l))
          .join("<br />")}</blockquote>`
      );
      blockquoteBuffer = [];
    }
  };

  for (let i = 0; i < linhas.length; i++) {
    const linhaBruta = linhas[i];
    const linha = linhaBruta.trim();

    if (!linha) {
      fecharLista();
      fecharBlockquote();
      continue;
    }

    const matchToken = linha.match(/^@@MD_BLOCK_(\d+)@@$/);
    if (matchToken) {
      fecharLista();
      fecharBlockquote();
      blocos.push(tokensBloco[Number(matchToken[1])] || "");
      continue;
    }

    if (linha.startsWith("&gt;")) {
      fecharLista();
      blockquoteBuffer.push(linha.replace(/^&gt;\s?/, ""));
      continue;
    } else {
      fecharBlockquote();
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(linha)) {
      fecharLista();
      blocos.push('<hr class="md-hr" />');
      continue;
    }

    if (
      linha.includes("|") &&
      i + 1 < linhas.length &&
      /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(linhas[i + 1].trim())
    ) {
      fecharLista();
      const linhasTabela = [linha, linhas[i + 1].trim()];
      i += 2;
      while (i < linhas.length && linhas[i].trim().includes("|")) {
        linhasTabela.push(linhas[i].trim());
        i++;
      }
      i--;
      blocos.push(renderizarTabelaMarkdown(linhasTabela));
      continue;
    }

    const matchHeading = linha.match(/^(#{1,6})\s+(.*)$/);
    if (matchHeading) {
      fecharLista();
      const nivel = Math.min(6, matchHeading[1].length);
      const tag = `h${nivel}`;
      blocos.push(
        `<${tag} class="md-h${nivel}">${formatarInlineMarkdown(matchHeading[2])}</${tag}>`
      );
      continue;
    }

    const matchTask = linha.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (matchTask) {
      if (listaAtual !== "ul" || !listaTask) {
        fecharLista();
        blocos.push('<ul class="md-list md-task-list">');
        listaAtual = "ul";
        listaTask = true;
      }
      const marcada = matchTask[1].toLowerCase() === "x";
      blocos.push(
        `<li class="msg-task-item"><span class="md-task-box ${
          marcada ? "checked" : ""
        }" aria-hidden="true">${marcada ? "✓" : ""}</span><span>${formatarInlineMarkdown(
          matchTask[2]
        )}</span></li>`
      );
      continue;
    }

    const matchBullet = linha.match(/^[-*•]\s+(.*)$/);
    if (matchBullet) {
      if (listaAtual !== "ul" || listaTask) {
        fecharLista();
        blocos.push('<ul class="md-list">');
        listaAtual = "ul";
        listaTask = false;
      }
      blocos.push(`<li>${formatarInlineMarkdown(matchBullet[1])}</li>`);
      continue;
    }

    const matchNum = linha.match(/^\d+\.\s+(.*)$/);
    if (matchNum) {
      if (listaAtual !== "ol") {
        fecharLista();
        blocos.push('<ol class="md-list">');
        listaAtual = "ol";
        listaTask = false;
      }
      blocos.push(`<li>${formatarInlineMarkdown(matchNum[1])}</li>`);
      continue;
    }

    fecharLista();
    blocos.push(`<p>${formatarInlineMarkdown(linha)}</p>`);
  }

  fecharLista();
  fecharBlockquote();
  return blocos.join("") || `<p>${escaparHtml(textoBruto)}</p>`;
}

function vincularBotoesCopiaMarkdown(balao) {
  if (!balao) return;

  balao.querySelectorAll(".md-copy-code-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pre = btn.closest(".md-code-block");
      const codeText = pre?.querySelector("code")?.textContent || "";
      if (!codeText) return;
      await navigator.clipboard.writeText(codeText).catch(() => {});
      const original = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    });
  });
}

async function renderizarBalaoModelo(balao, textoMarkdown, meta = {}, emStreaming = false) {
  if (!balao) return;
  balao.dataset.rawMarkdown = textoMarkdown || "";

  let corpoMd = balao.querySelector(".msg-markdown-body");
  let rawPre = balao.querySelector(".msg-raw-markdown");
  let footer = balao.querySelector(".msg-meta-footer");

  if (!corpoMd) {
    balao.innerHTML = `
      <div class="msg-markdown-body"></div>
      <pre class="msg-raw-markdown" hidden></pre>
      <div class="msg-meta-footer" hidden>
        <span class="msg-model-tag"></span>
        <div class="msg-meta-actions">
          <button type="button" class="msg-action-btn" data-action="toggle-raw">Ver MD</button>
          <button type="button" class="msg-action-btn" data-action="copy-md">Copiar Markdown</button>
        </div>
      </div>
    `;
    corpoMd = balao.querySelector(".msg-markdown-body");
    rawPre = balao.querySelector(".msg-raw-markdown");
    footer = balao.querySelector(".msg-meta-footer");

    const btnCopyMd = footer.querySelector('[data-action="copy-md"]');
    const btnToggleRaw = footer.querySelector('[data-action="toggle-raw"]');

    btnCopyMd?.addEventListener("click", async () => {
      const md = balao.dataset.rawMarkdown || "";
      await navigator.clipboard.writeText(md).catch(() => {});
      btnCopyMd.textContent = "Copiado!";
      setTimeout(() => {
        btnCopyMd.textContent = "Copiar Markdown";
      }, 1600);
    });

    btnToggleRaw?.addEventListener("click", () => {
      const exibindoRaw = !rawPre.hidden;
      rawPre.hidden = exibindoRaw;
      corpoMd.hidden = !exibindoRaw;
      btnToggleRaw.textContent = exibindoRaw ? "Ver MD" : "Ver Formatado";
    });
  }

  corpoMd.innerHTML = formatarTextoResposta(textoMarkdown, emStreaming);
  rawPre.textContent = textoMarkdown;

  if (!emStreaming) {
    vincularBotoesCopiaMarkdown(balao);
    await hidratarGraficosNoContainer(balao);
    const rotuloModelo = meta.modelo || obterRotuloModeloAtivo();
    const rotuloProvedor = meta.provedor || "Markdown";
    const tagEl = footer.querySelector(".msg-model-tag");
    if (tagEl) tagEl.textContent = `${rotuloModelo} • ${rotuloProvedor}`;
    footer.hidden = false;
  }
}

// =========================================================================
// DIAGNÓSTICO DO SERVIDOR E CATÁLOGO DINÂMICO DE MODELOS
// =========================================================================
async function sincronizarStatusServidor() {
  document.title = BRAND_NAME;
  if (brandTitleText) brandTitleText.textContent = BRAND_NAME;

  try {
    const resp = await fetch("/api/status");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados = await resp.json();
    statusServidor = dados.integracoesEnv || statusServidor;
  } catch {
    // Mantém flags padrão em caso de indisponibilidade transitória
  }

  const provedoresAtivos = [];
  if (statusServidor.geminiConfigurado) provedoresAtivos.push("Gemini");
  if (statusServidor.unoRouterConfigurado) provedoresAtivos.push("UnoRouter");

  if (userStatusBadge && usuarioAtual) {
    userStatusBadge.textContent =
      provedoresAtivos.length > 0 ? provedoresAtivos.join(" + ") : "Conectado";
  }

  if (heroProvidersSummary) {
    heroProvidersSummary.textContent =
      provedoresAtivos.length > 0
        ? `Ativo: ${provedoresAtivos.join(" + ")} • ESPN • Open-Meteo • Markdown`
        : "Workspace Dinâmico • Markdown";
  }

  if (settingsFirebaseBadge) {
    settingsFirebaseBadge.textContent = statusServidor.firebaseConfigurado
      ? "Conectado"
      : "Configurar .env";
  }

  renderizarStatusIntegracoesConfig();
}

function renderizarStatusIntegracoesConfig() {
  if (!settingsIntegrationStatus) return;
  const itens = [
    { nome: "Firebase Auth & DB", ok: Boolean(statusServidor.firebaseConfigurado) },
    { nome: "Google Gemini / Vertex", ok: Boolean(statusServidor.geminiConfigurado) },
    { nome: "UnoRouter (:free)", ok: Boolean(statusServidor.unoRouterConfigurado) },
    { nome: "Blindagem .env", ok: Boolean(statusServidor.envProtegido !== false) }
  ];
  settingsIntegrationStatus.innerHTML = itens
    .map(
      (item) => `
      <div class="integration-chip">
        <span>${escaparHtml(item.nome)}</span>
        <span class="${item.ok ? "status-ok" : "status-warn"}">${item.ok ? "OK" : "Pendente"}</span>
      </div>
    `
    )
    .join("");
}

async function carregarCatalogoDinamicoModelos(silencioso = false) {
  const spinnerEl = document.getElementById("model-loading-spinner");

  if (!silencioso && btnRefreshModels) {
    btnRefreshModels.classList.add("spinning");
  }
  if (!silencioso && spinnerEl) {
    spinnerEl.hidden = false;
  }

  try {
    const resp = await fetch("/api/models");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados = await resp.json();
    if (Array.isArray(dados?.models) && dados.models.length > 0) {
      catalogoModelos = dados.models;
    }
    if (dados?.providers) {
      statusServidor.geminiConfigurado = Boolean(dados.providers.gemini);
      statusServidor.unoRouterConfigurado = Boolean(dados.providers.unoRouter);
      statusServidor.firebaseConfigurado = Boolean(dados.providers.firebase);
    }
  } catch {
    // Mantém catálogo base local em caso de falha de rede
  } finally {
    if (btnRefreshModels) {
      btnRefreshModels.classList.remove("spinning");
    }
    if (spinnerEl) {
      spinnerEl.hidden = true;
    }
  }

  inicializarSeletorModelos();
}

function obterModeloPorId(id) {
  return catalogoModelos.find((m) => m.id === id) || null;
}

function obterRotuloModeloAtivo() {
  const atual = obterModeloPorId(modelSelector?.value);
  return atual?.nome || modelTriggerName?.textContent || "4 Hydrogen";
}

function renderizarListaModelosPopover() {
  if (!modelPrimaryOptions || !dynamicModelsList) return;

  const termo = buscaModelosTermo.trim().toLowerCase();
  const filtrados = catalogoModelos.filter((m) => {
    const matchProvider =
      filtroProvedorModelos === "all" || m.provedor === filtroProvedorModelos;
    const matchTermo =
      !termo ||
      m.nome.toLowerCase().includes(termo) ||
      m.id.toLowerCase().includes(termo) ||
      (m.descricao || "").toLowerCase().includes(termo) ||
      (m.subProvedor || "").toLowerCase().includes(termo);
    return matchProvider && matchTermo;
  });

  if (modelCountPill) {
    modelCountPill.textContent = `${filtrados.length}/${catalogoModelos.length}`;
  }

  const principais = filtrados.filter((m) => m.provedor === "auto" || m.provedor === "gemini");
  const unorouter = filtrados.filter((m) => m.provedor === "unorouter");

  // Mapeia ícone/abreviatura por provedor para visual moderno
  const iconePorProvedor = {
    auto: { label: "⚡", css: "icon-auto" },
    gemini: { label: "G", css: "icon-gemini" },
    unorouter: { label: "U", css: "icon-unorouter" }
  };

  // Mapeia classe de badge por texto para visual colorido
  const badgeCssMap = {
    "Pro": "pro",
    "Rápido": "rapid",
    ":free": "free",
    "free": "free",
    "Free": "free",
    "Lite": "rapid",
    "1M": "pro",
    "Auto": "pro"
  };

  const criarBotaoModelo = (m) => {
    const icone = iconePorProvedor[m.provedor] || { label: "?", css: "" };
    const badgeClass = m.gratuito ? "free" : (badgeCssMap[m.badge] || "");
    return `
    <button
      type="button"
      class="model-option-item"
      data-model-value="${escaparHtml(m.id)}"
      data-model-label="${escaparHtml(m.nome)}"
      data-model-provider="${escaparHtml(m.provedor)}"
      role="option"
      aria-selected="false"
    >
      <span class="model-item-provider-icon ${icone.css}" aria-hidden="true">${icone.label}</span>
      <div class="model-option-text">
        <div class="model-option-top-line">
          <strong>${escaparHtml(m.nome)}</strong>
          <span class="model-tag-group">
            ${m.contexto ? `<span class="model-mini-badge">${escaparHtml(m.contexto)}</span>` : ""}
            ${m.badge ? `<span class="model-mini-badge ${badgeClass}">${escaparHtml(m.badge)}</span>` : ""}
          </span>
        </div>
        <span>${escaparHtml(m.descricao || m.subProvedor || m.id)}</span>
      </div>
    </button>
  `;
  };

  modelPrimaryOptions.innerHTML =
    principais.length > 0
      ? `<div class="model-dynamic-header">Inteligente &amp; Google Gemini</div>${principais
          .map(criarBotaoModelo)
          .join("")}`
      : "";

  dynamicModelsList.innerHTML =
    unorouter.length > 0
      ? `<div class="model-dynamic-header">UnoRouter (:free)</div>${unorouter
          .map(criarBotaoModelo)
          .join("")}`
      : "";

  if (principais.length === 0 && unorouter.length === 0) {
    modelPrimaryOptions.innerHTML = `
      <div class="model-option-item" style="opacity:0.65;cursor:default;">
        <span class="model-item-provider-icon" aria-hidden="true">?</span>
        <div class="model-option-text">
          <strong>Nenhum modelo encontrado</strong>
          <span>Ajuste a busca ou filtro de provedor.</span>
        </div>
      </div>
    `;
  }

  modelDropdownMenu
    ?.querySelectorAll(".model-option-item[data-model-value]")
    .forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        selecionarModelo(item.dataset.modelValue, item.dataset.modelLabel, true);
        fecharPopoversBarra();
      });
    });

  destacarModeloSelecionadoNaLista(modelSelector?.value);
}

function inicializarSeletorModelos() {
  if (!modelSelector) return;

  const autoOpt = catalogoModelos.filter((m) => m.provedor === "auto");
  const geminiOpts = catalogoModelos.filter((m) => m.provedor === "gemini");
  const unoOpts = catalogoModelos.filter((m) => m.provedor === "unorouter");

  const grupos = [];
  if (autoOpt.length) {
    grupos.push(
      `<optgroup label="Inteligente">${autoOpt
        .map((m) => `<option value="${escaparHtml(m.id)}">${escaparHtml(m.nome)}</option>`)
        .join("")}</optgroup>`
    );
  }
  if (geminiOpts.length) {
    grupos.push(
      `<optgroup label="Google Gemini">${geminiOpts
        .map((m) => `<option value="${escaparHtml(m.id)}">${escaparHtml(m.nome)}</option>`)
        .join("")}</optgroup>`
    );
  }
  if (unoOpts.length) {
    grupos.push(
      `<optgroup label="UnoRouter (:free)">${unoOpts
        .map(
          (m) =>
            `<option value="${escaparHtml(m.id)}">${escaparHtml(m.nome)} (${escaparHtml(
              m.contexto
            )})</option>`
        )
        .join("")}</optgroup>`
    );
  }

  const htmlSelect = grupos.join("");
  modelSelector.innerHTML = htmlSelect;
  if (settingsDefaultModel) settingsDefaultModel.innerHTML = htmlSelect;
  if (settingsModelsCountBadge) {
    settingsModelsCountBadge.textContent = `${catalogoModelos.length} modelos`;
  }

  const modeloSalvo = configAtual.defaultModel;
  const modeloValido =
    catalogoModelos.find((m) => m.id === modeloSalvo)?.id ||
    (modeloSalvo === "Hydrogen" ? "4-hydrogen" : null) ||
    catalogoModelos.find((m) => m.id === "4-hydrogen")?.id ||
    catalogoModelos[0]?.id ||
    "4-hydrogen";

  const objAlvo = obterModeloPorId(modeloValido);
  renderizarListaModelosPopover();
  selecionarModelo(modeloValido, objAlvo?.nome || "4 Hydrogen", false);
}

function destacarModeloSelecionadoNaLista(valor) {
  modelDropdownMenu?.querySelectorAll(".model-option-item").forEach((btn) => {
    const ativo = btn.dataset.modelValue === valor;
    btn.classList.toggle("selected", ativo);
    btn.setAttribute("aria-selected", ativo ? "true" : "false");
    // A marca de check fica no ícone do provedor (não há mais .model-check)
  });
}

function selecionarModelo(valor, rotulo, persistir = true) {
  if (!modelSelector) return;
  const obj = obterModeloPorId(valor);
  const nomeFinal = rotulo || obj?.nome || valor;
  const provedor = obj?.provedor || (valor.endsWith(":free") ? "unorouter" : "gemini");
  const nivelAtual = configAtual.reasoningLevel || "Alto";

  modelSelector.value = valor;
  if (modelTriggerName) modelTriggerName.textContent = nomeFinal;
  if (settingsDefaultModel) settingsDefaultModel.value = valor;
  if (topbarActiveModelBadge) {
    topbarActiveModelBadge.textContent = `${nomeFinal} (${nivelAtual})`;
  }
  if (modelTriggerDot) {
    modelTriggerDot.className = `model-provider-dot provider-${provedor}`;
  }

  // Atualiza card de preview do modelo ativo dentro do popover
  const previewDot = document.getElementById("model-active-dot-preview");
  const previewName = document.getElementById("model-active-name-preview");
  const previewLevel = document.getElementById("model-active-level-preview");
  if (previewDot) {
    previewDot.className = `model-active-dot model-provider-dot provider-${provedor}`;
  }
  if (previewName) previewName.textContent = nomeFinal;
  if (previewLevel) previewLevel.textContent = nivelAtual;

  destacarModeloSelecionadoNaLista(valor);

  if (persistir) {
    configAtual.defaultModel = valor;
    salvarConfiguracoes();
  }
}

function atualizarNivelRaciocinio(nivel, persistir = true) {
  configAtual.reasoningLevel = nivel;
  if (modelTriggerLevel) modelTriggerLevel.textContent = nivel;
  if (reasoningBadgeLabel) reasoningBadgeLabel.textContent = nivel;
  if (topbarActiveModelBadge) {
    topbarActiveModelBadge.textContent = `${obterRotuloModeloAtivo()} (${nivel})`;
  }

  // Sincroniza badge de nível no preview do popover
  const previewLevel = document.getElementById("model-active-level-preview");
  if (previewLevel) previewLevel.textContent = nivel;

  document.querySelectorAll(".reasoning-choice").forEach((btn) => {
    const ativo = btn.dataset.reasoning === nivel;
    btn.classList.toggle("active", ativo);
    btn.textContent = ativo ? `${nivel} ✓` : btn.dataset.reasoning;
  });

  if (persistir) salvarConfiguracoes();
}

function posicionarPopoverInteligente(popover) {
  if (!popover || !promptWrapper) return;
  const rect = promptWrapper.getBoundingClientRect();
  const espacoAcima = rect.top;
  const espacoAbaixo = window.innerHeight - rect.bottom;
  const abrirParaBaixo = espacoAbaixo > espacoAcima && espacoAcima < 320;
  popover.classList.toggle("open-down", abrirParaBaixo);
}

// =========================================================================
// NAVEGAÇÃO ENTRE TELAS
// =========================================================================
const ROTULOS_MODO_TOPBAR = {
  chat: "Chat Principal",
  scheduled: "Programado • Rotinas",
  studies: "Estudantes • Notebooks",
  sports: "VarzIA • Esportes ao Vivo",
  agro: "Agro Inteligente",
  settings: "Configurações"
};

function navegarParaTela(destino) {
  telaAtual = destino;

  if (viewChat) viewChat.hidden = destino !== "chat";
  if (viewScheduled) viewScheduled.hidden = destino !== "scheduled";
  if (viewStudies) viewStudies.hidden = destino !== "studies";
  if (viewSports) viewSports.hidden = destino !== "sports";
  if (viewAgro) viewAgro.hidden = destino !== "agro";
  if (viewSettings) viewSettings.hidden = destino !== "settings";
  if (promptDock) promptDock.hidden = destino === "settings";

  if (topbarModeLabel) {
    topbarModeLabel.textContent = ROTULOS_MODO_TOPBAR[destino] || "Workspace";
  }

  if (promptInput) {
    const placeholder =
      destino === "sports"
        ? "Peça ao VarzIA (ex: tabela atualizada, escalação ou gráfico em Markdown)"
        : destino === "agro"
        ? "Peça ao Agro (ex: janela de pulverização, chuvas mm ou saldo diesel)"
        : destino === "scheduled"
        ? "Peça ao Planejador (ex: priorizar tarefas e gerar cronograma em Markdown)"
        : "Peça ao W3Labs WillIAn (respostas em Markdown e gráficos)";
    promptInput.placeholder = placeholder;
    promptInput.setAttribute("aria-label", placeholder);
  }

  document.querySelectorAll("[data-view-target]").forEach((el) => {
    const ativo = el.dataset.viewTarget === destino;
    el.classList.toggle("active", ativo);
    if (el.getAttribute("role") === "tab") {
      el.setAttribute("aria-selected", String(ativo));
    }
  });

  if (destino === "sports" && !estadoVarzIA.ultimaSincronizacao && !estadoVarzIA.carregando) {
    carregarDadosVarzIA();
  }
  if (destino === "agro" && estadoAgro.pluviometriaAtual) {
    renderizarMiniGraficoPluviometriaAgro(estadoAgro.pluviometriaAtual);
  }

  atualizarModoTelaInicial();
  fecharPopoversBarra();
  fecharMenuMobile();
}

document.querySelectorAll("[data-view-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const alvo = btn.dataset.viewTarget;
    if (alvo === "chat" && btn.id === "btn-new-chat") {
      if (telaAtual === "sports") {
        iniciarNovaConversaVarzIA();
      } else if (telaAtual === "agro") {
        iniciarNovaConversaAgro();
      } else {
        iniciarNovaConversa();
      }
    } else {
      navegarParaTela(alvo);
    }
  });
});

document.querySelectorAll("[data-quick-action]").forEach((card) => {
  card.addEventListener("click", () => {
    const acao = card.dataset.quickAction;
    if (acao === "chat") {
      const prompt = card.dataset.quickPrompt || "";
      promptInput.value = prompt;
      atualizarEstadoBotaoEnviar();
      promptInput.focus();
    } else {
      navegarParaTela(acao);
    }
  });
});

btnCloseSettings?.addEventListener("click", () => navegarParaTela("chat"));

// =========================================================================
// TEMA DE 4 CORES (VERDE, AMARELO, AZUL, VERMELHO) + CONFIGURAÇÕES
// =========================================================================
document.querySelectorAll("[data-theme-bg]").forEach((btn) => {
  btn.addEventListener("click", () => {
    selecionarCorDeFundoTema(btn.dataset.themeBg, false);
  });
});

document.querySelectorAll(".settings-tab-pill").forEach((tab) => {
  tab.addEventListener("click", () => {
    const filtro = tab.dataset.settingsFilter;

    document.querySelectorAll(".settings-tab-pill").forEach((el) => {
      const ativo = el === tab;
      el.classList.toggle("active", ativo);
      el.setAttribute("aria-selected", String(ativo));
    });

    document.querySelectorAll(".settings-card[data-settings-section]").forEach((card) => {
      const visivel = filtro === "all" || card.dataset.settingsSection === filtro;
      card.hidden = !visivel;
    });
  });
});

// =========================================================================
// EVENTOS DO SELETOR DE MODELOS E POPOVERS DA BARRA
// =========================================================================
btnToggleHistory?.addEventListener("click", () => {
  const expandido = btnToggleHistory.getAttribute("aria-expanded") === "true";
  btnToggleHistory.setAttribute("aria-expanded", String(!expandido));
  historyList.hidden = expandido;
  historyChevron.classList.toggle("rotated", !expandido);
});

btnSearchChats?.addEventListener("click", () => {
  const oculto = sidebarSearchBox.hidden;
  sidebarSearchBox.hidden = !oculto;
  btnSearchChats.classList.toggle("active", oculto);
  if (oculto) {
    sidebarSearchInput.focus();
  } else {
    sidebarSearchInput.value = "";
    filtrarItensHistorico("");
  }
});

sidebarSearchInput?.addEventListener("input", (e) => {
  filtrarItensHistorico(e.target.value);
});

function filtrarItensHistorico(termo) {
  const busca = termo.trim().toLowerCase();
  historyList.querySelectorAll("li").forEach((li) => {
    const texto = li.textContent.toLowerCase();
    li.hidden = busca.length > 0 && !texto.includes(busca);
  });
}

btnModelSelector?.addEventListener("click", (e) => {
  e.stopPropagation();
  const abrir = modelDropdownMenu.hidden;
  fecharPopoversBarra();
  if (abrir) {
    posicionarPopoverInteligente(modelDropdownMenu);
    modelDropdownMenu.hidden = false;
    btnModelSelector.setAttribute("aria-expanded", "true");
    modelSearchInput?.focus();
  }
});

modelDropdownMenu?.addEventListener("click", (e) => {
  e.stopPropagation();
});

modelSearchInput?.addEventListener("input", (e) => {
  buscaModelosTermo = e.target.value || "";
  renderizarListaModelosPopover();
});

document.querySelectorAll("[data-provider-filter]").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    e.stopPropagation();
    filtroProvedorModelos = tab.dataset.providerFilter || "all";
    document.querySelectorAll("[data-provider-filter]").forEach((el) => {
      el.classList.toggle("active", el === tab);
    });
    renderizarListaModelosPopover();
  });
});

btnRefreshModels?.addEventListener("click", (e) => {
  e.stopPropagation();
  carregarCatalogoDinamicoModelos(false);
});

btnReasoningToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  const abrir = reasoningSublist.hidden;
  reasoningSublist.hidden = !abrir;
  btnReasoningToggle.setAttribute("aria-expanded", String(abrir));
});

document.querySelectorAll(".reasoning-choice").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    atualizarNivelRaciocinio(btn.dataset.reasoning, true);
  });
});

btnAttach?.addEventListener("click", (e) => {
  e.stopPropagation();
  const abrir = attachDropdown.hidden;
  fecharPopoversBarra();
  if (abrir) {
    posicionarPopoverInteligente(attachDropdown);
    attachDropdown.hidden = false;
    btnAttach.setAttribute("aria-expanded", "true");
  }
});

actionDemoGoogleChart?.addEventListener("click", async () => {
  fecharPopoversBarra();
  navegarParaTela("chat");
  if (heroWelcome) heroWelcome.hidden = true;
  if (defaultChartWrapper) defaultChartWrapper.hidden = false;
  atualizarModoTelaInicial();
  await garantirGoogleChartsCarregado();
  drawChart();
});

btnCloseDefaultChart?.addEventListener("click", () => {
  if (defaultChartWrapper) defaultChartWrapper.hidden = true;
  if (historicoMensagens.length === 0 && heroWelcome) {
    heroWelcome.hidden = false;
  }
  atualizarModoTelaInicial();
});

actionUploadFile?.addEventListener("click", () => {
  fecharPopoversBarra();
  const seletorArquivo = document.createElement("input");
  seletorArquivo.type = "file";
  seletorArquivo.accept = ".txt,.md,.json,.csv,.js,.ts,.py,.html,.css";
  seletorArquivo.onchange = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const conteudo = await arquivo.text();
    navegarParaTela("chat");
    promptInput.value = `Analise em Markdown o arquivo "${arquivo.name}":\n\n\`\`\`\n${conteudo.slice(
      0,
      6000
    )}\n\`\`\``;
    atualizarEstadoBotaoEnviar();
    promptInput.focus();
  };
  seletorArquivo.click();
});

attachDropdown?.querySelectorAll("[data-tool-prefix]").forEach((btn) => {
  btn.addEventListener("click", () => {
    fecharPopoversBarra();
    navegarParaTela("chat");
    promptInput.value = btn.dataset.toolPrefix;
    atualizarEstadoBotaoEnviar();
    promptInput.focus();
  });
});

actionOpenScheduledFromTools?.addEventListener("click", () => {
  fecharPopoversBarra();
  navegarParaTela("scheduled");
});
actionOpenStudiesFromTools?.addEventListener("click", () => {
  fecharPopoversBarra();
  navegarParaTela("studies");
});
actionOpenSportsFromTools?.addEventListener("click", () => {
  fecharPopoversBarra();
  navegarParaTela("sports");
});
actionOpenAgroFromTools?.addEventListener("click", () => {
  fecharPopoversBarra();
  navegarParaTela("agro");
});

function fecharPopoversBarra() {
  if (attachDropdown) attachDropdown.hidden = true;
  if (btnAttach) btnAttach.setAttribute("aria-expanded", "false");
  if (modelDropdownMenu) modelDropdownMenu.hidden = true;
  if (btnModelSelector) btnModelSelector.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".prompt-wrapper")) {
    fecharPopoversBarra();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharPopoversBarra();
    fecharMenuMobile();
    fecharModalAgro();
    if (newNotebookPanel && !newNotebookPanel.hidden) {
      newNotebookPanel.hidden = true;
    }
  }
});

// =========================================================================
// DITADO POR VOZ LOCAL (WEB SPEECH API)
// =========================================================================
function pararDitadoVoz() {
  ditandoVoz = false;
  btnVoiceInput?.classList.remove("recording");
  if (reconhecimentoVozAtivo) {
    try {
      reconhecimentoVozAtivo.stop();
    } catch {}
    reconhecimentoVozAtivo = null;
  }
}

btnVoiceInput?.addEventListener("click", () => {
  if (ditandoVoz) {
    pararDitadoVoz();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz nativo.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = configAtual.voiceLang || "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = true;

  const textoBase = promptInput.value.trim();

  recognition.onstart = () => {
    ditandoVoz = true;
    btnVoiceInput.classList.add("recording");
  };

  recognition.onresult = (event) => {
    let falado = "";
    let finalizou = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      falado += event.results[i][0].transcript;
      if (event.results[i].isFinal) finalizou = true;
    }

    promptInput.value = textoBase ? `${textoBase} ${falado.trim()}` : falado.trim();
    atualizarEstadoBotaoEnviar();

    if (finalizou && configAtual.voiceAutoSend && promptInput.value.trim()) {
      pararDitadoVoz();
      promptForm.requestSubmit();
    }
  };

  recognition.onerror = () => pararDitadoVoz();
  recognition.onend = () => pararDitadoVoz();

  reconhecimentoVozAtivo = recognition;
  recognition.start();
});

// =========================================================================
// MÓDULO PROGRAMADO: ROTINAS & TAREFAS NO FIRESTORE
// =========================================================================
async function carregarRotinasProgramadas() {
  if (!usuarioAtual) return;

  try {
    const refRotinas = collection(db, "usuarios", usuarioAtual.uid, "rotinas_programadas");
    const q = query(refRotinas, orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(q);
    estadoRotinas.lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (erro) {
    console.warn("Falha ao ler rotinas do Firestore:", erro);
    estadoRotinas.lista = [];
  }

  renderizarRotinasProgramadas();
}

function renderizarRotinasProgramadas() {
  if (!scheduledList) return;

  const total = estadoRotinas.lista.length;
  const concluidas = estadoRotinas.lista.filter((r) => Boolean(r.concluida)).length;
  const pendentes = total - concluidas;

  if (schedKpiTotal) schedKpiTotal.textContent = String(total);
  if (schedKpiPending) schedKpiPending.textContent = String(pendentes);
  if (schedKpiDone) schedKpiDone.textContent = String(concluidas);

  if (navBadgeScheduled) {
    navBadgeScheduled.textContent = String(pendentes);
    navBadgeScheduled.hidden = pendentes === 0;
  }

  const filtro = estadoRotinas.filtro;
  const visiveis = estadoRotinas.lista.filter((r) => {
    if (filtro === "all") return true;
    if (filtro === "pending") return !r.concluida;
    if (filtro === "done") return Boolean(r.concluida);
    return r.categoria === filtro;
  });

  if (visiveis.length === 0) {
    scheduledList.innerHTML = `
      <div class="notebook-empty-state">
        <span>Nenhuma rotina neste filtro. Adicione uma tarefa acima para organizar seu dia.</span>
      </div>
    `;
    return;
  }

  scheduledList.innerHTML = "";
  visiveis.forEach((rotina) => {
    const item = document.createElement("div");
    item.className = `scheduled-item ${rotina.concluida ? "completed" : ""}`;
    item.innerHTML = `
      <div class="scheduled-item-left">
        <button type="button" class="scheduled-check-btn" aria-label="Alternar conclusão">
          ${rotina.concluida ? "✓" : ""}
        </button>
        <div class="scheduled-item-info">
          <strong>${escaparHtml(rotina.titulo)}</strong>
          <div class="scheduled-meta-line">
            <span class="sched-tag">${escaparHtml(rotina.categoria || "Geral")}</span>
            <span>${escaparHtml(rotina.horario || "Hoje")}</span>
            <span>• Prioridade ${escaparHtml(rotina.prioridade || "Média")}</span>
          </div>
        </div>
      </div>
      <button type="button" class="icon-btn" title="Excluir rotina" aria-label="Excluir rotina">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    `;

    item.querySelector(".scheduled-check-btn")?.addEventListener("click", async () => {
      if (!usuarioAtual) return;
      await updateDoc(
        doc(db, "usuarios", usuarioAtual.uid, "rotinas_programadas", rotina.id),
        { concluida: !rotina.concluida }
      ).catch(() => {});
      await carregarRotinasProgramadas();
    });

    item.querySelector(".icon-btn")?.addEventListener("click", async () => {
      if (!usuarioAtual) return;
      await deleteDoc(
        doc(db, "usuarios", usuarioAtual.uid, "rotinas_programadas", rotina.id)
      ).catch(() => {});
      await carregarRotinasProgramadas();
    });

    scheduledList.appendChild(item);
  });
}

scheduledForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioAtual) return;
  const titulo = scheduledInputTitle?.value.trim();
  if (!titulo) return;

  await addDoc(collection(db, "usuarios", usuarioAtual.uid, "rotinas_programadas"), {
    titulo,
    horario: scheduledInputTime?.value.trim() || "Hoje",
    categoria: scheduledInputCategory?.value || "Geral",
    prioridade: scheduledInputPriority?.value || "Média",
    concluida: false,
    criadoEm: serverTimestamp()
  });

  scheduledForm.reset();
  await carregarRotinasProgramadas();
});

document.querySelectorAll("[data-sched-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    estadoRotinas.filtro = btn.dataset.schedFilter || "all";
    document.querySelectorAll("[data-sched-filter]").forEach((el) => {
      el.classList.toggle("active", el === btn);
    });
    renderizarRotinasProgramadas();
  });
});

btnScheduledAiPlan?.addEventListener("click", async () => {
  const resumoLista = estadoRotinas.lista.length
    ? estadoRotinas.lista
        .map(
          (r) =>
            `- [${r.concluida ? "x" : " "}] ${r.titulo} (${r.categoria}, ${r.horario}, Prioridade ${r.prioridade})`
        )
        .join("\n")
    : "Nenhuma rotina cadastrada ainda — sugira um modelo produtivo padrão.";

  const pergunta =
    `Organize minhas rotinas programadas abaixo em um plano estratégico em Markdown (com tabela de horários, checkboxes de prioridade e gráfico de distribuição por categoria):\n\n${resumoLista}`;

  navegarParaTela("chat");
  await enviarPerguntaChatGeral(pergunta, SYSTEM_PROMPT_ROTINAS_GEMINI);
});

// =========================================================================
// ABA ESTUDOS: CARTÕES VISUAIS E NOTEBOOKS NO FIRESTORE
// =========================================================================
document.querySelectorAll("[data-study-prompt]").forEach((card) => {
  card.addEventListener("click", () => {
    navegarParaTela("chat");
    promptInput.value = `${card.dataset.studyPrompt} `;
    atualizarEstadoBotaoEnviar();
    promptInput.focus();
  });
});

btnOpenNewNotebook?.addEventListener("click", () => {
  if (!newNotebookPanel) return;
  const abrir = newNotebookPanel.hidden;
  newNotebookPanel.hidden = !abrir;
  if (abrir) inputNotebookTitle?.focus();
});

btnCancelNewNotebook?.addEventListener("click", () => {
  if (!newNotebookPanel) return;
  newNotebookPanel.hidden = true;
  newNotebookPanel.reset();
});

newNotebookPanel?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioAtual) return;

  const titulo = inputNotebookTitle.value.trim();
  const topicoAtual = inputNotebookTopic.value.trim();
  if (!titulo || !topicoAtual) return;

  try {
    const refNotebooks = collection(db, "usuarios", usuarioAtual.uid, "notebooks_estudo");
    const docRef = await addDoc(refNotebooks, {
      titulo,
      topicoAtual,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    newNotebookPanel.reset();
    newNotebookPanel.hidden = true;
    await carregarNotebooksEstudo();

    abrirNotebookParaEstudo({
      id: docRef.id,
      titulo,
      topicoAtual
    });
  } catch (erro) {
    console.error("Erro ao criar notebook de estudo:", erro);
  }
});

async function carregarNotebooksEstudo() {
  if (!usuarioAtual || !notebooksList) return;

  try {
    const refNotebooks = collection(db, "usuarios", usuarioAtual.uid, "notebooks_estudo");
    const q = query(refNotebooks, orderBy("atualizadoEm", "desc"));
    const snapshot = await getDocs(q);

    if (navBadgeStudies) {
      navBadgeStudies.textContent = String(snapshot.size);
      navBadgeStudies.hidden = snapshot.size === 0;
    }

    notebooksList.innerHTML = "";

    if (snapshot.empty) {
      notebooksList.innerHTML = `
        <div class="notebook-empty-state">
          <span>Nenhum notebook de estudo criado ainda. Clique em <strong>+ Novo notebook</strong> para organizar suas matérias.</span>
        </div>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      const notebook = {
        id: docSnap.id,
        titulo: dados.titulo || "Notebook de estudos",
        topicoAtual: dados.topicoAtual || "Revisão geral",
        conversaId: dados.conversaId || null
      };

      const card = document.createElement("div");
      card.className = "notebook-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="notebook-card-top">
          <span class="notebook-book-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="currentColor"/>
              <path d="M7.5 2.5v19" stroke="#09111e" stroke-width="1.6"/>
              <rect x="10" y="6.5" width="7" height="2" rx="1" fill="#ffffff"/>
            </svg>
          </span>
          <span class="notebook-card-title" title="${escaparHtml(notebook.titulo)}">${escaparHtml(
        notebook.titulo
      )}</span>
          <button type="button" class="notebook-delete-btn" title="Excluir notebook" aria-label="Excluir notebook">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
        <div class="notebook-card-bottom">
          <div class="notebook-continue-meta">
            <span class="notebook-continue-label">Continuar aprendendo</span>
            <span class="notebook-continue-topic">${escaparHtml(notebook.topicoAtual)}</span>
          </div>
          <span class="notebook-enter-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 10 20 15 15 20"/>
              <path d="M4 4v7a4 4 0 0 0 4 4h12"/>
            </svg>
          </span>
        </div>
      `;

      card.querySelector(".notebook-delete-btn")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await excluirNotebookEstudo(notebook.id);
      });

      card.addEventListener("click", () => abrirNotebookParaEstudo(notebook));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrirNotebookParaEstudo(notebook);
        }
      });

      notebooksList.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro ao carregar notebooks de estudo:", erro);
    notebooksList.innerHTML = `
      <div class="notebook-empty-state">
        <span>Sem permissão para ler <code>notebooks_estudo</code>. Verifique as regras do Firestore.</span>
      </div>
    `;
  }
}

async function excluirNotebookEstudo(notebookId) {
  if (!usuarioAtual || !notebookId) return;
  try {
    await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "notebooks_estudo", notebookId));
    if (notebookAtivoId === notebookId) notebookAtivoId = null;
    await carregarNotebooksEstudo();
  } catch (erro) {
    console.error("Erro ao excluir notebook:", erro);
  }
}

async function abrirNotebookParaEstudo(notebook) {
  notebookAtivoId = notebook.id;

  if (usuarioAtual && notebook.id) {
    updateDoc(doc(db, "usuarios", usuarioAtual.uid, "notebooks_estudo", notebook.id), {
      atualizadoEm: serverTimestamp()
    }).catch(() => {});
  }

  if (notebook.conversaId) {
    await carregarMensagensDaConversa(notebook.conversaId);
  } else {
    iniciarNovaConversa(false);
  }

  navegarParaTela("chat");
  promptInput.value = `Continuar aprendendo "${notebook.topicoAtual}" em Markdown no notebook "${notebook.titulo}": `;
  atualizarEstadoBotaoEnviar();
  promptInput.focus();
}

// =========================================================================
// VARZIA — HUB ESPORTIVO AO VIVO (ESPN BRASIL) + CHAT MARKDOWN & CHARTS
// =========================================================================
function inicializarBotoesLigasVarzIA() {
  if (!varziaLeaguesBar) return;
  varziaLeaguesBar.innerHTML = LIGAS_POPULARES_ESPN.map(
    (l) => `
      <button
        type="button"
        class="league-pill ${l.id === estadoVarzIA.ligaAtiva.id ? "active" : ""}"
        data-league-id="${escaparHtml(l.id)}"
      >
        ${escaparHtml(l.nome)}
      </button>
    `
  ).join("");

  varziaLeaguesBar.querySelectorAll("[data-league-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const liga = LIGAS_POPULARES_ESPN.find((l) => l.id === btn.dataset.leagueId);
      if (liga) {
        estadoVarzIA.ligaAtiva = liga;
        varziaLeaguesBar.querySelectorAll(".league-pill").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        carregarDadosVarzIA();
      }
    });
  });
}

async function carregarDadosVarzIA() {
  const liga = estadoVarzIA.ligaAtiva;
  estadoVarzIA.carregando = true;
  if (varziaKpiLeague) varziaKpiLeague.textContent = liga.nome;
  if (varziaLastSync) varziaLastSync.textContent = `Buscando jogos e tabela de ${liga.nome} na ESPN Brasil...`;
  if (varziaToolbarLeague) varziaToolbarLeague.textContent = `ESPN Brasil • ${liga.nome}`;

  try {
    const [placarRes, tabelaRes, noticiasRes] = await Promise.allSettled([
      buscarPlacarLiga({ esporte: liga.esporte, liga: liga.liga }),
      buscarClassificacaoLiga({ esporte: liga.esporte, liga: liga.liga }),
      buscarNoticiasLiga({ esporte: liga.esporte, liga: liga.liga, limit: 8 })
    ]);

    estadoVarzIA.eventos =
      placarRes.status === "fulfilled" ? placarRes.value.eventos || [] : [];
    estadoVarzIA.noticias =
      noticiasRes.status === "fulfilled" ? noticiasRes.value.articles || [] : [];

    const entries =
      tabelaRes.status === "fulfilled"
        ? tabelaRes.value.data?.children?.[0]?.standings?.entries ||
          tabelaRes.value.data?.standings?.entries ||
          []
        : [];
    estadoVarzIA.classificacao = entries;
    estadoVarzIA.ultimaSincronizacao = new Date();

    const aoVivo = estadoVarzIA.eventos.filter((e) => e.status?.type?.state === "in").length;
    if (varziaKpiMatches) varziaKpiMatches.textContent = String(estadoVarzIA.eventos.length);
    if (varziaKpiLive) varziaKpiLive.textContent = aoVivo > 0 ? `${aoVivo} ao vivo` : "0 agora";
    if (varziaKpiLeader) {
      varziaKpiLeader.textContent =
        entries[0]?.team?.displayName || estadoVarzIA.eventos[0]?.shortName || "Disponível";
    }
    if (varziaLastSync) {
      varziaLastSync.textContent = `Atualizado às ${estadoVarzIA.ultimaSincronizacao.toLocaleTimeString(
        "pt-BR"
      )} • ${liga.nome}`;
    }

    renderizarJogosVarzIA();
    renderizarClassificacaoVarzIA();
    renderizarNoticiasVarzIA();
  } catch (erro) {
    if (varziaLastSync) {
      varziaLastSync.textContent = `Feed ESPN indisponível (${erro.message}). Você ainda pode conversar com a VarzIA abaixo.`;
    }
  } finally {
    estadoVarzIA.carregando = false;
  }
}

function renderizarJogosVarzIA() {
  if (!varziaGamesGrid) return;
  if (estadoVarzIA.eventos.length === 0) {
    varziaGamesGrid.innerHTML = `
      <div class="notebook-empty-state">
        <span>Nenhuma partida listada para esta janela de ${escaparHtml(
          estadoVarzIA.ligaAtiva.nome
        )}. Pergunte à VarzIA abaixo ou troque de campeonato acima.</span>
      </div>
    `;
    return;
  }

  varziaGamesGrid.innerHTML = "";
  estadoVarzIA.eventos.slice(0, 12).forEach((ev) => {
    const comp = ev.competitions?.[0];
    const times = comp?.competitors || [];
    const casa = times.find((t) => t.homeAway === "home") || times[0] || {};
    const fora = times.find((t) => t.homeAway === "away") || times[1] || {};
    const state = ev.status?.type?.state || "pre";
    const statusText =
      ev.status?.type?.shortDetail ||
      ev.status?.type?.description ||
      formatarDataHoraBrasil(ev.date);
    const casaNome = casa.team?.displayName || "Mandante";
    const foraNome = fora.team?.displayName || "Visitante";
    const casaLogo = casa.team?.logo || "";
    const foraLogo = fora.team?.logo || "";
    const casaPlacar = state === "pre" ? "-" : casa.score ?? "0";
    const foraPlacar = state === "pre" ? "-" : fora.score ?? "0";
    const badgeClass = state === "in" ? "live" : "";
    const badgeLabel =
      state === "in" ? `AO VIVO • ${statusText}` : `${statusText} • ${formatarDataHoraBrasil(ev.date)}`;

    const card = document.createElement("article");
    card.className = "varzia-match-card";
    card.innerHTML = `
      <div class="match-card-top">
        <span class="match-status-badge ${badgeClass}">${escaparHtml(badgeLabel)}</span>
      </div>
      <div class="match-teams-box">
        <div class="match-team-row">
          <div class="match-team-info">
            ${
              casaLogo
                ? `<img class="match-team-logo" src="${escaparHtml(casaLogo)}" alt="${escaparHtml(
                    casaNome
                  )}" loading="lazy" />`
                : ""
            }
            <span class="match-team-name">${escaparHtml(casaNome)}</span>
          </div>
          <span class="match-team-score">${escaparHtml(casaPlacar)}</span>
        </div>
        <div class="match-team-row">
          <div class="match-team-info">
            ${
              foraLogo
                ? `<img class="match-team-logo" src="${escaparHtml(foraLogo)}" alt="${escaparHtml(
                    foraNome
                  )}" loading="lazy" />`
                : ""
            }
            <span class="match-team-name">${escaparHtml(foraNome)}</span>
          </div>
          <span class="match-team-score">${escaparHtml(foraPlacar)}</span>
        </div>
      </div>
      <div class="match-card-footer">
        <span class="match-venue">${escaparHtml(comp?.venue?.fullName || estadoVarzIA.ligaAtiva.nome)}</span>
        <div class="match-actions">
          <button type="button" class="btn-secondary-pill btn-xs" data-match-action="lineup">Escalação</button>
          <button type="button" class="btn-primary-notebook btn-xs" data-match-action="analyze">Analisar</button>
        </div>
      </div>
    `;

    card.querySelector('[data-match-action="analyze"]')?.addEventListener("click", () => {
      enviarPerguntaVarzIA(
        `Faça uma análise completa em Markdown (com tabela comparativa e gráfico) da partida ${casaNome} x ${foraNome} (${estadoVarzIA.ligaAtiva.nome} • ${statusText}).`
      );
    });

    card.querySelector('[data-match-action="lineup"]')?.addEventListener("click", async () => {
      let infoEscalacao = "";
      try {
        const esc = await buscarEscalacaoPartida({
          esporte: estadoVarzIA.ligaAtiva.esporte,
          liga: estadoVarzIA.ligaAtiva.liga,
          eventId: ev.id
        });
        infoEscalacao = esc.equipes
          .map(
            (eq) =>
              `**${eq.nome}** (${eq.formacao || "Formação não informada"}): ${eq.titulares
                .map((j) => `${j.camisa ? "#" + j.camisa + " " : ""}${j.nome} (${j.posicao})`)
                .join(", ")}`
          )
          .join("\n");
      } catch {}

      enviarPerguntaVarzIA(
        `Mostre em tabela Markdown a escalação, formação tática e principais destaques de ${casaNome} x ${foraNome} (${estadoVarzIA.ligaAtiva.nome}).${
          infoEscalacao ? `\n\nDados de escalação ESPN:\n${infoEscalacao}` : ""
        }`
      );
    });

    varziaGamesGrid.appendChild(card);
  });
}

function renderizarClassificacaoVarzIA() {
  if (!varziaStandingsWrap) return;
  const entries = estadoVarzIA.classificacao || [];
  if (varziaStandingsTitle) {
    varziaStandingsTitle.textContent = `Classificação • ${estadoVarzIA.ligaAtiva.nome}`;
  }

  if (entries.length === 0) {
    varziaStandingsWrap.innerHTML = `<div class="chart-loading-state">Tabela de classificação não disponível diretamente neste campeonato. Use o chat da VarzIA para consultar!</div>`;
    return;
  }

  const getStat = (entry, names) => {
    for (const n of names) {
      const found = entry.stats?.find((s) => s.name === n || s.abbreviation === n);
      if (found) return found.displayValue ?? "-";
    }
    return "-";
  };

  const rowsHtml = entries
    .slice(0, 20)
    .map((entry, idx) => {
      const pts = getStat(entry, ["points", "PTS"]);
      const jogos = getStat(entry, ["gamesPlayed", "GP"]);
      const vitorias = getStat(entry, ["wins", "W"]);
      const empates = getStat(entry, ["ties", "D"]);
      const derrotas = getStat(entry, ["losses", "L"]);
      const sg = getStat(entry, ["pointDifferential", "GD"]);
      return `
        <tr>
          <td>${idx + 1}º</td>
          <td><strong>${escaparHtml(entry.team?.displayName || "Time")}</strong></td>
          <td><strong>${escaparHtml(pts)}</strong></td>
          <td>${escaparHtml(jogos)}</td>
          <td>${escaparHtml(vitorias)}</td>
          <td>${escaparHtml(empates)}</td>
          <td>${escaparHtml(derrotas)}</td>
          <td>${escaparHtml(sg)}</td>
        </tr>
      `;
    })
    .join("");

  varziaStandingsWrap.innerHTML = `
    <table class="varzia-standings-table">
      <thead>
        <tr><th>#</th><th>Equipe</th><th>PTS</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function renderizarNoticiasVarzIA() {
  if (!varziaNewsGrid) return;
  if (estadoVarzIA.noticias.length === 0) {
    varziaNewsGrid.innerHTML = `<div class="notebook-empty-state"><span>Sem notícias recentes retornadas para esta liga no momento.</span></div>`;
    return;
  }

  varziaNewsGrid.innerHTML = "";
  estadoVarzIA.noticias.slice(0, 6).forEach((art) => {
    const card = document.createElement("article");
    card.className = "varzia-news-card";
    card.innerHTML = `
      <div>
        <h4>${escaparHtml(art.headline || "Notícia Esportiva")}</h4>
        <p>${escaparHtml(art.description || "")}</p>
      </div>
      <div class="match-actions">
        <button type="button" class="btn-secondary-pill btn-xs">Resumir em Markdown</button>
      </div>
    `;
    card.querySelector("button")?.addEventListener("click", () => {
      enviarPerguntaVarzIA(
        `Comente e contextualize em Markdown esta notícia da ESPN (${estadoVarzIA.ligaAtiva.nome}): "${art.headline}" — ${art.description || ""}`
      );
    });
    varziaNewsGrid.appendChild(card);
  });
}

document.querySelectorAll("[data-varzia-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const alvo = tab.dataset.varziaTab || "games";
    estadoVarzIA.abaAtiva = alvo;
    document.querySelectorAll("[data-varzia-tab]").forEach((el) => {
      el.classList.toggle("active", el === tab);
    });
    if (varziaPanelGames) varziaPanelGames.hidden = alvo !== "games";
    if (varziaPanelStandings) varziaPanelStandings.hidden = alvo !== "standings";
    if (varziaPanelNews) varziaPanelNews.hidden = alvo !== "news";
  });
});

btnVarziaRefresh?.addEventListener("click", () => carregarDadosVarzIA());

btnVarziaAiRound?.addEventListener("click", () => {
  enviarPerguntaVarzIA(
    `Faça um resumo completo da rodada atual de ${estadoVarzIA.ligaAtiva.nome} em Markdown com tabela de jogos, destaques e um gráfico Google Charts.`
  );
});

btnVarziaChartStandings?.addEventListener("click", () => {
  enviarPerguntaVarzIA(
    `Gere uma análise da classificação de ${estadoVarzIA.ligaAtiva.nome} em Markdown com tabela do G-6 e gráfico Google Charts de pontuação.`
  );
});

btnVarziaShowHub?.addEventListener("click", () => {
  if (varziaWelcomeBox) varziaWelcomeBox.hidden = false;
  if (varziaChatToolbar) varziaChatToolbar.hidden = true;
  atualizarModoTelaInicial();
});

function iniciarNovaConversaVarzIA() {
  estadoVarzIA.historicoAtual = [];
  if (varziaChatFeed) {
    varziaChatFeed.innerHTML = "";
    varziaChatFeed.hidden = true;
  }
  if (varziaWelcomeBox) varziaWelcomeBox.hidden = false;
  if (varziaChatToolbar) varziaChatToolbar.hidden = true;

  promptInput.value = "";
  atualizarEstadoBotaoEnviar();
  navegarParaTela("sports");
}

async function adicionarBalaoVarzIA(papel, texto) {
  if (varziaWelcomeBox) varziaWelcomeBox.hidden = true;
  if (varziaChatToolbar) varziaChatToolbar.hidden = false;
  if (varziaChatFeed) varziaChatFeed.hidden = false;
  atualizarModoTelaInicial();

  const balao = document.createElement("div");
  balao.className = `msg-bubble ${papel}`;
  if (papel === "model") {
    await renderizarBalaoModelo(balao, texto, {}, true);
  } else {
    balao.textContent = texto;
  }

  varziaChatFeed.appendChild(balao);
  varziaChatFeed.scrollTop = varziaChatFeed.scrollHeight;
  return balao;
}

async function enviarPerguntaVarzIA(perguntaUsuario) {
  if (estadoVarzIA.processando || !perguntaUsuario.trim()) return;
  estadoVarzIA.processando = true;

  const historicoAnterior = [...estadoVarzIA.historicoAtual];
  await adicionarBalaoVarzIA("user", perguntaUsuario);
  estadoVarzIA.historicoAtual.push({ papel: "user", texto: perguntaUsuario });

  const balaoResposta = await adicionarBalaoVarzIA(
    "model",
    "_Consultando ESPN Brasil e gerando análise em Markdown..._"
  );

  try {
    let blocoTempoReal = "";
    try {
      const contextoEspn = await coletarContextoEsportivoParaIA({
        esportePadrao: estadoVarzIA.ligaAtiva.esporte,
        ligaPadrao: estadoVarzIA.ligaAtiva.liga,
        pergunta: perguntaUsuario
      });
      if (contextoEspn?.textoContexto) {
        blocoTempoReal = `\n\n[Dados complementares em tempo real da ESPN Brasil]:\n${contextoEspn.textoContexto}`;
      }
    } catch {}

    const resultado = await executarPromptIADinamico({
      promptUsuario: perguntaUsuario,
      systemInstruction: `${SYSTEM_PROMPT_VARZIA_GEMINI}${blocoTempoReal}`,
      historico: historicoAnterior,
      balaoResposta,
      feedContainer: varziaChatFeed
    });

    estadoVarzIA.historicoAtual.push({ papel: "model", texto: resultado.texto });
  } catch (erro) {
    await renderizarBalaoModelo(
      balaoResposta,
      `### Não foi possível concluir a análise\n\n- **Detalhe:** ${erro.message}`,
      { modelo: obterRotuloModeloAtivo(), provedor: "Erro" },
      false
    );
  } finally {
    estadoVarzIA.processando = false;
    varziaChatFeed.scrollTop = varziaChatFeed.scrollHeight;
  }
}

// =========================================================================
// AGRO — CENTRAL COMPLETA (FIRESTORE + OPEN-METEO + MINI CHART + BENTO)
// =========================================================================
const CONFIG_MODULOS_AGRO = {
  propriedade: {
    titulo: "Propriedade Rural",
    promptBase:
      "Analise em Markdown com tabela e gráfico os dados da(s) minha(s) propriedade(s) cadastrada(s) no Firestore, área total e potencial produtivo:"
  },
  unidade: {
    titulo: "Unidade / Talhão",
    promptBase:
      "Avalie em Markdown a divisão de unidades/talhões cadastrados na propriedade e gere um gráfico comparativo de áreas:"
  },
  plantio: {
    titulo: "Registro de Plantio",
    promptBase:
      "Analise em Markdown os plantios ativos no Firestore, janela de semeadura, população de plantas e insumos utilizados:"
  },
  colheita: {
    titulo: "Registro de Colheita",
    promptBase:
      "Calcule produtividade média (sc/ha), descontos de umidade e comissões/porcentagens de salário sobre as colheitas registradas, exibindo tabela e gráfico:"
  },
  pluviometro: {
    titulo: "Pluviômetro (Open-Meteo mm)",
    promptBase:
      "Com base nos milímetros (mm) de chuva registrados no pluviômetro e na previsão Open-Meteo, gere um gráfico de colunas e avalie a janela de pulverização, plantio e colheita:"
  },
  diesel: {
    titulo: "Estoque de Diesel",
    promptBase:
      "Faça o balanço do estoque de diesel (entradas vs abastecimentos por máquina) em tabela Markdown + gráfico e estime a autonomia:"
  },
  inventario: {
    titulo: "Inventário (Máquinas & Insumos)",
    promptBase:
      "Revise meu inventário rural (maquinário, implementos, sementes e defensivos) em tabela Markdown e aponte necessidades de reposição:"
  },
  revisoes: {
    titulo: "Revisões de Maquinário",
    promptBase:
      "Verifique as revisões preventivas das máquinas cadastradas no inventário, horímetros e alertas de manutenção:"
  },
  salario: {
    titulo: "Porcentagem de Salário & Comissões",
    promptBase:
      "Calcule em tabela Markdown os valores de salário base + porcentagem sobre produção/colheita para cada operador/colaborador cadastrado:"
  },
  manuais: {
    titulo: "Manuais Técnicos & Guias",
    promptBase:
      "Consulte os manuais técnicos e protocolos salvos no Firestore e resuma os parâmetros operacionais em Markdown:"
  }
};

function obterRegistrosPorCategoria(categoria) {
  return estadoAgro.registros.filter((r) => r.categoria === categoria);
}

async function renderizarMiniGraficoPluviometriaAgro(dadosChuva) {
  if (!agroMiniChart || !dadosChuva?.historicoDiario?.length) return;
  const g = await garantirGoogleChartsCarregado();
  if (!g?.visualization?.DataTable) {
    agroMiniChart.innerHTML = `<p class="chart-loading-state">Previsão carregada (${dadosChuva.chuvaHojeMm} mm hoje).</p>`;
    return;
  }

  const tema = obterTemaAtivoObj();
  const ultimos7 = dadosChuva.historicoDiario.slice(-8);
  const data = new window.google.visualization.DataTable();
  data.addColumn("string", "Dia");
  data.addColumn("number", "Chuva (mm)");
  data.addRows(
    ultimos7.map((d) => [d.data.slice(5).split("-").reverse().join("/"), Number(d.chuvaMm || 0)])
  );

  const largura = Math.max(250, agroMiniChart.clientWidth - 10);
  const chart = new window.google.visualization.ColumnChart(agroMiniChart);
  chart.draw(data, {
    width: largura,
    height: 190,
    backgroundColor: "transparent",
    colors: [tema.accent],
    legend: { position: "none" },
    hAxis: { textStyle: { color: "#cbd5e1", fontSize: 10 } },
    vAxis: {
      textStyle: { color: "#94a3b8", fontSize: 10 },
      gridlines: { color: "rgba(255,255,255,0.08)" }
    },
    chartArea: { left: 36, top: 14, width: "86%", height: "72%" }
  });
}

function renderizarPainelClimaticoAgro(dadosChuva) {
  if (!dadosChuva) return;

  if (agroClimateLocation) {
    agroClimateLocation.textContent = `Clima & Chuva • ${dadosChuva.localizacao.nome}`;
  }
  if (agroClimateSoil) {
    const umid =
      dadosChuva.umidadeSoloSuperficial !== null
        ? `${(dadosChuva.umidadeSoloSuperficial * 100).toFixed(0)}% umid. solo`
        : "Open-Meteo ativo";
    agroClimateSoil.textContent = umid;
  }

  if (agroForecastStrip && Array.isArray(dadosChuva.historicoDiario)) {
    const dias = dadosChuva.historicoDiario.slice(6, 14);
    agroForecastStrip.innerHTML = dias
      .map((d) => {
        const labelDia = d.data.slice(5).split("-").reverse().join("/");
        return `
          <div class="forecast-day-chip ${d.periodo === "hoje" ? "today" : ""}">
            <span>${d.periodo === "hoje" ? "Hoje" : labelDia}</span>
            <strong>${d.chuvaMm} mm</strong>
            <span>${d.tempMin ?? "-"}° / ${d.tempMax ?? "-"}°</span>
            <span>Prob: ${d.probabilidadePct ?? 0}%</span>
          </div>
        `;
      })
      .join("");
  }

  renderizarMiniGraficoPluviometriaAgro(dadosChuva);
}

async function sincronizarPluviometriaAgro(forcarCidade = "") {
  const propriedades = obterRegistrosPorCategoria("propriedade");
  const propPrincipal = propriedades[0] || {};

  try {
    const dadosChuva = await buscarPluviometriaOpenMeteo({
      latitude: forcarCidade ? undefined : propPrincipal.latitude,
      longitude: forcarCidade ? undefined : propPrincipal.longitude,
      cidade: forcarCidade || propPrincipal.cidade || ""
    });
    estadoAgro.pluviometriaAtual = dadosChuva;

    const elStatPluv = document.getElementById("agro-stat-pluviometro");
    if (elStatPluv) {
      elStatPluv.textContent = `Hoje: ${dadosChuva.chuvaHojeMm} mm • 7d: ${dadosChuva.acumuladoUltimos7DiasMm} mm`;
    }
    const elKpiRain = document.getElementById("agro-kpi-rain");
    if (elKpiRain) {
      elKpiRain.textContent = `${dadosChuva.chuvaHojeMm} / ${dadosChuva.acumuladoUltimos7DiasMm} mm`;
    }
    if (agroToolbarRain) {
      agroToolbarRain.textContent = `Chuva (${dadosChuva.localizacao.nome}): ${dadosChuva.chuvaHojeMm} mm hoje • ${dadosChuva.acumuladoUltimos7DiasMm} mm (7d)`;
    }

    renderizarPainelClimaticoAgro(dadosChuva);
    return dadosChuva;
  } catch (erro) {
    console.warn("Falha ao consultar Open-Meteo:", erro);
    return null;
  }
}

function atualizarResumoCardsAgro() {
  const categorias = [
    "propriedade",
    "unidade",
    "plantio",
    "colheita",
    "pluviometro",
    "diesel",
    "inventario",
    "revisoes",
    "salario",
    "manuais"
  ];

  categorias.forEach((cat) => {
    const badge = document.getElementById(`agro-badge-${cat}`);
    if (badge) badge.textContent = String(obterRegistrosPorCategoria(cat).length);
  });

  if (navBadgeAgro) {
    navBadgeAgro.textContent = String(estadoAgro.registros.length);
    navBadgeAgro.hidden = estadoAgro.registros.length === 0;
  }

  const props = obterRegistrosPorCategoria("propriedade");
  const unidades = obterRegistrosPorCategoria("unidade");
  const plantios = obterRegistrosPorCategoria("plantio");
  const colheitas = obterRegistrosPorCategoria("colheita");
  const pluviometros = obterRegistrosPorCategoria("pluviometro");
  const dieselMovs = obterRegistrosPorCategoria("diesel");
  const inventario = obterRegistrosPorCategoria("inventario");
  const revisoes = obterRegistrosPorCategoria("revisoes");
  const salarios = obterRegistrosPorCategoria("salario");
  const manuais = obterRegistrosPorCategoria("manuais");

  const areaTotal = props.reduce((acc, p) => acc + Number(p.areaTotalHa || 0), 0);
  const elKpiArea = document.getElementById("agro-kpi-area");
  if (elKpiArea) elKpiArea.textContent = `${areaTotal.toLocaleString("pt-BR")} ha`;

  const elProp = document.getElementById("agro-stat-propriedade");
  if (elProp) {
    elProp.textContent = props.length
      ? `${props.length} propriedade(s) • ${areaTotal.toLocaleString("pt-BR")} ha`
      : "Cadastrar fazenda & GPS";
  }

  const elUni = document.getElementById("agro-stat-unidade");
  if (elUni) {
    elUni.textContent = unidades.length
      ? `${unidades.length} unidade(s)/talhão(ões) ativos`
      : "Talhões, silos & áreas";
  }

  const elPlan = document.getElementById("agro-stat-plantio");
  if (elPlan) {
    const ultimaCultura = plantios[0]?.cultura ? ` (${plantios[0].cultura})` : "";
    elPlan.textContent = plantios.length
      ? `${plantios.length} plantio(s) na safra${ultimaCultura}`
      : "Safra, cultivar & insumos";
  }

  const totalSacas = colheitas.reduce((acc, c) => acc + Number(c.sacas || 0), 0);
  const elKpiHarvest = document.getElementById("agro-kpi-harvest");
  if (elKpiHarvest) elKpiHarvest.textContent = `${totalSacas.toLocaleString("pt-BR")} sc`;

  const elCol = document.getElementById("agro-stat-colheita");
  if (elCol) {
    elCol.textContent = colheitas.length
      ? `${totalSacas.toLocaleString("pt-BR")} sc colhidas (${colheitas.length} reg.)`
      : "Sacas, umidade & talhão";
  }

  const elPluv = document.getElementById("agro-stat-pluviometro");
  if (elPluv && estadoAgro.pluviometriaAtual) {
    const totalManual = pluviometros.reduce((acc, p) => acc + Number(p.mm || 0), 0);
    elPluv.textContent = `API: ${estadoAgro.pluviometriaAtual.chuvaHojeMm} mm • Salvo: ${totalManual} mm`;
  }

  const saldoLitros = dieselMovs.reduce((acc, d) => {
    const litros = Number(d.litros || 0);
    return d.tipoMovimento === "saida" ? acc - litros : acc + litros;
  }, 0);
  const elKpiDiesel = document.getElementById("agro-kpi-diesel");
  if (elKpiDiesel) elKpiDiesel.textContent = `${saldoLitros.toLocaleString("pt-BR")} L`;

  const elDiesel = document.getElementById("agro-stat-diesel");
  if (elDiesel) {
    elDiesel.textContent = dieselMovs.length
      ? `Saldo: ${saldoLitros.toLocaleString("pt-BR")} L (${dieselMovs.length} mov.)`
      : "Tanque, entradas & consumo";
  }

  const elInv = document.getElementById("agro-stat-inventario");
  if (elInv) {
    elInv.textContent = inventario.length
      ? `${inventario.length} item(ns) no inventário`
      : "Máquinas, sementes & insumos";
  }

  const pendentesRev = revisoes.filter((r) => r.status !== "Concluída").length;
  const elKpiRev = document.getElementById("agro-kpi-revisions");
  if (elKpiRev) elKpiRev.textContent = String(pendentesRev);

  const elRev = document.getElementById("agro-stat-revisoes");
  if (elRev) {
    elRev.textContent = revisoes.length
      ? `${revisoes.length} revisão(ões) • ${pendentesRev} programada(s)`
      : "Horímetro, óleo & filtros";
  }

  const elSal = document.getElementById("agro-stat-salario");
  if (elSal) {
    elSal.textContent = salarios.length
      ? `${salarios.length} colaborador(es) com % vinculada`
      : "Comissão safra & equipe";
  }

  const elMan = document.getElementById("agro-stat-manuais");
  if (elMan) {
    elMan.textContent = manuais.length
      ? `${manuais.length} manual(is) técnico(s) salvo(s)`
      : "Calibração, guias & SOPs";
  }

  if (agroSyncSummary) {
    const mmHoje = estadoAgro.pluviometriaAtual
      ? `${estadoAgro.pluviometriaAtual.chuvaHojeMm} mm hoje (${estadoAgro.pluviometriaAtual.localizacao.nome})`
      : "Open-Meteo ativo";
    agroSyncSummary.textContent = `${estadoAgro.registros.length} registros no Firestore • Pluviômetro: ${mmHoje}`;
  }
}

async function carregarDadosAgro() {
  if (!usuarioAtual) return;

  try {
    const refAgro = collection(db, "usuarios", usuarioAtual.uid, "agro_dados");
    const q = query(refAgro, orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(q);

    estadoAgro.registros = [];
    snapshot.forEach((docSnap) => {
      estadoAgro.registros.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (erro) {
    console.error("Erro ao carregar dados Agro do Firestore:", erro);
  }

  await sincronizarPluviometriaAgro();
  atualizarResumoCardsAgro();
}

btnAgroUpdateWeather?.addEventListener("click", async () => {
  const cidade = agroCityInput?.value.trim() || "";
  await sincronizarPluviometriaAgro(cidade);
  atualizarResumoCardsAgro();
});

btnAgroAskWeather?.addEventListener("click", () => {
  enviarPerguntaAgro(CONFIG_MODULOS_AGRO.pluviometro.promptBase);
});

btnAgroFullReport?.addEventListener("click", () => {
  enviarPerguntaAgro(
    "Gere um relatório gerencial completo da minha fazenda em Markdown, cruzando propriedades, unidades, plantio, colheita, chuvas Open-Meteo (mm), saldo de diesel, revisões de máquinas e comissões da equipe, com tabelas e gráfico Google Charts."
  );
});

function gerarOpcoesSelectAgro(lista, labelFn, placeholderVazio) {
  if (!lista.length) {
    return `<option value="">${escaparHtml(placeholderVazio)}</option>`;
  }
  return [
    `<option value="">Selecione...</option>`,
    ...lista.map(
      (item) => `<option value="${escaparHtml(item.id)}">${escaparHtml(labelFn(item))}</option>`
    )
  ].join("");
}

function renderizarCamposModalAgro(categoria) {
  const props = obterRegistrosPorCategoria("propriedade");
  const unidades = obterRegistrosPorCategoria("unidade");
  const plantios = obterRegistrosPorCategoria("plantio");
  const colheitas = obterRegistrosPorCategoria("colheita");
  const inventario = obterRegistrosPorCategoria("inventario");
  const maquinas = inventario.filter((i) => i.tipoItem === "Maquinário / Implemento");

  const optsPropriedades = gerarOpcoesSelectAgro(
    props,
    (p) => `${p.nome} (${p.cidade || "Sem cidade"} - ${p.areaTotalHa || 0} ha)`,
    "Nenhuma propriedade cadastrada"
  );
  const optsUnidades = gerarOpcoesSelectAgro(
    unidades,
    (u) => `${u.nome} (${u.areaHa || 0} ha)`,
    "Nenhuma unidade/talhão cadastrado"
  );
  const optsPlantios = gerarOpcoesSelectAgro(
    plantios,
    (pl) => `${pl.cultura} • ${pl.cultivar || ""} (${pl.areaPlantadaHa || 0} ha)`,
    "Nenhum plantio cadastrado"
  );
  const optsColheitas = gerarOpcoesSelectAgro(
    colheitas,
    (c) => `Colheita ${c.cultura || ""} (${c.sacas || 0} sc)`,
    "Nenhuma colheita registrada"
  );
  const optsMaquinas = gerarOpcoesSelectAgro(
    maquinas.length ? maquinas : inventario,
    (m) => `${m.nome} (${m.horimetro || m.quantidade || ""})`,
    "Nenhum item/máquina no inventário"
  );

  switch (categoria) {
    case "propriedade":
      return `
        <div class="agro-field-group">
          <label>Nome da Propriedade / Fazenda *</label>
          <input type="text" name="nome" placeholder="Ex: Fazenda Santa Clara" required />
        </div>
        <div class="agro-field-group">
          <label>Área Total (hectares) *</label>
          <input type="number" step="0.01" name="areaTotalHa" placeholder="Ex: 450" required />
        </div>
        <div class="agro-field-group">
          <label>Município / UF (para Open-Meteo)</label>
          <input type="text" name="cidade" placeholder="Ex: Cascavel, PR" />
        </div>
        <div class="agro-field-group">
          <label>Matrícula / CAR / Observação</label>
          <input type="text" name="registroCar" placeholder="Ex: CAR-PR-12345" />
        </div>
        <div class="agro-field-group">
          <label>Latitude (opcional)</label>
          <input type="number" step="any" name="latitude" placeholder="-24.9555" />
        </div>
        <div class="agro-field-group">
          <label>Longitude (opcional)</label>
          <input type="number" step="any" name="longitude" placeholder="-53.4552" />
        </div>
      `;

    case "unidade":
      return `
        <div class="agro-field-group">
          <label>Propriedade Vinculada</label>
          <select name="propriedadeId">${optsPropriedades}</select>
        </div>
        <div class="agro-field-group">
          <label>Tipo de Unidade</label>
          <select name="tipoUnidade">
            <option value="Talhão Agrícola">Talhão Agrícola</option>
            <option value="Silo / Armazém">Silo / Armazém</option>
            <option value="Piquete / Pastagem">Piquete / Pastagem</option>
            <option value="Barracão / Oficina">Barracão / Oficina</option>
          </select>
        </div>
        <div class="agro-field-group">
          <label>Nome da Unidade / Talhão *</label>
          <input type="text" name="nome" placeholder="Ex: Talhão 04 - Pivô Central" required />
        </div>
        <div class="agro-field-group">
          <label>Área (ha) ou Capacidade (ton)</label>
          <input type="number" step="0.01" name="areaHa" placeholder="Ex: 85.5" required />
        </div>
      `;

    case "plantio":
      return `
        <div class="agro-field-group">
          <label>Propriedade</label>
          <select name="propriedadeId">${optsPropriedades}</select>
        </div>
        <div class="agro-field-group">
          <label>Unidade / Talhão</label>
          <select name="unidadeId">${optsUnidades}</select>
        </div>
        <div class="agro-field-group">
          <label>Cultura *</label>
          <input type="text" name="cultura" placeholder="Ex: Soja, Milho Safrinha, Trigo" required />
        </div>
        <div class="agro-field-group">
          <label>Cultivar / Híbrido *</label>
          <input type="text" name="cultivar" placeholder="Ex: Brasmax Fibra IPRO" required />
        </div>
        <div class="agro-field-group">
          <label>Área Plantada (ha) *</label>
          <input type="number" step="0.01" name="areaPlantadaHa" placeholder="Ex: 85.5" required />
        </div>
        <div class="agro-field-group">
          <label>Data do Plantio</label>
          <input type="date" name="dataPlantio" value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div class="agro-field-group full-span">
          <label>Insumo / Semente do Inventário Utilizado</label>
          <select name="itemInventarioId">${gerarOpcoesSelectAgro(
            inventario,
            (i) => `${i.nome} (Saldo: ${i.quantidade || 0} ${i.unidadeMedida || ""})`,
            "Nenhum insumo cadastrado no inventário"
          )}</select>
        </div>
      `;

    case "colheita":
      return `
        <div class="agro-field-group">
          <label>Plantio Vinculado</label>
          <select name="plantioId">${optsPlantios}</select>
        </div>
        <div class="agro-field-group">
          <label>Unidade / Talhão</label>
          <select name="unidadeId">${optsUnidades}</select>
        </div>
        <div class="agro-field-group">
          <label>Cultura Colhida *</label>
          <input type="text" name="cultura" placeholder="Ex: Soja 2026" required />
        </div>
        <div class="agro-field-group">
          <label>Total Colhido (Sacas 60kg) *</label>
          <input type="number" step="0.1" name="sacas" placeholder="Ex: 5420" required />
        </div>
        <div class="agro-field-group">
          <label>Umidade Média (%)</label>
          <input type="number" step="0.1" name="umidadePct" placeholder="Ex: 13.5" />
        </div>
        <div class="agro-field-group">
          <label>Preço Estimado / Saca (R$)</label>
          <input type="number" step="0.01" name="valorSaca" placeholder="Ex: 128.00" />
        </div>
      `;

    case "pluviometro": {
      const chuva = estadoAgro.pluviometriaAtual;
      return `
        <div class="agro-openmeteo-box">
          <div class="agro-openmeteo-row">
            <strong>Open-Meteo API (${escaparHtml(chuva?.localizacao?.nome || "Cascavel, PR")})</strong>
            <button type="button" class="btn-secondary-pill" id="btn-refresh-openmeteo">
              Atualizar mm agora
            </button>
          </div>
          <div class="agro-openmeteo-metrics">
            <div class="agro-openmeteo-metric">
              <span>Chuva Hoje</span>
              <strong id="om-mm-hoje">${chuva ? `${chuva.chuvaHojeMm} mm` : "--"}</strong>
            </div>
            <div class="agro-openmeteo-metric">
              <span>Acumulado 7 dias</span>
              <strong id="om-mm-7d">${chuva ? `${chuva.acumuladoUltimos7DiasMm} mm` : "--"}</strong>
            </div>
            <div class="agro-openmeteo-metric">
              <span>Previsão 7 dias</span>
              <strong id="om-mm-prev">${chuva ? `${chuva.previsaoProximos7DiasMm} mm` : "--"}</strong>
            </div>
          </div>
        </div>
        <div class="agro-field-group">
          <label>Propriedade / Talhão</label>
          <select name="propriedadeId">${optsPropriedades}</select>
        </div>
        <div class="agro-field-group">
          <label>Chuva Registrada (mm) *</label>
          <input type="number" step="0.1" name="mm" value="${chuva?.chuvaHojeMm ?? 0}" required />
        </div>
        <div class="agro-field-group">
          <label>Data da Leitura</label>
          <input type="date" name="dataLeitura" value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div class="agro-field-group">
          <label>Origem da Medição</label>
          <select name="origem">
            <option value="API Open-Meteo (Automático)">API Open-Meteo (Automático)</option>
            <option value="Pluviômetro Físico da Fazenda">Pluviômetro Físico da Fazenda</option>
          </select>
        </div>
      `;
    }

    case "diesel":
      return `
        <div class="agro-field-group">
          <label>Tipo de Movimentação *</label>
          <select name="tipoMovimento">
            <option value="entrada">Entrada no Tanque (+ Litros)</option>
            <option value="saida">Abastecimento de Máquina (- Litros)</option>
          </select>
        </div>
        <div class="agro-field-group">
          <label>Quantidade (Litros) *</label>
          <input type="number" step="0.1" name="litros" placeholder="Ex: 1500" required />
        </div>
        <div class="agro-field-group">
          <label>Máquina Abastecida (Inventário)</label>
          <select name="maquinaId">${optsMaquinas}</select>
        </div>
        <div class="agro-field-group">
          <label>Valor por Litro (R$)</label>
          <input type="number" step="0.01" name="valorLitro" placeholder="Ex: 5.89" />
        </div>
        <div class="agro-field-group full-span">
          <label>Horímetro Atual / Fornecedor / Observação</label>
          <input type="text" name="observacao" placeholder="Ex: Trator John Deere 6150J - 2.410h" />
        </div>
      `;

    case "inventario":
      return `
        <div class="agro-field-group">
          <label>Categoria do Item *</label>
          <select name="tipoItem">
            <option value="Maquinário / Implemento">Maquinário / Implemento</option>
            <option value="Sementes">Sementes</option>
            <option value="Fertilizantes / Corretivos">Fertilizantes / Corretivos</option>
            <option value="Defensivos Agrícolas">Defensivos Agrícolas</option>
            <option value="Peças & Lubrificantes">Peças & Lubrificantes</option>
          </select>
        </div>
        <div class="agro-field-group">
          <label>Propriedade / Galpão</label>
          <select name="propriedadeId">${optsPropriedades}</select>
        </div>
        <div class="agro-field-group">
          <label>Nome do Item / Máquina *</label>
          <input type="text" name="nome" placeholder="Ex: Colheitadeira S770 ou Adubo NPK 02-20-18" required />
        </div>
        <div class="agro-field-group">
          <label>Quantidade / Horímetro *</label>
          <input type="number" step="0.1" name="quantidade" placeholder="Ex: 1200" required />
        </div>
        <div class="agro-field-group">
          <label>Unidade de Medida</label>
          <input type="text" name="unidadeMedida" placeholder="Ex: kg, L, sacas, horas, un" value="un" />
        </div>
        <div class="agro-field-group">
          <label>Valor Unitário Estimado (R$)</label>
          <input type="number" step="0.01" name="valorUnitario" placeholder="Ex: 450.00" />
        </div>
      `;

    case "revisoes":
      return `
        <div class="agro-field-group">
          <label>Máquina / Equipamento (Inventário) *</label>
          <select name="maquinaId" required>${optsMaquinas}</select>
        </div>
        <div class="agro-field-group">
          <label>Tipo de Revisão *</label>
          <select name="tipoRevisao">
            <option value="Preventiva 250h (Óleo & Filtros)">Preventiva 250h (Óleo & Filtros)</option>
            <option value="Preventiva 500h (Hidráulico & Transmissão)">Preventiva 500h (Hidráulico & Transmissão)</option>
            <option value="Revisão Pré-Safra / Colheita">Revisão Pré-Safra / Colheita</option>
            <option value="Manutenção Corretiva">Manutenção Corretiva</option>
          </select>
        </div>
        <div class="agro-field-group">
          <label>Horímetro / Km Atual *</label>
          <input type="number" step="0.1" name="horimetroAtual" placeholder="Ex: 2450" required />
        </div>
        <div class="agro-field-group">
          <label>Próxima Revisão (Horímetro/Km)</label>
          <input type="number" step="0.1" name="proximaRevisaoHoras" placeholder="Ex: 2700" />
        </div>
        <div class="agro-field-group">
          <label>Status</label>
          <select name="status">
            <option value="Programada">Programada</option>
            <option value="Concluída">Concluída</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>
        <div class="agro-field-group">
          <label>Custo Estimado (R$)</label>
          <input type="number" step="0.01" name="custo" placeholder="Ex: 3200.00" />
        </div>
      `;

    case "salario":
      return `
        <div class="agro-field-group">
          <label>Nome do Colaborador / Operador *</label>
          <input type="text" name="colaborador" placeholder="Ex: João Silva (Operador)" required />
        </div>
        <div class="agro-field-group">
          <label>Função / Cargo</label>
          <input type="text" name="funcao" placeholder="Ex: Operador de Colheitadeira" />
        </div>
        <div class="agro-field-group">
          <label>Salário Base Fixo (R$) *</label>
          <input type="number" step="0.01" name="salarioBase" placeholder="Ex: 3500.00" required />
        </div>
        <div class="agro-field-group">
          <label>Porcentagem sobre Colheita/Produção (%) *</label>
          <input type="number" step="0.01" name="percentualComissao" placeholder="Ex: 1.5" required />
        </div>
        <div class="agro-field-group full-span">
          <label>Colheita Vinculada para Cálculo Automático</label>
          <select name="colheitaId">${optsColheitas}</select>
        </div>
      `;

    case "manuais":
    default:
      return `
        <div class="agro-field-group">
          <label>Título do Manual / Protocolo *</label>
          <input type="text" name="titulo" placeholder="Ex: Calibração Plantadeira & Taxa Variável" required />
        </div>
        <div class="agro-field-group">
          <label>Equipamento / Cultura Relacionada</label>
          <select name="maquinaId">${optsMaquinas}</select>
        </div>
        <div class="agro-field-group full-span">
          <label>Conteúdo Técnico, Regulagens e Parâmetros *</label>
          <textarea name="conteudo" rows="4" placeholder="Cole aqui trechos do manual, pressão de bicos, espaçamento, torque ou procedimentos operacionais para a IA Agro consultar..." required></textarea>
        </div>
      `;
  }
}

function formatarResumoRegistroAgro(reg) {
  switch (reg.categoria) {
    case "propriedade":
      return {
        titulo: reg.nome || "Propriedade",
        detalhe: `${reg.areaTotalHa || 0} ha • ${reg.cidade || "Localização padrão"}`
      };
    case "unidade":
      return {
        titulo: `${reg.nome} (${reg.tipoUnidade || "Unidade"})`,
        detalhe: `Área/Cap.: ${reg.areaHa || 0}`
      };
    case "plantio":
      return {
        titulo: `${reg.cultura} — ${reg.cultivar || ""}`,
        detalhe: `${reg.areaPlantadaHa || 0} ha • Data: ${reg.dataPlantio || "-"}`
      };
    case "colheita": {
      const faturamento = Number(reg.sacas || 0) * Number(reg.valorSaca || 0);
      return {
        titulo: `${reg.cultura} • ${Number(reg.sacas || 0).toLocaleString("pt-BR")} sacas`,
        detalhe: `Umidade: ${reg.umidadePct || "-"}% • Valor est.: R$ ${faturamento.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2 }
        )}`
      };
    }
    case "pluviometro":
      return {
        titulo: `${reg.mm} mm registrados`,
        detalhe: `${reg.dataLeitura || "-"} • ${reg.origem || "Pluviômetro"}`
      };
    case "diesel":
      return {
        titulo: `${reg.tipoMovimento === "saida" ? "Saída (-)" : "Entrada (+)"} ${reg.litros} L`,
        detalhe: `${reg.observacao || "Movimentação de tanque"}`
      };
    case "inventario":
      return {
        titulo: `${reg.nome} (${reg.tipoItem || "Item"})`,
        detalhe: `Saldo: ${reg.quantidade || 0} ${reg.unidadeMedida || ""}`
      };
    case "revisoes":
      return {
        titulo: `${reg.tipoRevisao}`,
        detalhe: `Horímetro: ${reg.horimetroAtual || 0}h → Próx.: ${
          reg.proximaRevisaoHoras || "-"
        }h • ${reg.status || "Programada"}`
      };
    case "salario": {
      const colheitaVinc = estadoAgro.registros.find((r) => r.id === reg.colheitaId);
      const baseProducao = colheitaVinc
        ? Number(colheitaVinc.sacas || 0) * Number(colheitaVinc.valorSaca || 0)
        : 0;
      const comissaoCalc = (baseProducao * Number(reg.percentualComissao || 0)) / 100;
      const total = Number(reg.salarioBase || 0) + comissaoCalc;
      return {
        titulo: `${reg.colaborador} (${reg.percentualComissao || 0}%)`,
        detalhe: `Base: R$ ${Number(reg.salarioBase || 0).toFixed(
          2
        )} + Comissão: R$ ${comissaoCalc.toFixed(2)} = R$ ${total.toFixed(2)}`
      };
    }
    case "manuais":
    default:
      return {
        titulo: reg.titulo || "Manual Técnico",
        detalhe: String(reg.conteudo || "").slice(0, 90)
      };
  }
}

function renderizarListaRegistrosModalAgro(categoria) {
  if (!agroModalRecordsList || !agroModalRecordsCount) return;

  const itens = obterRegistrosPorCategoria(categoria);
  agroModalRecordsCount.textContent = `${itens.length} item(ns)`;
  agroModalRecordsList.innerHTML = "";

  if (itens.length === 0) {
    agroModalRecordsList.innerHTML = `
      <div class="agro-record-row">
        <div class="agro-record-info">
          <span>Nenhum registro salvo nesta categoria ainda. Preencha acima para salvar no Firestore.</span>
        </div>
      </div>
    `;
    return;
  }

  itens.forEach((reg) => {
    const resumo = formatarResumoRegistroAgro(reg);
    const row = document.createElement("div");
    row.className = "agro-record-row";
    row.innerHTML = `
      <div class="agro-record-info">
        <strong>${escaparHtml(resumo.titulo)}</strong>
        <span>${escaparHtml(resumo.detalhe)}</span>
      </div>
      <button type="button" class="icon-btn" title="Excluir registro" aria-label="Excluir registro">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    `;

    row.querySelector("button")?.addEventListener("click", async () => {
      if (!usuarioAtual) return;
      try {
        await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "agro_dados", reg.id));
        await carregarDadosAgro();
        renderizarListaRegistrosModalAgro(categoria);
      } catch (erro) {
        console.error("Erro ao excluir registro Agro:", erro);
      }
    });

    agroModalRecordsList.appendChild(row);
  });
}

function abrirModalAgro(categoria) {
  const cfg = CONFIG_MODULOS_AGRO[categoria] || CONFIG_MODULOS_AGRO.propriedade;
  estadoAgro.categoriaModalAtiva = categoria;

  if (agroModalTitle) agroModalTitle.textContent = cfg.titulo;
  if (agroModalFields) agroModalFields.innerHTML = renderizarCamposModalAgro(categoria);

  if (categoria === "pluviometro") {
    document.getElementById("btn-refresh-openmeteo")?.addEventListener("click", async () => {
      const chuva = await sincronizarPluviometriaAgro();
      if (chuva) {
        const elHoje = document.getElementById("om-mm-hoje");
        const el7d = document.getElementById("om-mm-7d");
        const elPrev = document.getElementById("om-mm-prev");
        const inputMm = agroModalForm?.querySelector('input[name="mm"]');
        if (elHoje) elHoje.textContent = `${chuva.chuvaHojeMm} mm`;
        if (el7d) el7d.textContent = `${chuva.acumuladoUltimos7DiasMm} mm`;
        if (elPrev) elPrev.textContent = `${chuva.previsaoProximos7DiasMm} mm`;
        if (inputMm) inputMm.value = chuva.chuvaHojeMm;
      }
    });
  }

  renderizarListaRegistrosModalAgro(categoria);
  if (agroModalBackdrop) agroModalBackdrop.hidden = false;
}

function fecharModalAgro() {
  if (agroModalBackdrop) agroModalBackdrop.hidden = true;
  estadoAgro.categoriaModalAtiva = null;
}

document.querySelectorAll("[data-agro-category]").forEach((btn) => {
  btn.addEventListener("click", () => abrirModalAgro(btn.dataset.agroCategory));
});

btnCloseAgroModal?.addEventListener("click", fecharModalAgro);
agroModalBackdrop?.addEventListener("click", (e) => {
  if (e.target === agroModalBackdrop) fecharModalAgro();
});

btnAgroAskAi?.addEventListener("click", () => {
  const cat = estadoAgro.categoriaModalAtiva || "propriedade";
  const cfg = CONFIG_MODULOS_AGRO[cat];
  fecharModalAgro();
  navegarParaTela("agro");
  promptInput.value = `${cfg.promptBase} `;
  atualizarEstadoBotaoEnviar();
  promptInput.focus();
});

agroModalForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioAtual || !estadoAgro.categoriaModalAtiva) return;

  const categoria = estadoAgro.categoriaModalAtiva;
  const formData = new FormData(agroModalForm);
  const payload = {
    categoria,
    criadoEm: serverTimestamp()
  };

  formData.forEach((valor, chave) => {
    payload[chave] = String(valor).trim();
  });

  try {
    const refAgro = collection(db, "usuarios", usuarioAtual.uid, "agro_dados");
    await addDoc(refAgro, payload);

    if (categoria === "plantio" && payload.itemInventarioId) {
      const itemInv = estadoAgro.registros.find((r) => r.id === payload.itemInventarioId);
      if (itemInv && Number(itemInv.quantidade) > 0) {
        const novoSaldo = Math.max(
          0,
          Number(itemInv.quantidade) - Number(payload.areaPlantadaHa || 0)
        );
        await updateDoc(doc(db, "usuarios", usuarioAtual.uid, "agro_dados", itemInv.id), {
          quantidade: novoSaldo
        }).catch(() => {});
      }
    }

    if (categoria === "revisoes" && payload.maquinaId && payload.horimetroAtual) {
      await updateDoc(doc(db, "usuarios", usuarioAtual.uid, "agro_dados", payload.maquinaId), {
        quantidade: Number(payload.horimetroAtual)
      }).catch(() => {});
    }

    await carregarDadosAgro();
    agroModalFields.innerHTML = renderizarCamposModalAgro(categoria);
    renderizarListaRegistrosModalAgro(categoria);
  } catch (erro) {
    console.error("Erro ao salvar registro Agro no Firestore:", erro);
    alert(`Erro ao salvar no Firestore: ${erro.message}`);
  }
});

function montarContextoInterligadoAgro() {
  const secoes = [];

  if (estadoAgro.pluviometriaAtual) {
    const c = estadoAgro.pluviometriaAtual;
    secoes.push(
      `[Pluviômetro Open-Meteo em Tempo Real - ${c.localizacao.nome}]: ` +
        `Chuva hoje: ${c.chuvaHojeMm} mm | Ontem: ${c.chuvaOntemMm} mm | ` +
        `Acumulado últimos 7 dias: ${c.acumuladoUltimos7DiasMm} mm | Previsão próximos 7 dias: ${c.previsaoProximos7DiasMm} mm.`
    );
  }

  const categorias = [
    "propriedade",
    "unidade",
    "plantio",
    "colheita",
    "pluviometro",
    "diesel",
    "inventario",
    "revisoes",
    "salario",
    "manuais"
  ];

  categorias.forEach((cat) => {
    const lista = obterRegistrosPorCategoria(cat);
    if (lista.length > 0) {
      const linhas = lista.map((item) => {
        const r = formatarResumoRegistroAgro(item);
        return `- ${r.titulo}: ${r.detalhe}`;
      });
      secoes.push(`[Firestore • ${CONFIG_MODULOS_AGRO[cat].titulo}]:\n${linhas.join("\n")}`);
    }
  });

  return secoes.length
    ? `\n\n=== DADOS INTERLIGADOS DA PROPRIEDADE (FIRESTORE + OPEN-METEO) ===\n${secoes.join(
        "\n\n"
      )}`
    : "";
}

btnAgroShowCards?.addEventListener("click", () => {
  if (agroWelcomeBox) agroWelcomeBox.hidden = false;
  if (agroChatToolbar) agroChatToolbar.hidden = true;
  atualizarModoTelaInicial();
  if (estadoAgro.pluviometriaAtual) {
    renderizarMiniGraficoPluviometriaAgro(estadoAgro.pluviometriaAtual);
  }
});

function iniciarNovaConversaAgro() {
  estadoAgro.historicoAtual = [];

  if (agroChatFeed) {
    agroChatFeed.innerHTML = "";
    agroChatFeed.hidden = true;
  }
  if (agroWelcomeBox) agroWelcomeBox.hidden = false;
  if (agroChatToolbar) agroChatToolbar.hidden = true;

  promptInput.value = "";
  atualizarEstadoBotaoEnviar();
  navegarParaTela("agro");
}

async function adicionarBalaoAgro(papel, texto) {
  if (agroWelcomeBox) agroWelcomeBox.hidden = true;
  if (agroChatToolbar) agroChatToolbar.hidden = false;
  if (agroChatFeed) agroChatFeed.hidden = false;
  atualizarModoTelaInicial();

  const balao = document.createElement("div");
  balao.className = `msg-bubble ${papel}`;
  if (papel === "model") {
    await renderizarBalaoModelo(balao, texto, {}, true);
  } else {
    balao.textContent = texto;
  }

  agroChatFeed.appendChild(balao);
  agroChatFeed.scrollTop = agroChatFeed.scrollHeight;
  return balao;
}

async function enviarPerguntaAgro(perguntaUsuario) {
  if (estadoAgro.processando || !perguntaUsuario.trim()) return;
  estadoAgro.processando = true;

  const historicoAnterior = [...estadoAgro.historicoAtual];
  await adicionarBalaoAgro("user", perguntaUsuario);
  estadoAgro.historicoAtual.push({ papel: "user", texto: perguntaUsuario });

  const balaoResposta = await adicionarBalaoAgro(
    "model",
    "_Consultando dados interligados do Agro no Firestore e Open-Meteo..._"
  );

  try {
    const contextoAgro = montarContextoInterligadoAgro();
    const resultado = await executarPromptIADinamico({
      promptUsuario: perguntaUsuario,
      systemInstruction: `${SYSTEM_PROMPT_AGRO_GEMINI}${contextoAgro}`,
      historico: historicoAnterior,
      balaoResposta,
      feedContainer: agroChatFeed
    });

    estadoAgro.historicoAtual.push({ papel: "model", texto: resultado.texto });
  } catch (erro) {
    await renderizarBalaoModelo(
      balaoResposta,
      `### Não foi possível gerar o diagnóstico Agro\n\n- **Detalhe:** ${erro.message}`,
      { modelo: obterRotuloModeloAtivo(), provedor: "Erro" },
      false
    );
  } finally {
    estadoAgro.processando = false;
    agroChatFeed.scrollTop = agroChatFeed.scrollHeight;
  }
}

// =========================================================================
// EVENTOS DA ABA DE CONFIGURAÇÕES
// =========================================================================
document.querySelectorAll(".swatch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    configAtual.accentColor = btn.dataset.color;
    salvarConfiguracoes();
    aplicarConfiguracoesNaInterface();
  });
});

settingsAccentColor?.addEventListener("input", (e) => {
  configAtual.accentColor = e.target.value;
  salvarConfiguracoes();
  aplicarConfiguracoesNaInterface();
});

settingsGlowToggle?.addEventListener("change", (e) => {
  configAtual.ambientGlow = e.target.checked;
  salvarConfiguracoes();
  aplicarConfiguracoesNaInterface();
});

settingsDefaultModel?.addEventListener("change", (e) => {
  const val = e.target.value;
  const obj = obterModeloPorId(val);
  selecionarModelo(val, obj?.nome || val, true);
});

settingsDefaultReasoning?.addEventListener("change", (e) => {
  atualizarNivelRaciocinio(e.target.value, true);
});

settingsStreamToggle?.addEventListener("change", (e) => {
  configAtual.streaming = e.target.checked;
  salvarConfiguracoes();
});

settingsVoiceLang?.addEventListener("change", (e) => {
  configAtual.voiceLang = e.target.value;
  salvarConfiguracoes();
});

settingsVoiceAutosend?.addEventListener("change", (e) => {
  configAtual.voiceAutoSend = e.target.checked;
  salvarConfiguracoes();
});

btnExportMarkdown?.addEventListener("click", () => {
  const linhas = [
    `# ${BRAND_NAME} — Conversa Exportada`,
    `> Modelo ativo: **${obterRotuloModeloAtivo()}** | Data: ${new Date().toLocaleString("pt-BR")}`,
    ""
  ];
  historicoMensagens.forEach((m) => {
    linhas.push(m.papel === "user" ? `## Usuário\n\n${m.texto}\n` : `## Assistente\n\n${m.texto}\n`);
  });
  const blob = new Blob([linhas.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `w3labs_willian_${conversaAtualId}.md`;
  link.click();
  URL.revokeObjectURL(url);
});

btnExportHistory?.addEventListener("click", () => {
  const payload = {
    plataforma: BRAND_NAME,
    modelo: modelSelector.value || GEMINI_DEFAULT_MODEL,
    temaFundo: configAtual.themeColor,
    exportadoEm: new Date().toISOString(),
    conversaId: conversaAtualId,
    usuario: usuarioAtual?.email || usuarioAtual?.uid || "desconhecido",
    mensagens: historicoMensagens,
    rotinas: estadoRotinas.lista,
    agroRegistros: estadoAgro.registros
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `w3labs_willian_${conversaAtualId}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

btnResetSettings?.addEventListener("click", () => {
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(THEME_FAMILY_STORAGE_KEY);
  localStorage.removeItem(MONOCOLOR_STORAGE_KEY);
  configAtual = carregarConfiguracoes();
  aplicarConfiguracoesNaInterface();
  inicializarSeletorModelos();
  rehidratarGraficosVisiveis();
});

// =========================================================================
// AUTENTICAÇÃO REAL E HISTÓRICO DO FIRESTORE
// =========================================================================
observarSessao(async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  usuarioAtual = user;
  const nome = user.displayName || user.email?.split("@")[0] || user.uid.slice(0, 8);
  const projectId =
    import.meta.env?.VITE_FIREBASE_PROJECT_ID || auth?.app?.options?.projectId || "Firebase";

  userDisplayName.textContent = nome;
  userAvatar.textContent = nome.slice(0, 2).toUpperCase();
  if (userStatusBadge) userStatusBadge.textContent = `${BRAND_NAME} • Ativo`;
  if (heroWelcomeTitle) heroWelcomeTitle.textContent = `Olá, ${nome}. Por onde começamos?`;
  if (varziaWelcomeTitle) varziaWelcomeTitle.textContent = "VarzIA Esportes";
  if (agroWelcomeTitle) agroWelcomeTitle.textContent = "Agro Inteligente";

  if (settingsUserName) settingsUserName.textContent = nome;
  if (settingsUserEmail) {
    settingsUserEmail.textContent = `${user.email || user.uid} • ${projectId}`;
  }

  atualizarModoTelaInicial();
  await Promise.all([
    carregarHistoricoSidebar(),
    carregarNotebooksEstudo(),
    carregarRotinasProgramadas(),
    carregarDadosAgro()
  ]);
});

async function carregarMensagensDaConversa(conversaId) {
  if (!usuarioAtual) return;

  try {
    const refMensagens = collection(
      db,
      "usuarios",
      usuarioAtual.uid,
      "conversas",
      conversaId,
      "mensagens"
    );
    const q = query(refMensagens, orderBy("criadoEm", "asc"));
    const snapshot = await getDocs(q);

    conversaAtualId = conversaId;
    historicoMensagens = [];
    chatFeed.innerHTML = "";

    if (snapshot.empty) {
      chatFeed.hidden = true;
      heroWelcome.hidden = false;
      atualizarModoTelaInicial();
      return;
    }

    for (const docSnap of snapshot.docs) {
      const dados = docSnap.data();
      if (dados?.texto) {
        historicoMensagens.push({ papel: dados.papel || "user", texto: dados.texto });
        await adicionarBalaoMensagem(dados.papel || "user", dados.texto);
      }
    }

    navegarParaTela("chat");
    destacarConversaAtivaSidebar(conversaId);
  } catch (erro) {
    console.error("Erro ao carregar mensagens da conversa:", erro);
  }
}

function destacarConversaAtivaSidebar(conversaId) {
  historyList.querySelectorAll(".history-row").forEach((row) => {
    row.classList.toggle("active", row.dataset.conversaId === conversaId);
  });
}

async function excluirConversaHistorico(conversaId) {
  if (!usuarioAtual || !conversaId) return;

  try {
    const refMensagens = collection(
      db,
      "usuarios",
      usuarioAtual.uid,
      "conversas",
      conversaId,
      "mensagens"
    );
    const snapMensagens = await getDocs(refMensagens);
    const batch = writeBatch(db);

    snapMensagens.forEach((msgDoc) => {
      batch.delete(msgDoc.ref);
    });

    const refConversa = doc(db, "usuarios", usuarioAtual.uid, "conversas", conversaId);
    batch.delete(refConversa);

    await batch.commit();

    if (conversaAtualId === conversaId) {
      iniciarNovaConversa(true);
    }

    await carregarHistoricoSidebar();
  } catch (erro) {
    console.error("Erro ao excluir conversa do histórico:", erro);
  }
}

async function carregarHistoricoSidebar() {
  if (!usuarioAtual) return;

  const conversas = await listarConversasUsuario(usuarioAtual.uid);
  historyList.innerHTML = "";

  if (conversas.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "history-empty";
    vazio.style.cssText = "padding: 8px 12px; font-size: 0.76rem; color: var(--text-muted);";
    vazio.textContent = "Nenhuma conversa salva ainda.";
    historyList.appendChild(vazio);

    if (studyQuickChips) studyQuickChips.hidden = true;
    return;
  }

  conversas.forEach((conv) => {
    const li = document.createElement("li");
    li.className = "history-row";
    li.dataset.conversaId = conv.id;
    if (conv.id === conversaAtualId && historicoMensagens.length > 0) {
      li.classList.add("active");
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    btn.textContent = conv.titulo || conv.id;
    btn.title = conv.titulo || conv.id;
    btn.addEventListener("click", async () => {
      await carregarMensagensDaConversa(conv.id);
      fecharMenuMobile();
    });

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "history-delete-btn";
    btnDelete.title = "Excluir conversa";
    btnDelete.setAttribute("aria-label", "Excluir conversa");
    btnDelete.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    `;
    btnDelete.addEventListener("click", async (e) => {
      e.stopPropagation();
      await excluirConversaHistorico(conv.id);
    });

    li.appendChild(btn);
    li.appendChild(btnDelete);
    historyList.appendChild(li);
  });

  if (studyQuickChips) {
    const recentes = conversas.filter((c) => c.titulo).slice(0, 3);
    if (recentes.length > 0) {
      studyQuickChips.innerHTML = recentes
        .map(
          (c) => `
          <button type="button" class="study-chip" data-study-topic="${escaparHtml(c.titulo)}">
            Revisar tema: ${escaparHtml(c.titulo)}
          </button>
        `
        )
        .join("");

      studyQuickChips.querySelectorAll("[data-study-topic]").forEach((chip) => {
        chip.addEventListener("click", () => {
          navegarParaTela("chat");
          promptInput.value = `Crie um guia de revisão em Markdown e questões práticas sobre: ${chip.dataset.studyTopic}`;
          atualizarEstadoBotaoEnviar();
          promptInput.focus();
        });
      });
      studyQuickChips.hidden = false;
    } else {
      studyQuickChips.hidden = true;
    }
  }
}

// =========================================================================
// CONTROLES DE SIDEBAR E PRESETS
// =========================================================================
function abrirMenuMobile() {
  sidebar.classList.add("mobile-open");
  sidebarBackdrop.hidden = false;
}

function fecharMenuMobile() {
  sidebar.classList.remove("mobile-open");
  sidebarBackdrop.hidden = true;
}

btnMobileMenu?.addEventListener("click", () => {
  if (sidebar.classList.contains("mobile-open")) {
    fecharMenuMobile();
  } else {
    abrirMenuMobile();
  }
});

sidebarBackdrop?.addEventListener("click", fecharMenuMobile);
btnCollapseSidebar?.addEventListener("click", fecharMenuMobile);

function iniciarNovaConversa(limparNotebook = true) {
  conversaAtualId = `chat_${Date.now()}`;
  if (limparNotebook) notebookAtivoId = null;
  historicoMensagens = [];
  chatFeed.innerHTML = "";
  chatFeed.hidden = true;
  if (defaultChartWrapper) defaultChartWrapper.hidden = true;
  heroWelcome.hidden = false;
  promptInput.value = "";
  destacarConversaAtivaSidebar(null);
  atualizarEstadoBotaoEnviar();
  navegarParaTela("chat");
}

btnBrandHome?.addEventListener("click", () => iniciarNovaConversa(true));

btnLogout?.addEventListener("click", async () => {
  pararDitadoVoz();
  await sairDaConta();
  window.location.href = "/login";
});

// =========================================================================
// MOTOR UNIFICADO DE IA EM MARKDOWN + STREAMING EM TEMPO REAL
// =========================================================================
function detectarAssuntoEsportivo(texto) {
  return /\b(futebol|brasileir[aã]o|s[ée]rie [ab]|copa do brasil|libertadores|sul-americana|champions|premier league|laliga|paulist[aã]o|carioca|escal[aã][cç][aã]o|placar|jogo|partida|rodada|gol|artilheiro|tabela|classifica[cç][aã]o|t[ée]cnico|flamengo|palmeiras|corinthians|s[aã]o paulo|santos|gr[eê]mio|internacional|cruzeiro|atl[ée]tico|botafogo|vasco|fluminense|bahia|fortaleza|nba|nfl|f[oó]rmula 1|f1|ufc|t[eê]nis|olimp[ií]adas|copa do mundo|neymar|messi|cristiano ronaldo|vin[ií]cius|vini jr)\b/i.test(
    texto
  );
}

async function executarPromptIADinamico({
  promptUsuario,
  systemInstruction,
  historico,
  balaoResposta,
  feedContainer
}) {
  const modeloSelecionado = modelSelector?.value || configAtual.defaultModel || "4-hydrogen";
  let ultimoRender = 0;

  const resultado = await enviarChatServidorStream(
    promptUsuario,
    modeloSelecionado,
    historico,
    async (_delta, textoAcumulado, meta) => {
      if (!configAtual.streaming) return;
      const agora = Date.now();
      if (agora - ultimoRender < 60) return;
      ultimoRender = agora;
      await renderizarBalaoModelo(balaoResposta, textoAcumulado, meta, true);
      if (feedContainer) feedContainer.scrollTop = feedContainer.scrollHeight;
    },
    {
      systemInstruction,
      reasoningLevel: configAtual.reasoningLevel || "Alto",
      stream: configAtual.streaming
    }
  );

  await renderizarBalaoModelo(
    balaoResposta,
    resultado.texto,
    {
      modelo: resultado.modelo || obterRotuloModeloAtivo(),
      provedor: resultado.provedor || "IA"
    },
    false
  );

  if (feedContainer) feedContainer.scrollTop = feedContainer.scrollHeight;
  return resultado;
}

async function adicionarBalaoMensagem(papel, texto) {
  if (telaAtual !== "chat") navegarParaTela("chat");
  heroWelcome.hidden = true;
  chatFeed.hidden = false;
  atualizarModoTelaInicial();

  const balao = document.createElement("div");
  balao.className = `msg-bubble ${papel}`;
  if (papel === "model") {
    await renderizarBalaoModelo(
      balao,
      texto,
      { modelo: obterRotuloModeloAtivo(), provedor: "Markdown" },
      false
    );
  } else {
    balao.textContent = texto;
  }
  chatFeed.appendChild(balao);
  chatFeed.scrollTop = chatFeed.scrollHeight;
  return balao;
}

function atualizarEstadoBotaoEnviar() {
  const temTexto = promptInput.value.trim().length > 0;
  btnSendPrompt.hidden = !temTexto;
  btnVoiceInput.hidden = temTexto;
  promptInput.style.height = "auto";
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 140)}px`;
}

promptInput?.addEventListener("input", atualizarEstadoBotaoEnviar);

promptInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (promptInput.value.trim()) {
      promptForm.requestSubmit();
    }
  }
});

async function enviarPerguntaChatGeral(textoUsuario, systemPromptCustom = "") {
  const tituloConversa =
    historicoMensagens.length === 0 ? textoUsuario : historicoMensagens[0].texto;
  const historicoAnterior = [...historicoMensagens];

  await adicionarBalaoMensagem("user", textoUsuario);
  historicoMensagens.push({ papel: "user", texto: textoUsuario });

  if (usuarioAtual) {
    salvarMensagemFirestore(
      usuarioAtual.uid,
      conversaAtualId,
      tituloConversa,
      "user",
      textoUsuario
    );

    if (notebookAtivoId) {
      updateDoc(doc(db, "usuarios", usuarioAtual.uid, "notebooks_estudo", notebookAtivoId), {
        conversaId: conversaAtualId,
        atualizadoEm: serverTimestamp()
      }).catch(() => {});
    }
  }

  const balaoResposta = document.createElement("div");
  balaoResposta.className = "msg-bubble model";
  chatFeed.appendChild(balaoResposta);
  await renderizarBalaoModelo(balaoResposta, "_Processando resposta em Markdown..._", {}, true);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  let systemInstruction = systemPromptCustom || SYSTEM_PROMPT_GERAL_GEMINI;
  if (!systemPromptCustom && detectarAssuntoEsportivo(textoUsuario)) {
    try {
      const espn = await coletarContextoEsportivoParaIA({ pergunta: textoUsuario });
      systemInstruction =
        `${SYSTEM_PROMPT_VARZIA_GEMINI}\n` +
        (espn?.textoContexto ? `\n[Dados ESPN Brasil]:\n${espn.textoContexto}\n\n` : "\n");
    } catch {
      systemInstruction = SYSTEM_PROMPT_VARZIA_GEMINI;
    }
  }

  try {
    const resultado = await executarPromptIADinamico({
      promptUsuario: textoUsuario,
      systemInstruction,
      historico: historicoAnterior,
      balaoResposta,
      feedContainer: chatFeed
    });

    historicoMensagens.push({ papel: "model", texto: resultado.texto });

    if (usuarioAtual && resultado.texto) {
      await salvarMensagemFirestore(
        usuarioAtual.uid,
        conversaAtualId,
        tituloConversa,
        "model",
        resultado.texto
      );
      await carregarHistoricoSidebar();
    }
  } catch (erro) {
    await renderizarBalaoModelo(
      balaoResposta,
      `### Falha na requisição\n\n- **Modelo:** \`${obterRotuloModeloAtivo()}\`\n- **Erro:** ${erro.message}`,
      { modelo: obterRotuloModeloAtivo(), provedor: "Erro" },
      false
    );
  }
}

promptForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const textoUsuario = promptInput.value.trim();
  if (!textoUsuario) return;

  promptInput.value = "";
  atualizarEstadoBotaoEnviar();

  if (telaAtual === "sports") {
    await enviarPerguntaVarzIA(textoUsuario);
    return;
  }

  if (telaAtual === "agro") {
    await enviarPerguntaAgro(textoUsuario);
    return;
  }

  await enviarPerguntaChatGeral(textoUsuario);
});

// =========================================================================
// INSTALAÇÃO PWA NATIVA
// =========================================================================
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  eventoInstalacaoPWA = e;
});

btnInstallApp?.addEventListener("click", async () => {
  if (eventoInstalacaoPWA) {
    eventoInstalacaoPWA.prompt();
    await eventoInstalacaoPWA.userChoice;
    eventoInstalacaoPWA = null;
    return;
  }

  alert(
    `Para instalar o ${BRAND_NAME} como app:\n• Chrome / Edge: Menu ⋮ → 'Instalar aplicativo'\n• Safari (iOS): Compartilhar → 'Adicionar à Tela de Início'`
  );
});

// =========================================================================
// INICIALIZAÇÃO SEQUENCIAL NÃO BLOQUEANTE
// =========================================================================
(async function iniciarDashboard() {
  aplicarConfiguracoesNaInterface();
  inicializarSeletorModelos();
  inicializarBotoesLigasVarzIA();
  atualizarModoTelaInicial();

  garantirGoogleChartsCarregado();
  await Promise.all([
    sincronizarStatusServidor(),
    carregarCatalogoDinamicoModelos(true)
  ]);
})();
