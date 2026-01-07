const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
};

console.log('\n=== TESTE DE CONVERSÃO DE DATA ===\n');

// Teste 1: Data com dia 10
const testDate1 = new Date('2026-01-10T00:00:00');
console.log('Input: 2026-01-10');
console.log('getDate():', testDate1.getDate());
console.log('toISOString() [BUGADO]:', testDate1.toISOString());
console.log('toLocalISOString() [CORRETO]:', toLocalISOString(testDate1));

console.log('\n---\n');

// Teste 2: Data com dia 29
const testDate2 = new Date('2026-01-29T00:00:00');
console.log('Input: 2026-01-29');
console.log('getDate():', testDate2.getDate());
console.log('toISOString() [BUGADO]:', testDate2.toISOString());
console.log('toLocalISOString() [CORRETO]:', toLocalISOString(testDate2));

console.log('\n=== FIM DO TESTE ===\n');
