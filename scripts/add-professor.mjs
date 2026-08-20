import admin from 'firebase-admin';
import { createRequire } from 'module';
import { normalizeNome } from '../src/utils/normalizeNome.js';

const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT_PATH = 'C:\\xampp\\htdocs\\lms-speakup\\config\\speakup-system-69b73ecacb1d.json';
const NOME = process.argv[2];
if (!NOME) {
  console.error('Uso: node scripts/_add-professor-oneoff.mjs "Nome Completo"');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const key = normalizeNome(NOME);
const snap = await db.collection('professores').get();
const existente = snap.docs.find((d) => normalizeNome(d.data().nome) === key);

if (existente) {
  console.log(`Já existe: professores/${existente.id} ("${existente.data().nome}")`);
} else {
  const ref = await db.collection('professores').add({
    nome: NOME,
    email: '',
    telefone: '',
    status: 'ativo',
    createdAt: admin.firestore.Timestamp.now(),
  });
  console.log(`Criado: professores/${ref.id} ("${NOME}")`);
}
process.exit(0);
