const express = require("express");
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();

// Configuração de upload de arquivos
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

let openai = null;

function initClient() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.error("AI_API_KEY não está definido no .env");
    return null;
  }
  return new OpenAI({ apiKey });
}

function getAI() {
  if (!openai) openai = initClient();
  return openai;
}

// Rota de chat - texto simples
router.post("/chat", async (req, res) => {
  const { message, conversation } = req.body;

  if (!message) {
    return res.status(400).json({ error: "A mensagem é obrigatória" });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(500).json({ error: "Serviço de IA não configurado" });
  }

  try {
    const history = conversation || [];
    const response = await ai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é o WillIAn, um assistente de IA amigável e útil. Responda em português brasileiro.",
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Erro na IA:", err);
    res.status(500).json({ error: "Erro ao processar a mensagem" });
  }
});

// Rota de chat com upload de imagem
router.post("/chat/image", upload.single("image"), async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "A mensagem é obrigatória" });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(500).json({ error: "Serviço de IA não configurado" });
  }

  try {
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString("base64");
    const ext = path.extname(req.file.originalname).split(".").pop();

    const response = await ai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Você é o WillIAn, um assistente de IA. Analise a imagem enviada e responda em português brasileiro.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: message },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${ext};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    const reply = response.choices[0].message.content;
    fs.unlinkSync(req.file.path); // Limpa o arquivo
    res.json({ reply });
  } catch (err) {
    console.error("Erro na IA:", err);
    res.status(500).json({ error: "Erro ao processar a imagem" });
  }
});

// Rota para gerar imagem
router.post("/image", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "O prompt é obrigatório" });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(500).json({ error: "Serviço de IA não configurado" });
  }

  try {
    const response = await ai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    res.json({ url: response.data[0].url });
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    res.status(500).json({ error: "Erro ao gerar a imagem" });
  }
});

module.exports = router;