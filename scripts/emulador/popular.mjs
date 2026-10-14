// Popula o EMULADOR local com dados fictícios (npm run emuladores:dados).
// Apaga tudo o que estiver no emulador e recria do zero — rode quando quiser
// voltar ao estado inicial. Recusa-se a rodar contra qualquer coisa que não
// seja o emulador local do projeto demo-speakup.
//
// Uso: em um terminal `npm run emuladores`; em outro `npm run emuladores:dados`.

import { readFileSync } from 'node:fs';
import { PROJETO_EMULADOR, PORTAS_EMULADOR } from '../../src/config/ambiente.js';
import { montarDadosFicticios } from './dadosFicticios.js';

// 1) Trava: só emulador local, só projeto demo-.
process.env.FIRESTORE_EMULATOR_HOST ||= `127.0.0.1:${PORTAS_EMULADOR.firestore}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `127.0.0.1:${PORTAS_EMULADOR.auth}`;
const local = (h) => /^(127\.0\.0\.1|localhost):\d+$/.test(h);
if (!local(process.env.FIRESTORE_EMULATOR_HOST) || !local(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  console.error('Recusado: os endereços do emulador não são locais.');
  process.exit(1);
}
if (!PROJETO_EMULADOR.startsWith('demo-')) {
  console.error('Recusado: o projeto do emulador precisa começar com "demo-".');
  process.exit(1);
}

const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST}`;
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;

// 2) Emulador ligado?
try {
  await fetch(FS);
} catch {
  console.error('O emulador não está rodando. Em outro terminal: npm run emuladores');
  process.exit(1);
}

// firebase-admin só depois das variáveis acima (ele lê os endereços ao iniciar)
const { default: admin } = await import('firebase-admin');
admin.initializeApp({ projectId: PROJETO_EMULADOR });
const db = admin.firestore();

// 3) Limpa o emulador (endpoints exclusivos do emulador; não existem na produção)
await fetch(`${FS}/emulator/v1/projects/${PROJETO_EMULADOR}/databases/(default)/documents`, { method: 'DELETE' });
await fetch(`${AUTH}/emulator/v1/projects/${PROJETO_EMULADOR}/accounts`, { method: 'DELETE' });

// 4) Monta e grava
const contas = JSON.parse(readFileSync(new URL('../../src/config/contasTesteEmulador.json', import.meta.url), 'utf8'));
const dados = montarDadosFicticios({ contas });
const base = 'artifacts/speakup-manager/public/data';

const gravacoes = [
  ...dados.users.map((d) => [`users/${d.id}`, d.data]),
  ...dados.professores.map((d) => [`professores/${d.id}`, d.data]),
  ...dados.turmas.map((d) => [`turmas/${d.id}`, d.data]),
  ...dados.students.map((d) => [`${base}/students/${d.id}`, d.data]),
  ...dados.payments.map((d) => [`${base}/payments/${d.id}`, d.data]),
];
for (let i = 0; i < gravacoes.length; i += 400) {
  const batch = db.batch();
  gravacoes.slice(i, i + 400).forEach(([caminho, dado]) => batch.set(db.doc(caminho), dado));
  await batch.commit();
}

// Contas: equipe com login "Google" falso (o app só consulta o papel em login
// Google); professores com e-mail e senha, como na produção.
const importacao = await admin.auth().importUsers(contas.equipe.map((c) => ({
  uid: c.uid,
  email: c.email,
  displayName: c.nome,
  emailVerified: true,
  providerData: [{ uid: c.googleSub, providerId: 'google.com', email: c.email, displayName: c.nome }],
})));
if (importacao.failureCount) {
  console.error('Falha ao criar contas da equipe:', importacao.errors.map((e) => e.error.message));
  process.exit(1);
}
for (const p of contas.professores) {
  await admin.auth().createUser({ uid: p.uid, email: p.email, password: p.senha, displayName: p.nome });
}

const ativos = dados.students.filter((s) => s.data.status === 'ativo').length;
console.log(`Emulador populado (${PROJETO_EMULADOR}):`);
console.log(`  ${dados.students.length} alunos (${ativos} ativos), ${dados.payments.length} parcelas, ${dados.turmas.length} turmas, ${dados.professores.length} professores`);
console.log(`  Equipe: ${contas.equipe.map((c) => c.email).join(', ')} (botões na tela de login)`);
console.log(`  Professores: ${contas.professores.map((c) => `${c.email} / ${c.senha}`).join(', ')}`);
console.log('  Painel do emulador: http://127.0.0.1:4000');
process.exit(0);
