const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;
const MODEL = "claude-sonnet-4-20250514";

// GET /img2txt?url=https://example.com/image.png
app.get("/img2txt", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: "Missing required query param: url",
    });
  }

  try {
    // Download image
    const imageResponse = await axios.get(url, {
      responseType: "arraybuffer",
    });

    const contentType = imageResponse.headers["content-type"];

    if (!contentType || !contentType.startsWith("image/")) {
      return res.status(400).json({
        error: "URL does not point to a valid image",
      });
    }

    // Convert image to base64
    const base64Image = Buffer.from(imageResponse.data).toString("base64");

    // Send image to Anthropic
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: contentType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text:
                  "Extract and return ALL text visible in this image. " +
                  "Preserve formatting and layout as much as possible. " +
                  "If there is no text, respond with: No text found in image.",
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    const text = response.data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return res.json({
      url,
      text,
    });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({
        error:
          err.response.data?.error?.message ||
          "Anthropic API error",
      });
    }

    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
