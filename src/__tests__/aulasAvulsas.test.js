import {
  validarAulaAvulsa, montarAulaAvulsa, avulsasDoProfessor, itensDeAvulsas, linhasDoRelatorio,
  totaisDoRelatorio, rotuloMes, ultimoDiaDoMes, somarMeses, aulasDeTurmasApagadas,
} from '../utils/aulasAvulsas';
import { ocorrenciasDaSemana, ocorrenciasDoMes, diasDaSemana, horarioDaTurmaNoDia } from '../utils/agendaProfessor';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const barbara = { id: 'p1', nome: 'Bárbara Dias' };
const turma = {
  id: 't1', nome: 'GE 5', professor: 'Bárbara Dias', professorId: 'p1', alunosIds: ['a1', 'a2'],
  horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:30' }],
};
const formOk = { tipo: 'reposicao', turmaId: 't1', data: '2026-11-04', inicio: '14:00', fim: '15:00', alunosIds: ['a1'], conteudo: 'Unit 3 review' };

describe('aula avulsa', () => {
  it('valida tipo, turma, horário, participantes e conteúdo', () => {
    expect(validarAulaAvulsa(formOk)).toBe('');
    expect(validarAulaAvulsa({ ...formOk, tipo: 'x' })).toMatch(/reposição ou aula extra/);
    expect(validarAulaAvulsa({ ...formOk, turmaId: '' })).toMatch(/turma/);
    expect(validarAulaAvulsa({ ...formOk, fim: '13:00' })).toMatch(/depois/);
    expect(validarAulaAvulsa({ ...formOk, alunosIds: [] })).toMatch(/participou/);
    expect(validarAulaAvulsa({ ...formOk, conteudo: '  ' })).toMatch(/conteúdo/);
  });

  it('grava só os alunos marcados, com o nome para as regras do Firestore', () => {
    const doc = montarAulaAvulsa(formOk, {
      turma, alunos: [{ id: 'a1', name: 'Ana' }, { id: 'a2', name: 'Beto' }], professorNome: 'Bárbara Dias', origem: 'professor',
    });
    expect(doc).toMatchObject({
      tipo: 'reposicao', turmaId: 't1', turmaNome: 'GE 5', alunos: [{ alunoId: 'a1', nome: 'Ana' }],
      professor: 'Bárbara Dias', professorKey: 'barbara dias', professorId: 'p1', origem: 'professor',
    });
  });

  it('é do professor pelo id, pelo nome ou pela turma', () => {
    const avulsas = [
      { id: '1', professorId: 'p1' },
      { id: '2', professorKey: 'barbara dias' },
      { id: '3', turmaId: 't1' },
      { id: '4', professorKey: 'bruna amorim', turmaId: 't9' },
    ];
    expect(avulsasDoProfessor(avulsas, barbara, [turma]).map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('vira item da grade no dia e horário dela', () => {
    const [item] = itensDeAvulsas([{ id: 'x', data: '2026-11-04', inicio: '14:00', fim: '15:00' }], diasDaSemana('2026-11-02'));
    expect(item).toMatchObject({ tipo: 'avulsa', diaIndice: 2, inicio: 840, fim: 900 });
  });
});

describe('aula registrada fora do dia da grade', () => {
  it('aparece no horário de costume da turma', () => {
    const dias = diasDaSemana('2026-11-02');
    const occ = ocorrenciasDaSemana([turma], dias, [{ turmaId: 't1', data: '2026-11-05', status: 'realizada' }], { hojeISO: '2026-11-09' });
    const fora = occ.find((o) => o.foraDaGrade);
    expect(fora).toMatchObject({ iso: '2026-11-05', diaIndice: 3, inicio: 1080, status: 'registrada' });
    expect(occ.find((o) => o.iso === '2026-11-03').status).toBe('pendente');
  });
});

describe('relatório do mês', () => {
  const aulas = [
    { turmaId: 't1', data: '2026-11-03', status: 'realizada', conteudo: 'Unit 4', chamadas: [{ status: 'presente' }, { status: 'falta' }] },
    { turmaId: 't1', data: '2026-11-10', status: 'cancelada' },
  ];
  const ocorrencias = ocorrenciasDoMes([turma], '2026-11', aulas, { hojeISO: '2026-11-20', agoraMin: 600 });

  it('cobre só as terças do mês, inclusive as que caem em semana que começa em outubro', () => {
    expect(ocorrencias.map((o) => o.iso)).toEqual(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']);
  });

  it('linhas: dada, sem aula, não registrada e avulsa; futuro fica de fora', () => {
    const avulsa = { id: 'v1', tipo: 'reposicao', data: '2026-11-04', inicio: '14:00', fim: '15:00', turmaNome: 'GE 5', alunos: [{ nome: 'Ana' }], conteudo: 'Review' };
    const linhas = linhasDoRelatorio(ocorrencias, [avulsa]);
    expect(linhas.map((l) => [l.iso, l.tipo, l.situacao])).toEqual([
      ['2026-11-03', 'regular', 'dada'],
      ['2026-11-04', 'reposicao', 'dada'],
      ['2026-11-10', 'regular', 'sem-aula'],
      ['2026-11-17', 'regular', 'nao-registrada'],
    ]);
    expect(linhas[0]).toMatchObject({ presentes: 1, total: 2, minutos: 90, conteudo: 'Unit 4' });
    expect(linhas[2].detalhe).toBe('Cancelada');
    expect(totaisDoRelatorio(linhas)).toEqual({
      aulasDadas: 1, avulsasDadas: 1, minutosDados: 150, semAula: 1, naoRegistradas: 1, horarioEstimado: false,
    });
  });

  it('aula de turma apagada entra pelo nome gravado; a de outro professor não', () => {
    const professores = [barbara, { id: 'p2', nome: 'Bruna Amorim' }];
    const aulasMes = [
      { id: 'o1', turmaId: 'velha', turmaNome: 'TEENS 2', professor: 'BÁRBARA', data: '2026-11-05', inicio: '10:00', fim: '11:00', status: 'realizada' },
      { id: 'o2', turmaId: 'velha', professor: 'Bruna Amorim', data: '2026-11-06', status: 'realizada' },
      { id: 'o3', turmaId: 't1', professor: 'Bárbara Dias', data: '2026-11-03' },
    ];
    const orfas = aulasDeTurmasApagadas(aulasMes, [turma], barbara, professores);
    expect(orfas.map((a) => a.id)).toEqual(['o1']);
    const [linha] = linhasDoRelatorio([], [], orfas);
    expect(linha).toMatchObject({ turmaNome: 'TEENS 2', minutos: 60, situacao: 'dada', turmaApagada: true, estimado: false });
  });

  it('enquanto as aulas carregam, nada vira "não registrada"', () => {
    const carregando = ocorrenciasDoMes([turma], '2026-11', [], { hojeISO: '2026-11-20', carregando: true });
    expect(carregando.every((o) => o.status !== 'pendente')).toBe(true);
    expect(linhasDoRelatorio(carregando, [])).toEqual([]);
  });

  it('horário gravado na aula vale mais que a grade atual', () => {
    const [o] = ocorrenciasDoMes([turma], '2026-11', [{ turmaId: 't1', data: '2026-11-03', inicio: '17:00', fim: '18:00' }], { hojeISO: '2026-11-04' });
    expect([o.inicio, o.fim]).toEqual([1020, 1080]);
    expect(horarioDaTurmaNoDia(turma, '2026-11-03')).toEqual({ inicio: '18:00', fim: '19:30' });
    expect(horarioDaTurmaNoDia(turma, '2026-11-04')).toBeNull();
  });

  it('datas do mês', () => {
    expect(rotuloMes('2026-11')).toBe('Novembro de 2026');
    expect(ultimoDiaDoMes('2026-02')).toBe('2026-02-28');
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
  });
});
