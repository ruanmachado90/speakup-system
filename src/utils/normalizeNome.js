// Normaliza nomes para comparação tolerante a acentos, maiúsculas e espaços.
// Ex: "  Bárbara  Dias " -> "barbara dias"
export function normalizeNome(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
