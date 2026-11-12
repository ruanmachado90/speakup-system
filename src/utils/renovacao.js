/**
 * Renovação de matrícula (ano letivo seguinte). Regras puras — sem React, sem
 * Firestore — porque é dinheiro e precisa ser testável fora da tela.
 * Planejamento completo: docs/rematricula/PLANO.md.
 *
 * Convenções:
 *  - Dinheiro em CENTAVOS inteiros (Number), convertido para reais só ao gravar
 *    a parcela (`valuePlanned` continua em reais, como no resto do sistema).
 *  - Datas "YYYY-MM-DD" comparadas como texto, como em mensalidade.js.
 *  - Nada de valor fixo aqui: reajuste, planos e descontos vêm da campanha
 *    (`renovacao-campanhas/{ano}`; padrão em src/config/renovacao.js).
 */
import { montarParcelas, soDigitos } from './matricula';
import { classificarParcelas, diaDaParcela, saldoDevedor } from './mensalidade';

const pad = (n) => String(n).padStart(2, '0');

// ── Dinheiro ───────────────────────────────────────────────────────────────

export const paraCentavos = (reais) => Math.round(Number(reais || 0) * 100);
export const paraReais = (centavos) => Math.round(centavos) / 100;

/** Mensalidade com o reajuste da campanha, em centavos. */
export function reajustar(baseCentavos, reajustePct, arredondamento = 'centavos') {
  const bruto = baseCentavos * (1 + Number(reajustePct || 0) / 100);
  return arredondamento === 'real' ? Math.round(bruto / 100) * 100 : Math.round(bruto);
}

// ── Prazo (fuso de Brasília) ───────────────────────────────────────────────

/** "YYYY-MM-DD" do instante `ms` no horário de Brasília. */
export const diaEmBrasilia = (ms) =>
  new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

// ── Descontos (nunca acumulam) ─────────────────────────────────────────────

/**
 * O ÚNICO desconto que vale para o plano: o maior entre os que se aplicam.
 * Empate fica com o primeiro da lista (o do próprio plano).
 *
 * @param {object} p
 * @param {object} p.campanha       documento da campanha
 * @param {string} p.planoId
 * @param {number} [p.respondidaEm] ms (horário do servidor); sem ele, a renovação
 *                                  no prazo não entra
 * @param {boolean} [p.irmao]       desconto de irmão marcado pela secretaria
 * @returns {{ id, nome, pct, condicao? } | null}
 */
export function descontoAplicavel({ campanha, planoId, respondidaEm, irmao = false }) {
  const plano = planoDaCampanha(campanha, planoId);
  const candidatos = [];

  if (plano.descontoPct > 0) {
    candidatos.push({ id: 'plano', nome: `Desconto ${plano.rotulo}`, pct: plano.descontoPct });
  }

  const noPrazo = campanha.descontoRenovacaoNoPrazo;
  const ate = noPrazo?.respostaAte || campanha.encerramento;
  if (
    noPrazo?.pct > 0 && (noPrazo.planos || []).includes(planoId) &&
    respondidaEm != null && ate && diaEmBrasilia(respondidaEm) <= ate
  ) {
    // Condições conferidas depois (efetivação e etapa 7b); `emDia` vale salvo
    // se a campanha desligar (campanhas antigas não têm o campo).
    const condicao = {
      ...(noPrazo.primeiraParcelaPagaAte ? { primeiraParcelaPagaAte: noPrazo.primeiraParcelaPagaAte } : {}),
      ...(noPrazo.exigeEmDia !== false ? { emDia: true } : {}),
    };
    candidatos.push({
      id: 'renovacao_no_prazo',
      nome: 'Renovação no prazo',
      pct: noPrazo.pct,
      condicao: Object.keys(condicao).length ? condicao : null,
    });
  }

  if (irmao && campanha.descontoIrmao?.pct > 0) {
    candidatos.push({ id: 'irmao', nome: 'Desconto de irmão', pct: campanha.descontoIrmao.pct });
  }

  return candidatos.reduce((melhor, c) => (!melhor || c.pct > melhor.pct ? c : melhor), null);
}

export function planoDaCampanha(campanha, planoId) {
  const plano = (campanha?.planos || []).find((p) => p.id === planoId);
  if (!plano) throw new Error(`Plano "${planoId}" não existe na campanha.`);
  return plano;
}

// ── Valores de um plano ────────────────────────────────────────────────────

/**
 * Todos os pagamentos do plano têm o MESMO valor: cada um cobre 12/n meses,
 * com o desconto aplicado e arredondado ao centavo. O total é a soma deles.
 */
