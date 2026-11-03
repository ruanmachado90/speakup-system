import {
  planejarAlunosDaTurma, registroDeTurma, outrasTurmasDoAluno, turmasDoHistorico,
} from '../utils/movimentacaoTurma';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const turmas = [
  { id: 'A', nome: 'TEENS 2', alunosIds: ['ana', 'beto'] },
  { id: 'B', nome: 'TEENS 3', alunosIds: [{ id: 'caio', nome: 'Caio' }] },
  { id: 'R', nome: 'REFORÇO', alunosIds: ['ana'] },
];

describe('troca de turma', () => {
  it('quem entra sai das outras turmas; quem sai é registrado', () => {
    const plano = planejarAlunosDaTurma({ turmaId: 'B', antes: turmas[1].alunosIds, depois: ['ana'], turmas });
    expect(plano.entraram).toEqual(['ana']);
    expect(plano.sairam).toEqual(['caio']);
    expect(plano.removerDe.map((r) => [r.turma.id, r.alunoId])).toEqual([['A', 'ana'], ['R', 'ana']]);
  });

  it('"manter nas duas" deixa o aluno onde está', () => {
    const plano = planejarAlunosDaTurma({ turmaId: 'B', antes: [], depois: ['ana'], turmas, manterNasDuas: ['ana'] });
    expect(plano.removerDe).toEqual([]);
  });

  it('editar a turma sem mexer nos alunos não move ninguém', () => {
    const plano = planejarAlunosDaTurma({ turmaId: 'A', antes: ['ana', 'beto'], depois: ['ana', 'beto'], turmas });
    expect(plano).toEqual({ entraram: [], sairam: [], removerDe: [] });
  });

  it('outras turmas do aluno, para o aviso no formulário', () => {
    expect(outrasTurmasDoAluno(turmas, 'ana', 'B').map((t) => t.id)).toEqual(['A', 'R']);
    expect(outrasTurmasDoAluno(turmas, 'caio', 'B')).toEqual([]);
  });

  it('registro de entrada/saída com data local', () => {
    const r = registroDeTurma({ id: 'A', nome: 'TEENS 2', professor: 'Vera Machado' }, 'saida', 'troca', new Date(2026, 10, 2, 22, 0));
    expect(r).toMatchObject({ turmaId: 'A', turmaNome: 'TEENS 2', professor: 'Vera Machado', evento: 'saida', motivo: 'troca', data: '2026-11-02' });
  });
});

describe('histórico pelas aulas', () => {
  it('acha as turmas em que o aluno teve chamada, mais recente primeiro', () => {
    const aulas = [
      { turmaId: 'A', turmaNome: 'TEENS 2', data: '2026-03-02', chamadas: [{ alunoId: 'ana' }] },
      { turmaId: 'A', turmaNome: 'TEENS 2', data: '2026-06-01', chamadas: [{ alunoId: 'ana' }] },
      { turmaId: 'B', turmaNome: 'TEENS 3', data: '2026-09-01', chamadas: [{ alunoId: 'ana' }] },
      { turmaId: 'C', turmaNome: 'KIDS', data: '2026-09-02', chamadas: [{ alunoId: 'outro' }] },
    ];
    const h = turmasDoHistorico(aulas, 'ana');
    expect(h.map((t) => [t.id, t.aulas, t.primeira, t.ultima])).toEqual([
      ['B', 1, '2026-09-01', '2026-09-01'],
      ['A', 2, '2026-03-02', '2026-06-01'],
    ]);
  });
});
