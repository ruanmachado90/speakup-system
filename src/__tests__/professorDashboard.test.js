import {
  mesDiaNascimento, getHorarioDia, nomeDiaSemana, dataDeISO, horaEmMinutos, compararHorario,
  datasPendentes, contarAlunos, totalAlunosUnicos, ordemDia, compararDiasTurma,
} from '../utils/professorDashboard';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

describe('dia da semana e datas', () => {
  it('nome do dia como as turmas gravam, por getDay()', () => {
    expect(nomeDiaSemana(dataDeISO('2026-10-14'))).toBe('Quarta');
    expect(nomeDiaSemana(dataDeISO('2026-10-18'))).toBe('Domingo');
  });
  it('dataDeISO é meia-noite local, não UTC', () => {
    const d = dataDeISO('2026-10-14');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 14, 0]);
  });
});

describe('ordenação por horário', () => {
  it('7:30 vem antes de 19:00 (antes comparava como texto)', () => {
    expect(['19:00', '7:30', '10:15'].sort(compararHorario)).toEqual(['7:30', '10:15', '19:00']);
  });
  it('lê o primeiro horário de texto legado; sem horário vai para o fim', () => {
    expect(horaEmMinutos('Seg 20:00 · Sex 07:00')).toBe(1200);
    expect(['', '08:00', 'a combinar'].sort(compararHorario)[0]).toBe('08:00');
    expect(compararHorario('', 'x')).toBe(0);
  });
});

describe('ordem da semana', () => {
  it('dias em ordem de semana, não alfabética', () => {
    expect(['Quarta', 'Segunda', 'Sábado', 'Terça'].sort((a, b) => ordemDia(a) - ordemDia(b)))
      .toEqual(['Segunda', 'Terça', 'Quarta', 'Sábado']);
  });
  it('turma pelo primeiro dia; empate, pelo horário; sem dia vai para o fim', () => {
    const t = [
      { nome: 'qua', dias: 'Quarta, Sexta', horario: '08:00' },
      { nome: 'seg-noite', dias: 'Segunda', horario: '19:00' },
      { nome: 'sem-dia', dias: '' },
      { nome: 'seg-manha', dias: 'Quinta, Segunda', horario: '7:30' },
    ];
    expect(t.sort(compararDiasTurma).map(x => x.nome)).toEqual(['seg-manha', 'seg-noite', 'qua', 'sem-dia']);
  });
});

describe('datasPendentes', () => {
  // 2026-10-14 é quarta. Turma de segunda e quarta.
  const turma = { dias: 'Segunda, Quarta' };
  it('não conta hoje, devolve as mais recentes primeiro, no máximo 2', () => {
    expect(datasPendentes(turma, [], '2026-10-14')).toEqual(['2026-10-12', '2026-10-07']);
  });
  it('dia registrado (inclusive feriado) não é pendente', () => {
    const aulas = [{ data: '2026-10-12', status: 'feriado' }];
    expect(datasPendentes(turma, aulas, '2026-10-14')).toEqual(['2026-10-07', '2026-10-05']);
  });
  it('tudo registrado → nada pendente', () => {
    const aulas = ['2026-10-12', '2026-10-07', '2026-10-05', '2026-09-30'].map(data => ({ data }));
    expect(datasPendentes(turma, aulas, '2026-10-14')).toEqual([]);
  });
});

describe('contagem de alunos', () => {
  const alunosPorTurma = {
    t1: [{ id: 'a' }, { id: 'b' }],
    t2: [{ id: 'b' }, { id: 'c' }],
  };
  it('bate com a lista exibida (id de aluno apagado não conta)', () => {
    expect(contarAlunos({ id: 't1', alunosIds: ['a', 'b', 'apagado'] }, alunosPorTurma)).toBe(2);
  });
  it('turma antiga com { id, nome } não conta duplicado', () => {
    const t = { id: 't1', alunosIds: [{ id: 'a', nome: 'A' }, { id: 'a', nome: 'A' }, 'b'] };
    expect(contarAlunos(t, alunosPorTurma)).toBe(2);
  });
  it('turma sem alunosIds usa o alunosCount gravado', () => {
    expect(contarAlunos({ id: 'tx', alunosCount: 7 }, alunosPorTurma)).toBe(7);
  });
  it('total do professor não conta duas vezes o aluno em duas turmas', () => {
    const turmas = [
      { id: 't1', alunosIds: [{ id: 'a' }, 'b'] },
      { id: 't2', alunosIds: ['b', 'c'] },
      { id: 'tx', alunosCount: 4 },
    ];
    expect(totalAlunosUnicos(turmas, alunosPorTurma)).toBe(3 + 4);
  });
});

describe('mesDiaNascimento', () => {
  it('aceita AAAA-MM-DD, DD/MM/AAAA, Timestamp e Date', () => {
    expect(mesDiaNascimento('2010-03-05')).toBe('03-05');
    expect(mesDiaNascimento('05/03/2010')).toBe('03-05');
    expect(mesDiaNascimento('5/3/10')).toBe('03-05');
    expect(mesDiaNascimento({ toDate: () => new Date(2010, 2, 5) })).toBe('03-05');
    expect(mesDiaNascimento(new Date(2010, 2, 5))).toBe('03-05');
  });

  it('formato desconhecido devolve null em vez de quebrar o painel', () => {
    expect(mesDiaNascimento('lixo')).toBeNull();
    expect(mesDiaNascimento(12345)).toBeNull();
    expect(mesDiaNascimento({})).toBeNull();
    expect(mesDiaNascimento(new Date('x'))).toBeNull();
    expect(mesDiaNascimento(null)).toBeNull();
  });
});

describe('getHorarioDia', () => {
  it('usa o horário do dia em horarios[] e cai no campo legado', () => {
    const turma = { horarios: [{ dia: 'Segunda', horario: '20:00' }], horario: 'Seg 20:00 · Sex 07:00' };
    expect(getHorarioDia(turma, 'Segunda')).toBe('20:00');
    expect(getHorarioDia(turma, 'Sexta')).toBe('20:00'); // legado: primeiro hh:mm
    expect(getHorarioDia({ horario: '' }, 'Segunda')).toBe('');
  });
});
