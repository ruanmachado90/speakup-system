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
  MODEL: "claude-sonnet-5",
  MAX_TOKENS: 4096,
  
  // CORS — só o Hosting do sistema e o dev server local. Domínio próprio
  // novo no Hosting precisa entrar aqui, senão o navegador bloqueia a IA.
  ALLOWED_ORIGINS: [
    "https://speakup-system.web.app",
    "https://speakup-system.firebaseapp.com",
    "https://gestao.speakupcataguases.com",
    "http://localhost:5173",
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

  return { authorized: true };
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
 * Chama a API da Anthropic Claude em modo streaming e repassa os eventos
 * SSE diretamente para a resposta HTTP conforme chegam, sem esperar a
 * resposta completa — permite ao frontend renderizar o texto em tempo real.
 * @param {string} systemPrompt - Prompt do sistema
 * @param {Array} messages - Array de mensagens
 * @param {import('express').Response} res - Resposta HTTP do Cloud Function
 * @returns {Promise<void>}
 */
async function streamClaudeAPI(systemPrompt, messages, res) {
  const upstream = await fetch(CONFIG.API_URL, {
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
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => ({}));
    const error = new Error(data.error?.message || "API request failed");
    error.status = upstream.status;
    error.data = data;
    throw error;
  }

  res.status(200);
  res.set("Content-Type", "text/event-stream; charset=utf-8");
  res.set("Cache-Control", "no-cache");
  // Desativa qualquer buffering de proxy intermediário (nginx/GFE) que
  // quebraria o streaming em pedaços grandes em vez de chunk a chunk.
  res.set("X-Accel-Buffering", "no");

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
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
  
  // Configurar CORS — ecoa a origem só se estiver na lista; origem desconhecida
  // fica sem o header e o navegador barra a resposta.
  const origin = req.headers.origin;
  if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  // Authorization é obrigatório: o frontend manda o ID token do Firebase nele.
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

    // 3. Chamar API da Claude em streaming — repassa os eventos SSE direto
    // para o cliente conforme chegam (res.status/headers só são setados
    // aqui dentro, depois que a Anthropic confirmar que a chamada é válida)
    await streamClaudeAPI(systemPrompt, messages, res);

    // 4. Log de sucesso (sem métricas de token — streaming não devolve
    // usage agregado no fluxo que repassamos bruto ao cliente)
    const duration = Date.now() - startTime;
    console.log("Request successful:", { duration: `${duration}ms` });

  } catch (error) {
    // Log detalhado do erro
    const duration = Date.now() - startTime;
    console.error("Request failed:", {
      duration: `${duration}ms`,
      error: error.message,
      status: error.status || 500,
      stack: error.stack,
    });

    // Se o streaming já começou (headers já enviados), não dá mais para
    // trocar o status/JSON de erro — apenas encerra a conexão.
    if (res.headersSent) {
      res.end();
      return;
    }

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

/**
 * Migração idempotente: parcelas de alunos já cancelados que ficaram como
 * 'Pendente' (ou foram deletadas antes desta correção) passam a 'cancelada'.
 * Antes, cancelar/excluir aluno fazia batch.delete nas parcelas pendentes —
 * perda de registro financeiro e provável causa do gap de faturamento.
 * As parcelas já deletadas não voltam; esta função só conserta as que restaram.
 * Callable: httpsCallable(functions, 'backfillParcelasCanceladas')
 */
exports.backfillParcelasCanceladas = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autorizado.");
  }
  const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem executar esta migração.");
  }

  const dryRun = !!(data && data.dryRun);

  try {
    const db = admin.firestore();
    const base = "artifacts/speakup-manager/public/data";

    // Um único filtro de igualdade por query — evita necessidade de índice composto.
    const cancelledSnap = await db.collection(`${base}/students`)
      .where("status", "==", "cancelado").get();

    const cancelledById = new Map();
    cancelledSnap.forEach((d) => cancelledById.set(d.id, d.data()));

    let scannedStudents = cancelledById.size;
    let updatedPayments = 0;
    let batch = db.batch();
    let pending = 0;

    // Varre TODAS as parcelas pendentes uma vez e cruza com os alunos cancelados
    // em memória (mais barato que 1 query por aluno e sem índice composto).
    const pendentesSnap = await db.collection(`${base}/payments`)
      .where("status", "==", "Pendente").get();

    for (const paymentDoc of pendentesSnap.docs) {
      const p = paymentDoc.data();
      const aluno = cancelledById.get(p.studentId);
      if (!aluno) continue;

      updatedPayments += 1;
      if (!dryRun) {
        batch.update(paymentDoc.ref, {
          status: "cancelada",
          canceledAt: aluno.canceledAt || Date.now(),
          cancelReason: "Backfill: aluno já cancelado",
        });
        pending += 1;
        if (pending === 450) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
    }

    if (!dryRun && pending > 0) await batch.commit();

    return { dryRun, scannedStudents, updatedPayments };
  } catch (err) {
    console.error("backfillParcelasCanceladas falhou:", err);
    throw new functions.https.HttpsError("internal", err.message || String(err));
  }
});
