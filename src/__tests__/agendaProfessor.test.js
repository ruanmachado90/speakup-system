import {
  inicioDaSemana, diasDaSemana, rotuloSemana, indiceDoDia, turmasDoProfessor, blocosDaTurma,
  horasSemanaisDaTurma, resumoDoProfessor, resumoHorario, criarDiaNaoLetivo, statusDaOcorrencia,
  ocorrenciasDaSemana, placarDeRegistro, itensDeEventos, validarEvento, textoRecadoEvento,
  posicionarNoDia, faixaDeHoras, fotoDoProfessor, iniciaisDoNome,
} from '../utils/agendaProfessor';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const barbara = { id: 'p1', nome: 'Bárbara Dias' };
const turmaTerQui = {
  id: 't1', professor: 'Bárbara Dias', professorId: 'p1', alunosIds: ['a1', 'a2'],
  horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:30' }, { dia: 'Quinta', horario: '18:00', horarioFim: '19:30' }],
};

describe('semana', () => {
  it('começa na segunda, inclusive quando o dia é domingo', () => {
    expect(inicioDaSemana('2026-11-04')).toBe('2026-11-02'); // quarta
    expect(inicioDaSemana('2026-11-08')).toBe('2026-11-02'); // domingo
    expect(inicioDaSemana('2026-11-02')).toBe('2026-11-02');
  });
  it('7 dias atravessando o mês', () => {
    expect(diasDaSemana('2026-10-26')).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
  });
  it('rótulo curto no mesmo mês, com os dois meses na virada', () => {
    expect(rotuloSemana('2026-11-02')).toBe('02 – 08 nov 2026');
    expect(rotuloSemana('2026-10-26')).toBe('26 out – 01 nov 2026');
  });
  it('nome do dia em qualquer grafia', () => {
    expect(['Segunda', 'terça-feira', 'SÁBADO', 'Dom', 'feriado'].map(indiceDoDia)).toEqual([0, 1, 5, 6, -1]);
  });
});

describe('foto', () => {
  it('pelo primeiro nome, com ou sem acento; sem foto devolve null', () => {
    expect(fotoDoProfessor('Bárbara Dias')).toBe('/professores/barbara.webp');
    expect(fotoDoProfessor('BRUNA')).toBe('/professores/bruna.webp');
    expect(fotoDoProfessor('Sofia Chaim')).toBe('/professores/sofia.webp');
    expect(fotoDoProfessor('Professor Novo')).toBeNull();
    expect(fotoDoProfessor('')).toBeNull();
    expect(iniciaisDoNome('Vera Machado')).toBe('VM');
  });
});

describe('turmas e números do professor', () => {
  it('casa por id ou por nome sem acento, sem pegar o de outro professor', () => {
    const turmas = [
      turmaTerQui,
      { id: 't2', professor: 'barbara dias' },
      { id: 't3', professor: 'Bruna Amorim' },
      { id: 't4', professor: 'Outro nome', professorId: 'p1' },
    ];
    expect(turmasDoProfessor(turmas, barbara).map((t) => t.id)).toEqual(['t1', 't2', 't4']);
  });

  it('blocos por dia com duração real; sem fim assume 1h', () => {
    expect(blocosDaTurma(turmaTerQui)).toEqual([
      { dia: 1, inicio: 1080, fim: 1170, estimado: false },
      { dia: 3, inicio: 1080, fim: 1170, estimado: false },
    ]);
    expect(blocosDaTurma({ horarios: [{ dia: 'Sábado', horario: '9:00' }] }))
      .toEqual([{ dia: 5, inicio: 540, fim: 600, estimado: true }]);
  });

  it('formato legado: dias + horário único', () => {
    expect(blocosDaTurma({ dias: 'Segunda, Quarta', horario: '19:00 - 20:00' }).map((b) => [b.dia, b.inicio, b.fim]))
      .toEqual([[0, 1140, 1200], [2, 1140, 1200]]);
    expect(blocosDaTurma({ dias: 'Segunda', horario: '' })).toEqual([]);
  });

  it('resumo do horário: junta dias iguais, separa quando difere', () => {
    expect(resumoHorario(turmaTerQui)).toBe('Ter, Qui · 18:00–19:30');
    expect(resumoHorario({ horarios: [{ dia: 'Sábado', horario: '09:00' }, { dia: 'Segunda', horario: '19:00', horarioFim: '20:00' }] }))
      .toBe('Seg 19:00–20:00 · Sáb 09:00');
    expect(resumoHorario({})).toBe('Sem horário cadastrado');
  });

  it('horas da semana e alunos sem repetir nem contar cancelado', () => {
    expect(horasSemanaisDaTurma(turmaTerQui)).toBe(3);
    const t2 = { id: 't2', alunosIds: ['a2', { id: 'a3', nome: 'x' }], horarios: [{ dia: 'Sexta', horario: '10:00', horarioFim: '11:00' }] };
    const t3 = { id: 't3', alunosIds: [], alunosCount: 4, horarios: [] };
    const students = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3', status: 'cancelado' }];
    expect(resumoDoProfessor([turmaTerQui, t2, t3], students))
      .toEqual({ turmas: 3, alunos: 6, horasSemana: 4, horarioEstimado: false });
  });
});

