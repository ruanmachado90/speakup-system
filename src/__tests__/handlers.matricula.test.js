/**
 * @jest-environment node
 *
 * Fluxo de matrícula ↔ cancelamento ↔ reativação contra um Firestore em
 * memória: é onde um bug mexe com dinheiro (parcelas) e com turma (alunosIds).
 */
jest.mock('firebase/firestore', () => require('../testUtils/firestoreFake').modulo);
jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const fake = require('../testUtils/firestoreFake');
const {
  saveStudent,
  confirmarPreCadastro,
  descartarPreCadastro,
  handleDeleteStudent,
  handleCancelEnrollment,
  handleReactivateEnrollment,
  removerCanceladosDasTurmas,
} = require('../utils/handlers');

const B = 'artifacts/speakup-manager/public/data';
const ALUNO = `${B}/students`;
const PARC = `${B}/payments`;

const toast = jest.fn();
// Os testes de falha simulada fazem o handler logar o erro (esperado): silencia.
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
beforeEach(() => { fake.limpar(); toast.mockClear(); });

const parcelasDe = (studentId) => fake.todos(PARC).filter((p) => p.studentId === studentId);

/** Formulário do "Nova Matrícula" como o navegador entrega (FormData). */
const formulario = (campos) => {
  const fd = new FormData();
  Object.entries(campos).forEach(([k, v]) => fd.set(k, v));
  return { preventDefault: jest.fn(), target: { __fd: fd } };
};
// handlers usam new FormData(e.target): no node basta devolver o próprio FormData.
const realFormData = global.FormData;
beforeAll(() => {
  global.FormData = function FormDataProxy(alvo) { return alvo && alvo.__fd ? alvo.__fd : new realFormData(); };
});
afterAll(() => { global.FormData = realFormData; });

const campos = (extra = {}) => ({
  name: ' Ana Souza ', cpf: '123.456.789-00', contact: '(32) 99999-0000', email: '',
  course: 'TEENS', book: '3', teacher: 'Vera Machado', professorId: 'p1',
  fee: '350', dueDate: '2026-10-10', installments: '3',
  installmentDates: JSON.stringify(['2026-10-10', '2026-11-10', '2026-12-10']),
  ...extra,
});

// Formulários usam FormData real do node (Node 18+), então montamos direto:
const submeter = (c, modal = { data: null }) => {
  const e = { preventDefault: jest.fn(), target: null };
  const fd = new realFormData();
  Object.entries(c).forEach(([k, v]) => fd.set(k, v));
  e.target = { __fd: fd };
  const setModal = jest.fn();
  const setSaving = jest.fn();
  return saveStudent(e, { uid: 'u1' }, modal, toast, setModal, setSaving).then(() => ({ setModal, setSaving }));
};

describe('saveStudent — matrícula nova', () => {
  it('cria aluno + parcelas de uma vez, com tipos certos e snapshot de curso/professor', async () => {
    await submeter(campos());
    const [aluno] = fake.todos(ALUNO);
    expect(aluno).toMatchObject({
      name: 'Ana Souza', course: 'TEENS', book: 3, teacher: 'Vera Machado', professorId: 'p1',
      fee: 350, installments: 3, status: 'ativo', source: 'balcao',
    });
    const ps = parcelasDe(aluno.id).sort((a, b) => a.installmentNum - b.installmentNum);
    expect(ps.map((p) => p.dueDate)).toEqual(['2026-10-10T00:00:00', '2026-11-10T00:00:00', '2026-12-10T00:00:00']);
    expect(ps.every((p) => p.valuePlanned === 350 && p.status === 'Pendente' && p.course === 'TEENS' && p.professorId === 'p1')).toBe(true);
  });

  it('data de parcela ajustada à mão é respeitada (semestralidade)', async () => {
    await submeter(campos({ installments: '2', installmentDates: JSON.stringify(['2026-10-10', '2027-03-10']) }));
    const ps = fake.todos(PARC).sort((a, b) => a.installmentNum - b.installmentNum);
    expect(ps.map((p) => p.dueDate.slice(0, 10))).toEqual(['2026-10-10', '2027-03-10']);
  });

  it('mensalidade inválida não grava nada', async () => {
    await submeter(campos({ fee: '0' }));
    expect(fake.todos(ALUNO)).toHaveLength(0);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/mensalidade/i));
  });

  it('falha no commit não deixa aluno sem parcelas (atomicidade)', async () => {
    fake.falharProximoCommit();
    await submeter(campos());
    expect(fake.todos(ALUNO)).toHaveLength(0);
    expect(fake.todos(PARC)).toHaveLength(0);
  });
});

