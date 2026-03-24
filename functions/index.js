const functions = require("firebase-functions");

// ============================================
// CONFIGURAÇÕES
// ============================================
const CONFIG = {
  // API Key da Anthropic Claude (configurada via Firebase Config ou variáveis de ambiente)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  
  // Configurações da API
  API_URL: "https://api.anthropic.com/v1/messages",
  API_VERSION: "2023-06-01",
  MODEL: "claude-sonnet-4-20250514",
  MAX_TOKENS: 2000,
  
  // CORS
  ALLOWED_ORIGINS: "*", // Em produção, pode limitar para seu domínio específico
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Valida o payload da requisição
 * @param {Object} body - Corpo da requisição
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validatePayload(body) {
  if (!body) {
    return { valid: false, error: "Request body is missing" };
  }
  
  if (!body.messages || !Array.isArray(body.messages)) {
    return { valid: false, error: "messages field is required and must be an array" };
  }
  
  if (!body.systemPrompt || typeof body.systemPrompt !== "string") {
    return { valid: false, error: "systemPrompt field is required and must be a string" };
  }
  
  if (body.messages.length === 0) {
    return { valid: false, error: "messages array cannot be empty" };
  }
  
  return { valid: true };
}

/**
 * Chama a API da Anthropic Claude
 * @param {string} systemPrompt - Prompt do sistema
 * @param {Array} messages - Array de mensagens
 * @returns {Promise<Object>} - Resposta da API
 */
async function callClaudeAPI(systemPrompt, messages) {
  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.ANTHROPIC_API_KEY,
      "anthropic-version": CONFIG.API_VERSION,
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: systemPrompt,
      messages: messages,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error?.message || "API request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// ============================================
// ENDPOINT PRINCIPAL
// ============================================

/**
 * Cloud Function para conversar com a IA Anthropic Claude
 * Endpoint: POST /chatWithAI
 * Body: { systemPrompt: string, messages: Array<{role: string, content: string}> }
 */
exports.chatWithAI = functions.https.onRequest(async (req, res) => {
  const startTime = Date.now();
  
  // Configurar CORS
  res.set("Access-Control-Allow-Origin", CONFIG.ALLOWED_ORIGINS);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Responder preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // Aceitar apenas POST
  if (req.method !== "POST") {
    res.status(405).json({ 
      error: "Method Not Allowed",
      message: "Only POST requests are accepted"
    });
    return;
  }

  try {
    // 1. Validar payload
    const validation = validatePayload(req.body);
    if (!validation.valid) {
      console.warn("Invalid payload:", validation.error);
      res.status(400).json({ 
        error: "Bad Request",
        message: validation.error 
      });
      return;
    }

    const { messages, systemPrompt } = req.body;
    
    // 2. Log da requisição (sem dados sensíveis)
    console.log("Request received:", {
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
      timestamp: new Date().toISOString(),
    });

    // 3. Chamar API da Claude
    const data = await callClaudeAPI(systemPrompt, messages);

    // 4. Log de sucesso
    const duration = Date.now() - startTime;
    console.log("Request successful:", {
      duration: `${duration}ms`,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      model: data.model,
    });

    // 5. Retornar resposta
    res.status(200).json(data);
    
  } catch (error) {
    // Log detalhado do erro
    const duration = Date.now() - startTime;
    console.error("Request failed:", {
      duration: `${duration}ms`,
      error: error.message,
      status: error.status || 500,
      stack: error.stack,
    });

    // Retornar erro apropriado
    const statusCode = error.status || 500;
    res.status(statusCode).json({ 
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.data : undefined,
    });
  }
});
