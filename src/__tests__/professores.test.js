/**
 * @jest-environment node
 */
import {
  resolverNomeProfessor,
  normalizarProfessoresDosAlunos,
  normalizarProfessoresDasTurmas,
} from '../utils/professores';

const PROFS = [
  { id: 'p1', nome: 'Bárbara Dias' },
  { id: 'p2', nome: 'Vera Machado' },
  { id: 'p3', nome: 'Fernando Machado' },
  { id: 'p4', nome: 'Ruan Machado' },
];

describe('resolverNomeProfessor', () => {
  it('usa o nome cadastrado quando há professorId', () => {
    expect(resolverNomeProfessor({ teacher: 'BÁRBARA', professorId: 'p1' }, PROFS)).toBe('Bárbara Dias');
  });

  it('resolve "BÁRBARA" em caixa alta sem professorId (primeiro nome)', () => {
    expect(resolverNomeProfessor({ teacher: 'BÁRBARA' }, PROFS)).toBe('Bárbara Dias');
  });

  it('ignora acento e caixa no nome completo', () => {
    expect(resolverNomeProfessor({ teacher: 'barbara DIAS' }, PROFS)).toBe('Bárbara Dias');
  });

  it('professorId desconhecido cai no texto', () => {
    expect(resolverNomeProfessor({ teacher: 'VERA', professorId: 'zzz' }, PROFS)).toBe('Vera Machado');
  });

  it('primeiro nome ambíguo não adivinha', () => {
    const dois = [...PROFS, { id: 'p5', nome: 'Vera Souza' }];
    expect(resolverNomeProfessor({ teacher: 'VERA' }, dois)).toBe('VERA');
  });

  it('nome desconhecido ou vazio é preservado', () => {
    expect(resolverNomeProfessor({ teacher: 'Yure' }, PROFS)).toBe('Yure');
    expect(resolverNomeProfessor({}, PROFS)).toBeUndefined();
  });
});

describe('normalizarProfessoresDosAlunos', () => {
  it('só cria objeto novo quando o nome muda', () => {
    const certo = { id: 'a', teacher: 'Vera Machado' };
    const errado = { id: 'b', teacher: 'VERA' };
    const [a, b] = normalizarProfessoresDosAlunos([certo, errado], PROFS);
    expect(a).toBe(certo);
    expect(b).toEqual({ id: 'b', teacher: 'Vera Machado' });
    expect(errado.teacher).toBe('VERA');
  });

  it('turmas usam o campo `professor`', () => {
    const [t] = normalizarProfessoresDasTurmas([{ id: 't', professor: 'BÁRBARA' }], PROFS);
    expect(t.professor).toBe('Bárbara Dias');
  });

  it('sem professores carregados devolve a mesma lista', () => {
    const lista = [{ id: 'a', teacher: 'VERA' }];
    expect(normalizarProfessoresDosAlunos(lista, [])).toBe(lista);
  });
});
