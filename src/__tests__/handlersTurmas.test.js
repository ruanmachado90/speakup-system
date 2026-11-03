/**
 * @jest-environment node
 *
 * Troca de turma contra o Firestore em memória: o aluno não pode ficar nas
 * duas turmas, e o histórico (entrada/saída) vai junto, no mesmo lote.
 */
jest.mock('firebase/firestore', () => require('../testUtils/firestoreFake').modulo);
jest.mock('../firebase', () => ({ db: {}, auth: {} }));
// O fake não tem documentId(): a busca por id lê o próprio fake.
jest.mock('../utils/buscarAlunos', () => {
  const real = jest.requireActual('../utils/buscarAlunos');
  const f = require('../testUtils/firestoreFake');
  return {
    ...real,
    buscarAlunosPorIds: async (ids) => ids
      .filter((id) => f.existe(`artifacts/speakup-manager/public/data/students/${id}`))
      .map((id) => ({ id, ...f.ler(`artifacts/speakup-manager/public/data/students/${id}`) })),
  };
});

const fake = require('../testUtils/firestoreFake');
const { colocarAlunoNaTurma, juntarMovimentacao } = require('../utils/handlersTurmas');
const { writeBatch } = require('firebase/firestore');

const ALUNO = 'artifacts/speakup-manager/public/data/students';

beforeEach(() => {
  fake.limpar();
  fake.semear(`${ALUNO}/ana`, { name: 'Ana', status: 'ativo' });
  fake.semear(`${ALUNO}/beto`, { name: 'Beto', status: 'ativo' });
  fake.semear('turmas/A', { nome: 'TEENS 2', professor: 'Vera Machado', alunosIds: ['ana', 'beto'], alunosCount: 2 });
  fake.semear('turmas/B', { nome: 'TEENS 3', professor: 'Bruna Amorim', alunosIds: [], alunosCount: 0 });
});

describe('colocarAlunoNaTurma (tela de Alunos)', () => {
  it('troca: entra na nova, sai da antiga e registra as duas pontas', async () => {
    const saiuDe = await colocarAlunoNaTurma('ana', 'B');
    expect(saiuDe.map((t) => t.id)).toEqual(['A']);
    expect(fake.ler('turmas/A')).toMatchObject({ alunosIds: ['beto'], alunosCount: 1 });
    expect(fake.ler('turmas/B')).toMatchObject({ alunosIds: ['ana'], alunosCount: 1 });
    const hist = fake.ler(`${ALUNO}/ana`).historicoTurmas;
    expect(hist.map((r) => [r.turmaId, r.evento, r.motivo])).toEqual([['A', 'saida', 'troca'], ['B', 'entrada', 'troca']]);
  });

  it('"manter nas duas" só adiciona', async () => {
    await colocarAlunoNaTurma('ana', 'B', { manterNasOutras: true });
    expect(fake.ler('turmas/A').alunosIds).toEqual(['ana', 'beto']);
    expect(fake.ler('turmas/B').alunosIds).toEqual(['ana']);
    expect(fake.ler(`${ALUNO}/ana`).historicoTurmas.map((r) => r.motivo)).toEqual(['turma']);
  });

  it('se o lote falha, nada muda (não fica meio trocado)', async () => {
    fake.falharProximoCommit();
    await expect(colocarAlunoNaTurma('ana', 'B')).rejects.toThrow();
    expect(fake.ler('turmas/A').alunosIds).toEqual(['ana', 'beto']);
    expect(fake.ler('turmas/B').alunosIds).toEqual([]);
  });
});

describe('juntarMovimentacao (formulário de Turmas)', () => {
  it('quem sai da turma vai pro histórico; id de aluno apagado não derruba o lote', async () => {
    fake.semear('turmas/A', { nome: 'TEENS 2', alunosIds: ['ana', 'beto', 'apagado'] });
    const batch = writeBatch();
    batch.update({ path: 'turmas/A' }, { alunosIds: ['ana'] });
    const plano = await juntarMovimentacao(batch, { turmaId: 'A', turma: { nome: 'TEENS 2' }, antes: ['ana', 'beto', 'apagado'], depois: ['ana'] });
    await batch.commit();
    expect(plano.sairam).toEqual(['beto', 'apagado']);
    expect(fake.ler(`${ALUNO}/beto`).historicoTurmas[0]).toMatchObject({ turmaId: 'A', evento: 'saida', motivo: 'removido' });
    expect(fake.existe(`${ALUNO}/apagado`)).toBe(false);
  });
});
