const express = require("express");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const sharp = require("sharp");

const app = express();
const PORT = 3000;

app.get("/trtimg", async (req, res) => {
  const { url, lang = "eng+ara+fra+spa+chis_sim+jpn+kor" } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing "url" query parameter' });

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const pngBuffer = await sharp(Buffer.from(response.data)).png().toBuffer();
    const { data } = await Tesseract.recognize(pngBuffer, lang);
    const text = data.text.trim();

    const trt = await axios.get(`https://trt-php.vercel.app/translate.php?lang=ar&text=${encodeURIComponent(text)}`);

    return res.json({
      success: true,
      lang,
      text,
      translated: trt.data.result,
      confidence: Math.round(data.confidence),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
      
