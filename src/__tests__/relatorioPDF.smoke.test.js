/**
 * Smoke test: os geradores de PDF (mensal e trimestral) rodam de ponta a ponta
 * sem lançar, com dados realistas e com dados vazios. Não valida o visual —
 * só garante que o layout não tem referência quebrada / método inexistente.
 */

// Assets do Vite não resolvem no jest: mock como string simples.
jest.mock('../assets/fonts/Montserrat-Regular.ttf', () => 'regular.ttf', { virtual: true });
jest.mock('../assets/fonts/Montserrat-ExtraBold.ttf', () => 'extrabold.ttf', { virtual: true });
jest.mock('../assets/logo-speakup-azul.png', () => 'logo.png', { virtual: true });

// jsdom do jest não expõe TextEncoder/TextDecoder que o jsPDF (node build) usa.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

// carregarAssets() faz fetch das fontes/logo; sem rede no jest → devolve falha controlada
// (o gerador cai no fallback helvetica, sem logo — exatamente o caminho a testar).
let errSpy;
beforeAll(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error('sem rede no teste')));
  // o gerador loga a falha esperada de carregar fontes/logo — silencia no teste
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => errSpy && errSpy.mockRestore());

const { gerarRelatorioMensalPDF, gerarRelatorioTrimestralPDF } = require('../utils/relatorioMensal');

const dadosRealistas = () => {
  const students = [
    { id: 'a', createdAt: Date.UTC(2026, 0, 5), status: 'ativo', fee: 239, course: 'Kids', teacher: 'Vera' },
    { id: 'b', createdAt: Date.UTC(2026, 1, 10), status: 'ativo', fee: 270, course: 'Teens', teacher: 'Bruna' },
    { id: 'c', createdAt: Date.UTC(2025, 10, 1), status: 'cancelado', canceledAt: Date.UTC(2026, 2, 15), fee: 239, course: 'Kids', teacher: 'Vera' },
  ];
  const payments = [
    { studentId: 'a', studentName: 'Ana', valuePlanned: 239, valuePaid: 239, status: 'Pago', dueDate: '2026-03-10', paidAt: Date.UTC(2026, 2, 9), month: 3, year: 2026 },
    { studentId: 'b', studentName: 'Bia', valuePlanned: 270, valuePaid: 0, status: 'Pendente', dueDate: '2026-01-05', month: 1, year: 2026 },
    { studentId: 'c', studentName: 'Cadu', valuePlanned: 239, valuePaid: 0, status: 'cancelada', canceledAt: Date.now(), dueDate: '2026-03-10', month: 3, year: 2026 },
  ];
  const expenses = [
    { category: 'Aluguel', value: 3000, month: 3, year: 2026, recorrente: true, date: '2026-03-01' },
    { category: 'Marketing', value: 500, month: 3, year: 2026, date: '2026-03-05' },
  ];
  const leads = [
    { createdAt: Date.UTC(2026, 2, 2), status: 'novo' },
    { createdAt: Date.UTC(2026, 2, 8), status: 'matriculado', updatedAt: Date.UTC(2026, 2, 20) },
  ];
  const turmas = [
    { id: 't1', nome: 'Kids A', professor: 'Vera', maxAlunos: 6, horasMensais: 8, alunosIds: ['a'] },
    { id: 't2', nome: 'Teens B', professor: 'Bruna', maxAlunos: 8, horasMensais: 4, alunosIds: ['b'] },
  ];
  const vendas = [{ status: 'pago', valor: 180, dataPagamento: '2026-03-12' }];
  return { students, payments, expenses, leads, turmas, vendas };
};

describe('geradores de PDF do relatório (paisagem, slides)', () => {
  it('mensal: gera blob com dados realistas', async () => {
    const blob = await gerarRelatorioMensalPDF({ ...dadosRealistas(), mes: 2, ano: 2026, retornarBlob: true });
    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('mensal: gera com tudo vazio sem lançar', async () => {
    const blob = await gerarRelatorioMensalPDF({
      students: [], payments: [], expenses: [], leads: [], turmas: [], vendas: [],
      mes: 5, ano: 2026, retornarBlob: true,
    });
    expect(blob.size).toBeGreaterThan(500);
  });

  it('trimestral: gera blob com dados realistas', async () => {
    const blob = await gerarRelatorioTrimestralPDF({ ...dadosRealistas(), trimestre: 0, ano: 2026, retornarBlob: true });
    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('trimestral: gera com tudo vazio sem lançar', async () => {
    const blob = await gerarRelatorioTrimestralPDF({
      students: [], payments: [], expenses: [], leads: [], turmas: [], vendas: [],
      trimestre: 2, ano: 2026, retornarBlob: true,
    });
    expect(blob.size).toBeGreaterThan(500);
  });
});
