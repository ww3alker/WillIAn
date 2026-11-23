const express = require("express");
const cors = require("cors");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    message: "WillIAn AI - Backend API",
    version: "1.0.0",
  });
});

app.use("/api", chatRoutes);

app.listen(PORT, () => {
  console.log(`WillIAn Backend rodando na porta ${PORT}`);
});

module.exports = app;