describe('situação de cada aula', () => {
  const base = { iso: '2026-11-03', fim: 1170, hojeISO: '2026-11-03', agoraMin: 1000 };
  it('registrada só quando realizada; cancelada/feriado contam como "sem aula"', () => {
    expect(statusDaOcorrencia({ ...base, aula: { status: 'realizada' } })).toBe('registrada');
    expect(statusDaOcorrencia({ ...base, aula: {} })).toBe('registrada');
    expect(statusDaOcorrencia({ ...base, aula: { status: 'cancelada' } })).toBe('cancelada');
  });
  it('hoje antes de terminar não é pendência; depois é', () => {
    expect(statusDaOcorrencia(base)).toBe('hoje');
    expect(statusDaOcorrencia({ ...base, agoraMin: 1170 })).toBe('pendente');
    expect(statusDaOcorrencia({ ...base, iso: '2026-11-02' })).toBe('pendente');
    expect(statusDaOcorrencia({ ...base, iso: '2026-11-05' })).toBe('prevista');
  });
  it('feriado sem registro não vira pendência', () => {
    expect(statusDaOcorrencia({ ...base, iso: '2026-11-02', naoLetivo: 'Finados' })).toBe('nao-letivo');
  });

  it('dias sem aula: feriado nacional e recesso do calendário', () => {
    const naoLetivo = criarDiaNaoLetivo({ recesso: [{ inicio: '2026-10-12', fim: '2026-10-16', nome: 'Semana da Criança' }] }, [2026]);
    expect(naoLetivo('2026-11-02')).toBe('Finados');
    expect(naoLetivo('2026-10-14')).toBe('Semana da Criança');
    expect(naoLetivo('2026-11-03')).toBeNull();
    expect(criarDiaNaoLetivo(null, [2026])('2026-10-14')).toBeNull();
  });

  it('monta a semana casando aula por turma + data', () => {
    const dias = diasDaSemana('2026-11-02');
    const aulas = [
      { turmaId: 't1', data: '2026-11-03', status: 'realizada' },
      { turmaId: 'outra', data: '2026-11-05' },
    ];
    const occ = ocorrenciasDaSemana([turmaTerQui], dias, aulas, { hojeISO: '2026-11-05', agoraMin: 600 });
    expect(occ.map((o) => [o.iso, o.status])).toEqual([['2026-11-03', 'registrada'], ['2026-11-05', 'hoje']]);
    expect(placarDeRegistro(occ)).toEqual({ registradas: 1, pendentes: 0, devidas: 1 });
  });

  it('com duas aulas no mesmo dia, a realizada prevalece', () => {
    const dias = diasDaSemana('2026-11-02');
    const aulas = [
      { turmaId: 't1', data: '2026-11-03', status: 'realizada' },
      { turmaId: 't1', data: '2026-11-03', status: 'cancelada' },
    ];
    const [primeira] = ocorrenciasDaSemana([turmaTerQui], dias, aulas, { hojeISO: '2026-11-09' });
    expect(primeira.status).toBe('registrada');
  });
});

describe('compromissos', () => {
  const evento = { id: 'e1', professorId: 'p1', titulo: 'Aula experimental', tipo: 'experimental', data: '2026-11-04', inicio: '15:00', fim: '15:45', aluno: 'Maria', link: 'https://meet.google.com/abc' };

  it('vira item da grade só se cair na semana', () => {
    const dias = diasDaSemana('2026-11-02');
    expect(itensDeEventos([evento], dias)[0]).toMatchObject({ diaIndice: 2, inicio: 900, fim: 945 });
    expect(itensDeEventos([{ ...evento, data: '2026-11-20' }], dias)).toEqual([]);
  });

  it('valida título, horário e link', () => {
    expect(validarEvento(evento)).toBe('');
    expect(validarEvento({ ...evento, titulo: ' ' })).toMatch(/título/);
    expect(validarEvento({ ...evento, fim: '14:00' })).toMatch(/depois/);
    expect(validarEvento({ ...evento, link: 'meet.google.com/abc' })).toMatch(/http/);
    expect(validarEvento({ ...evento, link: '' })).toBe('');
  });

  it('recado para o professor com dia, hora, aluno e link', () => {
    const texto = textoRecadoEvento(evento);
    expect(texto).toMatch(/^Novo na sua agenda: Aula experimental, quarta-feira, 04\/11, 15:00–15:45\./);
    expect(texto).toContain('Aluno: Maria.');
    expect(texto).toContain('https://meet.google.com/abc');
    expect(textoRecadoEvento(evento, 'cancelado')).not.toContain('meet');
  });
});

describe('layout da grade', () => {
  it('itens sobrepostos dividem a largura; os demais ocupam tudo', () => {
    const r = posicionarNoDia([
      { id: 'a', inicio: 600, fim: 660 },
      { id: 'b', inicio: 630, fim: 700 },
      { id: 'c', inicio: 700, fim: 760 },
    ]);
    const por = Object.fromEntries(r.map((i) => [i.id, [i.coluna, i.colunas]]));
    expect(por).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] });
  });

  it('faixa de horas cobre aulas cedo e tarde', () => {
    expect(faixaDeHoras([])).toEqual({ inicio: 480, fim: 1200 });
    expect(faixaDeHoras([{ inicio: 7 * 60 + 30, fim: 21 * 60 + 15 }])).toEqual({ inicio: 420, fim: 1320 });
  });
});
