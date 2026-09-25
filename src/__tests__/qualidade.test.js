/**
 * @jest-environment node
 *
 * Catraca de qualidade: o número de cores fixas (hex cru) e o tamanho dos
 * arquivos só podem DESCER. Roda no CI, então uma cor nova sem token ou um
 * arquivo que cresce além da baseline derruba o build.
 *
 * Como resolver quando falhar:
 *  - hex novo: use um token (`bg-accent`, `var(--su-blue)`, src/styles/tokens/colors.css).
 *    Em HTML de impressão / PDF / canvas o token CSS não vale — nesses arquivos
 *    o hex é legítimo; rode `npm run qualidade:baseline` e explique no commit.
 *  - arquivo grande: extraia parte dele para um módulo próprio.
 *  - baseline desatualizada (você reduziu!): `npm run qualidade:baseline` trava o ganho.
 */
const fs = require('fs');
const { medir, CAMINHO_BASELINE, LIMITE_LINHAS } = require('../testUtils/medirCodigo.cjs');

const baseline = JSON.parse(fs.readFileSync(CAMINHO_BASELINE, 'utf8'));
const atual = medir();

describe('cores fixas (hex cru) só diminuem', () => {
  it('nenhum arquivo ganha hex além da baseline; arquivo novo começa com zero', () => {
    const acima = Object.entries(atual.hex)
      .filter(([arquivo, n]) => n > (baseline.hex[arquivo] || 0))
      .map(([arquivo, n]) => `${arquivo}: ${n} hex (limite ${baseline.hex[arquivo] || 0})`);
    expect(acima).toEqual([]);
  });

  it('baseline não está desatualizada (ganhos travados)', () => {
    const folgas = Object.entries(baseline.hex)
      .filter(([arquivo, n]) => (atual.hex[arquivo] || 0) < n)
      .map(([arquivo, n]) => `${arquivo}: baseline ${n}, atual ${atual.hex[arquivo] || 0} → npm run qualidade:baseline`);
    expect(folgas).toEqual([]);
  });
});

describe('arquivos grandes só encolhem', () => {
  it(`nenhum arquivo passa de ${LIMITE_LINHAS} linhas sem estar na baseline, nem cresce além dela`, () => {
    const acima = Object.entries(atual.linhas)
      .filter(([arquivo, l]) => l > (baseline.linhas[arquivo] || LIMITE_LINHAS))
      .map(([arquivo, l]) => `${arquivo}: ${l} linhas (limite ${baseline.linhas[arquivo] || LIMITE_LINHAS})`);
    expect(acima).toEqual([]);
  });
});
