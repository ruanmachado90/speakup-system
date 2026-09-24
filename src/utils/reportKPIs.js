/**
 * Cálculo puro dos KPIs do relatório mensal da SpeakUp.
 *
 * SEM React, SEM Firestore, SEM efeitos colaterais. Só recebe arrays de dados
 * + parâmetros e devolve números. É a camada de leitura — NÃO altera nada.
 *
 * Convenções:
 *  - `mes` é 0-11 (padrão JS). `ano` é 4 dígitos.
 *  - Toda métrica que pode não ter dado devolve `{ valor, disponivel, motivo }`
 *    em vez de 0 silencioso — quem renderiza decide mostrar "dado indisponível".
 *  - Divisão por zero e período sem dados nunca quebram: caem em `disponivel:false`.
 *
 * Regras de negócio (não negociáveis, vindas de auditoria):
 *  - Inadimplência SEMPRE em R$ (saldo devedor), nunca contagem de parcelas.
 *  - Mensalidade (payments) e material/avulso (vendas) são receitas separadas.
 *  - MRR = Σ mensalidade (`fee`) dos alunos ativos no fim do mês.
 *  - Custo de professor (CLT): horas/mês da turma × valorHoraAula × (1 + encargos%).
 */

import { PARAMETROS_PADRAO } from '../config/parametros';

const MS_DIA = 86400000;

// ───────────────────────── helpers de data ─────────────────────────

/** Converte "YYYY-MM-DD", ISO string ou timestamp (ms) para Date local. */
export function paraData(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw);
  // "YYYY-MM-DD" (ou o prefixo de um ISO) → constrói em horário local p/ não deslocar fuso
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Primeiro instante do mês. */
export function inicioDoMes(mes, ano) {
  return new Date(ano, mes, 1, 0, 0, 0, 0);
}

/** Último instante do mês (23:59:59.999 do último dia). */
export function fimDoMes(mes, ano) {
  return new Date(ano, mes + 1, 0, 23, 59, 59, 999);
}

/** {mes, ano} do mês anterior. */
export function mesAnterior(mes, ano) {
  return mes === 0 ? { mes: 11, ano: ano - 1 } : { mes: mes - 1, ano };
}

/** {mes, ano} do mesmo mês no ano anterior. */
export function mesmoMesAnoAnterior(mes, ano) {
  return { mes, ano: ano - 1 };
}

/** A data cai dentro do mês/ano informado? */
export function noMes(raw, mes, ano) {
  const d = paraData(raw);
  if (!d) return false;
  return d.getMonth() === mes && d.getFullYear() === ano;
}

