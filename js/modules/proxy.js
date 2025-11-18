import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors()); // habilita CORS para todos

// PROXY ANTI-CORS
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url parameter");

    // Descarga desde Google Drive
    const response = await fetch(url);
    if (!response.ok) return res.status(500).send("Failed to fetch image");

    const buffer = await response.arrayBuffer();

    // Entregar imagen SIN BLOQUEOS CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error(e);
    res.status(500).send("Proxy error");
  }
});

app.listen(3000, () => {
  console.log("CORS proxy running at http://localhost:3000/proxy?url=...");
});