describe('saveStudent — edição', () => {
  const semearAluno = () => {
    fake.semear(`${ALUNO}/a1`, { name: 'Ana', fee: 300, status: 'ativo' });
    fake.semear(`${PARC}/p1`, { studentId: 'a1', status: 'Pendente', valuePlanned: 300, studentName: 'Ana', dueDate: '2026-10-10T00:00:00' });
    fake.semear(`${PARC}/p2`, { studentId: 'a1', status: 'Pago', valuePlanned: 300, valuePaid: 300, studentName: 'Ana', dueDate: '2026-09-10T00:00:00' });
  };

  it('mensalidade nova vale só pras parcelas pendentes; paga fica intacta', async () => {
    semearAluno();
    await submeter(campos({ fee: '400' }), { data: { id: 'a1', fee: 300 } });
    expect(fake.ler(`${PARC}/p1`).valuePlanned).toBe(400);
    expect(fake.ler(`${PARC}/p2`)).toMatchObject({ valuePlanned: 300, valuePaid: 300, status: 'Pago' });
    expect(fake.ler(`${ALUNO}/a1`).fee).toBe(400);
  });

  it('editar não recalcula vencimentos nem mexe no nº de parcelas', async () => {
    semearAluno();
    await submeter(campos({ dueDate: '2027-01-01', installments: '9' }), { data: { id: 'a1', fee: 300 } });
    expect(fake.ler(`${PARC}/p1`).dueDate).toBe('2026-10-10T00:00:00');
    expect(fake.todos(PARC)).toHaveLength(2);
    expect(fake.ler(`${ALUNO}/a1`).installments).toBeUndefined();
  });
});

describe('confirmarPreCadastro', () => {
  const pre = {
    id: 'pc1', nome: 'Bia Lima', cpf: '111.222.333-44', celular: '(32) 98888-0000', email: 'bia@x.com',
    responsavelNome: 'Carla Lima', responsavelCpf: '555.666.777-88', responsavelEmail: 'carla@x.com',
    responsavelCelular: '(32) 97777-0000', formaPagamento: 'PIX', diaVencimento: '10',
  };
  const contrato = {
    course: 'KIDS', book: 2, teacher: 'Bruna Amorim', professorId: 'p2',
    fee: 239, dueDate: '2026-10-10', installments: 2, installmentDates: ['2026-10-10', '2026-11-10'],
  };

  it('copia CPF e e-mail do responsável (o contrato depende disso) e fecha o pré-cadastro', async () => {
    fake.semear(`${B}/pre-cadastros/pc1`, { status: 'pendente' });
    expect(await confirmarPreCadastro(pre, contrato, toast)).toBe(true);
    const [aluno] = fake.todos(ALUNO);
    expect(aluno).toMatchObject({
      name: 'Bia Lima', responsibleCpf: '555.666.777-88', responsibleEmail: 'carla@x.com',
      course: 'KIDS', teacher: 'Bruna Amorim', status: 'ativo', source: 'pre-cadastro', preCadastroId: 'pc1',
    });
    expect(parcelasDe(aluno.id)).toHaveLength(2);
    expect(fake.ler(`${B}/pre-cadastros/pc1`)).toMatchObject({ status: 'convertido', studentId: aluno.id });
  });

  it('falha no commit não cria aluno nem converte o pré-cadastro', async () => {
    fake.semear(`${B}/pre-cadastros/pc1`, { status: 'pendente' });
    fake.falharProximoCommit();
    expect(await confirmarPreCadastro(pre, contrato, toast)).toBe(false);
    expect(fake.todos(ALUNO)).toHaveLength(0);
    expect(fake.ler(`${B}/pre-cadastros/pc1`).status).toBe('pendente');
  });

  it('descartar marca como duplicado sem criar aluno', async () => {
    fake.semear(`${B}/pre-cadastros/pc1`, { status: 'pendente' });
    expect(await descartarPreCadastro('pc1', 'a9', toast)).toBe(true);
    expect(fake.ler(`${B}/pre-cadastros/pc1`)).toMatchObject({ status: 'duplicado', studentId: 'a9' });
    expect(fake.todos(ALUNO)).toHaveLength(0);
  });
});

