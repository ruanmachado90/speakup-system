/**
 * @jest-environment node
 */
/**
 * Testes dos cálculos de KPI do relatório mensal (src/utils/reportKPIs.js).
 * Foco nos que dão erro sutil: churn, aging de inadimplência, margem por turma,
 * taxa de recuperação — e sempre: divisão por zero e mês sem dados.
 */

import {
  paraData,
  noMes,
  variacao,
  alunoAtivoEm,
  alunosAtivosNoFim,
  novasMatriculas,
  cancelamentosNoMes,
  mrr,
  ticketMedioPorAluno,
  mensalidadePorCurso,
  churnMensalPct,
  retencaoPorSafra,
  ltv,
  saldoParcela,
  parcelasVencidas,
  receitaPrevistaNoMes,
  inadimplenciaValor,
  inadimplenciaDoMes,
  agingInadimplencia,
  taxaRecuperacao,
  custoHoraAula,
  custoProfessorTurma,
  ocupacaoTurma,
  detalhamentoPorTurma,
  custoPorAluno,
  taxaConversaoPct,
  cac,
  pontoEquilibrio,
  custoFixoNoMes,
  despesaPorCategoriaNoMes,
  despesasPorTipoNoMes,
  lucroOperacionalDoMes,
  margemOperacionalPct,
  cobrancasNaoEmitidas,
  resumoCobrancasNoMes,
  saldoCaixaDoMes,
  saldoCaixaDoTrimestre,
  indiceSaudeNegocio,
  pontosDeMelhoriaDespesas,
  montarRelatorioMensal,
  montarRelatorioTrimestral,
  projecaoSimples,
  planoDeAcao,
} from '../utils/reportKPIs';
import { PARAMETROS_PADRAO } from '../config/parametros';

// Helpers de fixture
const ms = (y, m, d) => new Date(y, m, d).getTime();

// ───────────────────────── helpers de data ─────────────────────────

