/* Medição de qualidade do código, compartilhada pelo teste de catraca e pelo
 * script que gera a baseline. CommonJS de propósito: o jest e o node puro
 * carregam com `require`, sem transpilar. */
const fs = require('fs');
const path = require('path');

const RAIZ_SRC = path.join(__dirname, '..');
// Fora da medição: testes, helpers de teste, assets e os próprios tokens (lá o hex é a definição).
const IGNORADOS = /(^|\/)(__tests__|testUtils|assets|styles)(\/|$)/;
const REGEX_HEX = /#[0-9a-fA-F]{6}\b/g;

// Arquivo grande demais: acima disto é preciso justificar (entrar na baseline).
const LIMITE_LINHAS = 600;

function listarArquivos(dir = RAIZ_SRC, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (IGNORADOS.test(rel)) return [];
    if (e.isDirectory()) return listarArquivos(path.join(dir, e.name), rel);
    return /\.(js|jsx)$/.test(e.name) ? [`src/${rel}`] : [];
  });
}

function medir() {
  const hex = {};
  const linhas = {};
  for (const arquivo of listarArquivos()) {
    const texto = fs.readFileSync(path.join(RAIZ_SRC, '..', arquivo), 'utf8');
    const n = (texto.match(REGEX_HEX) || []).length;
    if (n > 0) hex[arquivo] = n;
    const l = texto.split('\n').length;
    if (l > LIMITE_LINHAS) linhas[arquivo] = l;
  }
  return { hex, linhas };
}

const CAMINHO_BASELINE = path.join(__dirname, 'qualidade.baseline.json');

module.exports = { medir, CAMINHO_BASELINE, LIMITE_LINHAS };
