// Monta TUDO que o relatório trimestral imprime, a partir dos dados crus:
// o pacote financeiro do motor existente (montarRelatorioTrimestral) + os
// KPIs operacionais de utils/relatorioTrimestral. Puro — testado em
// __tests__/relatorioTrimestralModelo.test.js.
import {
  montarRelatorioTrimestral, projecaoSimples, planoDeAcao, pontosDeMelhoriaDespesas, alunosAtivosNoFim,
} from './reportKPIs';
import { PARAMETROS_PADRAO } from '../config/parametros';
import { criarDiaNaoLetivo } from './agendaProfessor';
import {
  intervaloDoTrimestre, situacaoDoPeriodo, serieMensal, motivosDeCancelamento, coberturaDeContratos, situacaoDeTurma,
  alunosPorCursoBook, funilDeLeads, pedagogicoDoTrimestre, notasDoSemestre, receitaDoProfessor, alertasOperacionais,
  planoOperacional,
} from './relatorioTrimestral';

// Indicadores de "fotografia" (valem no instante, não somam no período):
// comparáveis mesmo com o trimestre em andamento.
const ESTOQUE = new Set(['mrr', 'alunosAtivos', 'mensalidadeMedia', 'inadimplenciaCarteira']);

export function montarRelatorioCompleto({
  tri, ano, hojeISO, agoraMin = 0,
  students = [], payments = [], expenses = [], leads = [], vendas = [], saldosBancarios = [],
  turmas = [], professores = [], aulas = [], avulsas = [], eventos = [], avaliacoes = [], grades = [],
  contratosAssinados = new Set(), calendarioAno = null, params: paramsIn,
}) {
  const params = { ...PARAMETROS_PADRAO, ...(paramsIn || {}) };
  const intervalo = intervaloDoTrimestre(tri, ano);
  const situacao = situacaoDoPeriodo(intervalo, hojeISO);
  const mesFim = tri * 3 + 2;
  const parcial = situacao.tipo === 'parcial';
  // Em andamento: "fim do período" é o mês corrente.
  const mesRef = parcial ? Number(hojeISO.slice(5, 7)) - 1 : mesFim;
  const hoje = new Date(`${hojeISO}T12:00:00`);

  // Trimestre em andamento: parcela que ainda não venceu e não foi paga fica
  // de fora — senão o motor (que mede no fim do trimestre) conta novembro e
  // dezembro como "atrasados" já em 3 de novembro. Paga adiantada continua.
  const paymentsBase = parcial
    ? payments.filter((p) => p.status === 'Pago' || String(p.dueDate || '').slice(0, 10) <= hojeISO)
    : payments;
  const base = { students, payments: paymentsBase, expenses, leads, turmas, vendas, saldosBancarios, trimestre: tri, ano, params, hoje };
  const R = montarRelatorioTrimestral(base);
  // Comparar um trimestre pela metade com trimestres inteiros engana em tudo
  // que é fluxo (receita, matrículas…). Em andamento, só os de estoque.
  const variacoes = parcial
    ? Object.fromEntries(Object.entries(R.variacoes).map(([k, val]) => [k, ESTOQUE.has(k) ? val : null]))
    : R.variacoes;
  // Projeção a partir do último mês FECHADO (o corrente está pela metade).
  const mesProjecao = parcial ? mesRef - 1 : mesRef;
  const dataProjecao = new Date(ano, mesProjecao, 1);
  const ativos = alunosAtivosNoFim(students, mesRef, ano);

  const ped = pedagogicoDoTrimestre({
    turmas, aulas, avulsas, eventos, students, professores, intervalo, params, hojeISO, agoraMin,
    diaNaoLetivo: criarDiaNaoLetivo(calendarioAno, [ano]),
  });
  const notas = notasDoSemestre({ avaliacoes, grades, turmas });
  const contratos = coberturaDeContratos(ativos, contratosAssinados);
  const turmaSit = situacaoDeTurma(ativos, turmas);

  const equipe = ped.porProfessor.map((p) => {
    const prof = professores.find((x) => x.id === p.id);
    const receita = receitaDoProfessor(students, prof, mesRef, ano);
    return { ...p, receitaMensal: receita.receitaMensal, alunosPagantes: receita.alunos };
  });

  // Frequência e registro entram na tabela de turmas do motor financeiro.
  const pedPorTurma = new Map(ped.porTurma.map((t) => [t.id, t]));
  const turmasDetalhe = R.detalhamentoTurmas
    .map((t) => ({ ...t, ped: pedPorTurma.get(t.id) || null }))
    .sort((a, b) => (a.professor || '').localeCompare(b.professor || '') || a.nome.localeCompare(b.nome));

  const alertas = [...R.alertas, ...alertasOperacionais({ ped, notas, contratos, turmaSit })];

  return {
    intervalo,
    situacao,
    params,
    R,
    variacoes,
    serie: serieMensal(base, mesRef, ano, 12),
    projecao: projecaoSimples({ payments: paymentsBase, expenses, mes: dataProjecao.getMonth(), ano: dataProjecao.getFullYear() }),
    plano: (() => {
      const financeiro = planoDeAcao(R, params);
      const juntos = [...financeiro.filter((x) => x.area !== 'Manutenção'), ...planoOperacional({ ped, notas, contratos, turmaSit })];
      return juntos.length ? juntos.sort((x, y) => x.prioridade - y.prioridade).slice(0, 9) : financeiro;
    })(),
    pontosDespesas: pontosDeMelhoriaDespesas(R),
    alunos: {
      ativos: ativos.length,
      motivos: motivosDeCancelamento(students, tri, ano),
      contratos,
      turmaSit,
      cursos: alunosPorCursoBook(ativos),
    },
    comercial: { funil: funilDeLeads(leads, tri, ano) },
    ped,
    notas,
    equipe,
    turmasDetalhe,
    alertas,
  };
}
