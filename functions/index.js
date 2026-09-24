const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

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
  
  // CORS — domínios padrão do Firebase Hosting deste projeto + ambiente local.
  // Se houver domínio customizado mapeado no Firebase Hosting, adicione aqui.
  ALLOWED_ORIGINS: [
    "https://speakup-system.web.app",
    "https://speakup-system.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:4173",
  ],
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Normaliza nome para comparação tolerante a acentos/maiúsculas
 * (mesma lógica de src/utils/normalizeNome.js)
 * @param {string} str - Nome a normalizar
 * @return {string} Nome normalizado
 */
function normalizeNome(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Verifica o token Firebase enviado no header Authorization e confirma
 * que o usuário é admin. Mesma regra aplicada no acesso à tela AIManager
 * no frontend (src/App.jsx) — replicada aqui porque o endpoint chama a
 * API paga da Anthropic e não pode ficar aberto sem checagem no servidor.
 * @param {import('express').Request} req - Requisição HTTP
 * @return {Promise<{authorized: boolean, status?: number, error?: string}>}
 */
async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return { authorized: false, status: 401, error: "Token de autenticação ausente." };
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch (err) {
    return { authorized: false, status: 401, error: "Token de autenticação inválido." };
  }

  const callerSnap = await admin.firestore().doc(`users/${decoded.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    return { authorized: false, status: 403, error: "Apenas administradores podem usar o assistente de IA." };
  }

  return { authorized: true, uid: decoded.uid };
}

const RATE_LIMIT = {
  MAX_REQUESTS: 20,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutos
};

/**
 * Limite simples de chamadas por usuário, para conter custo da API paga
 * em caso de bug de loop no frontend ou uso abusivo por um admin.
 * @param {string} uid - UID do usuário autenticado
 * @return {Promise<{allowed: boolean}>}
 */
async function checkRateLimit(uid) {
  const ref = admin.firestore().doc(`rateLimits/${uid}`);
  const now = Date.now();

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart?.toMillis?.() ?? 0;

    if (!data || now - windowStart > RATE_LIMIT.WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: admin.firestore.Timestamp.fromMillis(now) });
      return { allowed: true };
    }

    if (data.count >= RATE_LIMIT.MAX_REQUESTS) {
      return { allowed: false };
    }

    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) });
    return { allowed: true };
  });
}

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
  
  // Configurar CORS — ecoa a origem só se estiver na allowlist
  const requestOrigin = req.headers.origin;
  if (CONFIG.ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.set("Access-Control-Allow-Origin", requestOrigin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

  // 0. Exigir usuário admin autenticado — sem isso, o endpoint repassa
  // chamadas para a API paga da Anthropic para qualquer chamador externo.
  const authCheck = await verifyAdminAuth(req);
  if (!authCheck.authorized) {
    res.status(authCheck.status).json({
      error: "Unauthorized",
      message: authCheck.error,
    });
    return;
  }

  // 0.1 Limite de chamadas por usuário — contém custo em caso de abuso/loop.
  const rateLimit = await checkRateLimit(authCheck.uid);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: "Too Many Requests",
      message: `Limite de ${RATE_LIMIT.MAX_REQUESTS} mensagens a cada 10 minutos atingido. Tente novamente em instantes.`,
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

// ============================================
// CRIAR CONTA DE PROFESSOR
// ============================================

/**
 * Cria conta de professor no Firebase Auth + doc no Firestore /users/{uid}
 * Somente admins podem chamar (verificado via token)
 * Callable: httpsCallable(functions, 'createProfessor')
 */
exports.createProfessor = functions.https.onCall(async (data, context) => {
  // Verifica autenticação do chamador
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autorizado.");
  }

  // Verifica que o chamador é admin
  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem criar professores.");
  }

  const { email, password, nome, slug } = data;

  if (!email || !password || !nome || !slug) {
    throw new functions.https.HttpsError("invalid-argument", "Email, senha, nome e slug são obrigatórios.");
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "A senha deve ter pelo menos 6 caracteres.");
  }

  // Cria o usuário no Firebase Auth (ou recupera existente do magic link)
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: nome.trim(),
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      // Conta já existe (ex: criada via magic link) — apenas atualiza a senha
      userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
      await admin.auth().updateUser(userRecord.uid, { password, displayName: nome.trim() });
    } else {
      throw new functions.https.HttpsError("internal", err.message);
    }
  }

  // Salva/atualiza doc no Firestore (merge para não sobrescrever dados extras)
  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    role: "professor",
    nome: nome.trim(),
    nomeKey: normalizeNome(nome),
    slug: slug.trim(),
    email: email.trim().toLowerCase(),
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { uid: userRecord.uid, email: userRecord.email };
});

/**
 * Migração única: preenche/corrige o campo nomeKey (nome normalizado, sem
 * acento/maiúsculas) em todos os usuários com role "professor" que já
 * existiam antes desta correção. Sem isso, professores cadastrados antes
 * não conseguem lançar conteúdo se o nome digitado nas turmas divergir em
 * acento/caixa do nome salvo no login (ex: "Bárbara" vs "Barbara").
 * Callable: httpsCallable(functions, 'backfillProfessorNomeKeys')
 */
exports.backfillProfessorNomeKeys = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autorizado.");
  }
  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem executar esta migração.");
  }

  const usersSnap = await admin.firestore().collection("users").where("role", "==", "professor").get();
  const batch = admin.firestore().batch();
  let updated = 0;
  usersSnap.forEach((docSnap) => {
    const nome = docSnap.data().nome;
    if (!nome) return;
    batch.set(docSnap.ref, { nomeKey: normalizeNome(nome) }, { merge: true });
    updated += 1;
  });
  if (updated > 0) await batch.commit();

  return { updated };
});

/**
 * Atualiza a senha de um professor (chamado pelo admin)
 */
exports.updateProfessorPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autorizado.");
  }

  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem alterar senhas.");
  }

  const { uid, password } = data;
  if (!uid || !password || password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "UID e senha (mín. 6 caracteres) são obrigatórios.");
  }

  await admin.auth().updateUser(uid, { password });
  return { success: true };
});

/**
 * Remove conta de professor do Firebase Auth + doc Firestore
 */
exports.deleteProfessor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autorizado.");
  }

  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem remover professores.");
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "UID é obrigatório.");
  }

  await admin.auth().deleteUser(uid);
  await admin.firestore().doc(`users/${uid}`).delete();
  return { success: true };
});
