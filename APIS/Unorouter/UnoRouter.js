// APIS/Unorouter/UnoRouter.js
import { enviarChatServidorStream } from "../Firebase&Gemini/FirebaseGemini.js";

// Leitura segura exclusiva das configurações públicas injetadas pelo servidor
const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

const UNOROUTER_BASE_URL = (env.VITE_UNOROUTER_BASE_URL || "https://api.unorouter.com/v1").replace(/\/+$/, "");
const UNOROUTER_API_KEY = (env.VITE_UNOROUTER_API_KEY || "").trim();

/**
 * Catálogo base dos modelos gratuitos (:free) da UnoRouter
 * (Enriquecido dinamicamente em tempo real via GET /api/models)
 */
export const MODELOS_GRATUITOS_UNOROUTER = {
  gemini: [
    { id: "gemini-3.6-flash:free", nome: "Gemini 3.6 Flash", contexto: "1M", tipo: "chat" },
    { id: "gemini-3.5-flash-lite:free", nome: "Gemini 3.5 Flash Lite", contexto: "1M", tipo: "chat" },
    { id: "gemini-3-flash:free", nome: "Gemini 3 Flash", contexto: "1M", tipo: "chat" },
    { id: "gemini-3-pro:free", nome: "Gemini 3 Pro", contexto: "1M", tipo: "chat" },
    { id: "gemini-embedding-2:free", nome: "Gemini Embedding 2", contexto: "8.2K", tipo: "embedding" },
    { id: "gemini-embedding-001:free", nome: "Gemini Embedding 001", contexto: "8.2K", tipo: "embedding" }
  ],
  gpt: [
    { id: "gpt-6-luna:free", nome: "GPT-6 Luna", contexto: "1.1M", tipo: "chat" },
    { id: "gpt-6:free", nome: "GPT-6", contexto: "1.1M", tipo: "chat" },
    { id: "gpt-5.4-mini:free", nome: "GPT-5.4 Mini", contexto: "400K", tipo: "chat" },
    { id: "gpt-5.4:free", nome: "GPT-5.4", contexto: "1.1M", tipo: "chat" },
    { id: "gpt-oss-safeguard-20b:free", nome: "GPT-OSS Safeguard 20B", contexto: "131.1K", tipo: "chat" },
    { id: "gpt-5-mini:free", nome: "GPT-5 Mini", contexto: "400K", tipo: "chat" },
    { id: "gpt-oss-20b:free", nome: "GPT-OSS 20B", contexto: "128K", tipo: "chat" },
    { id: "gpt-oss-120b:free", nome: "GPT-OSS 120B", contexto: "131.1K", tipo: "chat" },
    { id: "gpt-4o:free", nome: "GPT-4o", contexto: "128K", tipo: "chat" }
  ],
  deepseek: [
    { id: "deepseek-v4.1-flash-1017:free", nome: "DeepSeek V4.1 Flash (1017)", contexto: "1M", tipo: "chat" },
    { id: "deepseek-v4.1-flash:free", nome: "DeepSeek V4.1 Flash", contexto: "1M", tipo: "chat" },
    { id: "deepseek-v4-flash:free", nome: "DeepSeek V4 Flash", contexto: "1M", tipo: "chat" }
  ]
};

export const MODELO_PADRAO_UNOROUTER = "gemini-3.6-flash:free";

export function listarModelosChatGratuitos() {
  return [
    ...MODELOS_GRATUITOS_UNOROUTER.gemini,
    ...MODELOS_GRATUITOS_UNOROUTER.gpt,
    ...MODELOS_GRATUITOS_UNOROUTER.deepseek
  ].filter((m) => m.tipo === "chat");
}

function formatarMensagensOpenAI(prompt, historico = [], systemPrompt = "") {
  const mensagens = [];

  if (systemPrompt && systemPrompt.trim()) {
    mensagens.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const item of historico) {
    if (item.role && item.content) {
      mensagens.push({ role: item.role, content: item.content });
    } else if (item.papel && item.texto) {
      mensagens.push({
        role: item.papel === "user" ? "user" : "assistant",
        content: item.texto
      });
    }
  }

  mensagens.push({ role: "user", content: prompt });
  return mensagens;
}

