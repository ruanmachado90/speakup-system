const functions = require("firebase-functions");

// Endpoint para conversar com a IA
exports.chatWithAI = functions.https.onRequest(async (req, res) => {
  // Habilitar CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Responder OPTIONS para preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !systemPrompt) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Chamar a API da Anthropic Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "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",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API Error:", JSON.stringify(data));
      res.status(response.status).json({ 
        error: data.error?.message || "Erro na API da Anthropic" 
      });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in chatWithAI:", error.message, error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});