describe('handleCancelEnrollment', () => {
  const HOJE = new Date(2026, 8, 24).getTime();
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(HOJE);
    fake.semear(`${ALUNO}/a1`, { name: 'Ana', status: 'ativo' });
    fake.semear('turmas/t1', { nome: 'TEENS 1', alunosIds: ['a1', 'a2'], alunosCount: 2 });
    fake.semear('turmas/t2', { nome: 'VIP', alunosIds: [{ id: 'a1', nome: 'Ana' }, { id: 'a3', nome: 'Caio' }], alunosCount: 2 });
    fake.semear('turmas/t3', { nome: 'KIDS', alunosIds: ['a9'], alunosCount: 1 });
    fake.semear(`${PARC}/vencida`, { studentId: 'a1', status: 'Pendente', dueDate: '2026-09-10T00:00:00', valuePlanned: 300 });
    fake.semear(`${PARC}/futura`, { studentId: 'a1', status: 'Pendente', dueDate: '2026-10-10T00:00:00', valuePlanned: 300 });
    fake.semear(`${PARC}/paga`, { studentId: 'a1', status: 'Pago', dueDate: '2026-08-10T00:00:00', valuePlanned: 300, valuePaid: 300 });
    fake.semear(`${PARC}/outra`, { studentId: 'a9', status: 'Pendente', dueDate: '2026-10-10T00:00:00', valuePlanned: 300 });
  });
  afterEach(() => jest.restoreAllMocks());

  it('tira o aluno das turmas (nos dois formatos), preserva os outros e o contador', async () => {
    expect(await handleCancelEnrollment('a1', toast, { motivo: 'Financeiro' })).toBe(true);
    expect(fake.ler('turmas/t1')).toMatchObject({ alunosIds: ['a2'], alunosCount: 1 });
    expect(fake.ler('turmas/t2')).toMatchObject({ alunosIds: [{ id: 'a3', nome: 'Caio' }], alunosCount: 1 });
    expect(fake.ler('turmas/t3')).toMatchObject({ alunosIds: ['a9'], alunosCount: 1 }); // outra turma intacta
  });

  it('registra motivo, data e as turmas de onde saiu', async () => {
    await handleCancelEnrollment('a1', toast, { motivo: 'Financeiro', observacao: 'mudou de cidade' });
    expect(fake.ler(`${ALUNO}/a1`)).toMatchObject({
      status: 'cancelado', canceledAt: HOJE, cancelReason: 'Financeiro', cancelNote: 'mudou de cidade',
      turmasNoCancelamento: [{ id: 't1', nome: 'TEENS 1' }, { id: 't2', nome: 'VIP' }],
      parcelasEmAbertoNoCancelamento: 1,
    });
  });

  it('cancela as parcelas que vencem de hoje em diante; vencida continua dívida; paga intacta', async () => {
    await handleCancelEnrollment('a1', toast, { motivo: 'Financeiro' });
    expect(fake.ler(`${PARC}/futura`)).toMatchObject({ status: 'cancelada', cancelReason: 'Financeiro' });
    expect(fake.ler(`${PARC}/vencida`).status).toBe('Pendente');
    expect(fake.ler(`${PARC}/paga`)).toMatchObject({ status: 'Pago', valuePaid: 300 });
    expect(fake.ler(`${PARC}/outra`).status).toBe('Pendente'); // de outro aluno
  });

  it('dívida perdoada (manterVencidas=false) cancela também a vencida', async () => {
    await handleCancelEnrollment('a1', toast, { motivo: 'Financeiro', manterVencidas: false });
    expect(fake.ler(`${PARC}/vencida`).status).toBe('cancelada');
  });

  it('falha no commit não deixa nada pela metade', async () => {
    fake.falharProximoCommit();
    expect(await handleCancelEnrollment('a1', toast, { motivo: 'Financeiro' })).toBe(false);
    expect(fake.ler(`${ALUNO}/a1`).status).toBe('ativo');
    expect(fake.ler('turmas/t1').alunosIds).toEqual(['a1', 'a2']);
    expect(fake.ler(`${PARC}/futura`).status).toBe('Pendente');
  });
});

