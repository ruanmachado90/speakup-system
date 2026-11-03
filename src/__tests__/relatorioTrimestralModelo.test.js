import { montarRelatorioCompleto } from '../utils/relatorioTrimestralModelo';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

describe('relatório trimestral completo', () => {
  const dados = {
    tri: 3, ano: 2026, hojeISO: '2026-11-03',
    students: [
      { id: 'a', name: 'Ana', status: 'ativo', createdAt: '2026-02-01', fee: 300, course: 'TEENS', teacher: 'Bárbara Dias' },
      { id: 'b', name: 'Beto', status: 'cancelado', createdAt: '2026-02-01', canceledAt: '2026-10-10', cancelReason: 'Financeiro', fee: 300 },
    ],
    payments: [{ studentId: 'a', dueDate: '2026-10-10', status: 'Pago', valuePlanned: 300, valuePaid: 300, paymentDate: '2026-10-09' }],
    turmas: [{ id: 't1', nome: 'GE 5', professor: 'Bárbara Dias', professorId: 'p1', alunosIds: ['a'], maxAlunos: 8, horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:00' }] }],
    professores: [{ id: 'p1', nome: 'Bárbara Dias' }],
    aulas: [{ turmaId: 't1', turmaNome: 'GE 5', data: '2026-10-06', status: 'realizada', conteudo: 'U1', chamadas: [{ alunoId: 'a', status: 'presente' }] }],
    contratosAssinados: new Set(['a']),
  };

  it('junta financeiro, alunos, pedagógico, equipe e alertas sem quebrar', () => {
    const M = montarRelatorioCompleto(dados);
    expect(M.situacao).toEqual({ tipo: 'parcial', ate: '2026-11-03' });
    expect(M.intervalo.rotulo).toBe('4º trimestre de 2026');
    expect(M.R.atual.cancelamentos).toBe(1);
    expect(M.alunos).toMatchObject({ ativos: 1, contratos: { assinados: 1, total: 1, pct: 100 }, turmaSit: { semTurma: 0, emVarias: 0 } });
    expect(M.alunos.motivos).toEqual([{ motivo: 'Financeiro', qtd: 1 }]);
    expect(M.ped.geral).toMatchObject({ dadas: 1, frequencia: 100 });
    expect(M.equipe[0]).toMatchObject({ nome: 'Bárbara Dias', dadas: 1, receitaMensal: 300 });
    expect(M.turmasDetalhe[0].ped).toMatchObject({ dadas: 1 });
    expect(M.serie).toHaveLength(12);
    expect(M.alertas.some((a) => a.titulo === 'Aulas sem registro')).toBe(true); // terças de out/nov sem registro
  });

  it('período sem nada não quebra', () => {
    const M = montarRelatorioCompleto({ tri: 0, ano: 2020, hojeISO: '2026-11-03' });
    expect(M.situacao.tipo).toBe('fechado');
    expect(M.ped.geral.previstas).toBe(0);
    expect(M.notas.media).toBeNull();
  });
});
