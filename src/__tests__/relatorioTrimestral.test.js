import {
  intervaloDoTrimestre, trimestreDe, situacaoDoPeriodo, serieMensal, motivosDeCancelamento, coberturaDeContratos,
  situacaoDeTurma, alunosPorCursoBook, funilDeLeads, frequenciaDasAulas, alunosEmRisco, pedagogicoDoTrimestre,
  notasDoSemestre, receitaDoProfessor,
} from '../utils/relatorioTrimestral';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

describe('período', () => {
  it('datas, meses e semestre do trimestre', () => {
    expect(intervaloDoTrimestre(3, 2026)).toMatchObject({
      inicio: '2026-10-01', fim: '2026-12-31', meses: ['2026-10', '2026-11', '2026-12'], semestre: '2026-2', faixa: 'Out–Dez',
    });
    expect(intervaloDoTrimestre(0, 2027).fim).toBe('2027-03-31');
    expect(intervaloDoTrimestre(1, 2026).semestre).toBe('2026-1');
    expect(trimestreDe('2026-11-03')).toEqual({ tri: 3, ano: 2026 });
  });
  it('fechado, parcial ou futuro', () => {
    const t = intervaloDoTrimestre(3, 2026);
    expect(situacaoDoPeriodo(t, '2026-11-03')).toEqual({ tipo: 'parcial', ate: '2026-11-03' });
    expect(situacaoDoPeriodo(t, '2027-01-05').tipo).toBe('fechado');
    expect(situacaoDoPeriodo(t, '2026-09-30').tipo).toBe('futuro');
  });
});

describe('alunos', () => {
  const students = [
    { id: 'a', status: 'ativo', createdAt: '2026-01-10', course: 'TEENS', book: 2, fee: 300, teacher: 'Bárbara Dias' },
    { id: 'b', status: 'ativo', createdAt: '2026-02-10', course: 'TEENS', book: 2, fee: 320, professorId: 'p1' },
    { id: 'c', status: 'cancelado', createdAt: '2026-01-10', canceledAt: '2026-10-15', cancelReason: 'Financeiro' },
    { id: 'd', status: 'cancelado', createdAt: '2026-01-10', canceledAt: '2026-11-02', cancelReason: 'qualquer texto' },
    { id: 'e', status: 'cancelado', createdAt: '2026-01-10', canceledAt: '2026-11-03' },
    { id: 'f', status: 'cancelado', createdAt: '2026-01-10', canceledAt: '2026-08-03', cancelReason: 'Financeiro' },
  ];

  it('motivos de cancelamento do trimestre, fora da lista vira "Outro"', () => {
    expect(motivosDeCancelamento(students, 3, 2026)).toEqual(expect.arrayContaining([
      { motivo: 'Financeiro', qtd: 1 }, { motivo: 'Outro', qtd: 1 }, { motivo: 'Sem motivo registrado', qtd: 1 },
    ]));
    expect(motivosDeCancelamento(students, 3, 2026)).toHaveLength(3);
  });

  it('contratos, sem turma / várias turmas, curso + book', () => {
    const ativos = students.filter((s) => s.status === 'ativo');
    expect(coberturaDeContratos(ativos, new Set(['a']))).toEqual({ assinados: 1, total: 2, pct: 50 });
    expect(situacaoDeTurma(ativos, [{ alunosIds: ['a'] }, { alunosIds: [{ id: 'a' }] }])).toEqual({ semTurma: 1, emVarias: 1 });
    expect(alunosPorCursoBook(ativos)).toEqual([{ grupo: 'TEENS 2', qtd: 2 }]);
  });

  it('receita atribuída ao professor por id ou nome', () => {
    expect(receitaDoProfessor(students, { id: 'p1', nome: 'Bárbara Dias' }, 9, 2026)).toEqual({ alunos: 2, receitaMensal: 620 });
  });

  it('série de 12 meses termina no mês pedido', () => {
    const s = serieMensal({ students, payments: [], expenses: [], leads: [], vendas: [] }, 11, 2026, 12);
    expect(s).toHaveLength(12);
    expect(s[11].rotulo).toMatch(/dez/i);
    expect(s[0].rotulo).toMatch(/jan/i);
  });
});