describe('handleReactivateEnrollment', () => {
  const contrato = {
    fee: 300, dueDate: '2026-11-10', installments: 2, installmentDates: ['2026-11-10', '2026-12-10'],
    studentName: 'Ana', course: 'TEENS', teacher: 'Vera Machado', professorId: 'p1',
  };
  beforeEach(() => {
    fake.semear(`${ALUNO}/a1`, {
      name: 'Ana', status: 'cancelado', canceledAt: 111, cancelReason: 'Financeiro', cancelNote: 'x',
      turmasNoCancelamento: [{ id: 't1', nome: 'TEENS 1' }], parcelasEmAbertoNoCancelamento: 1,
    });
    fake.semear('turmas/t1', { nome: 'TEENS 1', alunosIds: ['a2'], alunosCount: 1 });
  });

  it('reativa, guarda o cancelamento anterior no histórico e gera as parcelas', async () => {
    expect(await handleReactivateEnrollment('a1', contrato, toast)).toBe(true);
    const a = fake.ler(`${ALUNO}/a1`);
    expect(a).toMatchObject({ status: 'ativo', canceledAt: null, cancelReason: null, fee: 300, installments: 2, turmasNoCancelamento: null });
    expect(a.historicoCancelamentos).toEqual([
      expect.objectContaining({ canceladoEm: 111, motivo: 'Financeiro', turmas: [{ id: 't1', nome: 'TEENS 1' }] }),
    ]);
    expect(parcelasDe('a1')).toHaveLength(2);
  });

  it('volta pra turma anterior só se marcado, sem duplicar', async () => {
    await handleReactivateEnrollment('a1', { ...contrato, voltarTurmaIds: ['t1'] }, toast);
    expect(fake.ler('turmas/t1')).toMatchObject({ alunosIds: ['a2', 'a1'], alunosCount: 2 });
  });

  it('sem marcar, não mexe na turma', async () => {
    await handleReactivateEnrollment('a1', contrato, toast);
    expect(fake.ler('turmas/t1').alunosIds).toEqual(['a2']);
  });

  it('ex-aluno vindo de pré-cadastro fecha o pré-cadastro junto', async () => {
    fake.semear(`${B}/pre-cadastros/pc1`, { status: 'pendente' });
    await handleReactivateEnrollment('a1', contrato, toast, { preCadastroId: 'pc1' });
    expect(fake.ler(`${B}/pre-cadastros/pc1`)).toMatchObject({ status: 'convertido', studentId: 'a1', reativacao: true });
  });

  it('falha no commit não reativa nem cria parcela', async () => {
    fake.falharProximoCommit();
    expect(await handleReactivateEnrollment('a1', contrato, toast)).toBe(false);
    expect(fake.ler(`${ALUNO}/a1`).status).toBe('cancelado');
    expect(parcelasDe('a1')).toHaveLength(0);
  });
});

describe('handleDeleteStudent', () => {
  it('apaga o aluno, cancela pendentes e preserva parcela paga (nunca deleta financeiro)', async () => {
    fake.semear(`${ALUNO}/a1`, { name: 'Ana' });
    fake.semear(`${PARC}/pend`, { studentId: 'a1', status: 'Pendente', dueDate: '2026-10-10T00:00:00' });
    fake.semear(`${PARC}/paga`, { studentId: 'a1', status: 'Pago', valuePaid: 300 });
    expect(await handleDeleteStudent('a1', toast)).toBe(true);
    expect(fake.existe(`${ALUNO}/a1`)).toBe(false);
    expect(fake.ler(`${PARC}/pend`)).toMatchObject({ status: 'cancelada', cancelReason: 'Aluno removido' });
    expect(fake.ler(`${PARC}/paga`)).toMatchObject({ status: 'Pago', valuePaid: 300 });
  });
});

describe('removerCanceladosDasTurmas (limpeza de legado)', () => {
  it('tira só cancelados, em qualquer formato, e registra de onde saíram', async () => {
    fake.semear(`${ALUNO}/c1`, { name: 'Cancelado', status: 'cancelado' });
    fake.semear(`${ALUNO}/v1`, { name: 'Ativo', status: 'ativo' });
    fake.semear('turmas/t1', { nome: 'A', alunosIds: ['c1', 'v1'], alunosCount: 2 });
    fake.semear('turmas/t2', { nome: 'B', alunosIds: [{ id: 'c1', nome: 'Cancelado' }], alunosCount: 1 });
    const turmas = [{ id: 't1', nome: 'A', alunosIds: ['c1', 'v1'] }, { id: 't2', nome: 'B', alunosIds: [{ id: 'c1', nome: 'Cancelado' }] }];
    const students = [{ id: 'c1', status: 'cancelado' }, { id: 'v1', status: 'ativo' }];

    expect(await removerCanceladosDasTurmas(turmas, students)).toBe(2);
    expect(fake.ler('turmas/t1')).toMatchObject({ alunosIds: ['v1'], alunosCount: 1 });
    expect(fake.ler('turmas/t2')).toMatchObject({ alunosIds: [], alunosCount: 0 });
    expect(fake.ler(`${ALUNO}/c1`).turmasNoCancelamento).toEqual([{ id: 't1', nome: 'A' }, { id: 't2', nome: 'B' }]);
  });

  it('nada a limpar → não escreve', async () => {
    expect(await removerCanceladosDasTurmas([{ id: 't1', alunosIds: ['v1'] }], [{ id: 'v1', status: 'ativo' }])).toBe(0);
  });
});
