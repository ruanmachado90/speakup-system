// Testa as regras do Firestore da renovação (etapa 4 do docs/rematricula/PLANO.md)
// contra o EMULADOR: o que a página da família pode e não pode gravar sem login,
// e o limite da secretaria na campanha. Usa documentos próprios (ano 2099,
// códigos "teste-regras-…") e apaga tudo no fim — não mexe nos dados fictícios.
//
// Uso: com `npm run emuladores` ligado, `npm run emuladores:regras`.

import { PROJETO_EMULADOR, PORTAS_EMULADOR } from '../../src/config/ambiente.js';

process.env.FIRESTORE_EMULATOR_HOST ||= `127.0.0.1:${PORTAS_EMULADOR.firestore}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `127.0.0.1:${PORTAS_EMULADOR.auth}`;
const local = (h) => /^(127\.0\.0\.1|localhost):\d+$/.test(h);
if (!local(process.env.FIRESTORE_EMULATOR_HOST) || !PROJETO_EMULADOR.startsWith('demo-')) {
  console.error('Recusado: só roda contra o emulador local do projeto demo-.');
  process.exit(1);
}
try { await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}`); } catch {
  console.error('O emulador não está rodando. Em outro terminal: npm run emuladores');
  process.exit(1);
}

const { default: admin } = await import('firebase-admin');
admin.initializeApp({ projectId: PROJETO_EMULADOR });
const adm = admin.firestore();

const { initializeApp } = await import('firebase/app');
const fs = await import('firebase/firestore');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = await import('firebase/auth');
fs.setLogLevel('silent'); // cada recusa esperada viraria um erro no terminal

const APP_ID = 'speakup-manager';
const ANO = 2099;
const base = `artifacts/${APP_ID}/public/data`;
const P = 'teste-regras-';

// ── Dados de teste (gravados como admin, por fora das regras) ──────────────
const campanha = {
  anoLetivo: ANO, status: 'aberta', reajustePct: 7, arredondamento: 'centavos',
  planos: [{ id: '12x', meses: [1], descontoPct: 0 }, { id: 'semestral', meses: [1, 7], descontoPct: 5 }, { id: 'avista', meses: [1], descontoPct: 10 }],
  formasPagamento: ['PIX', 'Boleto'], diasVencimento: [5, 10],
};
const convite = (n, extra = {}) => ({
  codigo: `${P}${n}`, anoLetivo: ANO, studentId: `${P}aluno${n}`, alunoNome: `Aluno ${n}`,
  mensalidadeBaseCentavos: 25000, mensalidadeNovaCentavos: 26750, status: 'enviada', historico: [], ...extra,
});
const SECRETARIA = { email: `${P}secretaria@teste.local`, senha: 'teste123' };

async function preparar() {
  await adm.doc(`${base}/renovacao-campanhas/${ANO}`).set(campanha);
  for (const n of [1, 2, 3, 4]) await adm.doc(`${base}/renovacoes/${P}${n}`).set(convite(n));
  await adm.doc(`${base}/renovacoes-notas/${P}1`).set({ motivo: 'teste', anoLetivo: ANO });
  let usuario;
  try { usuario = await admin.auth().getUserByEmail(SECRETARIA.email); } catch {
    usuario = await admin.auth().createUser({ email: SECRETARIA.email, password: SECRETARIA.senha });
  }
  await adm.doc(`users/${usuario.uid}`).set({ role: 'secretaria', nome: 'Teste regras' });
  return usuario.uid;
}

async function limpar(uidSecretaria) {
  const lote = adm.batch();
  lote.delete(adm.doc(`${base}/renovacao-campanhas/${ANO}`));
  for (const n of [1, 2, 3, 4]) {
    lote.delete(adm.doc(`${base}/renovacoes/${P}${n}`));
    lote.delete(adm.doc(`${base}/contratos/${P}aluno${n}_${ANO}`));
  }
  lote.delete(adm.doc(`${base}/renovacoes-notas/${P}1`));
  lote.delete(adm.doc(`${base}/contratos/${P}aluno-antigo`));
  lote.delete(adm.doc(`${base}/contratos/${P}aluno2_${ANO}`));
  if (uidSecretaria) lote.delete(adm.doc(`users/${uidSecretaria}`));
  await lote.commit();
  if (uidSecretaria) await admin.auth().deleteUser(uidSecretaria).catch(() => {});
}

