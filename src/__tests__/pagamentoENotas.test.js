/**
 * @jest-environment node
 */
// useNotas importa o SDK do Firebase no topo; aqui só interessam as funções puras.
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({}));

import { montarBaixa } from '../utils/pagamento';
import { calcularMediaCategoria, calcularConceito } from '../hooks/useNotas';

describe('montarBaixa (dar baixa numa parcela)', () => {
  const noite = new Date(2026, 8, 24, 22, 30); // 22h30 local — UTC já é dia 25

  it('data padrão é o dia local, não o UTC', () => {
    const { dados } = montarBaixa({ status: 'Pendente' }, { valuePaid: '350' }, noite);
    expect(dados.paymentDate).toBe('2026-09-24');
  });

  it('grava paidAt só na primeira baixa', () => {
    expect(montarBaixa({}, { valuePaid: 350 }, noite).dados.paidAt).toBe(noite.getTime());
    expect(montarBaixa({ paidAt: 123 }, { valuePaid: 350 }, noite).dados.paidAt).toBeUndefined();
  });

  it('aceita vírgula e arredonda centavos', () => {
    expect(montarBaixa({}, { valuePaid: '350,456' }, noite).dados.valuePaid).toBe(350.46);
  });

  it('recusa valor zero, negativo ou texto', () => {
    ['0', '-10', 'abc', '', null].forEach((v) => {
      expect(montarBaixa({}, { valuePaid: v }, noite).erro).toMatch(/valor/);
    });
  });

  it('recusa baixa em parcela cancelada', () => {
    expect(montarBaixa({ status: 'cancelada' }, { valuePaid: 350 }, noite).erro).toMatch(/cancelada/);
  });

  it('respeita data, forma e banco informados', () => {
    const { dados } = montarBaixa({}, { valuePaid: 100, paymentDate: '2026-09-01', paymentMethod: 'Boleto', bank: 'Inter' }, noite);
    expect(dados).toMatchObject({ status: 'Pago', paymentDate: '2026-09-01', paymentMethod: 'Boleto', bank: 'Inter' });
  });
});

describe('calcularMediaCategoria (notas)', () => {
  const avs = [{ id: 'p1', pontos: 10 }, { id: 'p2', pontos: 20 }];

  it('média das porcentagens × máximo da categoria', () => {
    // 8/10 = 80%, 10/20 = 50% → média 65% de 50 = 32.5
    expect(calcularMediaCategoria(avs, { p1: 8, p2: 10 }, 50)).toBe(32.5);
  });

  it('prova sem nota lançada não conta (nem como zero)', () => {
    expect(calcularMediaCategoria(avs, { p1: 8 }, 50)).toBe(40);
    expect(calcularMediaCategoria(avs, { p1: 8, p2: '' }, 50)).toBe(40);
  });

  it('nenhuma nota → null (não zero)', () => {
    expect(calcularMediaCategoria(avs, {}, 50)).toBeNull();
  });

  it('prova com pontos 0 ou ausentes não gera NaN/Infinity', () => {
    expect(calcularMediaCategoria([{ id: 'x', pontos: 0 }, { id: 'y' }], { x: 5, y: 5 }, 50)).toBeNull();
    expect(calcularMediaCategoria([{ id: 'x', pontos: 0 }, ...avs], { x: 5, p1: 10 }, 50)).toBe(50);
  });

  it('nota acima do máximo da prova conta como 100%, nunca mais', () => {
    expect(calcularMediaCategoria(avs, { p1: 80 }, 50)).toBe(50);
  });

  it('nota salva como texto numérico funciona', () => {
    expect(calcularMediaCategoria(avs, { p1: '5' }, 50)).toBe(25);
  });
});

describe('calcularConceito', () => {
  it('faixas nos limites', () => {
    expect(calcularConceito(95)).toBe('A+');
    expect(calcularConceito(94.99)).toBe('A');
    expect(calcularConceito(60)).toBe('C-');
    expect(calcularConceito(59.9)).toBe('D');
    expect(calcularConceito(49)).toBe('F');
  });
});
