// Aula cancelada com quem cancelou (canceladaPor), 06/11/2026: o status
// continua 'cancelada'; o campo novo separa professor × aluno.
import { rotuloSemAula, contarCanceladas, rotuloQuemCancelou } from '../utils/agendaProfessor';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

describe('rotuloSemAula', () => {
  test('cancelada mostra quem cancelou', () => {
    expect(rotuloSemAula({ status: 'cancelada', canceladaPor: 'professor' })).toBe('Cancelada pelo professor');
    expect(rotuloSemAula({ status: 'cancelada', canceladaPor: 'aluno' })).toBe('Cancelada pelo aluno');
  });
  test('registro antigo, sem canceladaPor, continua "Cancelada"', () => {
    expect(rotuloSemAula({ status: 'cancelada' })).toBe('Cancelada');
  });
  test('feriado e recesso', () => {
    expect(rotuloSemAula({ status: 'feriado' })).toBe('Feriado');
    expect(rotuloSemAula({ status: 'recesso' })).toBe('Recesso');
  });
});

describe('contarCanceladas / rotuloQuemCancelou', () => {
  const aulas = [
    { status: 'realizada' },
    { status: 'cancelada', canceladaPor: 'professor' },
    { status: 'cancelada', canceladaPor: 'professor' },
    { status: 'cancelada', canceladaPor: 'aluno' },
    { status: 'cancelada' },
  ];
  test('separa por quem cancelou; as antigas só entram no total', () => {
    expect(contarCanceladas(aulas)).toEqual({ canceladas: 4, canceladasProf: 2, canceladasAluno: 1 });
  });
  test('rótulo com a divisão', () => {
    expect(rotuloQuemCancelou(contarCanceladas(aulas))).toBe('2 prof. · 1 aluno · 1 sem registro');
    expect(rotuloQuemCancelou(contarCanceladas(aulas.slice(0, 4)))).toBe('2 prof. · 1 aluno');
  });
});
