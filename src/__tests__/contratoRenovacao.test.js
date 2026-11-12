/**
 * Contrato do ano letivo (renovação): quadro resumo com os valores do plano
 * escolhido, e o PDF gera de ponta a ponta sem lançar.
 */

jest.mock('../assets/logo-speakup-azul.png', () => 'logo.png', { virtual: true });

const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

beforeAll(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error('sem rede no teste')));
});

const { gerarContratoPDF, quadroDaRenovacao } = require('../utils/contrato');

const contrato = {
  nome: 'Maria Souza', cpf: '52998224725', alunoNome: 'Ana Souza', anoLetivo: 2027, cursoAtual: 'TEENS',
  planoRotulo: '12 parcelas', mensalidadeCentavos: 26750, pagamentos: 12, valorPagamentoCentavos: 25814,
  totalCentavos: 309768,
  desconto: { id: 'renovacao_no_prazo', nome: 'Renovação no prazo', pct: 3.5, condicao: { primeiraParcelaPagaAte: '2027-01-10', emDia: true } },
  diaVencimento: 10, vencimentos: ['2027-01-10'], formaPagamento: 'PIX',
};

describe('contrato da renovação', () => {
  it('quadro resumo com os valores escolhidos', () => {
    const campos = Object.fromEntries(quadroDaRenovacao(contrato).flat());
    expect(campos).toMatchObject({
      Contratante: 'Maria Souza',
      'CPF do contratante': '529.982.247-25',
      'Ano letivo': '2027',
      Plano: '12 parcelas',
      'Mensalidade de referência': 'R$ 267,50',
      Pagamento: '12x de R$ 258,14',
      Desconto: 'Renovação no prazo (3,5%)',
      'Total do ano': 'R$ 3.097,68',
      Vencimento: 'dia 10 · 1º em 10/01/2027',
      'Forma de pagamento': 'PIX',
      'Condição do desconto': '2026 em dia e 1ª paga até 10/01/2027',
    });
  });

  it('à vista e sem desconto', () => {
    const campos = Object.fromEntries(quadroDaRenovacao({ ...contrato, pagamentos: 1, valorPagamentoCentavos: 288900, desconto: null }).flat());
    expect(campos.Pagamento).toBe('R$ 2.889,00 (à vista)');
    expect(campos.Desconto).toBe('Sem desconto');
    expect(campos['Condição do desconto']).toBeUndefined();
  });

  it('PDF assinado gera sem erro', async () => {
    const blob = await gerarContratoPDF(
      { name: contrato.alunoNome, responsibleName: contrato.nome, responsibleCpf: contrato.cpf },
      { renovacao: contrato, assinatura: { nome: 'Maria Souza', cpf: contrato.cpf, timestamp: '01/12/2026, 12:00:00 (BRT)' }, retornarBlob: true },
    );
    expect(blob.size).toBeGreaterThan(1000);
  });
});