export function calcularPlano({ mensalidadeCentavos, plano, desconto = null }) {
  const n = plano.meses.length;
  if (!n || 12 % n !== 0) throw new Error(`Plano "${plano.id}": nº de pagamentos precisa dividir 12.`);
  const fator = 1 - (desconto ? desconto.pct / 100 : 0);
  const valorPagamento = Math.round(mensalidadeCentavos * (12 / n) * fator);
  const total = valorPagamento * n;
  const bruto = mensalidadeCentavos * 12;
  return {
    planoId: plano.id,
    mensalidade: mensalidadeCentavos,
    pagamentos: n,
    valorPagamento,
    total,
    bruto,
    desconto: desconto ? { ...desconto, valor: bruto - total } : null,
  };
}

/** Os planos da campanha já calculados para um aluno (o que a página mostra). */
export function opcoesDePlano({ campanha, mensalidadeBaseCentavos, respondidaEm, irmao = false }) {
  const mensalidade = reajustar(mensalidadeBaseCentavos, campanha.reajustePct, campanha.arredondamento);
  const opcoes = campanha.planos.map((plano) => calcularPlano({
    mensalidadeCentavos: mensalidade,
    plano,
    desconto: descontoAplicavel({ campanha, planoId: plano.id, respondidaEm, irmao }),
  }));
  const cheio = mensalidade * 12;
  return { mensalidade, opcoes: opcoes.map((o) => ({ ...o, economia: cheio - o.total })) };
}

// ── Datas e parcelas ───────────────────────────────────────────────────────

const ultimoDia = (ano, mes) => new Date(ano, mes, 0).getDate();

/** Vencimentos do plano no ano letivo, no dia escolhido (limitado ao fim do mês). */
export function datasDosPagamentos({ ano, meses, dia }) {
  return meses.map((m) => `${ano}-${pad(m)}-${pad(Math.min(Number(dia), ultimoDia(ano, m)))}`);
}

/**
 * Parcelas da renovação: o MESMO formato de montarParcelas (matrícula), mais
 * três campos que separam o contrato novo do antigo.
 */
export function montarParcelasRenovacao({
  studentId, studentName, course, professorId, valores, datas, renovacaoId, anoLetivo,
}) {
  return montarParcelas({
    studentId,
    studentName,
    fee: paraReais(valores.valorPagamento),
    installmentDates: datas,
    course,
    professorId,
  }).map((p) => ({ ...p, anoLetivo, origem: 'renovacao', renovacaoId }));
}

/**
 * Contrato de 2026 que invade o ano novo (matrícula de 12x no meio do ano).
 * Na efetivação, as parcelas em aberto desse trecho são canceladas — o
 * contrato novo começa em janeiro. Parcela já paga (inteira OU em parte) não
 * pode simplesmente sumir: bloqueia a efetivação para a secretaria decidir.
 */
export function parcelasAntigasDoAno(parcelas = [], anoLetivo) {
  const doAno = parcelas.filter(
    (p) => diaDaParcela(p).startsWith(`${anoLetivo}-`) && p.origem !== 'renovacao' && p.status !== 'cancelada'
  );
  const temPagamento = (p) => p.status === 'Pago' || Number(p.valuePaid) > 0;
  return {
    cancelar: doAno.filter((p) => !temPagamento(p)),
    bloqueiam: doAno.filter(temPagamento),
  };
}

/** Último mês ("YYYY-MM") com parcela do contrato atual; null sem parcelas. */
export function contratoVaiAte(parcelas = []) {
  const meses = parcelas
    .filter((p) => p.status !== 'cancelada' && p.origem !== 'renovacao')
    .map((p) => diaDaParcela(p).slice(0, 7))
    .filter(Boolean)
    .sort();
  return meses[meses.length - 1] || null;
}

// ── Pendência ──────────────────────────────────────────────────────────────

/** Parcelas vencidas em aberto (o que deixa a renovação "aguardando regularização"). */
export function pendencias(parcelas = [], hoje = new Date()) {
  const { vencidas } = classificarParcelas(parcelas, hoje);
  return {
    quantidade: vencidas.length,
    valor: paraCentavos(vencidas.reduce((s, p) => s + saldoDevedor(p), 0)),
  };
}

// ── Seleção pela secretaria ────────────────────────────────────────────────

const normalizar = (s) => String(s || '').normalize('NFD').replace(/\p{Mn}/gu, '').toUpperCase().trim();

/** Grupo do curso para os atalhos de seleção. Os nomes reais são inconsistentes. */
export function grupoDoCurso(course) {
  const c = normalizar(course);
  if (!c) return 'sem_curso';
  if (c.includes('KIDS')) return 'kids';
  if (c.includes('TEENS')) return 'teens';
  if (c.includes('REFORC')) return 'reforco';
  return 'adulto';
}

