/**
 * Mudança de mensalidade de um aluno já matriculado.
 *
 * Duas coisas MUITO diferentes levavam ao mesmo lugar no código antigo, que
 * reescrevia o valor de toda parcela com status 'Pendente':
 *
 *  - O aluno reduziu a carga horária no 6º mês. As 5 primeiras parcelas estavam
 *    certas a R$ 200; só valem R$ 100 da mudança em diante. Reescrever as
 *    anteriores APAGA DÍVIDA: a parcela vencida de R$ 200 virava R$ 100 e a
 *    inadimplência (que é `valuePlanned − valuePaid`) caía sem ninguém pagar.
 *  - A secretaria digitou o valor errado na matrícula. Aí o valor nunca foi
 *    R$ 200, e TODA parcela em aberto precisa ser corrigida, vencida inclusive.
 *
 * Daí os dois modos. Puro: sem React, sem Firestore — a regra é dinheiro e
 * precisa ser testável fora da tela.
 *
 * Datas são comparadas como texto "YYYY-MM-DD". `dueDate` é gravado como
 * "YYYY-MM-DDT00:00:00", então comparar o prefixo evita qualquer conversão de
 * fuso — foi assim que a despesa do dia 1º caiu no mês anterior.
 */
import { paraISODia } from './matricula';

export const MODO_PLANO = 'plano';
export const MODO_CORRECAO = 'correcao';

export const ROTULO_MODO = {
  [MODO_PLANO]: 'Mudança de plano',
  [MODO_CORRECAO]: 'Correção de cadastro',
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "YYYY-MM-DD" de um dueDate ("2026-05-10T00:00:00") ou de uma data já curta. */
export const diaDaParcela = (p) => String(p?.dueDate ?? '').slice(0, 10);

/**
 * A parcela aceita mudança de valor? Paga é histórico (mexer nela exigiria
 * crédito ou devolução) e cancelada saiu junto com a matrícula.
 * 'Atrasado' é status legado — atraso hoje é derivado do vencimento, não gravado.
 */
export const parcelaEmAberto = (p) => p?.status !== 'Pago' && p?.status !== 'cancelada';

/** Saldo devedor da parcela. */
export const saldoDevedor = (p) => Math.max(0, num(p?.valuePlanned) - num(p?.valuePaid));

/**
 * Separa as parcelas do aluno em pagas/canceladas, vencidas e a vencer.
 * `hoje` é um Date; o corte é por dia, não por hora.
 */
export function classificarParcelas(parcelas = [], hoje = new Date()) {
  const hojeYMD = paraISODia(hoje);
  const abertas = parcelas.filter(parcelaEmAberto);
  return {
    fechadas: parcelas.filter((p) => !parcelaEmAberto(p)),
    vencidas: abertas.filter((p) => diaDaParcela(p) && diaDaParcela(p) < hojeYMD),
    aVencer: abertas.filter((p) => !diaDaParcela(p) || diaDaParcela(p) >= hojeYMD),
  };
}

/**
 * Data sugerida para começar a valer o novo valor: o vencimento da primeira
 * parcela em aberto que ainda não venceu. Sem nenhuma, cai em hoje.
 */
export function sugerirVigencia(parcelas = [], hoje = new Date()) {
  const { aVencer } = classificarParcelas(parcelas, hoje);
  const dias = aVencer.map(diaDaParcela).filter(Boolean).sort();
  return dias[0] || paraISODia(hoje);
}

/**
 * O que acontece com cada parcela se a mensalidade passar a `fee`.
 *
 * `modo` MODO_PLANO  → só parcelas em aberto que vencem de `aPartirDe` em diante.
 * `modo` MODO_CORRECAO → toda parcela em aberto, vencida inclusive.
 *
 * Devolve sempre as três listas, para a tela mostrar a prévia antes de gravar.
 * Parcela que já está no valor novo não entra em `alterar` (não gera escrita).
 */
export function planoDeAlteracao(parcelas = [], { fee, modo = MODO_PLANO, aPartirDe, hoje = new Date() } = {}) {
  const novo = num(fee);
  const { fechadas, vencidas, aVencer } = classificarParcelas(parcelas, hoje);
  const corte = modo === MODO_PLANO ? (aPartirDe || sugerirVigencia(parcelas, hoje)) : null;

  const abertas = [...vencidas, ...aVencer];
  const elegivel = (p) => {
    if (modo === MODO_CORRECAO) return true;
    const dia = diaDaParcela(p);
    // Parcela sem vencimento legível não é tocada por data — só na correção.
    return Boolean(dia) && dia >= corte;
  };

  const alvo = abertas.filter(elegivel);
  const alterar = alvo
    .filter((p) => num(p.valuePlanned) !== novo)
    .map((p) => ({
      id: p.id,
      dia: diaDaParcela(p),
      installmentNum: p.installmentNum ?? null,
      de: num(p.valuePlanned),
      para: novo,
      vencida: vencidas.includes(p),
    }))
    .sort((a, b) => String(a.dia).localeCompare(String(b.dia)));

  const mantidas = abertas
    .filter((p) => !alvo.includes(p))
    .map((p) => ({
      id: p.id,
      dia: diaDaParcela(p),
      valor: num(p.valuePlanned),
      vencida: vencidas.includes(p),
    }))
    .sort((a, b) => String(a.dia).localeCompare(String(b.dia)));

  const dividaAntes = abertas.reduce((s, p) => s + saldoDevedor(p), 0);
  const delta = alterar.reduce((s, a) => s + (a.para - a.de), 0);

  return {
    modo,
    vigenteDesde: corte,
    alterar,
    mantidas,
    fechadas: fechadas.length,
    resumo: {
      quantidade: alterar.length,
      primeiro: alterar[0]?.dia || null,
      ultimo: alterar[alterar.length - 1]?.dia || null,
      vencidasAlteradas: alterar.filter((a) => a.vencida).length,
      vencidasMantidas: mantidas.filter((m) => m.vencida).length,
      delta,
      dividaAntes,
      dividaDepois: dividaAntes + delta,
    },
  };
}

/**
 * Registro para `student.historicoMensalidade`. Sem isso o valor antigo é
 * sobrescrito e ninguém consegue responder, três meses depois, por que o MRR
 * caiu naquele mês.
 */
export function entradaHistorico({ fee, feeAnterior, modo, vigenteDesde, por, agora = Date.now() }) {
  return {
    fee: num(fee),
    feeAnterior: num(feeAnterior),
    modo: modo === MODO_CORRECAO ? MODO_CORRECAO : MODO_PLANO,
    // Na correção não há vigência: o valor passa a valer para tudo em aberto.
    vigenteDesde: modo === MODO_CORRECAO ? null : (vigenteDesde || null),
    por: por || null,
    registradoEm: agora,
  };
}
