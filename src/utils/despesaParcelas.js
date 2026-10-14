/**
 * Despesa parcelada (cartão de crédito): uma compra vira N lançamentos, um por
 * mês, cada um no mês em que a parcela sai do caixa. Assim relatório mensal,
 * estrutura de custos e evolução continuam somando por mês sem saber que
 * existe parcelamento. As parcelas de uma compra compartilham
 * `grupoParcelamento`, que é o que permite excluí-las juntas.
 *
 * Puro: sem Firestore, sem React.
 */
import { addMonthsClamped } from './dateMath';

export const OPCOES_PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];
export const PAGAMENTO_PARCELAVEL = 'Cartão de Crédito';

const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" de uma Date, em horário local. */
export function dataParaYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Hoje em horário local. `toISOString()` daria amanhã depois das 21h em UTC-3. */
export function hojeLocalYMD(ref = new Date()) {
  return dataParaYMD(ref);
}

/** "YYYY-MM-DD" (ou prefixo de ISO) → Date local; inválido → null. */
export function ymdParaData(ymd) {
  const m = String(ymd ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/**
 * Data gravada no Firestore. Meio-dia UTC cai no mesmo dia para quem lê pelo
 * prefixo (paraData/formatDate) e para quem faz `new Date(iso)` em UTC-3 —
 * meia-noite UTC jogava a despesa do dia 1º para o mês anterior.
 */
export function ymdParaISO(ymd) {
  return `${ymd}T12:00:00.000Z`;
}

/** Divide em centavos exatos; a diferença do arredondamento vai na 1ª parcela. */
export function dividirEmParcelas(total, n) {
  const qtd = Math.max(1, Math.floor(n) || 1);
  const centavos = Math.round(Number(total) * 100);
  const base = Math.floor(centavos / qtd);
  const resto = centavos - base * qtd;
  return Array.from({ length: qtd }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
}

/**
 * Lançamentos de uma despesa. `parcelas` = 1 devolve um único lançamento sem
 * campos de parcelamento. Parcelas mensais a partir de `dataYMD`, travando no
 * último dia do mês (31/01 → 28/02).
 */
export function montarLancamentos({ dataYMD, valor, parcelas = 1, grupoId = null, ...campos }) {
  const inicio = ymdParaData(dataYMD);
  if (!inicio) throw new Error(`Data inválida: ${dataYMD}`);
  const valores = dividirEmParcelas(valor, parcelas);
  const n = valores.length;
  return valores.map((value, i) => {
    const d = addMonthsClamped(inicio, i);
    const lanc = {
      ...campos,
      value,
      date: ymdParaISO(dataParaYMD(d)),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
    if (n > 1) {
      lanc.parcela = i + 1;
      lanc.parcelas = n;
      lanc.valorTotal = Math.round(Number(valor) * 100) / 100;
      lanc.grupoParcelamento = grupoId;
    }
    return lanc;
  });
}