/** Mensalidade que a secretaria precisa conferir à mão antes do envio. */
export function precisaRevisarValor({ fee, course }, campanha) {
  const valor = Number(fee);
  const faixa = campanha.faixaMensalidadeRegular || {};
  if (!(valor > 0)) return true;
  if (faixa.min != null && valor < faixa.min) return true;
  if (faixa.max != null && valor > faixa.max) return true;
  const c = normalizar(course);
  return (campanha.cursosRevisaoManual || []).some((trecho) => c.includes(normalizar(trecho)));
}

/** Telefone para o link: o do responsável, se houver; senão o do aluno. */
export function telefoneDeEnvio(student) {
  return soDigitos(student?.responsibleContact).length >= 10 ? student.responsibleContact : (student?.contact || '');
}

/**
 * Irmãos = mesmo CPF de responsável. Devolve { [studentId]: [ids dos irmãos] }
 * só para quem tem irmão. É uma DICA na tela: o desconto é a secretaria quem marca.
 */
export function irmaosPorResponsavel(students = []) {
  const porCpf = new Map();
  students.forEach((s) => {
    const cpf = soDigitos(s.responsibleCpf);
    if (cpf.length !== 11) return;
    porCpf.set(cpf, [...(porCpf.get(cpf) || []), s.id]);
  });
  const resultado = {};
  porCpf.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach((id) => { resultado[id] = ids.filter((x) => x !== id); });
  });
  return resultado;
}

// ── Link ───────────────────────────────────────────────────────────────────

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Código do link (32 caracteres). O link nunca leva o ID do aluno. */
export function gerarCodigo(bytesAleatorios = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(bytesAleatorios(32), (b) => ALFABETO[b % ALFABETO.length]).join('');
}

// ── Status ─────────────────────────────────────────────────────────────────

export const STATUS = {
  GERADA: 'gerada',
  ENVIADA: 'enviada',
  ABERTA: 'aberta',
  RESPONDIDA: 'respondida',
  AGUARDANDO: 'aguardando_regularizacao',
  EFETIVADA: 'efetivada',
  NAO_RENOVARA: 'nao_renovara',
  EXPIRADA: 'expirada',
  CANCELADA: 'cancelada',
};

const S = STATUS;
const TRANSICOES = {
  [S.GERADA]: [S.ENVIADA, S.ABERTA, S.RESPONDIDA, S.NAO_RENOVARA, S.EXPIRADA, S.CANCELADA],
  [S.ENVIADA]: [S.ENVIADA, S.ABERTA, S.RESPONDIDA, S.NAO_RENOVARA, S.EXPIRADA, S.CANCELADA],
  [S.ABERTA]: [S.RESPONDIDA, S.NAO_RENOVARA, S.EXPIRADA, S.CANCELADA],
  // reabrir = voltar para "aberta" (família quer trocar o plano), só antes de efetivar
  [S.RESPONDIDA]: [S.EFETIVADA, S.AGUARDANDO, S.ABERTA, S.NAO_RENOVARA, S.CANCELADA],
  [S.AGUARDANDO]: [S.EFETIVADA, S.ABERTA, S.NAO_RENOVARA, S.CANCELADA],
  [S.EFETIVADA]: [S.CANCELADA],
  [S.NAO_RENOVARA]: [S.GERADA], // desfazer "não renovará"
  [S.EXPIRADA]: [],
  [S.CANCELADA]: [],
};

export const podeMudarStatus = (de, para) => (TRANSICOES[de] || []).includes(para);

// ── Regra de 10/01 (etapa 7b) ──────────────────────────────────────────────

/**
 * Quem ganhou o desconto de renovação no prazo e NÃO pagou a 1ª parcela até a
 * data-limite perde o desconto (as parcelas em aberto vão ao valor cheio).
 * Antes de a data passar, ainda não dá para saber: devolve false.
 *
 * @param {object} p
 * @param {object|null} p.desconto       o desconto aplicado na efetivação
 * @param {Array} p.parcelasDaRenovacao  parcelas com origem 'renovacao'
 * @param {Date} [p.hoje]
 */
export function perdeuDescontoNoPrazo({ desconto, parcelasDaRenovacao = [], hoje = new Date() }) {
  const limite = desconto?.id === 'renovacao_no_prazo' ? desconto.condicao?.primeiraParcelaPagaAte : null;
  if (!limite) return false;
  const hojeYMD = diaEmBrasilia(hoje.getTime());
  if (hojeYMD <= limite) return false;
  const primeira = [...parcelasDaRenovacao].sort((a, b) => diaDaParcela(a).localeCompare(diaDaParcela(b)))[0];
  if (!primeira) return false;
  const pagaNoPrazo = primeira.status === 'Pago' && String(primeira.paymentDate || '').slice(0, 10) <= limite;
  return !pagaNoPrazo;
}