// ── Clientes (como o navegador): sem login e secretaria ────────────────────
const cliente = (nome) => {
  const app = initializeApp({ projectId: PROJETO_EMULADOR, apiKey: 'demo' }, nome);
  const db = fs.getFirestore(app);
  fs.connectFirestoreEmulator(db, '127.0.0.1', PORTAS_EMULADOR.firestore);
  return { app, db };
};
const publico = cliente('publico');
const sec = cliente('secretaria');

const ref = (db, caminho) => fs.doc(db, `${base}/${caminho}`);
const resposta = (extra = {}) => ({ planoId: '12x', formaPagamento: 'PIX', diaVencimento: 10, canal: 'link', respondidaEm: fs.serverTimestamp(), ...extra });
const contrato = (n, extra = {}) => ({
  nome: 'Maria Souza', cpf: '52998224725', timestamp: 'x', ip: '', alunoId: `${P}aluno${n}`, alunoNome: `Aluno ${n}`,
  anoLetivo: ANO, renovacaoId: `${P}${n}`, planoId: '12x', formaPagamento: 'PIX', diaVencimento: 10, ...extra,
});
/** Resposta + contrato no mesmo lote, como a página faz. */
function responder(db, n, { resp = {}, contr = {}, idContrato = `${P}aluno${n}_${ANO}`, semContrato = false } = {}) {
  const lote = fs.writeBatch(db);
  lote.update(ref(db, `renovacoes/${P}${n}`), { status: 'respondida', resposta: resposta(resp) });
  if (!semContrato) lote.set(ref(db, `contratos/${idContrato}`), contrato(n, contr));
  return lote.commit();
}

// ── Casos ──────────────────────────────────────────────────────────────────
const resultados = [];
async function caso(descricao, deveFuncionar, acao) {
  let funcionou;
  try { await acao(); funcionou = true; } catch (e) {
    if (e.code !== 'permission-denied') { resultados.push({ descricao, ok: false, detalhe: `erro inesperado: ${e.message}` }); return; }
    funcionou = false;
  }
  resultados.push({ descricao, ok: funcionou === deveFuncionar, detalhe: funcionou ? 'gravou/leu' : 'recusado' });
}