describe('paraData', () => {
  it('parseia "YYYY-MM-DD" em horário local (sem deslocar fuso)', () => {
    const d = paraData('2026-03-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(10);
  });
  it('aceita timestamp em ms', () => {
    expect(paraData(ms(2026, 5, 1)).getMonth()).toBe(5);
  });
  it('devolve null para vazio/inválido', () => {
    expect(paraData('')).toBeNull();
    expect(paraData(null)).toBeNull();
    expect(paraData('xoxo')).toBeNull();
  });
});

describe('noMes', () => {
  it('bate mês e ano', () => {
    expect(noMes('2026-03-31', 2, 2026)).toBe(true);
    expect(noMes('2026-04-01', 2, 2026)).toBe(false);
    expect(noMes(ms(2026, 2, 15), 2, 2026)).toBe(true);
  });
});

describe('variacao', () => {
  it('calcula % e direção', () => {
    expect(variacao(120, 100)).toMatchObject({ pct: 20, direcao: 'up', disponivel: true });
    expect(variacao(80, 100)).toMatchObject({ direcao: 'down' });
    expect(variacao(100, 100)).toMatchObject({ direcao: 'flat' });
  });
  it('anterior nulo ou zero → indisponível (não divide por zero)', () => {
    expect(variacao(100, 0)).toMatchObject({ disponivel: false, pct: null });
    expect(variacao(100, null)).toMatchObject({ disponivel: false });
    expect(variacao(null, 100)).toMatchObject({ disponivel: false });
  });
});

// ───────────────────────── ciclo de vida do aluno ─────────────────────────

describe('alunoAtivoEm / alunosAtivosNoFim', () => {
  const ref = new Date(2026, 2, 31, 23, 59); // fim de março/26

  it('ativo: matriculado antes e não cancelado', () => {
    expect(alunoAtivoEm({ createdAt: ms(2026, 0, 10), status: 'ativo' }, ref)).toBe(true);
  });
  it('inativo: matriculado depois da referência', () => {
    expect(alunoAtivoEm({ createdAt: ms(2026, 4, 1), status: 'ativo' }, ref)).toBe(false);
  });
  it('cancelado depois da referência ainda conta como ativo naquele momento', () => {
    expect(alunoAtivoEm({ createdAt: ms(2026, 0, 1), status: 'cancelado', canceledAt: ms(2026, 5, 1) }, ref)).toBe(true);
  });
  it('cancelado antes da referência → inativo', () => {
    expect(alunoAtivoEm({ createdAt: ms(2026, 0, 1), status: 'cancelado', canceledAt: ms(2026, 1, 1) }, ref)).toBe(false);
  });
  it('registro legado sem createdAt: decide só pelo cancelamento', () => {
    expect(alunoAtivoEm({ status: 'ativo' }, ref)).toBe(true);
    expect(alunoAtivoEm({ status: 'cancelado' }, ref)).toBe(false);
  });

  it('conta a base ativa no fim do mês', () => {
    const students = [
      { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo' },
      { id: 'b', createdAt: ms(2026, 2, 20), status: 'ativo' },
      { id: 'c', createdAt: ms(2026, 3, 5), status: 'ativo' },              // entrou depois
      { id: 'd', createdAt: ms(2026, 0, 1), status: 'cancelado', canceledAt: ms(2026, 2, 10) }, // saiu no mês
    ];
    expect(alunosAtivosNoFim(students, 2, 2026).map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('novasMatriculas / cancelamentosNoMes', () => {
  const students = [
    { id: 'a', createdAt: ms(2026, 2, 3), status: 'ativo' },
    { id: 'b', createdAt: ms(2026, 2, 28), status: 'cancelado', canceledAt: ms(2026, 4, 1) },
    { id: 'c', createdAt: ms(2026, 1, 1), status: 'cancelado', canceledAt: ms(2026, 2, 15) },
  ];
  it('matrículas no mês', () => {
    expect(novasMatriculas(students, 2, 2026).map((s) => s.id)).toEqual(['a', 'b']);
  });
  it('cancelamentos no mês', () => {
    expect(cancelamentosNoMes(students, 2, 2026).map((s) => s.id)).toEqual(['c']);
  });
});

// ───────────────────────── receita ─────────────────────────

describe('mrr', () => {
  it('soma a mensalidade dos ativos no fim do mês', () => {
    const students = [
      { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239 },
      { id: 'b', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 270 },
      { id: 'c', createdAt: ms(2026, 3, 1), status: 'ativo', fee: 300 }, // entrou depois
    ];
    expect(mrr(students, 2, 2026)).toMatchObject({ valor: 509, disponivel: true, alunos: 2 });
  });
  it('mês sem alunos ativos → indisponível', () => {
    expect(mrr([], 2, 2026)).toMatchObject({ disponivel: false });
  });
});

describe('ticketMedioPorAluno', () => {
  it('ticket = receita ÷ ativos', () => {
    expect(ticketMedioPorAluno(2390, 10)).toMatchObject({ valor: 239, disponivel: true });
  });
  it('zero alunos → indisponível (sem divisão por zero)', () => {
    expect(ticketMedioPorAluno(1000, 0)).toMatchObject({ disponivel: false });
  });
});

describe('mensalidadePorCurso', () => {
  const ms2 = (y, m, d) => new Date(y, m, d).getTime();
  const students = [
    { id: 'a', createdAt: ms2(2026, 0, 1), status: 'ativo', fee: 239, course: 'Teens' },
    { id: 'b', createdAt: ms2(2026, 0, 1), status: 'ativo', fee: 259, course: 'Teens' },
    { id: 'c', createdAt: ms2(2026, 0, 1), status: 'ativo', fee: 189, course: 'Kids' },
    { id: 'd', createdAt: ms2(2026, 3, 1), status: 'ativo', fee: 300, course: 'Business' }, // entrou depois
  ];
  it('agrupa alunos ativos por curso, com mensalidade média e MRR do curso', () => {
    const r = mensalidadePorCurso(students, 2, 2026);
    const teens = r.find((c) => c.curso === 'Teens');
    expect(teens).toMatchObject({ alunos: 2, mrr: 498, mensalidadeMedia: 249 });
    const kids = r.find((c) => c.curso === 'Kids');
    expect(kids).toMatchObject({ alunos: 1, mensalidadeMedia: 189 });
    expect(r.find((c) => c.curso === 'Business')).toBeUndefined();
  });
});

// ───────────────────────── churn ─────────────────────────

describe('churnMensalPct', () => {
  it('cancelamentos ÷ base do início do mês', () => {
    const students = [
      // ativos no início de março (entraram antes de mar, não cancelados até fim de fev)
      { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo' },
      { id: 'b', createdAt: ms(2026, 0, 1), status: 'ativo' },
      { id: 'c', createdAt: ms(2026, 0, 1), status: 'ativo' },
      { id: 'd', createdAt: ms(2026, 0, 1), status: 'cancelado', canceledAt: ms(2026, 2, 10) }, // era ativo no início, cancelou em março
    ];
    // base início de março = a,b,c,d = 4 ; cancelados em março = d = 1 → 25%
    const r = churnMensalPct(students, 2, 2026);
    expect(r.disponivel).toBe(true);
    expect(r.valor).toBe(25);
    expect(r).toMatchObject({ cancelados: 1, base: 4 });
  });

  it('não conta quem entrou no próprio mês na base do início', () => {
    const students = [
      { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo' },
      { id: 'novo', createdAt: ms(2026, 2, 2), status: 'cancelado', canceledAt: ms(2026, 2, 20) },
    ];
    // base início março = só 'a' (1). 'novo' cancelou em março mas não estava na base.
    const r = churnMensalPct(students, 2, 2026);
    expect(r.base).toBe(1);
    expect(r.cancelados).toBe(1); // conta como cancelamento do mês
    expect(r.valor).toBe(100);
  });

  it('base zero → indisponível (nunca NaN/Infinity)', () => {
    expect(churnMensalPct([], 2, 2026)).toMatchObject({ disponivel: false, valor: null });
  });
});

describe('retencaoPorSafra', () => {
  it('para cada safra, quantos seguem ativos hoje', () => {
    const hoje = new Date(2026, 5, 15);
    const students = [
      { id: 'a', createdAt: ms(2026, 2, 3), status: 'ativo' },
      { id: 'b', createdAt: ms(2026, 2, 10), status: 'cancelado', canceledAt: ms(2026, 4, 1) },
      { id: 'c', createdAt: ms(2026, 3, 1), status: 'ativo' },
    ];
    const linhas = retencaoPorSafra(students, 5, 2026, 6, hoje);
    expect(linhas).toHaveLength(6);
    const mar = linhas.find((l) => l.safra === 'Mar/2026');
    expect(mar).toMatchObject({ entraram: 2, ativos: 1, retencaoPct: 50 });
    const abr = linhas.find((l) => l.safra === 'Abr/2026');
    expect(abr).toMatchObject({ entraram: 1, ativos: 1, retencaoPct: 100 });
    const mai = linhas.find((l) => l.safra === 'Mai/2026');
    expect(mai).toMatchObject({ entraram: 0, retencaoPct: null }); // safra vazia não vira 0/0
  });
});

describe('ltv', () => {
  it('ticket ÷ churn (fração)', () => {
    expect(ltv(239, 5)).toMatchObject({ valor: 4780, disponivel: true }); // 239 / 0.05
  });
  it('churn zero → indisponível (não Infinity)', () => {
    expect(ltv(239, 0)).toMatchObject({ disponivel: false });
  });
  it('ticket indisponível → indisponível', () => {
    expect(ltv(null, 5)).toMatchObject({ disponivel: false });
  });
});

// ───────────────────────── inadimplência (R$) ─────────────────────────

describe('saldoParcela', () => {
  it('parcela paga → 0', () => {
    expect(saldoParcela({ status: 'Pago', valuePlanned: 239, valuePaid: 239 })).toBe(0);
  });
  it('pagamento parcial → previsto − pago', () => {
    expect(saldoParcela({ status: 'Pendente', valuePlanned: 239, valuePaid: 100 })).toBe(139);
  });
  it('nunca negativo', () => {
    expect(saldoParcela({ status: 'Pendente', valuePlanned: 100, valuePaid: 150 })).toBe(0);
  });
  it('parcela cancelada → 0 (registro preservado, mas fora dos KPIs)', () => {
    expect(saldoParcela({ status: 'cancelada', valuePlanned: 239, valuePaid: 0 })).toBe(0);
  });
});

describe('parcela cancelada sai de todos os agregados financeiros', () => {
  const ref = new Date(2026, 2, 31, 23, 59);
  const base = [
    { studentName: 'A', valuePlanned: 239, valuePaid: 0, status: 'Pendente', dueDate: '2026-01-10' },
    { studentName: 'B', valuePlanned: 239, valuePaid: 0, status: 'cancelada', dueDate: '2026-01-15', canceledAt: Date.now() },
    { studentName: 'C', valuePlanned: 239, valuePaid: 0, status: 'cancelada', dueDate: '2026-02-10' },
  ];

  it('não entra em parcelasVencidas', () => {
    const venc = parcelasVencidas(base, ref);
    expect(venc).toHaveLength(1);
    expect(venc[0].studentName).toBe('A');
  });

  it('não entra em inadimplenciaValor', () => {
    expect(inadimplenciaValor(base, ref)).toBe(239); // só a parcela de A
  });

  it('não entra em receitaPrevistaNoMes', () => {
    // janeiro/26: A (239) prevista, B (cancelada) fora
    expect(receitaPrevistaNoMes(base, 0, 2026)).toBe(239);
  });

  it('não entra no previsto de inadimplenciaDoMes', () => {
    const jan = inadimplenciaDoMes(base, 0, 2026);
    expect(jan.previsto).toBe(239); // só A
    expect(jan.valor).toBe(239);
  });
});

describe('inadimplenciaValor / inadimplenciaDoMes — SEMPRE em R$, nunca contagem', () => {
  const ref = new Date(2026, 2, 31, 23, 59);
  const payments = [
    { studentName: 'A', valuePlanned: 239, valuePaid: 0, status: 'Pendente', dueDate: '2026-01-10' }, // vencida, 239
    { studentName: 'B', valuePlanned: 239, valuePaid: 139, status: 'Pendente', dueDate: '2026-02-05' }, // vencida parcial, saldo 100
    { studentName: 'C', valuePlanned: 500, valuePaid: 500, status: 'Pago', dueDate: '2026-02-10' }, // paga, 0
    { studentName: 'D', valuePlanned: 239, valuePaid: 0, status: 'Pendente', dueDate: '2026-04-10' }, // futura, não conta
  ];

  it('soma o saldo devedor vencido, não o número de parcelas', () => {
    expect(inadimplenciaValor(payments, ref)).toBe(339); // 239 + 100, não "2"
  });

  it('inadimplência do mês = vencido do mês ÷ previsto do mês', () => {
    // março/26 não tem parcela nenhuma vencendo → indisponível, sem dividir por zero
    expect(inadimplenciaDoMes(payments, 2, 2026)).toMatchObject({ disponivel: false });
    // fevereiro/26: previsto = 239 (B) + 500 (C) = 739 ; vencido de fev medido no fim de fev = saldo de B = 100
    const fev = inadimplenciaDoMes(payments, 1, 2026);
    expect(fev.previsto).toBe(739);
    expect(fev.valor).toBe(100);
    expect(fev.pct).toBeCloseTo((100 / 739) * 100, 4);
  });
});

describe('agingInadimplencia', () => {
  it('distribui o saldo pelas faixas 0-30 / 31-60 / 61-90 / 90+', () => {
    const ref = new Date(2026, 3, 30); // 30/abr
    const payments = [
      { valuePlanned: 100, valuePaid: 0, status: 'Pendente', dueDate: '2026-04-20' }, // 10 dias → 0-30
      { valuePlanned: 100, valuePaid: 0, status: 'Pendente', dueDate: '2026-03-20' }, // ~41 dias → 31-60
      { valuePlanned: 100, valuePaid: 30, status: 'Pendente', dueDate: '2026-02-15' }, // ~74 dias, saldo 70 → 61-90
      { valuePlanned: 100, valuePaid: 0, status: 'Pendente', dueDate: '2025-12-01' }, // >90 → 90+
      { valuePlanned: 100, valuePaid: 100, status: 'Pago', dueDate: '2026-01-01' }, // paga, ignora
    ];
    expect(agingInadimplencia(payments, ref)).toEqual({
      '0-30': 100,
      '31-60': 100,
      '61-90': 70,
      '90+': 100,
    });
  });
  it('carteira limpa → tudo zero, sem quebrar', () => {
    expect(agingInadimplencia([], new Date())).toEqual({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  });
});

describe('taxaRecuperacao', () => {
  it('recebido no mês de parcelas vencidas antes ÷ carteira de abertura', () => {
    const payments = [
      // vencia em jan, foi paga em março → recuperação de março
      { valuePlanned: 200, valuePaid: 200, status: 'Pago', dueDate: '2026-01-10', paidAt: ms(2026, 2, 5) },
      // vencia em fev, ainda aberta no fim de fev → entra na carteira de abertura de março
      { valuePlanned: 300, valuePaid: 0, status: 'Pendente', dueDate: '2026-02-10' },
      // vencida antiga ainda aberta → também na carteira de abertura
      { valuePlanned: 100, valuePaid: 0, status: 'Pendente', dueDate: '2026-01-01' },
    ];
    // carteira abertura (fim de fev) = 300 + 100 = 400 ; recuperado em março = 200
    const r = taxaRecuperacao(payments, 2, 2026);
    expect(r.disponivel).toBe(true);
    expect(r.recuperado).toBe(200);
    expect(r.carteiraAbertura).toBe(400);
    expect(r.valor).toBe(50);
  });

  it('sem carteira vencida no início → indisponível (não divide por zero)', () => {
    const r = taxaRecuperacao([], 2, 2026);
    expect(r).toMatchObject({ disponivel: false, recuperado: 0 });
  });
});

// ───────────────────────── operacional ─────────────────────────

describe('custoHoraAula / custoProfessorTurma — modelo hora-aula CLT', () => {
  const p = PARAMETROS_PADRAO; // R$ 23/h + 70% encargos, 4h/mês padrão

  it('hora-aula efetiva = valor × (1 + encargos%)', () => {
    expect(custoHoraAula(p)).toBeCloseTo(39.1, 5); // 23 × 1,70
    expect(custoHoraAula({ valorHoraAula: 30, encargosProfessorPct: 0 })).toBe(30);
  });
  it('custo da turma = horas/mês × hora-aula efetiva', () => {
    expect(custoProfessorTurma({ horasMensais: 4 }, p)).toBeCloseTo(156.4, 4);
    expect(custoProfessorTurma({ horasMensais: 8 }, p)).toBeCloseTo(312.8, 4);
  });
  it('turma sem horas cadastradas usa o padrão da config', () => {
    expect(custoProfessorTurma({}, p)).toBeCloseTo(156.4, 4);
    expect(custoProfessorTurma({ horasMensais: 0 }, { ...p, horasMensaisPadraoTurma: 6 })).toBeCloseTo(6 * 39.1, 4);
  });
});

describe('ocupacaoTurma', () => {
  const ativos = new Map([['a', {}], ['b', {}], ['c', {}]]);
  it('matriculados ativos ÷ capacidade', () => {
    expect(ocupacaoTurma({ maxAlunos: 10, alunosIds: ['a', 'b', 'c', 'x'] }, ativos)).toMatchObject({ valor: 30, disponivel: true });
  });
  it('capacidade zero → indisponível (sem divisão por zero)', () => {
    expect(ocupacaoTurma({ maxAlunos: 0, alunosIds: ['a'] }, ativos)).toMatchObject({ disponivel: false });
  });
  it('conta quem saiu da turma ao cancelar mas ainda estava ativo no mês', () => {
    const ativosNoMes = new Map([
      ['a', {}],
      ['z', { turmasNoCancelamento: [{ id: 't1', nome: 'TEENS 1' }] }],
    ]);
    expect(ocupacaoTurma({ id: 't1', maxAlunos: 10, alunosIds: ['a'] }, ativosNoMes)).toMatchObject({ valor: 20 });
    expect(ocupacaoTurma({ id: 't2', maxAlunos: 10, alunosIds: ['a'] }, ativosNoMes)).toMatchObject({ valor: 10 });
  });
  it('aceita alunosIds no formato antigo ({ id, nome })', () => {
    expect(ocupacaoTurma({ maxAlunos: 10, alunosIds: [{ id: 'a', nome: 'A' }, 'b'] }, ativos)).toMatchObject({ valor: 20 });
  });
});

describe('detalhamentoPorTurma — margem de contribuição', () => {
  const students = [
    { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239, teacher: 'Vera' },
    { id: 'b', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239, teacher: 'Vera' },
    { id: 'c', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 270, teacher: 'Vera' },
    { id: 'd', createdAt: ms(2026, 0, 1), status: 'cancelado', canceledAt: ms(2026, 1, 1), fee: 239, teacher: 'Vera' }, // inativo, não conta
  ];
  const turmas = [
    { id: 't1', nome: 'Kids A', professor: 'Vera', maxAlunos: 10, horasMensais: 8, alunosIds: ['a', 'b', 'd'] },
    { id: 't2', nome: 'Teens B', professor: 'Vera', maxAlunos: 8, horasMensais: 4, alunosIds: ['c'] },
  ];

  it('receita = Σ fee dos alunos ATIVOS; custo = horas × hora-aula; margem = receita − custo', () => {
    const det = detalhamentoPorTurma(turmas, students, 2, 2026, PARAMETROS_PADRAO);
    const t1 = det.find((t) => t.id === 't1');
    const t2 = det.find((t) => t.id === 't2');

    expect(t1.receita).toBe(478); // a + b (d é inativo)
    expect(t1.matriculados).toBe(2);
    expect(t1.ocupacaoPct).toBe(20);
    expect(t1.custoProfessor).toBeCloseTo(312.8, 4); // 8h × 39,10
    expect(t1.margemContribuicao).toBeCloseTo(165.2, 4);

    expect(t2.receita).toBe(270);
    expect(t2.custoProfessor).toBeCloseTo(156.4, 4); // 4h × 39,10
    expect(t2.margemContribuicao).toBeCloseTo(113.6, 4);
  });

  it('turma sem alunos ativos → receita 0, margem negativa igual ao custo', () => {
    const det = detalhamentoPorTurma(
      [{ id: 'x', nome: 'Vazia', professor: 'Solo', maxAlunos: 10, horasMensais: 4, alunosIds: [] }],
      students, 2, 2026, PARAMETROS_PADRAO,
    );
    expect(det[0].receita).toBe(0);
    expect(det[0].matriculados).toBe(0);
    expect(det[0].custoProfessor).toBeCloseTo(156.4, 4);
    expect(det[0].margemContribuicao).toBeCloseTo(-156.4, 4);
  });
});

describe('custoPorAluno / cac / pontoEquilibrio', () => {
  it('custo por aluno', () => {
    expect(custoPorAluno(5000, 25)).toMatchObject({ valor: 200, disponivel: true });
    expect(custoPorAluno(5000, 0)).toMatchObject({ disponivel: false });
  });
  it('CAC = marketing ÷ novas matrículas', () => {
    expect(cac(900, 3)).toMatchObject({ valor: 300, disponivel: true });
    expect(cac(900, 0)).toMatchObject({ disponivel: false });
  });
  it('ponto de equilíbrio arredonda pra cima', () => {
    expect(pontoEquilibrio(2400, 239)).toMatchObject({ valor: 11, disponivel: true });
    expect(pontoEquilibrio(null, 239)).toMatchObject({ disponivel: false });
    expect(pontoEquilibrio(2400, 0)).toMatchObject({ disponivel: false });
  });
});

describe('custoFixoNoMes — depende da flag recorrente', () => {
  it('sem nenhuma flag no mês → indisponível, mas devolve proxy (Aluguel+Salários+Serviços)', () => {
    const expenses = [
      { category: 'Aluguel', value: 2000, month: 3, year: 2026 },
      { category: 'Salários', value: 4000, month: 3, year: 2026 },
      { category: 'Marketing', value: 900, month: 3, year: 2026 },
    ];
    const r = custoFixoNoMes(expenses, 2, 2026);
    expect(r.disponivel).toBe(false);
    expect(r.proxy).toBe(6000);
  });
  it('com flag → soma só as recorrentes', () => {
    const expenses = [
      { category: 'Aluguel', value: 2000, month: 3, year: 2026, recorrente: true },
      { category: 'Materiais', value: 500, month: 3, year: 2026, recorrente: false },
      { category: 'Serviços', value: 300, month: 3, year: 2026, recorrente: true },
    ];
    const r = custoFixoNoMes(expenses, 2, 2026);
    expect(r).toMatchObject({ disponivel: true, valor: 2300 });
  });
});

describe('despesaPorCategoriaNoMes', () => {
  it('agrupa por categoria, maior primeiro', () => {
    const expenses = [
      { category: 'Aluguel', value: 3000, month: 8, year: 2026 },
      { category: 'Marketing', value: 500, month: 8, year: 2026 },
      { category: 'Aluguel', value: 200, month: 8, year: 2026 }, // segunda linha da mesma categoria
      { category: 'Salários', value: 5000, month: 8, year: 2026 },
      { category: 'Aluguel', value: 999, month: 7, year: 2026 }, // fora do mês
    ];
    const r = despesaPorCategoriaNoMes(expenses, 7, 2026);
    expect(r).toEqual([
      { categoria: 'Salários', valor: 5000 },
      { categoria: 'Aluguel', valor: 3200 },
      { categoria: 'Marketing', valor: 500 },
    ]);
  });
});

describe('indiceSaudeNegocio — 4 fatores de 25 pts, reescala sobre os disponíveis', () => {
  const params = { metaChurnPct: 5, metaInadimplenciaPct: 5, metaOcupacaoPct: 60 };

  it('tudo na meta ou melhor → 100', () => {
    const atual = {
      inadimplenciaMes: { disponivel: true, pct: 2 },
      churnPct: { disponivel: true, valor: 1 },
      margemOperacional: { disponivel: true, valor: 30 }, // acima do teto de 25% já vira 25 pts (capado)
    };
    const detTurmas = [{ ocupacaoPct: 80 }, { ocupacaoPct: 90 }];
    const r = indiceSaudeNegocio({ atual, detTurmas }, params);
    expect(r.disponivel).toBe(true);
    expect(r.valor).toBe(100);
    expect(r.nivel).toBe('bom');
  });

  it('tudo ruim → índice baixo e nível crítico', () => {
    const atual = {
      inadimplenciaMes: { disponivel: true, pct: 20 },
      churnPct: { disponivel: true, valor: 15 },
      margemOperacional: { disponivel: true, valor: -10 },
    };
    const detTurmas = [{ ocupacaoPct: 20 }];
    const r = indiceSaudeNegocio({ atual, detTurmas }, params);
    expect(r.disponivel).toBe(true);
    expect(r.valor).toBeLessThan(50);
    expect(r.nivel).toBe('critico');
  });

  it('sem nenhum fator disponível → indisponível, não quebra', () => {
    const atual = {
      inadimplenciaMes: { disponivel: false },
      churnPct: { disponivel: false },
      margemOperacional: { disponivel: false },
    };
    const r = indiceSaudeNegocio({ atual, detTurmas: [] }, params);
    expect(r.disponivel).toBe(false);
  });

  it('só alguns fatores disponíveis → reescala sobre eles, não penaliza os que faltam', () => {
    const atual = {
      inadimplenciaMes: { disponivel: true, pct: 2 }, // dentro da meta → 25/25
      churnPct: { disponivel: false },
      margemOperacional: { disponivel: false },
    };
    const r = indiceSaudeNegocio({ atual, detTurmas: [] }, params);
    expect(r.disponivel).toBe(true);
    expect(r.valor).toBe(100); // só 1 fator disponível, e ele está perfeito
  });
});

describe('pontosDeMelhoriaDespesas', () => {
  it('aponta a maior categoria e não quebra sem despesa', () => {
    const relatorio = {
      atual: {
        despesaTotal: 10000,
        despesasPorTipo: { operacional: 8000, retiradaSocio: 1500, investimento: 500, imposto: 0 },
        custoFixo: { disponivel: false },
        pontoEquilibrio: { disponivel: false },
      },
      variacoes: { despesaTotal: { vsMesAnterior: { disponivel: false } } },
      despesasPorCategoria: [{ categoria: 'Salários', valor: 6000 }, { categoria: 'Aluguel', valor: 4000 }],
    };
    const pontos = pontosDeMelhoriaDespesas(relatorio);
    expect(pontos.length).toBeGreaterThan(0);
    expect(pontos[0]).toMatch(/Salários/);
  });

  it('despesa zerada → mensagem padrão, sem quebrar', () => {
    const relatorio = {
      atual: { despesaTotal: 0, despesasPorTipo: { operacional: 0, retiradaSocio: 0, investimento: 0, imposto: 0 }, custoFixo: { disponivel: false }, pontoEquilibrio: { disponivel: false } },
      variacoes: { despesaTotal: { vsMesAnterior: { disponivel: false } } },
      despesasPorCategoria: [],
    };
    expect(() => pontosDeMelhoriaDespesas(relatorio)).not.toThrow();
  });
});

describe('despesasPorTipoNoMes / lucroOperacionalDoMes — retirada de sócio nunca é custo', () => {
  const expenses = [
    { category: 'Aluguel', value: 3000, month: 8, year: 2026, tipoSaida: 'operacional' },
    { category: 'Salários', value: 5000, month: 8, year: 2026 }, // legado, sem tipoSaida → operacional
    { category: 'Pró-labore', value: 4000, month: 8, year: 2026, tipoSaida: 'retiradaSocio' },
    { category: 'Reforma', value: 2000, month: 8, year: 2026, tipoSaida: 'investimento' },
    { category: 'DAS', value: 600, month: 8, year: 2026, tipoSaida: 'imposto' },
  ];

  it('agrupa por tipoSaida; despesa legada sem o campo cai em operacional', () => {
    const r = despesasPorTipoNoMes(expenses, 7, 2026);
    expect(r).toEqual({ operacional: 8000, retiradaSocio: 4000, investimento: 2000, imposto: 600 });
  });

  it('lucro operacional exclui retirada de sócio e investimento', () => {
    const porTipo = despesasPorTipoNoMes(expenses, 7, 2026);
    const lucro = lucroOperacionalDoMes(20000, porTipo);
    expect(lucro).toBe(20000 - 8000 - 600); // NÃO subtrai retirada (4000) nem investimento (2000)
  });

  it('margemOperacionalPct = lucro ÷ receita recebida; sem receita → indisponível', () => {
    expect(margemOperacionalPct(5000, 20000)).toMatchObject({ disponivel: true, valor: 25 });
    expect(margemOperacionalPct(5000, 0)).toMatchObject({ disponivel: false });
  });
});

describe('cobrancasNaoEmitidas / resumoCobrancasNoMes — gap de faturamento', () => {
  const students = [
    { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239 },
    { id: 'b', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 270 },
    { id: 'c', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 220 },
  ];
  const payments = [
    { studentId: 'a', valuePlanned: 239, valuePaid: 239, status: 'Pago', dueDate: '2026-03-10' },
    { studentId: 'b', valuePlanned: 270, valuePaid: 0, status: 'Pendente', dueDate: '2026-03-05' },
    // 'c' está ativo mas não tem nenhuma parcela vencendo em março → gap
  ];

  it('identifica alunos ativos sem cobrança gerada no mês', () => {
    const r = cobrancasNaoEmitidas(students, payments, 2, 2026);
    expect(r.total).toBe(1);
    expect(r.alunos[0].id).toBe('c');
  });

  it('resumoCobrancasNoMes junta previsto/recebido/contagens/gap', () => {
    const r = resumoCobrancasNoMes(students, payments, 2, 2026);
    expect(r.emitidas).toBe(2);
    expect(r.previsto).toBe(509); // 239 + 270
    expect(r.recebido).toBe(239);
    expect(r.pagasCount).toBe(1);
    expect(r.pendentesCount).toBe(1);
    expect(r.naoEmitidasCount).toBe(1);
  });
});

describe('saldoCaixaDoMes / saldoCaixaDoTrimestre — dado manual, nunca derivado', () => {
  const saldos = [
    { competencia: '2026-06', saldoInicial: 1000, saldoFinal: 1200 },
    { competencia: '2026-07', saldoInicial: 1200, saldoFinal: 900 },
    { competencia: '2026-08', saldoInicial: 900, saldoFinal: 1640 },
  ];

  it('mês sem registro → indisponível (não vira 0)', () => {
    expect(saldoCaixaDoMes([], 5, 2026)).toMatchObject({ disponivel: false });
  });

  it('mês registrado → valor = saldo final, variação = final - inicial', () => {
    const r = saldoCaixaDoMes(saldos, 7, 2026); // agosto (mes=7)
    expect(r).toMatchObject({ disponivel: true, valor: 1640, saldoInicial: 900, saldoFinal: 1640, variacao: 740 });
  });

  it('trimestre: inicial do 1º mês, final do 3º', () => {
    const r = saldoCaixaDoTrimestre(saldos, 2, 2026); // Q3 = jul/ago/set (mês 6,7,8)
    expect(r.disponivel).toBe(false); // set/2026 não tem registro
  });

  it('trimestre completo → inicial do primeiro mês, final do último', () => {
    // Q3 (tri=2) = meses 6,7,8 (jul/ago/set); só falta setembro nos fixtures
    const completo = [...saldos, { competencia: '2026-09', saldoInicial: 1640, saldoFinal: 2000 }];
    const r = saldoCaixaDoTrimestre(completo, 2, 2026);
    expect(r).toMatchObject({ disponivel: true, saldoInicial: 1200, saldoFinal: 2000, variacao: 800 });
  });
});

describe('taxaConversaoPct', () => {
  it('convertidos ÷ captados, marcado como aproximado', () => {
    const leads = [
      { status: 'novo', createdAt: ms(2026, 2, 1) },
      { status: 'contato', createdAt: ms(2026, 2, 5) },
      { status: 'matriculado', createdAt: ms(2026, 2, 10), updatedAt: ms(2026, 2, 20) },
      { status: 'perdido', createdAt: ms(2026, 2, 12) },
    ];
    const r = taxaConversaoPct(leads, 2, 2026);
    expect(r).toMatchObject({ disponivel: true, valor: 25, aproximado: true });
  });
  it('nenhum lead no mês → indisponível', () => {
    expect(taxaConversaoPct([], 2, 2026)).toMatchObject({ disponivel: false });
  });
});

// ───────────────────────── montagem completa ─────────────────────────

describe('montarRelatorioMensal', () => {
  it('mês totalmente vazio não quebra e marca tudo como indisponível onde faz sentido', () => {
    const r = montarRelatorioMensal({
      students: [], payments: [], expenses: [], leads: [], turmas: [], vendas: [],
      mes: 2, ano: 2026,
    });
    expect(r.periodo.rotulo).toBe('Mar/2026');
    expect(r.atual.alunosAtivos).toBe(0);
    expect(r.atual.mrr.disponivel).toBe(false);
    expect(r.atual.ticketMedio.disponivel).toBe(false);
    expect(r.atual.churnPct.disponivel).toBe(false);
    expect(r.atual.resultado).toBe(0);
    expect(Array.isArray(r.alertas)).toBe(true);
    expect(Array.isArray(r.coorte)).toBe(true);
  });

  it('cenário real: calcula variação vs. mês anterior', () => {
    const students = [
      { id: 'a', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239, teacher: 'Vera' },
      { id: 'b', createdAt: ms(2026, 0, 1), status: 'ativo', fee: 239, teacher: 'Vera' },
      { id: 'c', createdAt: ms(2026, 2, 5), status: 'ativo', fee: 270, teacher: 'Bruna' }, // matrícula de março
    ];
    const payments = [
      { studentName: 'A', valuePlanned: 239, valuePaid: 239, status: 'Pago', dueDate: '2026-02-10', paidAt: ms(2026, 1, 9) },
      { studentName: 'A', valuePlanned: 239, valuePaid: 239, status: 'Pago', dueDate: '2026-03-10', paidAt: ms(2026, 2, 9) },
      { studentName: 'B', valuePlanned: 239, valuePaid: 0, status: 'Pendente', dueDate: '2026-03-10' }, // vai vencer
    ];
    const expenses = [{ category: 'Marketing', value: 540, month: 3, year: 2026 }];
    const r = montarRelatorioMensal({ students, payments, expenses, leads: [], turmas: [], vendas: [], mes: 2, ano: 2026 });

    expect(r.atual.alunosAtivos).toBe(3);
    expect(r.atual.mrr.valor).toBe(748); // 239+239+270
    expect(r.anterior.mrr.valor).toBe(478); // só a,b em fev
    expect(r.variacoes.mrr.vsMesAnterior).toMatchObject({ direcao: 'up' });
    expect(r.atual.novasMatriculas).toBe(1);
    expect(r.atual.cac.valor).toBe(540); // 540 / 1
    expect(r.receitaPorProfessor.find((x) => x.professor === 'Vera').receita).toBe(478);
  });
});

describe('montarRelatorioTrimestral', () => {
  it('soma os fluxos dos 3 meses e usa o fim do trimestre como estoque', () => {
    const students = [
      { id: 'a', createdAt: ms(2025, 11, 1), status: 'ativo', fee: 200, teacher: 'X' },
      { id: 'b', createdAt: ms(2026, 0, 15), status: 'ativo', fee: 200, teacher: 'X' },
      { id: 'c', createdAt: ms(2026, 1, 10), status: 'cancelado', canceledAt: ms(2026, 2, 20), fee: 200 },
    ];
    const payments = [
      { studentName: 'A', valuePlanned: 200, valuePaid: 200, status: 'Pago', dueDate: '2026-01-10', paidAt: ms(2026, 0, 9) },
      { studentName: 'A', valuePlanned: 200, valuePaid: 200, status: 'Pago', dueDate: '2026-02-10', paidAt: ms(2026, 1, 9) },
      { studentName: 'A', valuePlanned: 200, valuePaid: 200, status: 'Pago', dueDate: '2026-03-10', paidAt: ms(2026, 2, 9) },
    ];
    const r = montarRelatorioTrimestral({
      students, payments, expenses: [], leads: [], turmas: [], vendas: [],
      trimestre: 0, ano: 2026,
    });
    expect(r.periodo.rotulo).toBe('1º trimestre 2026');
    expect(r.atual.receitaRecebida).toBe(600); // 200×3
    expect(r.atual.alunosAtivos).toBe(2); // a, b no fim de março (c cancelou)
    expect(r.atual.cancelamentos).toBe(1);
    expect(r.atual.mrr.valor).toBe(400); // snapshot fim do trimestre
    expect(Array.isArray(r.alertas)).toBe(true);
    expect(r.variacoes.receitaRecebida).toHaveProperty('vsMesAnterior');
  });

  it('cenário de agosto/2026: lucro operacional positivo mas caixa caindo → alerta e ação P1', () => {
    // 20 alunos pagando R$ 1000 cada = R$ 20.000 recebidos; despesas operacionais
    // baixas o bastante pra dar lucro operacional positivo, mas o saldo bancário
    // (dado manual) mostra a conta caindo — exatamente o caso que motivou o Passe.
    const students = Array.from({ length: 20 }, (_, i) => ({
      id: 's' + i, createdAt: ms(2026, 0, 1), status: 'ativo', fee: 1000,
    }));
    const payments = students.map((s) => ({
      studentId: s.id, valuePlanned: 1000, valuePaid: 1000, status: 'Pago',
      dueDate: '2026-08-10', paidAt: ms(2026, 7, 9),
    }));
    const expenses = [{ category: 'Aluguel', value: 3000, month: 8, year: 2026, tipoSaida: 'operacional' }];
    const saldosBancarios = [{ competencia: '2026-08', saldoInicial: 1644.6, saldoFinal: 929.03 }];

    const r = montarRelatorioMensal({
      students, payments, expenses, leads: [], turmas: [], vendas: [], saldosBancarios,
      mes: 7, ano: 2026,
    });

    expect(r.atual.lucroOperacional).toBe(17000); // 20000 - 3000
    expect(r.atual.saldoCaixa).toMatchObject({ disponivel: true, saldoInicial: 1644.6, saldoFinal: 929.03 });
    expect(r.atual.saldoCaixa.variacao).toBeCloseTo(-715.57, 2);

    const alertaCaixa = r.alertas.find((a) => a.titulo === 'Lucro no papel, caixa caindo');
    expect(alertaCaixa).toBeDefined();
    expect(alertaCaixa.nivel).toBe('critico');

    const plano = planoDeAcao(r, PARAMETROS_PADRAO);
    expect(plano[0]).toMatchObject({ prioridade: 1, area: 'Caixa' });
  });

  it('trimestre vazio não quebra', () => {
    const r = montarRelatorioTrimestral({
      students: [], payments: [], expenses: [], leads: [], turmas: [], vendas: [],
      trimestre: 2, ano: 2026,
    });
    expect(r.atual.alunosAtivos).toBe(0);
    expect(r.atual.mrr.disponivel).toBe(false);
    expect(r.atual.resultado).toBe(0);
  });
});

describe('projecaoSimples — tendência linear, sem sazonalidade', () => {
  it('menos de 3 meses com receita → indisponível', () => {
    const payments = [
      { valuePaid: 200, valuePlanned: 200, status: 'Pago', dueDate: '2026-08-05', paidAt: ms(2026, 7, 5) },
    ];
    const p = projecaoSimples({ payments, expenses: [], mes: 8, ano: 2026 });
    expect(p.disponivel).toBe(false);
  });

  it('receita crescente linear → tendência positiva e 3 meses projetados', () => {
    // mai..set com receita crescente mas não perfeitamente linear (gera resíduo → cenários)
    const mk = (m, v) => ({ valuePaid: v, valuePlanned: v, status: 'Pago', dueDate: `2026-0${m + 1}-05`, paidAt: ms(2026, m, 5) });
    const payments = [mk(4, 1000), mk(5, 1150), mk(6, 1400), mk(7, 1500), mk(8, 1750)];
    const p = projecaoSimples({ payments, expenses: [], mes: 8, ano: 2026, janela: 5, horizonte: 3 });
    expect(p.disponivel).toBe(true);
    expect(p.tendenciaReceitaMes).toBeGreaterThan(0);
    expect(p.meses).toHaveLength(3);
    expect(p.meses[0].receita.base).toBeGreaterThan(1750);
    expect(p.meses[0].receita.otimista).toBeGreaterThan(p.meses[0].receita.conservador);
  });
});

describe('planoDeAcao — deriva das metas de params', () => {
  const params = { metaChurnPct: 5, metaInadimplenciaPct: 5, metaOcupacaoPct: 60 };

  it('tudo dentro da meta → 1 ação de manutenção', () => {
    const rel = {
      atual: {
        inadimplenciaMes: { disponivel: true, pct: 2 },
        churnPct: { disponivel: true, valor: 1 },
        resultado: 5000,
        ltvCac: { disponivel: false },
        taxaConversao: { disponivel: false },
        aging: {},
      },
      detalhamentoTurmas: [],
      parcelasInadimplentes: [],
    };
    const p = planoDeAcao(rel, params);
    expect(p).toHaveLength(1);
    expect(p[0].area).toBe('Manutenção');
  });

  it('inadimplência e churn acima da meta → ações P1 primeiro, no máx 5', () => {
    const rel = {
      atual: {
        inadimplenciaMes: { disponivel: true, pct: 12 },
        churnPct: { disponivel: true, valor: 9 },
        resultado: -1000,
        ltvCac: { disponivel: true, valor: 1.5 },
        taxaConversao: { disponivel: true, valor: 10 },
        aging: { '90+': 800 },
      },
      detalhamentoTurmas: [{ ocupacaoPct: 30 }],
      parcelasInadimplentes: [{}, {}],
    };
    const p = planoDeAcao(rel, params);
    expect(p.length).toBeLessThanOrEqual(5);
    expect(p[0].prioridade).toBe(1);
    expect(p.map((x) => x.area)).toEqual(expect.arrayContaining(['Inadimplência', 'Retenção', 'Financeiro']));
  });
});
