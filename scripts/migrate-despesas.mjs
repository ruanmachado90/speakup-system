// Migração das despesas já gravadas. Corrige três coisas, sem mudar valor,
// descrição nem categoria de nenhum lançamento:
//
//  1. `date` gravado como meia-noite UTC ("2026-10-01T00:00:00.000Z") passa a
//     meio-dia UTC. Meia-noite UTC é 21h do dia ANTERIOR no fuso de Brasília,
//     então todo consumidor que fazia `new Date(date)` lia a despesa do dia 1º
//     como se fosse do último dia do mês anterior.
//  2. `month`/`year` são recalculados a partir do dia do próprio `date`. Eles
//     foram gravados com getMonth()/getFullYear() em cima da data UTC, então a
//     despesa do dia 1º foi salva com o mês anterior (e a de 1º de janeiro com
//     o ano anterior). O relatório mensal lê esses campos primeiro.
//  3. `tipoSaida` ausente (lançamento anterior ao campo) passa a 'operacional'.
//     É o que os cálculos já assumiam; gravar explícito permite consultar por
//     tipo — inclusive para esconder pró-labore da secretaria nas regras.
//
// O dia pretendido é sempre o prefixo YYYY-MM-DD do `date`, que é o que o
// formulário enviou e o que a tela sempre exibiu. A migração não adivinha data.
//
// Uso:
//   node scripts/migrate-despesas.mjs            (dry-run — só imprime)
//   node scripts/migrate-despesas.mjs --apply     (escreve de verdade)
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Credencial de admin (fora do repositório). Se a chave for rotacionada, passe
// o caminho novo em GOOGLE_APPLICATION_CREDENTIALS em vez de editar aqui.
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || 'C:\\xampp\\htdocs\\lms-speakup\\config\\speakup-system-2c79e080ef8a.json';
const APP_ID = 'speakup-manager';
const APPLY = process.argv.includes('--apply');
const LOTE = 400; // writeBatch do Firestore aceita 500 operações

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TIPOS = ['operacional', 'retiradaSocio', 'investimento', 'imposto'];

/** Dia pretendido do lançamento: prefixo YYYY-MM-DD do que está gravado. */
function diaPretendido(date) {
  if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { ymd: m[0], mes: Number(m[2]), ano: Number(m[1]) };
  }
  // Timestamp do Firestore ou número (ms): usa o dia em UTC, que é como o
  // valor foi gravado originalmente.
  const d = date?.toDate?.() ?? (typeof date === 'number' ? new Date(date) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  const ymd = d.toISOString().slice(0, 10);
  return { ymd, mes: Number(ymd.slice(5, 7)), ano: Number(ymd.slice(0, 4)) };
}

const despesas = await db
  .collection(`artifacts/${APP_ID}/public/data/expenses`)
  .get();

const alteracoes = [];
const semData = [];

for (const doc of despesas.docs) {
  const d = doc.data();
  const alvo = diaPretendido(d.date);
  if (!alvo) {
    semData.push({ id: doc.id, description: d.description, date: d.date });
    continue;
  }

  const patch = {};
  const dateCerto = `${alvo.ymd}T12:00:00.000Z`;
  if (d.date !== dateCerto) patch.date = dateCerto;
  if (d.month !== alvo.mes) patch.month = alvo.mes;
  if (d.year !== alvo.ano) patch.year = alvo.ano;
  if (!TIPOS.includes(d.tipoSaida)) patch.tipoSaida = 'operacional';

  if (Object.keys(patch).length > 0) {
    alteracoes.push({
      ref: doc.ref,
      patch,
      // Só para o relatório: mês que o lançamento tinha e mês para onde vai.
      antes: `${String(d.month ?? '?').padStart(2, '0')}/${d.year ?? '?'}`,
      depois: `${String(alvo.mes).padStart(2, '0')}/${alvo.ano}`,
      description: d.description,
      value: d.value,
    });
  }
}

const mudaDeMes = alteracoes.filter((a) => a.antes !== a.depois);

console.log(`\nDespesas na coleção: ${despesas.size}`);
console.log(`Com algo a corrigir: ${alteracoes.length}`);
console.log(`Trocam de mês/ano:   ${mudaDeMes.length}  <- estas mudam o relatório mensal`);
console.log(`Sem data utilizável: ${semData.length}`);

if (mudaDeMes.length > 0) {
  console.log('\nLançamentos que trocam de competência:');
  for (const a of mudaDeMes) {
    console.log(`  ${a.antes} -> ${a.depois}  R$ ${Number(a.value || 0).toFixed(2)}  ${a.description || '(sem descrição)'}`);
  }
  // Soma por mês de destino, para conferir contra o relatório depois.
  const porMes = new Map();
  for (const a of mudaDeMes) {
    porMes.set(a.depois, (porMes.get(a.depois) || 0) + Number(a.value || 0));
  }
  console.log('\nValor que entra em cada mês:');
  for (const [mes, valor] of [...porMes].sort()) {
    console.log(`  ${mes}: R$ ${valor.toFixed(2)}`);
  }
}

if (semData.length > 0) {
  console.log('\nSem data — precisam de correção manual na tela de Despesas:');
  for (const s of semData) {
    console.log(`  ${s.id}  ${s.description || '(sem descrição)'}  date=${JSON.stringify(s.date)}`);
  }
}

if (!APPLY) {
  console.log('\nDry-run. Nada foi escrito. Rode com --apply para gravar.');
  process.exit(0);
}

for (let i = 0; i < alteracoes.length; i += LOTE) {
  const batch = db.batch();
  for (const a of alteracoes.slice(i, i + LOTE)) {
    batch.update(a.ref, { ...a.patch, migradoEm: Date.now() });
  }
  await batch.commit();
  console.log(`Gravado: ${Math.min(i + LOTE, alteracoes.length)}/${alteracoes.length}`);
}

console.log('\nPronto.');
process.exit(0);
