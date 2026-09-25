/* Regrava a baseline de qualidade (src/testUtils/qualidade.baseline.json)
 * com os números ATUAIS. Rode depois de reduzir hex cru ou encolher um arquivo
 * grande, pra travar o ganho:
 *
 *     npm run qualidade:baseline
 *
 * Subir um número aqui é decisão de revisão: o teste de CI (qualidade.test.js)
 * existe justamente pra impedir que isso aconteça sem alguém notar.
 */
const fs = require('fs');
const { medir, CAMINHO_BASELINE } = require('../src/testUtils/medirCodigo.cjs');

const ordenar = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
const { hex, linhas } = medir();
fs.writeFileSync(CAMINHO_BASELINE, `${JSON.stringify({ hex: ordenar(hex), linhas: ordenar(linhas) }, null, 2)}\n`);

const totalHex = Object.values(hex).reduce((s, n) => s + n, 0);
console.log(`baseline gravada: ${totalHex} hex em ${Object.keys(hex).length} arquivos; ${Object.keys(linhas).length} arquivos acima do limite de linhas`);
