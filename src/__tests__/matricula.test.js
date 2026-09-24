/**
 * @jest-environment node
 */
import {
  proximaDataParaDia,
  datasDasParcelas,
  validarContrato,
  montarParcelas,
  lerCamposMatricula,
  alunosComMesmoCpf,
  turmasDoAluno,
  alunosIdsSem,
  alunosIdsCom,
  separarParcelasNoCancelamento,
} from '../utils/matricula';

describe('proximaDataParaDia', () => {
  it('usa o dia neste mês se ainda não passou', () => {
    expect(proximaDataParaDia('10', new Date(2026, 8, 5))).toBe('2026-09-10');
  });
  it('hoje conta como ainda não passou', () => {
    expect(proximaDataParaDia('5', new Date(2026, 8, 5))).toBe('2026-09-05');
  });
  it('pula pro mês seguinte se o dia já passou', () => {
    expect(proximaDataParaDia('5', new Date(2026, 8, 24))).toBe('2026-10-05');
  });
  it('vira o ano em dezembro', () => {
    expect(proximaDataParaDia('5', new Date(2026, 11, 20))).toBe('2027-01-05');
  });
  it('dia inexistente trava no último dia do mês', () => {
    expect(proximaDataParaDia('31', new Date(2026, 1, 3))).toBe('2026-02-28');
  });
  it('sem dia válido cai em hoje', () => {
    expect(proximaDataParaDia(undefined, new Date(2026, 8, 24))).toBe('2026-09-24');
  });
});

describe('datasDasParcelas', () => {
  it('uma por mês, mesmo dia', () => {
    expect(datasDasParcelas('2026-10-10', 3)).toEqual(['2026-10-10', '2026-11-10', '2026-12-10']);
  });
  it('respeita ajuste manual de uma parcela (semestralidade)', () => {
    expect(datasDasParcelas('2026-02-10', 2, { 1: '2026-07-10' })).toEqual(['2026-02-10', '2026-07-10']);
  });
  it('não estoura o mês com dia 31', () => {
    expect(datasDasParcelas('2026-01-31', 2)).toEqual(['2026-01-31', '2026-02-28']);
  });
});

describe('validarContrato', () => {
  const ok = { fee: 350, dueDate: '2026-10-10', installments: 12 };
  it('aceita contrato válido', () => expect(validarContrato(ok)).toBeNull());
  it('recusa mensalidade zero', () => expect(validarContrato({ ...ok, fee: 0 })).toMatch(/mensalidade/));
  it('recusa sem vencimento', () => expect(validarContrato({ ...ok, dueDate: null })).toMatch(/vencimento/));
  it('recusa parcelas fora de 1..24', () => {
    expect(validarContrato({ ...ok, installments: 0 })).toMatch(/parcelas/);
    expect(validarContrato({ ...ok, installments: 25 })).toMatch(/parcelas/);
    expect(validarContrato({ ...ok, installments: 1.5 })).toMatch(/parcelas/);
  });
});

describe('montarParcelas', () => {
  it('gera parcelas numeradas, numéricas e com snapshot de curso/professor', () => {
    const ps = montarParcelas({
      studentId: 's1', studentName: 'Ana', fee: '350', installmentDates: ['2026-10-10', '2026-11-10'],
      course: 'TEENS', professorId: 'p1',
    });
    expect(ps).toHaveLength(2);
    expect(ps[1]).toEqual({
      studentId: 's1', studentName: 'Ana', installmentNum: 2, valuePlanned: 350, valuePaid: 0,
      status: 'Pendente', month: 11, year: 2026, dueDate: '2026-11-10T00:00:00',
      course: 'TEENS', professorId: 'p1',
    });
  });
});

describe('lerCamposMatricula', () => {
  it('converte tipos e vazio vira null', () => {
    const fd = new FormData();
    fd.set('course', 'VIP 1');
    fd.set('book', '');
    fd.set('teacher', 'Vera Machado');
    fd.set('professorId', '');
    fd.set('fee', '350.50');
    fd.set('dueDate', '2026-10-10');
    fd.set('installments', '6');
    fd.set('installmentDates', '["2026-10-10"]');
    expect(lerCamposMatricula(fd)).toEqual({
      course: 'VIP 1', book: null, teacher: 'Vera Machado', professorId: null,
      fee: 350.5, dueDate: '2026-10-10', installments: 6, installmentDates: ['2026-10-10'],
    });
  });
  it('sem campos financeiros (edição) não inventa valores', () => {
    const fd = new FormData();
    fd.set('fee', '200');
    const c = lerCamposMatricula(fd);
    expect(c.installments).toBeUndefined();
    expect(c.installmentDates).toEqual([]);
  });
});

describe('turmas no cancelamento', () => {
  const turmas = [
    { id: 't1', nome: 'TEENS 1', alunosIds: ['a', 'b'] },
    { id: 't2', nome: 'VIP', alunosIds: [{ id: 'a', nome: 'Ana' }, { id: 'c', nome: 'Caio' }] },
    { id: 't3', nome: 'KIDS', alunosIds: ['c'] },
  ];
  it('acha o aluno nos dois formatos de alunosIds', () => {
    expect(turmasDoAluno(turmas, 'a').map((t) => t.id)).toEqual(['t1', 't2']);
  });
  it('remove sem mexer no formato dos demais', () => {
    expect(alunosIdsSem(turmas[1], 'a')).toEqual([{ id: 'c', nome: 'Caio' }]);
    expect(alunosIdsSem(turmas[0], 'a')).toEqual(['b']);
  });
  it('adiciona sem duplicar', () => {
    expect(alunosIdsCom(turmas[0], 'a')).toEqual(['a', 'b']);
    expect(alunosIdsCom(turmas[2], 'a')).toEqual(['c', 'a']);
  });
});

describe('separarParcelasNoCancelamento', () => {
  const hoje = new Date(2026, 8, 24);
  const parcelas = [
    { id: 'venc', dueDate: '2026-09-10T00:00:00' },
    { id: 'hoje', dueDate: '2026-09-24T00:00:00' },
    { id: 'fut', dueDate: '2026-10-10T00:00:00' },
  ];
  it('por padrão mantém vencidas (dívida) e cancela de hoje em diante', () => {
    const { cancelar, manter } = separarParcelasNoCancelamento(parcelas, hoje);
    expect(manter.map((p) => p.id)).toEqual(['venc']);
    expect(cancelar.map((p) => p.id)).toEqual(['hoje', 'fut']);
  });
  it('dívida perdoada: cancela tudo', () => {
    expect(separarParcelasNoCancelamento(parcelas, hoje, false).cancelar).toHaveLength(3);
  });
});

describe('alunosComMesmoCpf', () => {
  const alunos = [
    { id: 'a', name: 'Ana', cpf: '123.456.789-00', status: 'ativo' },
    { id: 'b', name: 'Bia', cpf: '98765432100', status: 'cancelado' },
    { id: 'c', name: 'Sem CPF', cpf: '' },
  ];
  it('ignora pontuação', () => {
    expect(alunosComMesmoCpf(alunos, '12345678900').map((s) => s.id)).toEqual(['a']);
    expect(alunosComMesmoCpf(alunos, '987.654.321-00').map((s) => s.id)).toEqual(['b']);
  });
  it('CPF incompleto ou vazio nunca bate', () => {
    expect(alunosComMesmoCpf(alunos, '123')).toEqual([]);
    expect(alunosComMesmoCpf(alunos, '')).toEqual([]);
  });
  it('exclui o próprio aluno', () => {
    expect(alunosComMesmoCpf(alunos, '12345678900', 'a')).toEqual([]);
  });
});