/** Rótulo curto "Mai/2026". */
export function rotuloMes(mes, ano) {
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[((mes % 12) + 12) % 12]}/${ano}`;
}

// ───────────────────────── helpers numéricos ─────────────────────────

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const indisponivel = (motivo) => ({ valor: null, disponivel: false, motivo });
const disponivel = (valor, extra = {}) => ({ valor, disponivel: true, ...extra });

/**
 * Variação percentual entre o valor atual e o anterior.
 * `anterior` nulo/zero → não dá pra comparar.
 */
export function variacao(atual, anterior) {
  if (atual == null || anterior == null || anterior === 0) {
    return { pct: null, direcao: 'na', disponivel: false };
  }
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  let direcao = 'flat';
  if (pct > 0.5) direcao = 'up';
  else if (pct < -0.5) direcao = 'down';
  return { pct, direcao, disponivel: true };
}

// ───────────────────────── ciclo de vida do aluno ─────────────────────────

/**
 * O aluno estava ativo no instante `ref`?
 * Ativo = matriculado até `ref` E (não cancelado OU cancelado depois de `ref`).
 * Sem `createdAt` (registro legado): assume matriculado, decide só pelo cancelamento.
 */
export function alunoAtivoEm(aluno, ref) {
  const criado = paraData(aluno.createdAt);
  if (criado && criado > ref) return false;

  const cancelado = paraData(aluno.canceledAt);
  if (aluno.status === 'cancelado') {
    // Sem data de cancelamento → considera cancelado desde sempre.
    if (!cancelado) return false;
    return cancelado > ref;
  }
  return true;
}

/** Alunos ativos no fim do mês. */
export function alunosAtivosNoFim(students = [], mes, ano) {
  const ref = fimDoMes(mes, ano);
  return students.filter((s) => alunoAtivoEm(s, ref));
}

/** Alunos ativos no início do mês (= fim do mês anterior). */
export function alunosAtivosNoInicio(students = [], mes, ano) {
  const { mes: pm, ano: pa } = mesAnterior(mes, ano);
  return alunosAtivosNoFim(students, pm, pa);
}

/** Alunos matriculados no mês. */
export function novasMatriculas(students = [], mes, ano) {
  return students.filter((s) => noMes(s.createdAt, mes, ano));
}

/** Alunos cancelados no mês (usa canceledAt; sem ela, updatedAt como fallback). */
export function cancelamentosNoMes(students = [], mes, ano) {
  return students.filter(
    (s) => s.status === 'cancelado' && noMes(s.canceledAt ?? s.updatedAt, mes, ano),
  );
}

// ───────────────────────── receita ─────────────────────────

/** MRR = Σ mensalidade dos alunos ativos no fim do mês. */
export function mrr(students = [], mes, ano) {
  const ativos = alunosAtivosNoFim(students, mes, ano);
  if (ativos.length === 0) return indisponivel('Nenhum aluno ativo no período');
  const total = ativos.reduce((s, a) => s + num(a.fee), 0);
  return disponivel(total, { alunos: ativos.length });
}

/**
 * Receita RECEBIDA no mês (regime de caixa): parcelas dadas baixa cujo
 * pagamento caiu no mês. Usa `paidAt` (timestamp real) e cai em `paymentDate`.
 */
export function receitaRecebidaNoMes(payments = [], mes, ano) {
  return payments
    .filter((p) => p.status === 'Pago')
    .filter((p) => noMes(p.paidAt ?? p.paymentDate ?? p.dueDate, mes, ano))
    .reduce((s, p) => s + num(p.valuePaid || p.valuePlanned), 0);
}

/** Receita PREVISTA do mês: Σ valor planejado das parcelas que vencem no mês. */
export function receitaPrevistaNoMes(payments = [], mes, ano) {
  return payments
    .filter((p) => p.status !== 'cancelada')
    .filter((p) => noMes(p.dueDate, mes, ano))
    .reduce((s, p) => s + num(p.valuePlanned), 0);
}

/**
 * Receita NÃO-recorrente do mês: vendas de material/uniforme/avulso pagas no mês.
 * Taxa de matrícula não é registrada hoje → não entra (informar como lacuna).
 */
export function receitaNaoRecorrenteNoMes(vendas = [], mes, ano) {
  const pagas = vendas.filter(
    (v) => (v.status === 'pago' || v.status === 'Pago' || v.dataPagamento) && v.status !== 'cancelado',
  );
  const total = pagas
    .filter((v) => noMes(v.dataPagamento ?? v.createdAt, mes, ano))
    .reduce((s, v) => s + num(v.valorPago ?? v.valor), 0);
  return {
    ...disponivel(total),
    inclui: 'material, uniforme e avulsos',
    lacuna: 'taxa de matrícula não é registrada no sistema',
  };
}

/** Ticket médio por aluno = receita total ÷ alunos ativos. */
export function ticketMedioPorAluno(receitaTotal, nAtivos) {
  if (!nAtivos || nAtivos <= 0) return indisponivel('Sem alunos ativos');
  return disponivel(receitaTotal / nAtivos);
}

/**
 * Mensalidade média por curso: agrupa os alunos ativos por `course` e mostra
 * quantos são, a mensalidade média e a contribuição de MRR de cada curso.
 * Não depende de configuração — cada aluno carrega sua própria mensalidade.
 */
export function mensalidadePorCurso(students = [], mes, ano) {
  const ativos = alunosAtivosNoFim(students, mes, ano);
  const mapa = new Map();
  for (const a of ativos) {
    const chave = (a.course || a.curso || 'Sem curso').trim() || 'Sem curso';
    const atual = mapa.get(chave) || { curso: chave, alunos: 0, mrr: 0 };
    atual.alunos += 1;
    atual.mrr += num(a.fee);
    mapa.set(chave, atual);
  }
  return [...mapa.values()]
    .map((c) => ({ ...c, mensalidadeMedia: c.alunos > 0 ? c.mrr / c.alunos : 0 }))
    .sort((x, y) => y.mrr - x.mrr);
}

// ───────────────────────── alunos / churn / coorte ─────────────────────────

/** Churn mensal (%) = cancelamentos no mês ÷ alunos ativos no início do mês. */
export function churnMensalPct(students = [], mes, ano) {
  const base = alunosAtivosNoInicio(students, mes, ano).length;
  if (base === 0) return indisponivel('Nenhum aluno ativo no início do mês');
  const cancelados = cancelamentosNoMes(students, mes, ano).length;
  return disponivel((cancelados / base) * 100, { cancelados, base });
}

/**
 * Retenção por safra: para cada mês de entrada nos últimos `janela` meses,
 * quantos daqueles alunos seguem ativos em `ref` (default: agora).
 */
export function retencaoPorSafra(students = [], mes, ano, janela = 6, ref = new Date()) {
  const linhas = [];
  for (let i = janela - 1; i >= 0; i -= 1) {
    const d = new Date(ano, mes - i, 1);
    const sm = d.getMonth();
    const sy = d.getFullYear();
    const entraram = novasMatriculas(students, sm, sy);
    const ativos = entraram.filter((a) => alunoAtivoEm(a, ref)).length;
    linhas.push({
      safra: rotuloMes(sm, sy),
      entraram: entraram.length,
      ativos,
      retencaoPct: entraram.length > 0 ? (ativos / entraram.length) * 100 : null,
    });
  }
  return linhas;
}

/** LTV = ticket médio ÷ churn mensal (em fração). */
export function ltv(ticketMedio, churnPct) {
  if (ticketMedio == null) return indisponivel('Ticket médio indisponível');
  if (!churnPct || churnPct <= 0) return indisponivel('Churn zero ou indisponível no período');
  return disponivel(ticketMedio / (churnPct / 100));
}

// ───────────────────────── inadimplência (SEMPRE em R$) ─────────────────────────

/** Saldo devedor de uma parcela = previsto − pago (0 se quitada ou cancelada). */
export function saldoParcela(p) {
  if (p.status === 'Pago' || p.status === 'cancelada') return 0;
  return Math.max(0, num(p.valuePlanned) - num(p.valuePaid));
}

/** Parcelas com saldo em aberto e vencidas até `ref`. */
export function parcelasVencidas(payments = [], ref) {
  return payments.filter((p) => {
    if (saldoParcela(p) <= 0.005) return false;
    const venc = paraData(p.dueDate);
    return venc && venc < ref;
  });
}

/** Valor total inadimplente (R$) até `ref` — carteira vencida inteira. */
export function inadimplenciaValor(payments = [], ref) {
  return parcelasVencidas(payments, ref).reduce((s, p) => s + saldoParcela(p), 0);
}

/**
 * Inadimplência do mês: saldo vencido das parcelas que venceram NO mês,
 * medido no fim do mês, e seu % sobre a receita prevista do mês.
 */
export function inadimplenciaDoMes(payments = [], mes, ano) {
  const ref = fimDoMes(mes, ano);
  const doMes = payments.filter((p) => p.status !== 'cancelada' && noMes(p.dueDate, mes, ano));
  const previsto = doMes.reduce((s, p) => s + num(p.valuePlanned), 0);
  const vencido = doMes.reduce((s, p) => {
    const venc = paraData(p.dueDate);
    return venc && venc < ref ? s + saldoParcela(p) : s;
  }, 0);
  return {
    valor: vencido,
    previsto,
    pct: previsto > 0 ? (vencido / previsto) * 100 : null,
    disponivel: previsto > 0,
    motivo: previsto > 0 ? undefined : 'Sem parcelas previstas no mês',
  };
}

/** Aging da carteira vencida em `ref`: 0-30 / 31-60 / 61-90 / 90+ dias. */
export function agingInadimplencia(payments = [], ref) {
  const faixas = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const p of parcelasVencidas(payments, ref)) {
    const venc = paraData(p.dueDate);
    const dias = Math.floor((ref - venc) / MS_DIA);
    const saldo = saldoParcela(p);
    if (dias <= 30) faixas['0-30'] += saldo;
    else if (dias <= 60) faixas['31-60'] += saldo;
    else if (dias <= 90) faixas['61-90'] += saldo;
    else faixas['90+'] += saldo;
  }
  return faixas;
}

/**
 * Taxa de recuperação = valor recebido no mês referente a parcelas que já
 * estavam vencidas em meses anteriores ÷ carteira vencida no fim do mês anterior.
 */
export function taxaRecuperacao(payments = [], mes, ano) {
  const inicio = inicioDoMes(mes, ano);
  const recebidoDeAtrasados = payments
    .filter((p) => p.status === 'Pago')
    .filter((p) => noMes(p.paidAt ?? p.paymentDate, mes, ano))
    .filter((p) => {
      const venc = paraData(p.dueDate);
      return venc && venc < inicio; // vencia antes deste mês
    })
    .reduce((s, p) => s + num(p.valuePaid || p.valuePlanned), 0);

  const { mes: pm, ano: pa } = mesAnterior(mes, ano);
  const carteiraAbertura = inadimplenciaValor(payments, fimDoMes(pm, pa));

  if (carteiraAbertura <= 0.005) {
    return { ...indisponivel('Sem carteira vencida no início do mês'), recuperado: recebidoDeAtrasados };
  }
  return disponivel((recebidoDeAtrasados / carteiraAbertura) * 100, {
    recuperado: recebidoDeAtrasados,
    carteiraAbertura,
  });
}

// ───────────────────────── operacional (turmas / professores) ─────────────────────────

/** Custo efetivo de uma hora-aula (regime CLT): valor pago × (1 + encargos%). */
export function custoHoraAula(params = PARAMETROS_PADRAO) {
  return num(params.valorHoraAula) * (1 + num(params.encargosProfessorPct) / 100);
}

/**
 * Custo do professor de UMA turma no mês.
 *   horas/mês da turma × custo efetivo da hora-aula
 * Sem "horas/mês" cadastrado, usa `horasMensaisPadraoTurma` da config.
 */
export function custoProfessorTurma(turma, params = PARAMETROS_PADRAO) {
  const horas = num(turma?.horasMensais) > 0
    ? num(turma.horasMensais)
    : num(params.horasMensaisPadraoTurma) || 4;
  return horas * custoHoraAula(params);
}

/** Nº de alunos ativos matriculados numa turma. */
function alunosAtivosDaTurma(turma, ativosById) {
  const ids = Array.isArray(turma.alunosIds) ? turma.alunosIds : [];
  return ids.filter((id) => ativosById.has(id)).length;
}

/** Taxa de ocupação (%) de uma turma = matriculados ativos ÷ capacidade. */
export function ocupacaoTurma(turma, ativosById) {
  const cap = num(turma.maxAlunos);
  if (cap <= 0) return indisponivel('Turma sem capacidade definida');
  return disponivel((alunosAtivosDaTurma(turma, ativosById) / cap) * 100);
}

/**
 * Detalhamento por turma: ocupação, receita (Σ fee dos alunos ativos),
 * custo do professor alocado e margem de contribuição.
 */
export function detalhamentoPorTurma(turmas = [], students = [], mes, ano, params = PARAMETROS_PADRAO) {
  const ativos = alunosAtivosNoFim(students, mes, ano);
  const ativosById = new Map(ativos.map((a) => [a.id, a]));

  return turmas.map((t) => {
    const prof = (t.professor || '—').trim();
    const matriculados = alunosAtivosDaTurma(t, ativosById);
    const cap = num(t.maxAlunos);
    const receita = (Array.isArray(t.alunosIds) ? t.alunosIds : [])
      .map((id) => ativosById.get(id))
      .filter(Boolean)
      .reduce((s, a) => s + num(a.fee), 0);
    const custoProf = custoProfessorTurma(t, params);
    return {
      id: t.id,
      nome: t.nome || '—',
      professor: prof,
      horasMensais: num(t.horasMensais) || num(params.horasMensaisPadraoTurma) || 4,
      matriculados,
      capacidade: cap,
      ocupacaoPct: cap > 0 ? (matriculados / cap) * 100 : null,
      receita,
      custoProfessor: custoProf,
      margemContribuicao: receita - custoProf,
    };
  });
}

/** Custo por aluno = despesa total do mês ÷ alunos ativos. */
export function custoPorAluno(despesaTotal, nAtivos) {
  if (!nAtivos || nAtivos <= 0) return indisponivel('Sem alunos ativos');
  return disponivel(despesaTotal / nAtivos);
}

/** Receita por professor = Σ mensalidade dos alunos ativos de cada professor. */
export function receitaPorProfessor(students = [], mes, ano) {
  const ativos = alunosAtivosNoFim(students, mes, ano);
  const mapa = new Map();
  for (const a of ativos) {
    const chave = (a.teacher || 'Sem professor').trim();
    const atual = mapa.get(chave) || { professor: chave, alunos: 0, receita: 0 };
    atual.alunos += 1;
    atual.receita += num(a.fee);
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((x, y) => y.receita - x.receita);
}

// ───────────────────────── comercial ─────────────────────────

/** Leads captados no mês. */
export function leadsCaptados(leads = [], mes, ano) {
  return leads.filter((l) => noMes(l.createdAt ?? l.date, mes, ano));
}

/**
 * Taxa de conversão lead → matrícula (aproximada): leads marcados como
 * "matriculado" no mês ÷ leads captados no mês. Sem vínculo lead↔aluno no
 * sistema, é o melhor possível.
 */
export function taxaConversaoPct(leads = [], mes, ano) {
  const captados = leadsCaptados(leads, mes, ano);
  if (captados.length === 0) return indisponivel('Nenhum lead captado no mês');
  const convertidos = leads.filter(
    (l) => ['matriculado', 'Matriculado', 'convertido', 'Convertido'].includes(l.status)
      && noMes(l.updatedAt ?? l.createdAt, mes, ano),
  ).length;
  return { ...disponivel((convertidos / captados.length) * 100, { convertidos, captados: captados.length }), aproximado: true };
}

/** Gasto em marketing no mês (despesas da categoria Marketing). */
export function gastoMarketingNoMes(expenses = [], mes, ano) {
  return expenses
    .filter((e) => /marketing|tr[aá]fego|an[uú]ncio|ads/i.test(e.category || ''))
    .filter((e) => (e.month != null && e.year != null ? e.month === mes + 1 && e.year === ano : noMes(e.date, mes, ano)))
    .reduce((s, e) => s + num(e.value), 0);
}

/** CAC = gasto em marketing ÷ novas matrículas. */
export function cac(gastoMarketing, nNovasMatriculas) {
  if (!nNovasMatriculas || nNovasMatriculas <= 0) return indisponivel('Nenhuma matrícula nova no mês');
  return disponivel(gastoMarketing / nNovasMatriculas);
}

/** Relação LTV / CAC. */
export function ltvCac(valorLtv, valorCac) {
  if (valorLtv == null || valorCac == null || valorCac <= 0) {
    return indisponivel('LTV ou CAC indisponível');
  }
  return disponivel(valorLtv / valorCac);
}

// ───────────────────────── saúde geral ─────────────────────────

/** Despesa total do mês. */
export function despesaTotalNoMes(expenses = [], mes, ano) {
  return expenses
    .filter((e) => (e.month != null && e.year != null ? e.month === mes + 1 && e.year === ano : noMes(e.date, mes, ano)))
    .reduce((s, e) => s + num(e.value), 0);
}

/** Despesas do mês agrupadas por categoria, maiores primeiro. */
export function despesaPorCategoriaNoMes(expenses = [], mes, ano) {
  const doMes = expenses.filter(
    (e) => (e.month != null && e.year != null ? e.month === mes + 1 && e.year === ano : noMes(e.date, mes, ano)),
  );
  const mapa = new Map();
  for (const e of doMes) {
    const chave = (e.category || 'Outro').trim() || 'Outro';
    mapa.set(chave, (mapa.get(chave) || 0) + num(e.value));
  }
  return [...mapa.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Despesas do mês agrupadas por `tipoSaida`. Despesa legada sem o campo conta
 * como 'operacional' (não some do cálculo, mas também não vira retirada).
 */
export function despesasPorTipoNoMes(expenses = [], mes, ano) {
  const doMes = expenses.filter(
    (e) => (e.month != null && e.year != null ? e.month === mes + 1 && e.year === ano : noMes(e.date, mes, ano)),
  );
  const somaPor = (tipo) => doMes
    .filter((e) => (e.tipoSaida || 'operacional') === tipo)
    .reduce((s, e) => s + num(e.value), 0);
  return {
    operacional: somaPor('operacional'),
    retiradaSocio: somaPor('retiradaSocio'),
    investimento: somaPor('investimento'),
    imposto: somaPor('imposto'),
  };
}

/**
 * Lucro operacional = receita recebida − despesas operacionais − impostos.
 * Retirada de sócio e investimento NÃO entram — não são custo do negócio,
 * são distribuição de lucro / capex. Misturar os dois foi o que produziu uma
 * leitura de "lucro" desligada da variação real de caixa.
 */
export function lucroOperacionalDoMes(receitaRecebida, porTipo) {
  return receitaRecebida - porTipo.operacional - porTipo.imposto;
}

/** Margem operacional (%) = lucro operacional ÷ receita recebida. */
export function margemOperacionalPct(lucroOperacional, receitaRecebida) {
  if (!receitaRecebida || receitaRecebida <= 0) return indisponivel('Sem receita recebida no período');
  return disponivel((lucroOperacional / receitaRecebida) * 100);
}

/** Alunos ativos no fim do mês sem NENHUMA parcela vencendo no mês (gap de faturamento). */
export function cobrancasNaoEmitidas(students = [], payments = [], mes, ano) {
  const ativos = alunosAtivosNoFim(students, mes, ano);
  const comCobranca = new Set(
    payments.filter((p) => p.status !== 'cancelada' && p.studentId && noMes(p.dueDate, mes, ano)).map((p) => p.studentId),
  );
  const semCobranca = ativos.filter((a) => !comCobranca.has(a.id));
  return { total: semCobranca.length, alunos: semCobranca.map((a) => ({ id: a.id, name: a.name })) };
}

/**
 * Panorama das cobranças do mês: previsto, recebido, quantas pagas/pendentes/
 * atrasadas e quantos alunos ativos ficaram sem cobrança nenhuma no período.
 */
export function resumoCobrancasNoMes(students = [], payments = [], mes, ano) {
  const doMes = payments.filter((p) => p.status !== 'cancelada' && noMes(p.dueDate, mes, ano));
  const pagas = doMes.filter((p) => p.status === 'Pago');
  const pendentes = doMes.filter((p) => p.status !== 'Pago');
  const ref = fimDoMes(mes, ano);
  const atrasadas = doMes.filter((p) => {
    if (saldoParcela(p) <= 0.005) return false;
    const venc = paraData(p.dueDate);
    return venc && venc < ref;
  });
  const naoEmitidas = cobrancasNaoEmitidas(students, payments, mes, ano);
  return {
    emitidas: doMes.length,
    previsto: doMes.reduce((s, p) => s + num(p.valuePlanned), 0),
    recebido: pagas.reduce((s, p) => s + num(p.valuePaid || p.valuePlanned), 0),
    pagasCount: pagas.length,
    pendentesCount: pendentes.length,
    atrasadasCount: atrasadas.length,
    atrasadasValor: atrasadas.reduce((s, p) => s + saldoParcela(p), 0),
    naoEmitidasCount: naoEmitidas.total,
  };
}

/**
 * Saldo em caixa do mês — dado manual (sem integração bancária). `saldosBancarios`
 * é o array de docs de `saldosBancarios` no Firestore: { competencia:'YYYY-MM',
 * saldoInicial, saldoFinal }. É o KPI que responde "sobrevivo?" — nunca deriva
 * de payments/expenses, então indisponível até alguém preencher.
 */
export function saldoCaixaDoMes(saldosBancarios = [], mes, ano) {
  const id = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const reg = saldosBancarios.find((s) => s.competencia === id);
  if (!reg || reg.saldoInicial == null || reg.saldoFinal == null) {
    return indisponivel('Saldo bancário não registrado neste mês');
  }
  return disponivel(reg.saldoFinal, {
    saldoInicial: num(reg.saldoInicial),
    saldoFinal: num(reg.saldoFinal),
    variacao: num(reg.saldoFinal) - num(reg.saldoInicial),
  });
}

/** Mesma ideia para o trimestre: saldo inicial do 1º mês → saldo final do 3º. */
export function saldoCaixaDoTrimestre(saldosBancarios = [], tri, ano) {
  const primeiro = saldoCaixaDoMes(saldosBancarios, tri * 3, ano);
  const ultimo = saldoCaixaDoMes(saldosBancarios, tri * 3 + 2, ano);
  if (!primeiro.disponivel || !ultimo.disponivel) {
    return indisponivel('Saldo bancário incompleto no trimestre (falta algum mês)');
  }
  return disponivel(ultimo.saldoFinal, {
    saldoInicial: primeiro.saldoInicial,
    saldoFinal: ultimo.saldoFinal,
    variacao: ultimo.saldoFinal - primeiro.saldoInicial,
  });
}

/**
 * Custo fixo do mês. Depende da flag `recorrente` nas despesas:
 *  - se alguma despesa do mês tem `recorrente` definido → soma só as recorrentes;
 *  - senão → indisponível, mas devolve um `proxy` (Aluguel + Salários + Serviços).
 */
export function custoFixoNoMes(expenses = [], mes, ano) {
  const doMes = expenses.filter(
    (e) => (e.month != null && e.year != null ? e.month === mes + 1 && e.year === ano : noMes(e.date, mes, ano)),
  );
  const temFlag = doMes.some((e) => typeof e.recorrente === 'boolean');
  const proxy = doMes
    .filter((e) => /aluguel|sal[aá]rio|servi[cç]o/i.test(e.category || ''))
    .reduce((s, e) => s + num(e.value), 0);

  if (!temFlag) {
    return { ...indisponivel('Despesas ainda não classificadas como recorrentes'), proxy };
  }
  const fixo = doMes.filter((e) => e.recorrente === true).reduce((s, e) => s + num(e.value), 0);
  return disponivel(fixo, { proxy });
}

/**
 * Ponto de equilíbrio: nº de alunos (na mensalidade média praticada) que cobre
 * o custo fixo do mês.
 */
export function pontoEquilibrio(custoFixo, mensalidadeMedia) {
  if (custoFixo == null) return indisponivel('Custo fixo indisponível');
  if (!mensalidadeMedia || mensalidadeMedia <= 0) return indisponivel('Sem mensalidade média (nenhum aluno ativo)');
  return disponivel(Math.ceil(custoFixo / mensalidadeMedia));
}

/** Resultado do mês = receita recebida − despesa total. */
export function resultadoDoMes(receitaRecebida, despesaTotal) {
  return receitaRecebida - despesaTotal;
}

// ───────────────────────── projeção (tendência linear simples) ─────────────────────────

/** Regressão linear simples: recebe [y0, y1, ...] e devolve {a, b} de y = a·x + b. */
function regressaoLinear(valores) {
  const n = valores.length;
  if (n < 2) return { a: 0, b: n === 1 ? valores[0] : 0 };
  const sx = (n * (n - 1)) / 2;
  const sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  const sy = valores.reduce((s, v) => s + v, 0);
  const sxy = valores.reduce((s, v, i) => s + i * v, 0);
  const den = n * sxx - sx * sx || 1;
  const a = (n * sxy - sx * sy) / den;
  const b = (sy - a * sx) / n;
  return { a, b };
}

/**
 * Projeção simples dos próximos `horizonte` meses. SEM sazonalidade (só ~1 ano
 * de dados não separa sinal de ruído). Combina:
 *  - receita: tendência linear dos últimos `janela` meses de receita recebida
 *  - despesa: média das despesas recorrentes conhecidas + tendência da parte variável
 * Devolve 3 cenários (conservador / base / otimista) a partir do desvio histórico.
 *
 * @param {object} dados { payments, expenses, mes, ano, janela=6, horizonte=3 }
 */
export function projecaoSimples({ payments = [], expenses = [], mes, ano, janela = 6, horizonte = 3 }) {
  const histReceita = [];
  const histDespesa = [];
  for (let i = janela - 1; i >= 0; i -= 1) {
    const d = new Date(ano, mes - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    histReceita.push(receitaRecebidaNoMes(payments, m, y));
    histDespesa.push(despesaTotalNoMes(expenses, m, y));
  }

  const comDados = histReceita.filter((v) => v > 0).length;
  if (comDados < 3) {
    return { disponivel: false, motivo: 'Menos de 3 meses com receita — projeção não confiável', historico: { receita: histReceita, despesa: histDespesa } };
  }

  const { a: aR, b: bR } = regressaoLinear(histReceita);
  const { a: aD, b: bD } = regressaoLinear(histDespesa);

  // erro-padrão dos resíduos da receita → largura dos cenários
  const previstoNoHist = histReceita.map((_, i) => aR * i + bR);
  const resid = histReceita.map((v, i) => v - previstoNoHist[i]);
  const sd = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / Math.max(1, resid.length - 1));

  const meses = [];
  for (let k = 1; k <= horizonte; k += 1) {
    const idx = janela - 1 + k;
    const d = new Date(ano, mes + k, 1);
    const receitaBase = Math.max(0, aR * idx + bR);
    const despesaBase = Math.max(0, aD * idx + bD);
    meses.push({
      rotulo: rotuloMes(d.getMonth(), d.getFullYear()),
      receita: {
        conservador: Math.max(0, receitaBase - sd),
        base: receitaBase,
        otimista: receitaBase + sd,
      },
      despesa: despesaBase,
      resultado: {
        conservador: receitaBase - sd - despesaBase,
        base: receitaBase - despesaBase,
        otimista: receitaBase + sd - despesaBase,
      },
    });
  }

  return {
    disponivel: true,
    janela,
    horizonte,
    tendenciaReceitaMes: aR,
    historico: { receita: histReceita, despesa: histDespesa },
    meses,
    nota: 'Tendência linear dos últimos meses, sem ajuste sazonal. Cenários = base ± 1 desvio-padrão dos resíduos.',
  };
}

// ───────────────────────── índice de saúde do negócio ─────────────────────────

/**
 * Índice de saúde do negócio (0-100): 4 fatores de 25 pontos cada, todos na
 * mesma fonte de verdade das metas (`params`) — não é um número solto, é a
 * síntese dos mesmos KPIs que já aparecem no relatório.
 *  - Inadimplência do período (25 pts, quanto menor melhor)
 *  - Churn do período (25 pts, quanto menor melhor)
 *  - Margem operacional (25 pts, escala 0%→0pt até 25%→25pt)
 *  - Ocupação média das turmas (25 pts, escala 0%→0pt até meta→25pt)
 * Fator sem dado no período não pontua nem penaliza — o índice reescala
 * sobre os fatores disponíveis (nunca "castiga" por falta de dado).
 */
export function indiceSaudeNegocio({ atual, detTurmas = [] }, params = PARAMETROS_PADRAO) {
  const fatores = [];

  const deQuantoMenorMelhor = (valor, meta, disponivel, nome) => {
    if (!disponivel) return null;
    const pts = valor <= meta ? 25 : Math.max(0, 25 * (meta / valor));
    fatores.push({ nome, pts, valor, meta, bom: valor <= meta });
    return pts;
  };
  const deEscalaAteAlvo = (valor, alvo, disponivel, nome) => {
    if (!disponivel) return null;
    const pts = Math.max(0, Math.min(25, (valor / alvo) * 25));
    fatores.push({ nome, pts, valor, meta: alvo, bom: valor >= alvo });
    return pts;
  };

  deQuantoMenorMelhor(atual.inadimplenciaMes.pct, params.metaInadimplenciaPct, atual.inadimplenciaMes.disponivel, 'Inadimplência');
  deQuantoMenorMelhor(atual.churnPct.valor, params.metaChurnPct, atual.churnPct.disponivel, 'Churn');
  deEscalaAteAlvo(atual.margemOperacional.valor, 25, atual.margemOperacional.disponivel, 'Margem operacional');
  const comOcup = (detTurmas || []).filter((t) => t.ocupacaoPct != null);
  const ocupMedia = comOcup.length ? comOcup.reduce((s, t) => s + t.ocupacaoPct, 0) / comOcup.length : null;
  deEscalaAteAlvo(ocupMedia, params.metaOcupacaoPct, ocupMedia != null, 'Ocupação das turmas');

  if (fatores.length === 0) {
    return { valor: null, disponivel: false, motivo: 'Sem dados suficientes no período', fatores: [] };
  }
  // reescala: soma dos pontos obtidos ÷ máximo possível dos fatores disponíveis
  const maxPossivel = fatores.length * 25;
  const obtido = fatores.reduce((s, f) => s + f.pts, 0);
  const valor = (obtido / maxPossivel) * 100;
  const nivel = valor >= 80 ? 'bom' : valor >= 50 ? 'atencao' : 'critico';
  const pior = [...fatores].sort((a, b) => a.pts - b.pts)[0];
  return {
    valor, disponivel: true, nivel, fatores,
    motivo: pior && !pior.bom ? `Fator mais fraco: ${pior.nome}` : 'Todos os fatores dentro da meta',
  };
}

// ───────────────────────── pontos de melhoria (despesas) ─────────────────────────

/** 2-4 observações rápidas sobre despesas do período, geradas por regra (não IA). */
export function pontosDeMelhoriaDespesas(relatorio) {
  const a = relatorio.atual;
  const v = relatorio.variacoes;
  const pontos = [];

  if (a.despesaTotal > 0) {
    const maiorCategoria = (relatorio.despesasPorCategoria || [])[0];
    if (maiorCategoria) {
      const pctDoTotal = (maiorCategoria.valor / a.despesaTotal) * 100;
      pontos.push(`"${maiorCategoria.categoria}" é a maior categoria: ${pctDoTotal.toFixed(0)}% da despesa do período (${formatoBRL(maiorCategoria.valor)}).`);
    }
  }
  if (v.despesaTotal?.vsMesAnterior?.disponivel && v.despesaTotal.vsMesAnterior.pct > 15) {
    pontos.push(`Despesa total subiu ${v.despesaTotal.vsMesAnterior.pct.toFixed(0)}% vs. o período anterior — vale checar o que mudou.`);
  }
  if (a.despesaTotal > 0) {
    const naoOperacional = (a.despesasPorTipo.retiradaSocio || 0) + (a.despesasPorTipo.investimento || 0);
    const pctNaoOp = (naoOperacional / (a.despesaTotal)) * 100;
    if (pctNaoOp > 25) {
      pontos.push(`Retirada de sócio + investimento somam ${pctNaoOp.toFixed(0)}% do total de saídas do período — fora do custo operacional, mas pesa no caixa.`);
    }
  }
  if (a.custoFixo.disponivel && a.pontoEquilibrio.disponivel) {
    pontos.push(`Ponto de equilíbrio: ${Math.round(a.pontoEquilibrio.valor)} aluno(s) na mensalidade média cobrem o custo fixo do período.`);
  }
  if (pontos.length === 0) {
    pontos.push('Sem observações automáticas — despesas dentro do padrão do período.');
  }
  return pontos.slice(0, 4);
}

// ───────────────────────── plano de ação (deriva das metas) ─────────────────────────

/**
 * Lista priorizada de ações a partir dos KPIs do período vs. as metas de
 * `params`, e do índice de saúde do negócio.
 *
 * @param {object} relatorio  saída de montarRelatorioMensal / montarRelatorioTrimestral
 * @returns {Array<{prioridade, area, acao, porque}>}
 */
export function planoDeAcao(relatorio, params = PARAMETROS_PADRAO) {
  const a = relatorio.atual;
  const acoes = [];

  // "Registrar saldo" fica de fora do plano de ação por ora (dado ainda não
  // exposto como card — decisão do Ruan em 11/09/2026); só a contradição real
  // (lucro positivo com caixa caindo) vira ação, quando o dado existe.
  if (a.saldoCaixa?.disponivel && a.saldoCaixa.variacao < -0.005 && a.lucroOperacional > 0) {
    acoes.push({
      prioridade: 1,
      area: 'Caixa',
      acao: 'Investigar a diferença entre lucro operacional e queda de caixa: checar retiradas, investimentos e parcelas previstas não recebidas.',
      porque: `Lucro de ${formatoBRL(a.lucroOperacional)}, mas caixa caiu ${formatoBRL(Math.abs(a.saldoCaixa.variacao))}.`,
    });
  }
  if (a.inadimplenciaMes.disponivel && a.inadimplenciaMes.pct > params.metaInadimplenciaPct) {
    acoes.push({
      prioridade: 1,
      area: 'Inadimplência',
      acao: `Acionar cobrança dos ${(relatorio.parcelasInadimplentes || []).length} inadimplentes, priorizando os 90+ dias (${formatoBRL(a.aging?.['90+'] || 0)}).`,
      porque: `${a.inadimplenciaMes.pct.toFixed(1)}% da receita prevista em atraso (meta ${params.metaInadimplenciaPct}%).`,
    });
  }
  if (a.churnPct.disponivel && a.churnPct.valor > params.metaChurnPct) {
    acoes.push({
      prioridade: 1,
      area: 'Retenção',
      acao: 'Entrevistar os alunos que cancelaram no período e mapear motivo; criar rotina de contato nos primeiros 60 dias.',
      porque: `Churn ${a.churnPct.valor.toFixed(1)}% (meta ${params.metaChurnPct}%).`,
    });
  }
  if (a.resultado < 0) {
    acoes.push({
      prioridade: 1,
      area: 'Financeiro',
      acao: 'Revisar despesas do mês e renegociar as recorrentes; segurar investimentos não essenciais.',
      porque: `Resultado negativo: ${formatoBRL(a.resultado)}.`,
    });
  }
  const turmasBaixa = (relatorio.detalhamentoTurmas || []).filter((t) => t.ocupacaoPct != null && t.ocupacaoPct < params.metaOcupacaoPct);
  if (turmasBaixa.length > 0) {
    acoes.push({
      prioridade: 2,
      area: 'Ocupação',
      acao: `Remanejar/agrupar ${turmasBaixa.length} turma(s) abaixo de ${params.metaOcupacaoPct}% de ocupação ou abrir vagas à venda.`,
      porque: `Margem de contribuição achatada nessas turmas.`,
    });
  }
  if (a.ltvCac.disponivel && a.ltvCac.valor < 3) {
    acoes.push({
      prioridade: 2,
      area: 'Aquisição',
      acao: 'Rever canais de captação: cortar os de maior CAC, reforçar indicação de alunos atuais.',
      porque: `LTV/CAC ${a.ltvCac.valor.toFixed(1)}x (saudável ≥ 3x).`,
    });
  }
  if (a.taxaConversao.disponivel && a.taxaConversao.valor < 20) {
    acoes.push({
      prioridade: 3,
      area: 'Comercial',
      acao: 'Padronizar follow-up de leads (cadência de contato) e registrar origem do lead para medir canal.',
      porque: `Conversão de leads ${a.taxaConversao.valor.toFixed(1)}% (referência 20–30%).`,
    });
  }

  if (acoes.length === 0) {
    acoes.push({
      prioridade: 3,
      area: 'Manutenção',
      acao: 'Indicadores dentro das metas. Focar em crescer base ativa sem perder margem.',
      porque: 'Nenhum KPI fora do limite configurado.',
    });
  }

  return acoes.sort((x, y) => x.prioridade - y.prioridade).slice(0, 5);
}

// ───────────────────────── montagem do relatório ─────────────────────────

/**
 * Monta o pacote completo de KPIs de um mês, já com a variação vs. mês anterior
 * e vs. mesmo mês do ano passado, e a lista de alertas automáticos.
 *
 * @param {object} dados
 * @param {Array} dados.students
 * @param {Array} dados.payments
 * @param {Array} dados.expenses
 * @param {Array} dados.leads
 * @param {Array} [dados.turmas]
 * @param {Array} [dados.vendas]
 * @param {number} dados.mes  0-11
 * @param {number} dados.ano
 * @param {object} [dados.params]  parâmetros de negócio (ver config/parametros.js)
 * @param {Date}   [dados.hoje]    referência p/ coorte (default: agora)
 */
/**
 * Pacote de KPIs de UM mês (a "fatia" que vai em `.atual` / `.anterior`).
 * Exportada para o relatório trimestral reaproveitar a mesma forma.
 */
export function calcularMes({ students = [], payments = [], expenses = [], leads = [], vendas = [], saldosBancarios = [] }, m, y) {
  const ativosFim = alunosAtivosNoFim(students, m, y);
  const nAtivos = ativosFim.length;
  const recRecebida = receitaRecebidaNoMes(payments, m, y);
  const recNaoRec = receitaNaoRecorrenteNoMes(vendas, m, y);
  const receitaTotal = recRecebida + (recNaoRec.valor || 0);
  const despTotal = despesaTotalNoMes(expenses, m, y);
  const mrrRes = mrr(students, m, y);
  const ticket = ticketMedioPorAluno(receitaTotal, nAtivos);
  // Mensalidade média praticada = MRR ÷ alunos ativos.
  const mensalidadeMedia = mrrRes.disponivel && nAtivos > 0 ? mrrRes.valor / nAtivos : null;
  const churn = churnMensalPct(students, m, y);
  const inadMes = inadimplenciaDoMes(payments, m, y);
  const novas = novasMatriculas(students, m, y).length;
  const gastoMkt = gastoMarketingNoMes(expenses, m, y);
  const cacRes = cac(gastoMkt, novas);
  const ltvRes = ltv(ticket.valor, churn.valor);
  const porTipoDespesa = despesasPorTipoNoMes(expenses, m, y);
  const lucroOp = lucroOperacionalDoMes(recRecebida, porTipoDespesa);
  const cobrancas = resumoCobrancasNoMes(students, payments, m, y);

  const temDados = nAtivos > 0
    || payments.some((p) => noMes(p.dueDate, m, y))
    || expenses.some((e) => (e.month != null && e.year != null ? e.month === m + 1 && e.year === y : noMes(e.date, m, y)))
    || leads.some((l) => noMes(l.createdAt ?? l.date, m, y));

  return {
    periodo: { mes: m, ano: y, rotulo: rotuloMes(m, y) },
    temDados,
    // receita
    mrr: mrrRes,
    receitaRecebida: recRecebida,
    receitaPrevista: receitaPrevistaNoMes(payments, m, y),
    receitaNaoRecorrente: recNaoRec,
    receitaTotal,
    ticketMedio: ticket,
    mensalidadeMedia: mensalidadeMedia == null ? indisponivel('Sem alunos ativos') : disponivel(mensalidadeMedia),
    mensalidadePorCurso: mensalidadePorCurso(students, m, y),
    // alunos
    alunosAtivos: nAtivos,
    novasMatriculas: novas,
    cancelamentos: cancelamentosNoMes(students, m, y).length,
    churnPct: churn,
    ltv: ltvRes,
    // inadimplência
    inadimplenciaMes: inadMes,
    inadimplenciaCarteira: inadimplenciaValor(payments, fimDoMes(m, y)),
    aging: agingInadimplencia(payments, fimDoMes(m, y)),
    taxaRecuperacao: taxaRecuperacao(payments, m, y),
    // operacional
    custoPorAluno: custoPorAluno(despTotal, nAtivos),
    // comercial
    leadsCaptados: leadsCaptados(leads, m, y).length,
    taxaConversao: taxaConversaoPct(leads, m, y),
    cac: cacRes,
    ltvCac: ltvCac(ltvRes.valor, cacRes.valor),
    // saúde
    despesaTotal: despTotal,
    despesasPorTipo: porTipoDespesa,
    lucroOperacional: lucroOp,
    margemOperacional: margemOperacionalPct(lucroOp, recRecebida),
    retiradaSocio: porTipoDespesa.retiradaSocio,
    custoFixo: custoFixoNoMes(expenses, m, y),
    pontoEquilibrio: (() => {
      const cf = custoFixoNoMes(expenses, m, y);
      const base = cf.disponivel ? cf.valor : cf.proxy;
      return pontoEquilibrio(base ?? null, mensalidadeMedia);
    })(),
    resultado: resultadoDoMes(recRecebida, despTotal),
    // cobranças (previsto/recebido/emitidas/não emitidas)
    cobrancas,
    // caixa — dado manual, nunca derivado de payments/expenses
    saldoCaixa: saldoCaixaDoMes(saldosBancarios, m, y),
  };
}

export function montarRelatorioMensal(dados) {
  const {
    students = [], payments = [], expenses = [], leads = [],
    turmas = [], vendas = [], saldosBancarios = [],
    mes, ano,
    params = PARAMETROS_PADRAO,
    hoje = new Date(),
  } = dados;

  const calcMes = (m, y) => calcularMes({ students, payments, expenses, leads, vendas, saldosBancarios }, m, y);

  const atual = calcMes(mes, ano);
  const { mes: pm, ano: pa } = mesAnterior(mes, ano);
  const anterior = calcMes(pm, pa);
  const { mes: ym, ano: ya } = mesmoMesAnoAnterior(mes, ano);
  const anoPassado = calcMes(ym, ya);

  // valor bruto de cada métrica p/ comparar (null quando indisponível)
  const bruto = (obj) => (obj && typeof obj === 'object' && 'valor' in obj ? obj.valor : obj);
  const comparar = (chave) => ({
    vsMesAnterior: variacao(bruto(atual[chave]), bruto(anterior[chave])),
    vsAnoPassado: variacao(bruto(atual[chave]), bruto(anoPassado[chave])),
  });

  const variacoes = {};
  for (const chave of [
    'mrr', 'receitaRecebida', 'receitaTotal', 'ticketMedio', 'mensalidadeMedia',
    'alunosAtivos', 'novasMatriculas', 'cancelamentos', 'churnPct', 'ltv',
    'inadimplenciaCarteira', 'taxaRecuperacao',
    'custoPorAluno', 'leadsCaptados', 'taxaConversao', 'cac', 'ltvCac',
    'despesaTotal', 'resultado', 'lucroOperacional', 'margemOperacional', 'saldoCaixa',
  ]) {
    variacoes[chave] = comparar(chave);
  }
  variacoes.inadimplenciaMes = {
    vsMesAnterior: variacao(atual.inadimplenciaMes.pct, anterior.inadimplenciaMes.pct),
    vsAnoPassado: variacao(atual.inadimplenciaMes.pct, anoPassado.inadimplenciaMes.pct),
  };

  const detTurmas = detalhamentoPorTurma(turmas, students, mes, ano, params);
  const ativosById = new Map(alunosAtivosNoFim(students, mes, ano).map((a) => [a.id, a]));

  const alertas = gerarAlertas({ atual, detTurmas, params, ativosById, turmas });
  const indiceSaude = indiceSaudeNegocio({ atual, detTurmas }, params);

  return {
    periodo: { mes, ano, rotulo: rotuloMes(mes, ano) },
    params,
    atual,
    anterior,
    anoPassado,
    variacoes,
    coorte: retencaoPorSafra(students, mes, ano, 6, hoje),
    detalhamentoTurmas: detTurmas,
    receitaPorProfessor: receitaPorProfessor(students, mes, ano),
    despesasPorCategoria: despesaPorCategoriaNoMes(expenses, mes, ano),
    indiceSaude,
    parcelasInadimplentes: parcelasVencidas(payments, fimDoMes(mes, ano))
      .map((p) => {
        const venc = paraData(p.dueDate);
        return {
          studentName: p.studentName || p.studentId || '—',
          dueDate: p.dueDate,
          diasAtraso: Math.floor((fimDoMes(mes, ano) - venc) / MS_DIA),
          saldo: saldoParcela(p),
        };
      })
      .sort((a, b) => b.diasAtraso - a.diasAtraso),
    alertas,
  };
}

// ───────────────────────── relatório trimestral ─────────────────────────

const QUARTER_ROTULO = ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'];
const QUARTER_FAIXA = ['Jan–Mar', 'Abr–Jun', 'Jul–Set', 'Out–Dez'];

/** {trimestre, ano} do trimestre anterior. */
function trimestreAnterior(tri, ano) {
  return tri === 0 ? { trimestre: 3, ano: ano - 1 } : { trimestre: tri - 1, ano };
}

/**
 * Agrega 3 meses num objeto com a MESMA forma de `calcularMes` (`.atual`).
 * Fluxos (receita, despesa, matrículas, leads) = soma dos 3 meses.
 * Estoques (MRR, alunos ativos, carteira vencida, aging) = snapshot no fim do trimestre.
 * Taxas (churn, ticket, inadimplência, CAC, LTV) = recalculadas na base do trimestre.
 */
export function agregarTrimestre(dados, tri, ano) {
  const { students = [], payments = [], expenses = [], leads = [], saldosBancarios = [] } = dados;
  const meses = [0, 1, 2].map((k) => calcularMes(dados, tri * 3 + k, ano));
  const fim = meses[2];
  const mesFim = tri * 3 + 2;
  const refFim = fimDoMes(mesFim, ano);

  const soma = (sel) => meses.reduce((s, m) => s + (sel(m) || 0), 0);
  const nAtivos = fim.alunosAtivos;

  const receitaRecebida = soma((m) => m.receitaRecebida);
  const receitaNaoRecValor = soma((m) => m.receitaNaoRecorrente.valor);
  const receitaTotal = receitaRecebida + receitaNaoRecValor;
  const despesaTotal = soma((m) => m.despesaTotal);
  const novas = soma((m) => m.novasMatriculas);
  const cancel = soma((m) => m.cancelamentos);

  // churn do trimestre: cancelamentos no tri ÷ ativos no início do tri
  const baseInicio = alunosAtivosNoInicio(students, tri * 3, ano).length;
  const churnPct = baseInicio > 0
    ? disponivel((cancel / baseInicio) * 100, { cancelados: cancel, base: baseInicio })
    : indisponivel('Nenhum aluno ativo no início do trimestre');

  const ticket = ticketMedioPorAluno(receitaTotal, nAtivos);
  const ltvRes = ltv(ticket.valor, churnPct.valor);

  // inadimplência do trimestre: vencido das parcelas do tri ÷ previsto do tri
  const previstoTri = soma((m) => m.receitaPrevista);
  const vencidoTri = soma((m) => m.inadimplenciaMes.valor);
  const inadimplenciaTri = {
    valor: vencidoTri,
    previsto: previstoTri,
    pct: previstoTri > 0 ? (vencidoTri / previstoTri) * 100 : null,
    disponivel: previstoTri > 0,
    motivo: previstoTri > 0 ? undefined : 'Sem parcelas previstas no trimestre',
  };

  const gastoMkt = soma((m) => gastoMarketingNoMes(expenses, m.periodo.mes, m.periodo.ano));
  const cacRes = cac(gastoMkt, novas);
  const custoFixo = { ...disponivel(soma((m) => (m.custoFixo.disponivel ? m.custoFixo.valor : m.custoFixo.proxy || 0))) };
  const mensalidadeMedia = fim.mrr.disponivel && nAtivos > 0 ? fim.mrr.valor / nAtivos : null;

  return {
    periodo: { trimestre: tri, ano, rotulo: `${QUARTER_ROTULO[tri]} ${ano}`, faixa: QUARTER_FAIXA[tri] },
    temDados: meses.some((m) => m.temDados),
    meses,
    // receita (fluxo)
    mrr: fim.mrr, // estoque
    receitaRecebida,
    receitaPrevista: previstoTri,
    receitaNaoRecorrente: { ...disponivel(receitaNaoRecValor), inclui: 'material, uniforme e avulsos' },
    receitaTotal,
    ticketMedio: ticket,
    mensalidadeMedia: mensalidadeMedia == null ? indisponivel('Sem alunos ativos') : disponivel(mensalidadeMedia),
    mensalidadePorCurso: fim.mensalidadePorCurso,
    // alunos
    alunosAtivos: nAtivos,
    novasMatriculas: novas,
    cancelamentos: cancel,
    churnPct,
    ltv: ltvRes,
    // inadimplência
    inadimplenciaMes: inadimplenciaTri, // "do trimestre"
    inadimplenciaCarteira: inadimplenciaValor(payments, refFim),
    aging: agingInadimplencia(payments, refFim),
    taxaRecuperacao: (() => {
      const recuperado = meses.reduce((s, m) => s + (m.taxaRecuperacao.recuperado || 0), 0);
      const { mes: pm, ano: pa } = mesAnterior(tri * 3, ano);
      const carteiraAbertura = inadimplenciaValor(payments, fimDoMes(pm, pa));
      if (carteiraAbertura <= 0.005) return { ...indisponivel('Sem carteira vencida no início do trimestre'), recuperado };
      return disponivel((recuperado / carteiraAbertura) * 100, { recuperado, carteiraAbertura });
    })(),
    // operacional
    custoPorAluno: custoPorAluno(despesaTotal, nAtivos),
    // comercial
    leadsCaptados: soma((m) => m.leadsCaptados),
    taxaConversao: (() => {
      const captados = soma((m) => leadsCaptados(leads, m.periodo.mes, m.periodo.ano).length);
      if (captados === 0) return indisponivel('Nenhum lead captado no trimestre');
      const convertidos = [0, 1, 2].reduce((s, k) => {
        const mm = tri * 3 + k;
        return s + leads.filter((l) => ['matriculado', 'Matriculado', 'convertido', 'Convertido'].includes(l.status)
          && noMes(l.updatedAt ?? l.createdAt, mm, ano)).length;
      }, 0);
      return { ...disponivel((convertidos / captados) * 100, { convertidos, captados }), aproximado: true };
    })(),
    cac: cacRes,
    ltvCac: ltvCac(ltvRes.valor, cacRes.valor),
    // saúde
    despesaTotal,
    despesasPorTipo: {
      operacional: soma((m) => m.despesasPorTipo.operacional),
      retiradaSocio: soma((m) => m.despesasPorTipo.retiradaSocio),
      investimento: soma((m) => m.despesasPorTipo.investimento),
      imposto: soma((m) => m.despesasPorTipo.imposto),
    },
    lucroOperacional: soma((m) => m.lucroOperacional),
    margemOperacional: margemOperacionalPct(soma((m) => m.lucroOperacional), receitaRecebida),
    retiradaSocio: soma((m) => m.retiradaSocio),
    custoFixo,
    pontoEquilibrio: pontoEquilibrio(custoFixo.valor ?? null, mensalidadeMedia),
    resultado: receitaRecebida - despesaTotal,
    // cobranças do trimestre = soma dos 3 meses
    cobrancas: {
      emitidas: soma((m) => m.cobrancas.emitidas),
      previsto: soma((m) => m.cobrancas.previsto),
      recebido: soma((m) => m.cobrancas.recebido),
      pagasCount: soma((m) => m.cobrancas.pagasCount),
      pendentesCount: soma((m) => m.cobrancas.pendentesCount),
      atrasadasCount: soma((m) => m.cobrancas.atrasadasCount),
      atrasadasValor: soma((m) => m.cobrancas.atrasadasValor),
      naoEmitidasCount: soma((m) => m.cobrancas.naoEmitidasCount),
    },
    // caixa: inicial do 1º mês → final do 3º
    saldoCaixa: saldoCaixaDoTrimestre(saldosBancarios, tri, ano),
  };
}

/**
 * Pacote completo do relatório trimestral (mesma casca do mensal).
 * @param {object} dados students, payments, expenses, leads, turmas, vendas, trimestre (0-3), ano, params?, hoje?
 */
export function montarRelatorioTrimestral(dados) {
  const {
    students = [], payments = [], expenses = [], leads = [],
    turmas = [], vendas = [], saldosBancarios = [],
    trimestre, ano,
    params = PARAMETROS_PADRAO,
    hoje = new Date(),
  } = dados;
  const base = { students, payments, expenses, leads, vendas, saldosBancarios };

  const atual = agregarTrimestre(base, trimestre, ano);
  const { trimestre: pt, ano: pa } = trimestreAnterior(trimestre, ano);
  const anterior = agregarTrimestre(base, pt, pa);
  const anoPassado = agregarTrimestre(base, trimestre, ano - 1);

  const bruto = (o) => (o && typeof o === 'object' && 'valor' in o ? o.valor : o);
  const comparar = (chave) => ({
    vsMesAnterior: variacao(bruto(atual[chave]), bruto(anterior[chave])),
    vsAnoPassado: variacao(bruto(atual[chave]), bruto(anoPassado[chave])),
  });
  const variacoes = {};
  for (const chave of [
    'mrr', 'receitaRecebida', 'receitaTotal', 'ticketMedio', 'mensalidadeMedia',
    'alunosAtivos', 'novasMatriculas', 'cancelamentos', 'churnPct', 'ltv',
    'inadimplenciaCarteira', 'taxaRecuperacao',
    'custoPorAluno', 'leadsCaptados', 'taxaConversao', 'cac', 'ltvCac',
    'despesaTotal', 'resultado', 'lucroOperacional', 'margemOperacional', 'saldoCaixa',
  ]) {
    variacoes[chave] = comparar(chave);
  }
  variacoes.inadimplenciaMes = {
    vsMesAnterior: variacao(atual.inadimplenciaMes.pct, anterior.inadimplenciaMes.pct),
    vsAnoPassado: variacao(atual.inadimplenciaMes.pct, anoPassado.inadimplenciaMes.pct),
  };

  const mesFim = trimestre * 3 + 2;
  const refFim = fimDoMes(mesFim, ano);
  const detTurmas = detalhamentoPorTurma(turmas, students, mesFim, ano, params);
  const ativosById = new Map(alunosAtivosNoFim(students, mesFim, ano).map((a) => [a.id, a]));
  const alertas = gerarAlertas({ atual, detTurmas, params, ativosById, turmas, periodo: 'trimestre' });
  const indiceSaude = indiceSaudeNegocio({ atual, detTurmas }, params);

  // despesas por categoria do trimestre = soma dos 3 meses
  const despesasPorCategoria = (() => {
    const mapa = new Map();
    for (let k = 0; k < 3; k += 1) {
      for (const { categoria, valor } of despesaPorCategoriaNoMes(expenses, trimestre * 3 + k, ano)) {
        mapa.set(categoria, (mapa.get(categoria) || 0) + valor);
      }
    }
    return [...mapa.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  })();

  return {
    periodo: atual.periodo,
    params,
    atual,
    anterior,
    anoPassado,
    variacoes,
    coorte: retencaoPorSafra(students, mesFim, ano, 6, hoje),
    detalhamentoTurmas: detTurmas,
    receitaPorProfessor: receitaPorProfessor(students, mesFim, ano),
    despesasPorCategoria,
    indiceSaude,
    parcelasInadimplentes: parcelasVencidas(payments, refFim)
      .map((p) => {
        const venc = paraData(p.dueDate);
        return {
          studentName: p.studentName || p.studentId || '—',
          dueDate: p.dueDate,
          diasAtraso: Math.floor((refFim - venc) / MS_DIA),
          saldo: saldoParcela(p),
        };
      })
      .sort((a, b) => b.diasAtraso - a.diasAtraso),
    alertas,
  };
}

/** Alertas automáticos para o sumário executivo. */
export function gerarAlertas({ atual, detTurmas, params, ativosById, periodo = 'mês' }) {
  const alertas = [];

  // Lucro contábil e variação real de caixa são coisas diferentes — este é o
  // alerta que existe pra nunca mais acontecer o que aconteceu em agosto/2026:
  // "lucro" de R$16k anunciado num mês em que a conta caiu. O relatório não
  // expõe "saldo em caixa" como card (decisão do Ruan em 11/09/2026), mas o
  // alerta continua ativo — só dispara quando há de fato uma contradição.
  if (atual.saldoCaixa?.disponivel && atual.saldoCaixa.variacao < -0.005 && atual.lucroOperacional > 0) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Lucro no papel, caixa caindo',
      detalhe: `Lucro operacional de ${formatoBRL(atual.lucroOperacional)} no ${periodo}, mas o saldo em caixa caiu ${formatoBRL(Math.abs(atual.saldoCaixa.variacao))} (${formatoBRL(atual.saldoCaixa.saldoInicial)} → ${formatoBRL(atual.saldoCaixa.saldoFinal)}). Prováveis causas: retirada de sócio, investimento, ou parcelas previstas que não entraram.`,
    });
  }

  if (atual.churnPct.disponivel && atual.churnPct.valor > params.metaChurnPct) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Churn acima do limite',
      detalhe: `${atual.churnPct.valor.toFixed(1)}% no ${periodo} (meta: ${params.metaChurnPct}%). ${atual.churnPct.cancelados} cancelamento(s) sobre ${atual.churnPct.base} alunos.`,
    });
  }

  if (atual.inadimplenciaMes.disponivel && atual.inadimplenciaMes.pct > params.metaInadimplenciaPct) {
    alertas.push({
      nivel: 'critico',
      titulo: 'Inadimplência acima da meta',
      detalhe: `${atual.inadimplenciaMes.pct.toFixed(1)}% da receita prevista do ${periodo} em atraso (meta: ${params.metaInadimplenciaPct}%). Carteira vencida total: ${formatoBRL(atual.inadimplenciaCarteira)}.`,
    });
  }

  const turmasBaixaOcup = (detTurmas || []).filter(
    (t) => t.ocupacaoPct != null && t.ocupacaoPct < params.metaOcupacaoPct,
  );
  if (turmasBaixaOcup.length > 0) {
    const pior = [...turmasBaixaOcup].sort((a, b) => a.ocupacaoPct - b.ocupacaoPct)[0];
    alertas.push({
      nivel: 'atencao',
      titulo: `${turmasBaixaOcup.length} turma(s) com ocupação abaixo de ${params.metaOcupacaoPct}%`,
      detalhe: `Pior caso: ${pior.nome} com ${pior.ocupacaoPct.toFixed(0)}% (${pior.matriculados}/${pior.capacidade}).`,
    });
  }

  if (atual.resultado < 0) {
    alertas.push({
      nivel: 'critico',
      titulo: `Resultado negativo no ${periodo}`,
      detalhe: `Despesas superaram a receita recebida em ${formatoBRL(Math.abs(atual.resultado))}.`,
    });
  }

  if (atual.ltvCac.disponivel && atual.ltvCac.valor < 3) {
    alertas.push({
      nivel: 'atencao',
      titulo: 'Relação LTV/CAC abaixo de 3x',
      detalhe: `Cada real de aquisição retorna ${atual.ltvCac.valor.toFixed(1)}x em valor de vida do cliente.`,
    });
  }

  // Marca disponibilidade dos dados que faltam
  if (ativosById && ativosById.size === 0) {
    alertas.push({
      nivel: 'info',
      titulo: 'Período sem alunos ativos',
      detalhe: 'Vários KPIs ficam indisponíveis por falta de base ativa.',
    });
  }

  return alertas;
}

// ───────────────────────── formatação (usada só nos alertas) ─────────────────────────

function formatoBRL(v) {
  return Number(v || 0)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00A0/g, ' ');
}
