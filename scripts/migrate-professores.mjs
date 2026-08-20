// Migração: cria a coleção `professores` a partir dos nomes já usados em
// turmas.professor / aulas.professor / students.teacher, e grava um campo
// `professorId` (sem tocar nos campos de texto livre existentes) nos
// documentos cujo nome resolve sem ambiguidade.
//
// Uso:
//   node scripts/migrate-professores.mjs            (dry-run — só imprime)
//   node scripts/migrate-professores.mjs --apply     (escreve de verdade)
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { PROFESSORES } from '../src/constants/turmasConfig.js';
import { normalizeNome } from '../src/utils/normalizeNome.js';

const require = createRequire(import.meta.url);

// Credencial de admin (fora do repositório).
const SERVICE_ACCOUNT_PATH = 'C:\\xampp\\htdocs\\lms-speakup\\config\\speakup-system-69b73ecacb1d.json';
const APP_ID = 'speakup-manager';
const APPLY = process.argv.includes('--apply');

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Aliases confirmados manualmente pelo usuário (não decididos pelo script) —
// variantes que o relatório dry-run flagou como "possível duplicata" e que
// foram confirmadas como sendo o mesmo professor, ou nomes novos com a
// grafia completa correta (ex: "YURE" -> "Yure Martins").
const MANUAL_ALIASES = {
  [normalizeNome('Bárbara')]: 'Bárbara Dias',
  [normalizeNome('Vera')]: 'Vera Machado',
  [normalizeNome('Ruan')]: 'Ruan Machado',
  [normalizeNome('Bruna')]: 'Bruna Amorim',
  [normalizeNome('Fernando')]: 'Fernando Machado',
  [normalizeNome('Yure')]: 'Yure Martins',
};

// Distância de Levenshtein simples — usada só pra sinalizar possíveis
// duplicatas por grafia diferente (nunca pra decidir automaticamente).
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function pareceMesmaPessoa(normA, normB) {
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return levenshtein(normA, normB) <= 2;
}

async function coletarNomes(colRef, campo, docToNome) {
  const snap = await colRef.get();
  const ocorrencias = []; // { docId, nomeBruto }
  snap.forEach((doc) => {
    const nomeBruto = docToNome ? docToNome(doc.data()) : doc.data()[campo];
    if (nomeBruto && String(nomeBruto).trim()) {
      ocorrencias.push({ docId: doc.id, nomeBruto: String(nomeBruto).trim(), jaTemProfessorId: !!doc.data().professorId });
    }
  });
  return ocorrencias;
}