async function tratarErroUnoRouter(resposta) {
  const corpo = await resposta.json().catch(() => ({}));
  const detalheApi = corpo?.error?.message || "";

  switch (resposta.status) {
    case 401:
      return new Error(`Chave de API UnoRouter inválida ou expirada (401). ${detalheApi}`);
    case 402:
      return new Error(`Saldo insuficiente para modelo pago (402). Use um modelo terminado em ":free". ${detalheApi}`);
    case 429:
      return new Error(`Limite de taxa (Rate Limit) atingido na UnoRouter (429). Aguarde alguns segundos. ${detalheApi}`);
    case 503:
      return new Error(`Provedor temporariamente indisponível (503). Tente outro modelo ":free". ${detalheApi}`);
    default:
      return new Error(detalheApi || `Erro na API UnoRouter (HTTP ${resposta.status})`);
  }
}

export async function enviarChatUnoRouter(
  prompt,
  modelo = MODELO_PADRAO_UNOROUTER,
  historico = [],
  opcoes = {}
) {
  if (!UNOROUTER_API_KEY) {
    const res = await enviarChatServidorStream(prompt, modelo, historico, null, {
      systemInstruction: opcoes.systemPrompt || "",
      reasoningLevel: opcoes.reasoningLevel || "Alto",
      stream: false
    });
    return {
      texto: res.texto,
      modeloUtilizado: res.modelo,
      usoTokens: null
    };
  }

  const messages = formatarMensagensOpenAI(prompt, historico, opcoes.systemPrompt);

  const resposta = await fetch(`${UNOROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UNOROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: modelo,
      messages,
      temperature: opcoes.temperature ?? 0.7,
      max_tokens: opcoes.maxTokens ?? 2048,
      stream: false
    })
  });

  if (!resposta.ok) {
    throw await tratarErroUnoRouter(resposta);
  }

  const dados = await resposta.json();
  const conteudo = dados?.choices?.[0]?.message?.content;

  if (!conteudo) {
    throw new Error("A UnoRouter retornou uma resposta vazia.");
  }

  return {
    texto: conteudo,
    modeloUtilizado: dados.model || modelo,
    usoTokens: dados.usage || null
  };
}

export async function enviarChatUnoRouterStream(
  prompt,
  modelo = MODELO_PADRAO_UNOROUTER,
  historico = [],
  onChunk,
  opcoes = {}
) {
  if (!UNOROUTER_API_KEY) {
    const res = await enviarChatServidorStream(prompt, modelo, historico, onChunk, {
      systemInstruction: opcoes.systemPrompt || "",
      reasoningLevel: opcoes.reasoningLevel || "Alto",
      stream: opcoes.stream !== false
    });
    return res.texto;
  }

  const messages = formatarMensagensOpenAI(prompt, historico, opcoes.systemPrompt);

  const resposta = await fetch(`${UNOROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UNOROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: modelo,
      messages,
      temperature: opcoes.temperature ?? 0.7,
      max_tokens: opcoes.maxTokens ?? 2048,
      stream: true
    })
  });

  if (!resposta.ok) {
    throw await tratarErroUnoRouter(resposta);
  }

  const reader = resposta.body.getReader();
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
      if (payloadStr === "[DONE]") return textoCompleto;

      try {
        const json = JSON.parse(payloadStr);
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (delta) {
          textoCompleto += delta;
          if (typeof onChunk === "function") {
            onChunk(delta, textoCompleto);
          }
        }
      } catch {
        // Ignora fragmentos JSON parciais
      }
    }
  }

  return textoCompleto;
}

export async function gerarEmbeddingsUnoRouter(
  entrada,
  modelo = "gemini-embedding-2:free"
) {
  if (!UNOROUTER_API_KEY) {
    throw new Error(
      "VITE_UNOROUTER_API_KEY não configurada para geração de embeddings no cliente."
    );
  }

  const resposta = await fetch(`${UNOROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UNOROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: modelo,
      input: entrada
    })
  });

  if (!resposta.ok) {
    throw await tratarErroUnoRouter(resposta);
  }

  const dados = await resposta.json();
  return dados?.data || [];
}

export { UNOROUTER_BASE_URL };