const uid = await preparar();
try {
  const d = publico.db;
  // Leitura
  await caso('sem login: lê o próprio convite pelo código', true, () => fs.getDoc(ref(d, `renovacoes/${P}1`)));
  await caso('sem login: lê a campanha', true, () => fs.getDoc(ref(d, `renovacao-campanhas/${ANO}`)));
  await caso('sem login: NÃO lista os convites', false, () => fs.getDocs(fs.collection(d, `${base}/renovacoes`)));
  await caso('sem login: NÃO lê a anotação interna', false, () => fs.getDoc(ref(d, `renovacoes-notas/${P}1`)));
  // Campanha e valores
  await caso('sem login: NÃO altera a campanha', false, () => fs.updateDoc(ref(d, `renovacao-campanhas/${ANO}`), { status: 'aberta', reajustePct: 0 }));
  await caso('sem login: NÃO muda o valor do convite', false, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { mensalidadeNovaCentavos: 100 }));
  await caso('sem login: NÃO marca efetivada', false, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { status: 'efetivada' }));
  await caso('sem login: NÃO cria convite', false, () => fs.setDoc(ref(d, `renovacoes/${P}novo`), convite(9)));
  // Abrir
  await caso('abrir com horário do aparelho: recusado', false, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { status: 'aberta', abertaEm: fs.Timestamp.fromMillis(0) }));
  await caso('abrir com horário do servidor', true, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { status: 'aberta', abertaEm: fs.serverTimestamp() }));
  await caso('abrir de novo (já aberto): recusado', false, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { status: 'aberta', abertaEm: fs.serverTimestamp() }));
  // Responder: tentativas erradas
  await caso('responder sem o contrato: recusado', false, () => responder(d, 1, { semContrato: true }));
  await caso('responder com plano que não existe: recusado', false, () => responder(d, 1, { resp: { planoId: 'gratis' }, contr: { planoId: 'gratis' } }));
  await caso('responder com forma fora da campanha: recusado', false, () => responder(d, 1, { resp: { formaPagamento: 'Cartão' }, contr: { formaPagamento: 'Cartão' } }));
  await caso('responder com dia fora da campanha: recusado', false, () => responder(d, 1, { resp: { diaVencimento: 31 }, contr: { diaVencimento: 31 } }));
  await caso('responder com horário do aparelho: recusado', false, () => responder(d, 1, { resp: { respondidaEm: fs.Timestamp.fromMillis(0) } }));
  await caso('responder gravando outro campo junto: recusado', false, () => {
    const lote = fs.writeBatch(d);
    lote.update(ref(d, `renovacoes/${P}1`), { status: 'respondida', resposta: resposta(), mensalidadeNovaCentavos: 1 });
    lote.set(ref(d, `contratos/${P}aluno1_${ANO}`), contrato(1));
    return lote.commit();
  });
  await caso('contrato com plano diferente da resposta: recusado', false, () => responder(d, 1, { contr: { planoId: 'avista' } }));
  await caso('contrato no nome de OUTRO aluno: recusado', false, () => responder(d, 1, { idContrato: `${P}aluno2_${ANO}`, contr: { alunoId: `${P}aluno2` } }));
  await caso('contrato do ano sem responder: recusado', false, () => fs.setDoc(ref(d, `contratos/${P}aluno2_${ANO}`), contrato(2)));
  await caso('contrato com CPF inválido: recusado', false, () => responder(d, 1, { contr: { cpf: '123' } }));
  // Responder certo
  await caso('responder certo (resposta + contrato juntos)', true, () => responder(d, 1));
  await caso('responder de novo: recusado', false, () => responder(d, 1, { resp: { planoId: 'avista' }, contr: { planoId: 'avista' } }));
  await caso('trocar a resposta depois: recusado', false, () => fs.updateDoc(ref(d, `renovacoes/${P}1`), { 'resposta.planoId': 'avista' }));
  // Campanha fechada
  await adm.doc(`${base}/renovacao-campanhas/${ANO}`).update({ status: 'encerrada' });
  await caso('campanha encerrada: responder recusado', false, () => responder(d, 3));
  await adm.doc(`${base}/renovacao-campanhas/${ANO}`).update({ status: 'aberta' });
  // Convite que não pode mais responder
  await adm.doc(`${base}/renovacoes/${P}4`).update({ status: 'nao_renovara' });
  await caso('convite "não renovará": responder recusado', false, () => responder(d, 4));
  // Regressão: contrato antigo (sem ano) segue como antes
  await caso('contrato sem ano (fluxo antigo) continua liberado', true, () => fs.setDoc(ref(d, `contratos/${P}aluno-antigo`), { nome: 'X', cpf: '1' }));

  // Secretaria
  const auth = getAuth(sec.app);
  connectAuthEmulator(auth, `http://127.0.0.1:${PORTAS_EMULADOR.auth}`, { disableWarnings: true });
  await signInWithEmailAndPassword(auth, SECRETARIA.email, SECRETARIA.senha);
  const s = sec.db;
  await caso('secretaria: marca o checklist do guia', true, () => fs.updateDoc(ref(s, `renovacao-campanhas/${ANO}`), { 'guia.checklist.teste': { feito: true, por: 'x', em: 1 } }));
  await caso('secretaria: NÃO muda o reajuste da campanha', false, () => fs.updateDoc(ref(s, `renovacao-campanhas/${ANO}`), { reajustePct: 0 }));
  await caso('secretaria: lista os convites', true, () => fs.getDocs(fs.query(fs.collection(s, `${base}/renovacoes`), fs.where('anoLetivo', '==', ANO))));
  await caso('secretaria: marca desconto de irmão', true, () => fs.updateDoc(ref(s, `renovacoes/${P}2`), { descontoIrmao: true }));
  await caso('secretaria: lê a anotação interna', true, () => fs.getDoc(ref(s, `renovacoes-notas/${P}1`)));
  await caso('secretaria: NÃO apaga convite', false, () => fs.deleteDoc(ref(s, `renovacoes/${P}2`)));
} finally {
  await limpar(uid);
}

const falhas = resultados.filter((r) => !r.ok);
resultados.forEach((r) => console.log(`${r.ok ? '  ok ' : 'FALHA'}  ${r.descricao} (${r.detalhe})`));
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} casos como esperado.`);
process.exit(falhas.length ? 1 : 0);