async function main() {
  console.log(`\n=== Migração professores — modo ${APPLY ? 'APPLY (vai escrever)' : 'DRY-RUN (só leitura)'} ===\n`);

  const turmasCol = db.collection('turmas');
  const aulasCol = db.collection('aulas');
  const studentsCol = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('students');

  const [turmasOcorr, aulasOcorr, studentsOcorr] = await Promise.all([
    coletarNomes(turmasCol, 'professor'),
    coletarNomes(aulasCol, 'professor'),
    coletarNomes(studentsCol, 'teacher'),
  ]);

  const fontes = {
    turmas: { ref: turmasCol, ocorrencias: turmasOcorr },
    aulas: { ref: aulasCol, ocorrencias: aulasOcorr },
    students: { ref: studentsCol, ocorrencias: studentsOcorr },
  };

  // Agrupa todos os nomes brutos (das 3 fontes) por normalizeNome().
  const grupos = new Map(); // normKey -> { variantes: Set<string>, contagem: {turmas,aulas,students} }
  for (const [fonte, { ocorrencias }] of Object.entries(fontes)) {
    for (const { nomeBruto } of ocorrencias) {
      const key = normalizeNome(nomeBruto);
      if (!grupos.has(key)) grupos.set(key, { variantes: new Set(), contagem: { turmas: 0, aulas: 0, students: 0 } });
      const g = grupos.get(key);
      g.variantes.add(nomeBruto);
      g.contagem[fonte]++;
    }
  }

  // Seeds — os 5 professores já canônicos usados no <select> de turmas.
  const seedPorKey = new Map(PROFESSORES.map((nome) => [normalizeNome(nome), nome]));

  const gruposSeed = [];     // batem com um seed
  const gruposNovos = [];    // não batem com seed, sem ambiguidade
  const gruposDuplicados = []; // suspeita de duplicata — não resolve sozinho

  const keys = [...grupos.keys()];
  const jaMarcadoDuplicado = new Set();

  for (const key of keys) {
    if (seedPorKey.has(key)) {
      gruposSeed.push({ key, nomeCanonico: seedPorKey.get(key), ...grupos.get(key) });
    }
  }

  const keysNaoSeed = keys.filter((k) => !seedPorKey.has(k) && !MANUAL_ALIASES[k]);
  for (let i = 0; i < keysNaoSeed.length; i++) {
    const keyA = keysNaoSeed[i];
    if (jaMarcadoDuplicado.has(keyA)) continue;
    let suspeitos = [keyA];
    // Compara contra outros grupos não-seed e contra os seeds.
    for (let j = i + 1; j < keysNaoSeed.length; j++) {
      const keyB = keysNaoSeed[j];
      if (pareceMesmaPessoa(keyA, keyB)) {
        suspeitos.push(keyB);
        jaMarcadoDuplicado.add(keyB);
      }
    }
    const suspeitoDeSeed = [...seedPorKey.keys()].find((seedKey) => pareceMesmaPessoa(keyA, seedKey));

    if (suspeitos.length > 1 || suspeitoDeSeed) {
      jaMarcadoDuplicado.add(keyA);
      gruposDuplicados.push({
        candidatos: suspeitos.map((k) => ({ key: k, ...grupos.get(k) })),
        possivelSeed: suspeitoDeSeed ? seedPorKey.get(suspeitoDeSeed) : null,
      });
    }
  }

  for (const key of keysNaoSeed) {
    if (!jaMarcadoDuplicado.has(key)) {
      gruposNovos.push({ key, ...grupos.get(key) });
    }
  }

  // ── Relatório ──────────────────────────────────────────────────────────
  console.log('--- Professores existentes (seed) ---');
  for (const g of gruposSeed) {
    console.log(`  "${g.nomeCanonico}" — variantes encontradas: ${[...g.variantes].join(' | ')}`);
    console.log(`    turmas=${g.contagem.turmas} aulas=${g.contagem.aulas} students=${g.contagem.students}`);
  }
  for (const nome of PROFESSORES) {
    if (!gruposSeed.some((g) => g.nomeCanonico === nome)) {
      console.log(`  "${nome}" — nenhuma ocorrência encontrada nos dados (será criado mesmo assim, é seed)`);
    }
  }

  console.log('\n--- Aliases manuais confirmados (você aprovou) ---');
  const aliasKeysPresentes = Object.keys(MANUAL_ALIASES).filter((k) => grupos.has(k));
  if (aliasKeysPresentes.length === 0) console.log('  (nenhum)');
  for (const key of aliasKeysPresentes) {
    const g = grupos.get(key);
    console.log(`  ${[...g.variantes].join(' | ')} → "${MANUAL_ALIASES[key]}"`);
    console.log(`    turmas=${g.contagem.turmas} aulas=${g.contagem.aulas} students=${g.contagem.students}`);
  }

  console.log('\n--- Novos professores a criar (sem ambiguidade) ---');
  if (gruposNovos.length === 0) console.log('  (nenhum)');
  for (const g of gruposNovos) {
    console.log(`  "${[...g.variantes][0]}" — variantes: ${[...g.variantes].join(' | ')}`);
    console.log(`    turmas=${g.contagem.turmas} aulas=${g.contagem.aulas} students=${g.contagem.students}`);
  }

  console.log('\n--- Possíveis duplicatas (grafia diferente) — RESOLVER MANUALMENTE, não serão criadas/mapeadas ---');
  if (gruposDuplicados.length === 0) console.log('  (nenhuma)');
  for (const d of gruposDuplicados) {
    const todasVariantes = d.candidatos.flatMap((c) => [...c.variantes]);
    console.log(`  Grupo suspeito: ${todasVariantes.join(' | ')}${d.possivelSeed ? `  (pode ser o mesmo que o seed "${d.possivelSeed}")` : ''}`);
  }

  // ── Resolução de nome bruto -> professor canônico ─────────────────────
  const resolverCanonico = (nomeBruto) => {
    const key = normalizeNome(nomeBruto);
    if (MANUAL_ALIASES[key]) return MANUAL_ALIASES[key];
    if (seedPorKey.has(key)) return seedPorKey.get(key);
    if (jaMarcadoDuplicado.has(key)) return null; // ambíguo, não resolve
    const grupoNovo = gruposNovos.find((g) => g.key === key);
    if (grupoNovo) return [...grupoNovo.variantes][0];
    return null;
  };

  const nomesAliasCanonicos = [...new Set(Object.values(MANUAL_ALIASES))].filter(
    (nome) => !seedPorKey.has(normalizeNome(nome))
  );
  const nomesCanonicosFinais = [
    ...PROFESSORES,
    ...nomesAliasCanonicos,
    ...gruposNovos.map((g) => [...g.variantes][0]),
  ];

  let resolvidos = 0, naoResolvidos = 0;
  for (const [fonte, { ocorrencias }] of Object.entries(fontes)) {
    for (const oc of ocorrencias) {
      const canonico = resolverCanonico(oc.nomeBruto);
      if (canonico) resolvidos++; else naoResolvidos++;
    }
  }
  console.log(`\n--- Resumo de resolução de professorId ---`);
  console.log(`  Documentos que receberiam professorId: ${resolvidos}`);
  console.log(`  Documentos que ficariam SEM professorId (nome ambíguo/duplicado): ${naoResolvidos}`);

  if (!APPLY) {
    console.log('\nDry-run concluído. Revise o relatório acima e rode novamente com --apply para gravar.\n');
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────
  console.log('\n=== Aplicando alterações ===\n');

  // 1) Cria/garante documentos em `professores` (idempotente por nome normalizado).
  const professoresExistentesSnap = await db.collection('professores').get();
  const professorIdPorKey = new Map();
  professoresExistentesSnap.forEach((doc) => {
    professorIdPorKey.set(normalizeNome(doc.data().nome), doc.id);
  });

  for (const nome of nomesCanonicosFinais) {
    const key = normalizeNome(nome);
    if (professorIdPorKey.has(key)) continue;
    const ref = await db.collection('professores').add({
      nome,
      email: '',
      telefone: '',
      status: 'ativo',
      createdAt: admin.firestore.Timestamp.now(),
    });
    professorIdPorKey.set(key, ref.id);
    console.log(`  + professores/${ref.id} criado ("${nome}")`);
  }

  // 2) Grava professorId nos documentos resolvidos, sem tocar no campo de texto.
  for (const [fonte, { ref, ocorrencias }] of Object.entries(fontes)) {
    let atualizados = 0;
    for (const oc of ocorrencias) {
      if (oc.jaTemProfessorId) continue;
      const canonico = resolverCanonico(oc.nomeBruto);
      if (!canonico) continue;
      const professorId = professorIdPorKey.get(normalizeNome(canonico));
      if (!professorId) continue;
      await ref.doc(oc.docId).update({ professorId });
      atualizados++;
    }
    console.log(`  ${fonte}: ${atualizados} documento(s) atualizado(s) com professorId`);
  }

  console.log('\nMigração aplicada com sucesso.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro na migração:', err);
    process.exit(1);
  });
