import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

const PORT = Number(process.env.PORT) || 4145;
const HOST = "localhost";
const SINGLE_URL = "http://" + HOST + ":" + PORT;

// =========================================================================
// 1. LEITURA DINÂMICA DO .ENV EM TEMPO REAL (APENAS NO SERVIDOR)
// =========================================================================
function carregarEnvDinamico() {
  const envPath = path.join(ROOT_DIR, ".env");
  const vars = Object.assign({}, process.env);

  if (fs.existsSync(envPath)) {
    const conteudo = fs.readFileSync(envPath, "utf-8");
    const linhas = conteudo.split(/\r?\n/);

    for (const linhaBruta of linhas) {
      const linha = linhaBruta.trim();
      if (!linha || linha.startsWith("#")) continue;

      const idxIgual = linha.indexOf("=");
      if (idxIgual === -1) continue;

      const chave = linha.slice(0, idxIgual).trim();
      let valor = linha.slice(idxIgual + 1).trim();

      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }

      vars[chave] = valor;
    }
  }

  return vars;
}

// =========================================================================
// 2. INDEXAÇÃO DINÂMICA SEGURA DE ARQUIVOS (BLOQUEIA .ENV E ARQUIVOS SENSÍVEIS)
// =========================================================================
const PASTAS_IGNORADAS = new Set([
  "node_modules",
  ".git",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "coverage"
]);

