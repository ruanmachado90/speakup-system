/**
 * Geração das contas fixas do mês a partir das recorrentes do mês anterior.
 *
 * A flag `recorrente` só marcava a despesa como custo fixo (para o ponto de
 * equilíbrio do relatório); quem lançava aluguel e folha todo mês era a pessoa.
 * Aqui ela passa a produzir as contas a pagar do mês, já em aberto, com o
 * vencimento no mesmo dia do mês anterior.
 *
 * Puro: sem Firestore, sem React. Recebe o que já existe e devolve o que falta.
 */
import { addMonthsClamped } from './dateMath';
import { dataParaYMD, ymdParaISO } from './despesaParcelas';
import { dataDe, estaPaga, noPeriodo } from './despesasAnalise';

/** Chave de identidade de uma conta fixa dentro de um mês. */
const chave = (e) => `${(e.description || '').trim().toLowerCase()}|${(e.category || '').trim().toLowerCase()}`;

/**
 * Contas fixas a criar no mês de destino.
 *
 * Modelo: toda recorrente do mês de origem (paga ou não) deve ter uma
 * correspondente no destino. Já existe uma com a mesma descrição e categoria
 * no destino — mesmo lançada à mão, mesmo já paga — então não duplica.
 * Parcela de compra parcelada nunca entra: ela já nasce com todos os meses.
 *
 * @returns {{ lancamentos: Array, jaExistiam: number, origem: number }}
 */
export function recorrentesDoMes(expenses = [], { origem, destino }) {
  const daOrigem = expenses.filter(
    (e) => noPeriodo(e, 'month', origem.mes, origem.ano) && e.recorrente === true && !(e.parcelas > 1)
  );

  const noDestino = new Set(
    expenses.filter((e) => noPeriodo(e, 'month', destino.mes, destino.ano)).map(chave)
  );

  // Mesma conta lançada duas vezes no mês de origem (ex.: aluguel corrigido):
  // gera uma só no destino.
  const vistas = new Set();
  const lancamentos = [];
  let jaExistiam = 0;

  for (const e of daOrigem) {
    const k = chave(e);
    if (vistas.has(k)) continue;
    vistas.add(k);
    if (noDestino.has(k)) {
      jaExistiam++;
      continue;
    }

    const base = dataDe(e);
    if (!base) continue;
    // Mesmo dia do mês seguinte, travando no último dia nos meses curtos
    // (31/01 -> 28/02), igual ao parcelamento.
    const venc = addMonthsClamped(base, 1);
    const ymd = dataParaYMD(venc);

    lancamentos.push({
      description: e.description,
      category: e.category,
      value: Number(e.value) || 0,
      paymentMethod: e.paymentMethod || 'Não especificado',
      tipoSaida: e.tipoSaida || 'operacional',
      recorrente: true,
      status: 'pendente',
      vencimento: ymdParaISO(ymd),
      // `date` é a data de caixa; enquanto está em aberto, carrega a previsão.
      date: ymdParaISO(ymd),
      month: venc.getMonth() + 1,
      year: venc.getFullYear(),
      geradoDe: e.id || null,
    });
  }

  return { lancamentos, jaExistiam, origem: daOrigem.length };
}

/** Patch de baixa: a conta passa a paga e a data de caixa vira o dia do pagamento. */
export function baixaDeConta(dataPagamentoYMD) {
  const [ano, mes] = dataPagamentoYMD.split('-').map(Number);
  return {
    status: 'pago',
    date: ymdParaISO(dataPagamentoYMD),
    month: mes,
    year: ano,
    pagoEm: Date.now(),
  };
}

/** Só para a UI: contas em aberto, vencidas primeiro, depois por vencimento. */
export function ordenarAPagar(lista = []) {
  return [...lista]
    .filter((e) => !estaPaga(e))
    .sort((a, b) => (dataDe(a)?.getTime() ?? 0) - (dataDe(b)?.getTime() ?? 0));
}