describe('comercial', () => {
  it('funil por status dos leads criados no trimestre', () => {
    const leads = [
      { createdAt: '2026-10-02', status: 'novo' },
      { createdAt: '2026-10-05', status: 'Matriculado' },
      { createdAt: '2026-11-01', status: 'perdido' },
      { createdAt: '2026-09-30', status: 'novo' },
    ];
    expect(funilDeLeads(leads, 3, 2026)).toEqual({ total: 3, novo: 1, contato: 0, matriculado: 1, perdido: 1, outros: 0 });
  });
});

describe('pedagógico', () => {
  const turma = {
    id: 't1', nome: 'GE 5', professor: 'Bárbara Dias', professorId: 'p1', alunosIds: ['a', 'b'],
    horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:30' }],
  };
  const aulas = [
    { turmaId: 't1', turmaNome: 'GE 5', data: '2026-10-06', status: 'realizada', conteudo: 'Unit 1', chamadas: [{ alunoId: 'a', status: 'presente' }, { alunoId: 'b', status: 'falta' }] },
    { turmaId: 't1', turmaNome: 'GE 5', data: '2026-10-13', status: 'realizada', conteudo: '', chamadas: [{ alunoId: 'a', status: 'presente' }, { alunoId: 'b', status: 'falta' }] },
    { turmaId: 't1', turmaNome: 'GE 5', data: '2026-10-20', status: 'realizada', conteudo: 'Unit 2', chamadas: [{ alunoId: 'a', status: 'presente' }, { alunoId: 'b', status: 'presente' }] },
  ];

  it('frequência e alunos abaixo de 75%', () => {
    expect(frequenciaDasAulas(aulas)).toEqual({ pct: (4 / 6) * 100, presentes: 4, total: 6 });
    const risco = alunosEmRisco(aulas, { students: [{ id: 'b', name: 'Beto', status: 'ativo' }] });
    expect(risco.map((r) => [r.nome, Math.round(r.pct)])).toEqual([['Beto', 33]]);
  });

  it('previstas × dadas × não registradas, avulsas e horas, por professor', () => {
    const p = pedagogicoDoTrimestre({
      turmas: [turma], aulas,
      avulsas: [{ id: 'v', tipo: 'reposicao', data: '2026-10-08', inicio: '14:00', fim: '15:00', turmaId: 't1', professorId: 'p1' }],
      students: [{ id: 'a', status: 'ativo' }, { id: 'b', status: 'ativo' }],
      professores: [{ id: 'p1', nome: 'Bárbara Dias' }],
      intervalo: intervaloDoTrimestre(3, 2026), hojeISO: '2026-10-28', agoraMin: 0,
      params: { valorHoraAula: 20, encargosProfessorPct: 50 },
    });
    // terças de out até 28/10: 06, 13, 20, 27 → 3 dadas + 1 não registrada
    expect(p.geral).toMatchObject({ previstas: 4, dadas: 3, naoRegistradas: 1, reposicoes: 1, minutosDados: 3 * 90 + 60, semConteudo: 1 });
    expect(p.geral.registroPct).toBe(75);
    expect(p.porProfessor[0]).toMatchObject({ nome: 'Bárbara Dias', turmas: 1, dadas: 3, reposicoes: 1, custoEstimado: (330 / 60) * 30 });
    expect(p.porTurma[0]).toMatchObject({ nome: 'GE 5', previstas: 4, dadas: 3 });
  });
});

describe('notas', () => {
  it('total só com as 3 partes, média por turma e conceitos', () => {
    const avaliacoes = [
      { id: 'w', turmaId: 't1', tipo: 'written', pontos: 10 },
      { id: 'l', turmaId: 't1', tipo: 'listening', pontos: 10 },
      { id: 's', turmaId: 't1', tipo: 'speaking', pontos: 10 },
    ];
    const grades = [
      { turmaId: 't1', studentId: 'a', scores: { w: 10, l: 10, s: 10 } }, // 100 → A+
      { turmaId: 't1', studentId: 'b', scores: { w: 5, l: 5, s: 5 } }, // 50 → D
      { turmaId: 't1', studentId: 'c', scores: { w: 8 } }, // incompleto
    ];
    const n = notasDoSemestre({ avaliacoes, grades, turmas: [{ id: 't1', nome: 'GE 5' }] });
    expect(n).toMatchObject({ alunosComNota: 3, alunosComTotal: 2, media: 75, abaixoDe60: 1 });
    expect(n.conceitos['A+']).toBe(1);
    expect(n.conceitos.D).toBe(1);
    expect(n.porTurma).toEqual([{ id: 't1', nome: 'GE 5', professor: '—', media: 75, alunos: 2 }]);
  });
});