const CHAVES_PUBLICAS_FRONTEND = new Set([
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_GEMINI_MODEL",
  "VITE_GEMINI_LIVE_MODEL",
  "VITE_UNOROUTER_BASE_URL"
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function caminhoEhSensivel(pathname) {
  const normalizado = decodeURIComponent(pathname || "/").toLowerCase();
  const segmentos = normalizado.split("/").filter(Boolean);
  for (const seg of segmentos) {
    if (
      seg.startsWith(".") ||
      seg === "server.js" ||
      seg === "package.json" ||
      seg === "package-lock.json"
    ) {
      return true;
    }
  }
  return false;
}

function mapearArquivosDoProjeto(dirAtual = ROOT_DIR, mapa = new Map()) {
  const entradas = fs.readdirSync(dirAtual, { withFileTypes: true });

  for (const entrada of entradas) {
    if (PASTAS_IGNORADAS.has(entrada.name) || entrada.name.startsWith(".")) continue;

    const caminhoCompleto = path.join(dirAtual, entrada.name);
    if (entrada.isDirectory()) {
      mapearArquivosDoProjeto(caminhoCompleto, mapa);
    } else if (
      entrada.isFile() &&
      caminhoCompleto.toLowerCase() !== __filename.toLowerCase()
    ) {
      const relativo = "/" + path.relative(ROOT_DIR, caminhoCompleto).replace(/\\/g, "/");
      mapa.set(relativo.toLowerCase(), caminhoCompleto);

      const chaveArquivo = "file:" + entrada.name.toLowerCase();
      if (!mapa.has(chaveArquivo)) {
        mapa.set(chaveArquivo, caminhoCompleto);
      }
    }
  }

  return mapa;
}

function temSessaoAtiva(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").some((c) => c.trim() === "ws_session=active");
}

function resolverArquivoDinamico(pathname, autenticado) {
  if (caminhoEhSensivel(pathname)) {
    return null;
  }

  const mapa = mapearArquivosDoProjeto();
  const limpo = decodeURIComponent(pathname).replace(/\/+$/, "") || "/";

  // Único ponto de entrada (http://localhost:4145) alterna entre Login e Dashboard
  if (limpo === "/") {
    const telaPrincipal = autenticado ? "dashboard.html" : "login.html";
    const fallback = autenticado ? "login.html" : "dashboard.html";

    return (
      mapa.get("/" + telaPrincipal) ||
      mapa.get("/html/" + telaPrincipal) ||
      mapa.get("file:" + telaPrincipal) ||
      mapa.get("file:" + fallback) ||
      null
    );
  }

  // 1ª tentativa: caminho direto relativo à raiz
  const caminhoDireto = path.resolve(ROOT_DIR, "." + limpo);
  if (
    caminhoDireto.startsWith(ROOT_DIR) &&
    !path.basename(caminhoDireto).startsWith(".") &&
    fs.existsSync(caminhoDireto) &&
    fs.statSync(caminhoDireto).isFile()
  ) {
    return caminhoDireto;
  }

  // 2ª tentativa: índice relativo case-insensitive
  const peloRelativo = mapa.get(limpo.toLowerCase());
  if (peloRelativo) return peloRelativo;

  // 3ª tentativa: busca dinâmica pelo nome do arquivo em qualquer subpasta
  const baseName = path.basename(limpo).toLowerCase();
  if (baseName && mapa.has("file:" + baseName)) {
    return mapa.get("file:" + baseName);
  }

  return null;
}

// =========================================================================
// 3. INJEÇÃO SEGURA DE CONFIGURAÇÕES PÚBLICAS NO FRONTEND (SEM CHAVES DE IA)
// =========================================================================
function injetarVariaveisAmbienteNoJS(codigoJS, env) {
  const envPublico = {};
  for (const [chave, valor] of Object.entries(env)) {
    if (CHAVES_PUBLICAS_FRONTEND.has(chave)) {
      envPublico[chave] = valor;
    }
  }

  const cabecalhoEnv =
    'if (typeof import.meta !== "undefined") { import.meta.env = Object.assign(import.meta.env || {}, ' +
    JSON.stringify(envPublico) +
    "); }\n";

  return cabecalhoEnv + codigoJS;
}

// =========================================================================
// 4. CATÁLOGO DINÂMICO DE MODELOS & ROTEAMENTO GEMINI / VERTEX / UNOROUTER
// =========================================================================
const MODELOS_BASE_GEMINI = [
  {
    id: "4-hydrogen",
    nome: "4 Hydrogen",
    provedor: "gemini",
    subProvedor: "Google Gemini",
    contexto: "1M",
    descricao: "Principal • Rápido, preciso e otimizado para Markdown",
    badge: "Rápido",
    gratuito: false,
    ordem: 10
  },
  {
    id: "4-neon",
    nome: "4 Neon",
    provedor: "gemini",
    subProvedor: "Google Gemini",
    contexto: "1M",
    descricao: "Raciocínio avançado para código, Agro e análises profundas",
    badge: "Pro",
    gratuito: false,
    ordem: 11
  },
  {
    id: "gemini-2.5-flash",
    nome: "Gemini 2.5 Flash",
    provedor: "gemini",
    subProvedor: "Google Gemini",
    contexto: "1M",
    descricao: "Equilíbrio ideal entre velocidade e qualidade",
    badge: "1M",
    gratuito: false,
    ordem: 12
  },
  {
    id: "gemini-2.5-flash-lite",
    nome: "Gemini 2.5 Flash Lite",
    provedor: "gemini",
    subProvedor: "Google Gemini",
    contexto: "1M",
    descricao: "Baixíssima latência para respostas imediatas",
    badge: "Lite",
    gratuito: false,
    ordem: 13
  },
  {
    id: "gemini-2.5-pro",
    nome: "Gemini 2.5 Pro",
    provedor: "gemini",
    subProvedor: "Google Gemini",
    contexto: "1M",
    descricao: "Máxima capacidade analítica e raciocínio complexo",
    badge: "Pro",
    gratuito: false,
    ordem: 14
  }
];

const MODELOS_BASE_UNOROUTER = [
  { id: "gemini-3.6-flash:free", nome: "Gemini 3.6 Flash", contexto: "1M", familia: "Gemini" },
  { id: "gemini-3.5-flash-lite:free", nome: "Gemini 3.5 Flash Lite", contexto: "1M", familia: "Gemini" },
  { id: "gemini-3-flash:free", nome: "Gemini 3 Flash", contexto: "1M", familia: "Gemini" },
  { id: "gemini-3-pro:free", nome: "Gemini 3 Pro", contexto: "1M", familia: "Gemini" },
  { id: "gpt-6-luna:free", nome: "GPT-6 Luna", contexto: "1.1M", familia: "OpenAI" },
  { id: "gpt-6:free", nome: "GPT-6", contexto: "1.1M", familia: "OpenAI" },
  { id: "gpt-5.4:free", nome: "GPT-5.4", contexto: "1.1M", familia: "OpenAI" },
  { id: "gpt-5.4-mini:free", nome: "GPT-5.4 Mini", contexto: "400K", familia: "OpenAI" },
  { id: "gpt-5-mini:free", nome: "GPT-5 Mini", contexto: "400K", familia: "OpenAI" },
  { id: "gpt-4o:free", nome: "GPT-4o", contexto: "128K", familia: "OpenAI" },
  { id: "gpt-oss-120b:free", nome: "GPT-OSS 120B", contexto: "131K", familia: "OpenAI" },
  { id: "gpt-oss-20b:free", nome: "GPT-OSS 20B", contexto: "128K", familia: "OpenAI" },
  { id: "gpt-oss-safeguard-20b:free", nome: "GPT-OSS Safeguard 20B", contexto: "131K", familia: "OpenAI" },
  { id: "deepseek-v4.1-flash:free", nome: "DeepSeek V4.1 Flash", contexto: "1M", familia: "DeepSeek" },
  { id: "deepseek-v4.1-flash-1017:free", nome: "DeepSeek V4.1 Flash (1017)", contexto: "1M", familia: "DeepSeek" },
  { id: "deepseek-v4-flash:free", nome: "DeepSeek V4 Flash", contexto: "1M", familia: "DeepSeek" }
];

function formatarNomeModeloDinamico(id) {
  return String(id || "")
    .replace(/:free$/i, "")
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((parte) => {
      if (/^(gpt|oss|ai|pro|lite)$/i.test(parte)) return parte.toUpperCase();
      if (/^v\d/i.test(parte)) return parte.toUpperCase();
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(" ");
}

function detectarFamiliaUnoRouter(id) {
  const lower = String(id || "").toLowerCase();
  if (lower.includes("gemini")) return "Gemini";
  if (lower.includes("gpt")) return "OpenAI";
  if (lower.includes("deepseek")) return "DeepSeek";
  if (lower.includes("claude")) return "Anthropic";
  if (lower.includes("llama")) return "Meta";
  if (lower.includes("qwen")) return "Qwen";
  return "UnoRouter";
}

async function montarCatalogoDinamicoModelos(env) {
  const geminiAtivo = Boolean((env.VITE_GEMINI_API_KEY || "").trim());
  const unoRouterAtivo = Boolean((env.VITE_UNOROUTER_API_KEY || "").trim());
  const firebaseAtivo = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

  const mapaModelos = new Map();

  // 1. Modo Auto Inteligente (sempre disponível se houver pelo menos 1 provedor)
  if (geminiAtivo || unoRouterAtivo) {
    mapaModelos.set("auto", {
      id: "auto",
      nome: "Auto (Inteligente)",
      provedor: "auto",
      subProvedor: "Roteamento Dinâmico",
      contexto: "Dinâmico",
      descricao: "Escolhe automaticamente o melhor modelo para cada pergunta",
      badge: "Auto",
      gratuito: !geminiAtivo && unoRouterAtivo,
      disponivel: true,
      ordem: 1
    });
  }

  // 2. Modelos Google Gemini / Vertex Express
  if (geminiAtivo) {
    for (const m of MODELOS_BASE_GEMINI) {
      mapaModelos.set(m.id, { ...m, disponivel: true });
    }

    const geminiKey = env.VITE_GEMINI_API_KEY.trim();
    if (!geminiKey.startsWith("AQ.")) {
      try {
        const resp = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(geminiKey),
          { signal: AbortSignal.timeout(2500) }
        );
        if (resp.ok) {
          const dados = await resp.json();
          const lista = Array.isArray(dados?.models) ? dados.models : [];
          let ordemExtra = 20;
          for (const item of lista) {
            const idLimpo = String(item.name || "").replace(/^models\//, "");
            const metodos = item.supportedGenerationMethods || [];
            if (
              !idLimpo.startsWith("gemini-") ||
              !metodos.includes("generateContent") ||
              /embedding|tts|imagen|veo|audio/i.test(idLimpo)
            ) {
              continue;
            }
            if (!mapaModelos.has(idLimpo)) {
              mapaModelos.set(idLimpo, {
                id: idLimpo,
                nome: item.displayName || formatarNomeModeloDinamico(idLimpo),
                provedor: "gemini",
                subProvedor: "Google Gemini",
                contexto: item.inputTokenLimit
                  ? `${Math.round(item.inputTokenLimit / 1000)}K`
                  : "1M",
                descricao: item.description
                  ? String(item.description).slice(0, 72)
                  : "Descoberto ao vivo via API Gemini",
                badge: "Live",
                gratuito: false,
                disponivel: true,
                ordem: ordemExtra++
              });
            }
          }
        }
      } catch {
        // Fallback silencioso para o catálogo curado
      }
    }
  }

  // 3. Modelos UnoRouter (:free)
  if (unoRouterAtivo) {
    let ordemUno = 100;
    for (const m of MODELOS_BASE_UNOROUTER) {
      mapaModelos.set(m.id, {
        id: m.id,
        nome: m.nome,
        provedor: "unorouter",
        subProvedor: `UnoRouter • ${m.familia}`,
        contexto: m.contexto,
        descricao: `${m.familia} gratuito • Contexto ${m.contexto}`,
        badge: ":free",
        gratuito: true,
        disponivel: true,
        ordem: ordemUno++
      });
    }

    try {
      const baseUrl = (env.VITE_UNOROUTER_BASE_URL || "https://api.unorouter.com/v1").replace(/\/+$/, "");
      const respUno = await fetch(baseUrl + "/models", {
        headers: { Authorization: "Bearer " + env.VITE_UNOROUTER_API_KEY.trim() },
        signal: AbortSignal.timeout(2500)
      });
      if (respUno.ok) {
        const dadosUno = await respUno.json();
        const listaUno = Array.isArray(dadosUno?.data) ? dadosUno.data : [];
        for (const item of listaUno) {
          const id = String(item.id || "").trim();
          if (!id || !id.endsWith(":free")) continue;
          if (/embedding|whisper|tts|moderation|dall-e|imagen/i.test(id)) continue;
          if (!mapaModelos.has(id)) {
            const familia = detectarFamiliaUnoRouter(id);
            const ctxLen = item.context_length
              ? item.context_length >= 1000000
                ? `${(item.context_length / 1000000).toFixed(1).replace(/\.0$/, "")}M`
                : `${Math.round(item.context_length / 1000)}K`
              : "128K";
            mapaModelos.set(id, {
              id,
              nome: item.name || formatarNomeModeloDinamico(id),
              provedor: "unorouter",
              subProvedor: `UnoRouter • ${familia}`,
              contexto: ctxLen,
              descricao: `${familia} gratuito ao vivo • Contexto ${ctxLen}`,
              badge: ":free",
              gratuito: true,
              disponivel: true,
              ordem: ordemUno++
            });
          }
        }
      }
    } catch {
      // Fallback silencioso para o catálogo curado
    }
  }

  const modelosOrdenados = Array.from(mapaModelos.values()).sort((a, b) => a.ordem - b.ordem);
  const modeloPadrao = geminiAtivo
    ? "4-hydrogen"
    : unoRouterAtivo
    ? "gemini-3.6-flash:free"
    : "4-hydrogen";

  return {
    ok: true,
    providers: {
      firebase: firebaseAtivo,
      gemini: geminiAtivo,
      unoRouter: unoRouterAtivo
    },
    defaultModel: modeloPadrao,
    models: modelosOrdenados,
    timestamp: new Date().toISOString()
  };
}

function resolverModeloExecucao(modeloSolicitado, prompt, reasoningLevel, env) {
  const geminiKey = (env.VITE_GEMINI_API_KEY || "").trim();
  const unoKey = (env.VITE_UNOROUTER_API_KEY || "").trim();
  const geminiDefault = (env.VITE_GEMINI_MODEL || "gemini-2.5-flash").trim();

  const mapaRaciocinio = {
    Auto: { thinkingBudget: -1, temperature: 0.7 },
    Baixo: { thinkingBudget: 0, temperature: 0.5 },
    Médio: { thinkingBudget: 2048, temperature: 0.7 },
    Alto: { thinkingBudget: 8192, temperature: 0.85 }
  };
  const cfgRac = mapaRaciocinio[reasoningLevel] || mapaRaciocinio.Alto;

  let alvo = String(modeloSolicitado || "4-hydrogen").trim();
  const lower = alvo.toLowerCase();

  if (lower === "auto") {
    const complexo =
      String(prompt || "").length > 260 ||
      /\b(c[oó]digo|arquitetura|debug|analis[ae]|compare|gr[aá]fico|equa[cç][aã]o|estrat[eé]gia|relat[oó]rio|sql|api|refator|agro|t[aá]tica)\b/i.test(
        String(prompt || "")
      );
    if (geminiKey) {
      alvo = complexo ? "4-neon" : "4-hydrogen";
    } else if (unoKey) {
      alvo = complexo ? "deepseek-v4.1-flash:free" : "gemini-3.6-flash:free";
    }
  }

  const lowerAlvo = alvo.toLowerCase();
  const ehUnoRouter =
    alvo.endsWith(":free") ||
    lowerAlvo.startsWith("gpt") ||
    lowerAlvo.startsWith("deepseek") ||
    lowerAlvo.startsWith("claude") ||
    lowerAlvo.startsWith("llama") ||
    lowerAlvo.startsWith("qwen");

  if (ehUnoRouter) {
    return {
      provedor: "UnoRouter",
      modeloReal: alvo,
      rotulo: formatarNomeModeloDinamico(alvo),
      temperature: cfgRac.temperature,
      thinkingBudget: cfgRac.thinkingBudget
    };
  }

  if (lowerAlvo === "hydrogen" || lowerAlvo === "4-hydrogen") {
    return {
      provedor: "Google Gemini",
      modeloReal: geminiDefault || "gemini-2.5-flash",
      rotulo: "4 Hydrogen",
      temperature: cfgRac.temperature,
      thinkingBudget: cfgRac.thinkingBudget
    };
  }

  if (lowerAlvo === "4-neon" || lowerAlvo === "neon") {
    return {
      provedor: "Google Gemini",
      modeloReal: "gemini-2.5-pro",
      rotulo: "4 Neon",
      temperature: cfgRac.temperature,
      thinkingBudget: cfgRac.thinkingBudget === 0 ? 1024 : cfgRac.thinkingBudget
    };
  }

  const modeloLimpo = alvo.replace(/^models\//, "");
  return {
    provedor: "Google Gemini",
    modeloReal: modeloLimpo.includes("native-audio") ? "gemini-2.5-flash" : modeloLimpo,
    rotulo: modeloLimpo,
    temperature: cfgRac.temperature,
    thinkingBudget: cfgRac.thinkingBudget
  };
}

function construirUrlGemini(modelo, apiKey, stream = false) {
  const metodo = stream ? "streamGenerateContent?alt=sse&key=" : "generateContent?key=";
  const keyEncoded = encodeURIComponent(apiKey);
  if (apiKey.startsWith("AQ.")) {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelo}:${metodo}${keyEncoded}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:${metodo}${keyEncoded}`;
}

// =========================================================================
// 5. UTILITÁRIOS HTTP E ENDPOINTS INTERNOS (/api/*)
// =========================================================================
function enviarJson(res, statusCode, dados) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(dados, null, 2));
}

function enviarEventoSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function lerCorpoJson(req) {
  return new Promise((resolve, reject) => {
    let bruto = "";
    req.on("data", (chunk) => {
      bruto += chunk;
      if (bruto.length > 5 * 1024 * 1024) {
        reject(new Error("Payload excedeu o limite de 5MB."));
      }
    });
    req.on("end", () => {
      if (!bruto.trim()) return resolve({});
      try {
        resolve(JSON.parse(bruto));
      } catch {
        reject(new Error("JSON inválido no corpo da requisição."));
      }
    });
    req.on("error", reject);
  });
}

async function executarChatUnoRouter(reqBody, rota, env, resSse = null) {
  const baseUrl = (env.VITE_UNOROUTER_BASE_URL || "https://api.unorouter.com/v1").replace(/\/+$/, "");
  const apiKey = (env.VITE_UNOROUTER_API_KEY || "").trim();
  if (!apiKey) {
    throw Object.assign(new Error("VITE_UNOROUTER_API_KEY não configurada no .env."), { status: 500 });
  }

  const messages = [];
  if (reqBody.systemInstruction && String(reqBody.systemInstruction).trim()) {
    messages.push({ role: "system", content: String(reqBody.systemInstruction).trim() });
  }
  for (const h of reqBody.history || []) {
    const role = h.role || (h.papel === "user" ? "user" : "assistant");
    const content = h.content || h.texto || "";
    if (content) messages.push({ role, content });
  }
  messages.push({ role: "user", content: reqBody.prompt });

  const stream = Boolean(resSse);
  const respUno = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
      model: rota.modeloReal,
      messages,
      temperature: reqBody.temperature ?? rota.temperature,
      max_tokens: reqBody.maxTokens ?? 4096,
      stream
    })
  });

  if (!respUno.ok) {
    const errJson = await respUno.json().catch(() => ({}));
    throw Object.assign(
      new Error(errJson?.error?.message || `Erro na UnoRouter (HTTP ${respUno.status})`),
      { status: respUno.status }
    );
  }

  if (!stream) {
    const dadosUno = await respUno.json();
    const conteudo = dadosUno?.choices?.[0]?.message?.content || "";
    return {
      provedor: "UnoRouter",
      modelo: dadosUno?.model || rota.modeloReal,
      resposta: conteudo
    };
  }

  const reader = respUno.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let textoCompleto = "";
  let buffer = "";
  let modeloFinal = rota.modeloReal;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() || "";

    for (const linha of linhas) {
      const limpa = linha.trim();
      if (!limpa || !limpa.startsWith("data:")) continue;
      const payloadStr = limpa.replace(/^data:\s*/, "");
      if (payloadStr === "[DONE]") continue;
      try {
        const json = JSON.parse(payloadStr);
        if (json?.model) modeloFinal = json.model;
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (delta) {
          textoCompleto += delta;
          enviarEventoSse(resSse, {
            delta,
            texto: textoCompleto,
            provedor: "UnoRouter",
            modelo: modeloFinal
          });
        }
      } catch {
        // Ignora fragmentos JSON parciais
      }
    }
  }

  return {
    provedor: "UnoRouter",
    modelo: modeloFinal,
    resposta: textoCompleto
  };
}

async function executarChatGemini(reqBody, rota, env, resSse = null) {
  const geminiKey = (env.VITE_GEMINI_API_KEY || "").trim();
  if (!geminiKey) {
    throw Object.assign(new Error("VITE_GEMINI_API_KEY não configurada no .env."), { status: 500 });
  }

  const contents = [];
  for (const h of reqBody.history || []) {
    const texto = h.texto || h.content || "";
    if (!texto) continue;
    contents.push({
      role: h.papel === "user" || h.role === "user" ? "user" : "model",
      parts: [{ text: texto }]
    });
  }
  contents.push({ role: "user", parts: [{ text: reqBody.prompt }] });

  const payload = {
    contents,
    generationConfig: {
      temperature: reqBody.temperature ?? rota.temperature,
      maxOutputTokens: reqBody.maxTokens ?? 4096
    }
  };

  if (rota.thinkingBudget >= 0) {
    payload.generationConfig.thinkingConfig = {
      thinkingBudget: rota.thinkingBudget
    };
  }

  if (reqBody.systemInstruction && String(reqBody.systemInstruction).trim()) {
    payload.systemInstruction = {
      parts: [{ text: String(reqBody.systemInstruction).trim() }]
    };
  }

  const tentarChamada = async (modeloAlvo, stream) => {
    const url = construirUrlGemini(modeloAlvo, geminiKey, stream);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  };

  const usarStream = Boolean(resSse);
  let modeloUtilizado = rota.modeloReal;
  let respGemini = await tentarChamada(modeloUtilizado, usarStream);

  if (respGemini.status === 404 && modeloUtilizado !== "gemini-2.5-flash") {
    modeloUtilizado = "gemini-2.5-flash";
    respGemini = await tentarChamada(modeloUtilizado, usarStream);
  }

  if (!respGemini.ok && usarStream) {
    respGemini = await tentarChamada(modeloUtilizado, false);
    if (respGemini.ok) {
      const dados = await respGemini.json();
      const partes = dados?.candidates?.[0]?.content?.parts || [];
      const texto = partes.map((p) => p.text || "").join("");
      enviarEventoSse(resSse, {
        delta: texto,
        texto,
        provedor: "Google Gemini",
        modelo: modeloUtilizado
      });
      return { provedor: "Google Gemini", modelo: modeloUtilizado, resposta: texto };
    }
  }

  if (!respGemini.ok) {
    const dadosErro = await respGemini.json().catch(() => ({}));
    throw Object.assign(
      new Error(dadosErro?.error?.message || `Erro na API Gemini (HTTP ${respGemini.status})`),
      { status: respGemini.status }
    );
  }

  if (!usarStream) {
    const dadosGemini = await respGemini.json();
    const partes = dadosGemini?.candidates?.[0]?.content?.parts || [];
    const texto = partes.map((p) => p.text || "").join("");
    return {
      provedor: "Google Gemini",
      modelo: modeloUtilizado,
      resposta: texto
    };
  }

  const reader = respGemini.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let textoCompleto = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() || "";

    for (const linha of linhas) {
      const limpa = linha.trim();
      if (!limpa || !limpa.startsWith("data:")) continue;
      const payloadStr = limpa.replace(/^data:\s*/, "");
      if (payloadStr === "[DONE]") continue;
      try {
        const json = JSON.parse(payloadStr);
        const partes = json?.candidates?.[0]?.content?.parts || [];
        const delta = partes.map((p) => p.text || "").join("");
        if (delta) {
          textoCompleto += delta;
          enviarEventoSse(resSse, {
            delta,
            texto: textoCompleto,
            provedor: "Google Gemini",
            modelo: modeloUtilizado
          });
        }
      } catch {
        // Ignora fragmentos JSON parciais
      }
    }
  }

  return {
    provedor: "Google Gemini",
    modelo: modeloUtilizado,
    resposta: textoCompleto
  };
}

async function tratarRotasApi(req, res, urlObj, env) {
  const pathname = urlObj.pathname;

  if (req.method === "GET" && pathname === "/api/status") {
    const mapa = mapearArquivosDoProjeto();
    const arquivosConectados = Array.from(mapa.entries())
      .filter(([chave]) => !chave.startsWith("file:"))
      .map(([rota]) => rota)
      .sort();

    enviarJson(res, 200, {
      status: "online",
      url: SINGLE_URL,
      timestamp: new Date().toISOString(),
      integracoesEnv: {
        firebaseConfigurado: Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID),
        geminiConfigurado: Boolean(env.VITE_GEMINI_API_KEY),
        unoRouterConfigurado: Boolean(env.VITE_UNOROUTER_API_KEY),
        geminiLiveModel: env.VITE_GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025",
        envProtegido: true
      },
      arquivosConectados
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/models") {
    const catalogo = await montarCatalogoDinamicoModelos(env);
    enviarJson(res, 200, catalogo);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/proxy/espn") {
    const target = urlObj.searchParams.get("url") || "";
    try {
      const parsed = new URL(target);
      const allowedHosts = new Set([
        "site.api.espn.com",
        "site.web.api.espn.com",
        "sports.core.api.espn.com",
        "cdn.espn.com"
      ]);
      if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
        enviarJson(res, 403, { erro: "Host ESPN não permitido." });
        return true;
      }
      const resp = await fetch(parsed.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000)
      });
      const text = await resp.text();
      res.writeHead(resp.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(text);
      return true;
    } catch (err) {
      enviarJson(res, 502, { erro: "Falha ao consultar ESPN: " + err.message });
      return true;
    }
  }

  if (req.method === "POST" && pathname === "/api/chat") {
    let emModoStream = false;
    try {
      const corpo = await lerCorpoJson(req);
      const prompt = corpo.prompt;
      const model = corpo.model || "4-hydrogen";
      const reasoningLevel = corpo.reasoningLevel || "Alto";
      emModoStream = Boolean(corpo.stream);

      if (!prompt) {
        enviarJson(res, 400, { erro: "O campo 'prompt' é obrigatório." });
        return true;
      }

      const rota = resolverModeloExecucao(model, prompt, reasoningLevel, env);

      if (emModoStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive"
        });

        let resultado;
        try {
          resultado =
            rota.provedor === "UnoRouter"
              ? await executarChatUnoRouter(corpo, rota, env, res)
              : await executarChatGemini(corpo, rota, env, res);
        } catch (errPrincipal) {
          // Fallback automático entre provedores se o outro estiver configurado
          if (rota.provedor === "UnoRouter" && env.VITE_GEMINI_API_KEY) {
            const rotaFallback = resolverModeloExecucao("4-hydrogen", prompt, reasoningLevel, env);
            resultado = await executarChatGemini(corpo, rotaFallback, env, res);
          } else if (rota.provedor === "Google Gemini" && env.VITE_UNOROUTER_API_KEY) {
            const rotaFallback = resolverModeloExecucao("gemini-3.6-flash:free", prompt, reasoningLevel, env);
            resultado = await executarChatUnoRouter(corpo, rotaFallback, env, res);
          } else {
            throw errPrincipal;
          }
        }

        enviarEventoSse(res, {
          done: true,
          provedor: resultado.provedor,
          modelo: resultado.modelo,
          texto: resultado.resposta
        });
        res.write("data: [DONE]\n\n");
        res.end();
        return true;
      }

      let resultado;
      try {
        resultado =
          rota.provedor === "UnoRouter"
            ? await executarChatUnoRouter(corpo, rota, env, null)
            : await executarChatGemini(corpo, rota, env, null);
      } catch (errPrincipal) {
        if (rota.provedor === "UnoRouter" && env.VITE_GEMINI_API_KEY) {
          const rotaFallback = resolverModeloExecucao("4-hydrogen", prompt, reasoningLevel, env);
          resultado = await executarChatGemini(corpo, rotaFallback, env, null);
        } else if (rota.provedor === "Google Gemini" && env.VITE_UNOROUTER_API_KEY) {
          const rotaFallback = resolverModeloExecucao("gemini-3.6-flash:free", prompt, reasoningLevel, env);
          resultado = await executarChatUnoRouter(corpo, rotaFallback, env, null);
        } else {
          throw errPrincipal;
        }
      }

      enviarJson(res, 200, resultado);
      return true;
    } catch (err) {
      if (emModoStream && res.headersSent) {
        enviarEventoSse(res, { error: err.message || "Erro ao gerar resposta." });
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        enviarJson(res, err.status || 500, { erro: err.message });
      }
      return true;
    }
  }

  return false;
}

// =========================================================================
// 6. SERVIDOR ÚNICO EM http://localhost:4145
// =========================================================================
const server = http.createServer(async (req, res) => {
  const envAtual = carregarEnvDinamico();
  const urlObj = new URL(req.url || "/", SINGLE_URL);
  const pathname = urlObj.pathname;

  // Bloqueio explícito contra qualquer tentativa de acesso ao .env ou dotfiles
  if (caminhoEhSensivel(pathname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 - Acesso bloqueado a arquivo protegido.");
    return;
  }

  // Consolida transições de tela em um único endereço (http://localhost:4145)
  if (pathname === "/dashboard" || pathname === "/dashboard.html") {
    res.writeHead(302, {
      "Set-Cookie": "ws_session=active; Path=/; SameSite=Lax",
      Location: "/"
    });
    res.end();
    return;
  }

  if (pathname === "/login" || pathname === "/login.html") {
    res.writeHead(302, {
      "Set-Cookie": "ws_session=; Path=/; Max-Age=0; SameSite=Lax",
      Location: "/"
    });
    res.end();
    return;
  }

  // Endpoints de API internos
  if (pathname.startsWith("/api/")) {
    const atendido = await tratarRotasApi(req, res, urlObj, envAtual);
    if (atendido) return;
    enviarJson(res, 404, { erro: "Endpoint " + pathname + " não encontrado." });
    return;
  }

  // Entrega dinâmica da tela ativa (Login ou Dashboard) e seus módulos/estilos
  const arquivoLocal = resolverArquivoDinamico(pathname, temSessaoAtiva(req));

  if (!arquivoLocal) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 - Recurso não encontrado: " + pathname);
    return;
  }

  const ext = path.extname(arquivoLocal).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  if (ext === ".js" || ext === ".mjs") {
    const codigoOriginal = fs.readFileSync(arquivoLocal, "utf-8");
    const codigoComEnv = injetarVariaveisAmbienteNoJS(codigoOriginal, envAtual);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });
    res.end(codigoComEnv);
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(arquivoLocal).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log("\nServidor ativo em: " + SINGLE_URL + "\n");
});
