// APIS/Firebase&Gemini/FirebaseGemini.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Leitura segura exclusiva das variáveis públicas injetadas pelo servidor
const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const GEMINI_API_KEY = (env.VITE_GEMINI_API_KEY || "").trim();
const GEMINI_DEFAULT_MODEL = (env.VITE_GEMINI_MODEL || "gemini-2.5-flash").trim();

function validarAmbiente() {
  const obrigatorias = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID"
  ];
  const ausentes = obrigatorias.filter((chave) => !env[chave]);
  if (ausentes.length > 0) {
    console.warn(
      `[W3Labs WillIAn • .env] Variáveis Firebase ausentes no ambiente atual: ${ausentes.join(", ")}. Verifique o arquivo .env na raiz.`
    );
  }
}

validarAmbiente();

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Provedor Google Auth
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * Monta automaticamente a URL correta conforme o tipo da chave API (fallback direto)
 */
function construirUrlGenerateContent(modelo = GEMINI_DEFAULT_MODEL) {
  const keyEncoded = encodeURIComponent(GEMINI_API_KEY);
  if (GEMINI_API_KEY.startsWith("AQ.")) {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelo}:generateContent?key=${keyEncoded}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${keyEncoded}`;
}

export async function autenticarUsuario(usuarioOuEmail, senha) {
  const emailFormatado = usuarioOuEmail.includes("@")
    ? usuarioOuEmail.trim()
    : `${usuarioOuEmail.trim()}@walkertech.local`;

  const credencial = await signInWithEmailAndPassword(auth, emailFormatado, senha);
  return credencial.user;
}

export async function autenticarComGoogle() {
  const credencial = await signInWithPopup(auth, googleProvider);
  const user = credencial.user;

  await setDoc(
    doc(db, "usuarios", user.uid),
    {
      nome: user.displayName || (user.email ? user.email.split("@")[0] : "Usuário Google"),
      email: user.email || "",
      fotoUrl: user.photoURL || "",
      ultimoAcessoEm: serverTimestamp()
    },
    { merge: true }
  );

  return user;
}

export async function cadastrarUsuario(usuarioOuEmail, senha, nomeExibicao = "") {
  const emailFormatado = usuarioOuEmail.includes("@")
    ? usuarioOuEmail.trim()
    : `${usuarioOuEmail.trim()}@walkertech.local`;

  const credencial = await createUserWithEmailAndPassword(auth, emailFormatado, senha);
  const nome = nomeExibicao.trim() || emailFormatado.split("@")[0];

  await updateProfile(credencial.user, { displayName: nome });
  await setDoc(doc(db, "usuarios", credencial.user.uid), {
    nome,
    email: emailFormatado,
    criadoEm: serverTimestamp()
  });

  return credencial.user;
}

export function observarSessao(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

export async function sairDaConta() {
  await signOut(auth);
}

export async function salvarMensagemFirestore(uid, conversaId, titulo, papel, texto) {
  if (!uid) return null;
  try {
    const refConversa = doc(db, "usuarios", uid, "conversas", conversaId);
    await setDoc(
      refConversa,
      {
        titulo: titulo.slice(0, 48),
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );

    const refMensagens = collection(db, "usuarios", uid, "conversas", conversaId, "mensagens");
    await addDoc(refMensagens, {
      papel,
      texto,
      criadoEm: serverTimestamp()
    });
  } catch (erro) {
    console.error("Erro ao sincronizar histórico com Firestore:", erro);
  }
}

export async function listarConversasUsuario(uid) {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, "usuarios", uid, "conversas"),
      orderBy("atualizadoEm", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (erro) {
    console.error("Erro ao carregar conversas do Firestore:", erro);
    return [];
  }
}

function resolverConfiguracaoDinamica(modeloId, prompt = "", nivelRaciocinio = "Alto") {
  const idNormalizado = (modeloId || "4-hydrogen").toLowerCase();

  const mapaRaciocinio = {
    Auto: { thinkingBudget: -1, temperature: 0.7 },
    Baixo: { thinkingBudget: 0, temperature: 0.5 },
    Médio: { thinkingBudget: 2048, temperature: 0.7 },
    Alto: { thinkingBudget: 8192, temperature: 0.85 }
  };
  const cfgRaciocinio = mapaRaciocinio[nivelRaciocinio] || mapaRaciocinio.Alto;

  if (idNormalizado === "auto") {
    const exigeProfundidade =
      prompt.length > 260 ||
      /\b(c[oó]digo|arquitetura|debug|analis[ae]|compare|gr[aá]fico|equa[cç][aã]o|estrat[eé]gia|relat[oó]rio|sql|api|refator)/i.test(
        prompt
      );

    return {
      modeloReal: exigeProfundidade ? "gemini-2.5-pro" : "gemini-2.5-flash",
      rotuloExecutado: exigeProfundidade ? "4 Neon (Auto)" : "4 Hydrogen (Auto)",
      temperature: cfgRaciocinio.temperature,
      thinkingBudget: exigeProfundidade
        ? Math.max(cfgRaciocinio.thinkingBudget, 4096)
        : cfgRaciocinio.thinkingBudget
    };
  }

  if (idNormalizado === "4-neon") {
    return {
      modeloReal: "gemini-2.5-pro",
      rotuloExecutado: "4 Neon",
      temperature: cfgRaciocinio.temperature,
      thinkingBudget: cfgRaciocinio.thinkingBudget === 0 ? 1024 : cfgRaciocinio.thinkingBudget
    };
  }

  if (idNormalizado === "4-hydrogen" || idNormalizado === "hydrogen") {
    return {
      modeloReal: GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
      rotuloExecutado: "4 Hydrogen",
      temperature: cfgRaciocinio.temperature,
      thinkingBudget: cfgRaciocinio.thinkingBudget
    };
  }

  return {
    modeloReal: modeloId || GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
    rotuloExecutado: modeloId || "4 Hydrogen",
    temperature: cfgRaciocinio.temperature,
    thinkingBudget: cfgRaciocinio.thinkingBudget
  };
}

/**
 * Lê eventos SSE emitidos pelo endpoint seguro /api/chat
 */
async function consumirSseChat(resposta, onChunk) {
  const reader = resposta.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let textoCompleto = "";
  let buffer = "";
  let meta = { provedor: "", modelo: "" };

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
      if (payloadStr === "[DONE]") {
        return { texto: textoCompleto, ...meta };
      }

      try {
        const json = JSON.parse(payloadStr);
        if (json.error) {
          throw new Error(json.error);
        }
        if (json.provedor) meta.provedor = json.provedor;
        if (json.modelo) meta.modelo = json.modelo;

        if (typeof json.texto === "string" && json.done) {
          textoCompleto = json.texto || textoCompleto;
        } else if (json.delta) {
          textoCompleto += json.delta;
          if (typeof onChunk === "function") {
            onChunk(json.delta, textoCompleto, meta);
          }
        }
      } catch (erroParse) {
        if (erroParse instanceof SyntaxError) continue;
        throw erroParse;
      }
    }
  }

  return { texto: textoCompleto, ...meta };
}

/**
 * Envio unificado via backend seguro (/api/chat) com streaming em tempo real
 * mantendo a chave do .env exclusivamente no servidor.
 */
export async function enviarChatServidorStream(
  prompt,
  modeloSelecionado = "4-hydrogen",
  historico = [],
  onChunk = null,
  opcoes = {}
) {
  const usarStream = opcoes.stream !== false;
  const resposta = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: modeloSelecionado,
      history: historico,
      systemInstruction: opcoes.systemInstruction || "",
      reasoningLevel: opcoes.reasoningLevel || "Alto",
      stream: usarStream
    })
  });

  const contentType = resposta.headers.get("content-type") || "";

  if (!resposta.ok) {
    const detalhe = await resposta.json().catch(() => ({}));
    throw new Error(detalhe?.erro || `Falha na requisição (HTTP ${resposta.status})`);
  }

  if (contentType.includes("text/event-stream") && resposta.body) {
    const resultado = await consumirSseChat(resposta, onChunk);
    return {
      texto: resultado.texto || "Sem resposta textual retornada pelo modelo.",
      provedor: resultado.provedor || "IA",
      modelo: resultado.modelo || modeloSelecionado
    };
  }

  const dados = await resposta.json();
  const texto = dados?.resposta || "Sem resposta textual retornada pelo modelo.";
  if (typeof onChunk === "function") {
    onChunk(texto, texto, { provedor: dados?.provedor, modelo: dados?.modelo });
  }
  return {
    texto,
    provedor: dados?.provedor || "IA",
    modelo: dados?.modelo || modeloSelecionado
  };
}

/**
 * Enviar Prompt para a API do Gemini (usa /api/chat seguro como caminho principal)
 */
export async function enviarPromptGemini(
  prompt,
  modeloSelecionado = "4-hydrogen",
  historico = [],
  systemInstruction = "",
  nivelRaciocinio = "Alto"
) {
  if (!GEMINI_API_KEY) {
    const res = await enviarChatServidorStream(
      prompt,
      modeloSelecionado,
      historico,
      null,
      {
        systemInstruction,
        reasoningLevel: nivelRaciocinio,
        stream: false
      }
    );
    return res.texto;
  }

  const dinamico = resolverConfiguracaoDinamica(modeloSelecionado, prompt, nivelRaciocinio);
  const modeloAlvo = dinamico.modeloReal.replace(/^models\//, "");

  const contents = [
    ...historico.map((item) => ({
      role: item.papel === "user" ? "user" : "model",
      parts: [{ text: item.texto }]
    })),
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const payload = {
    contents,
    generationConfig: {
      temperature: dinamico.temperature,
      maxOutputTokens: 4096
    }
  };

  if (dinamico.thinkingBudget >= 0) {
    payload.generationConfig.thinkingConfig = {
      thinkingBudget: dinamico.thinkingBudget
    };
  }

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  async function executarRequisicao(modelo) {
    return fetch(construirUrlGenerateContent(modelo), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  let resposta = await executarRequisicao(modeloAlvo);

  if (resposta.status === 404 && modeloAlvo !== "gemini-2.5-flash") {
    resposta = await executarRequisicao("gemini-2.5-flash");
  }

  if (!resposta.ok) {
    const detalhe = await resposta.json().catch(() => ({}));
    throw new Error(
      detalhe?.error?.message || `Falha na requisição (${dinamico.rotuloExecutado} • HTTP ${resposta.status})`
    );
  }

  const dados = await resposta.json();
  return (
    dados?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
    "Sem resposta textual retornada pelo modelo."
  );
}

export { auth, db, GEMINI_DEFAULT_MODEL };
