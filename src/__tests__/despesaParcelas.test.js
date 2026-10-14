import {
  dividirEmParcelas,
  montarLancamentos,
  hojeLocalYMD,
  ymdParaData,
} from '../utils/despesaParcelas';
import { paraData } from '../utils/reportKPIs';

describe('dividirEmParcelas', () => {
  it('divide valor exato', () => {
    expect(dividirEmParcelas(1200, 3)).toEqual([400, 400, 400]);
  });

  it('joga a diferença de centavos na 1ª parcela e fecha o total', () => {
    const v = dividirEmParcelas(100, 3);
    expect(v).toEqual([33.34, 33.33, 33.33]);
    expect(Math.round(v.reduce((s, x) => s + x, 0) * 100)).toBe(10000);
  });

  it('parcelas inválidas viram 1', () => {
    expect(dividirEmParcelas(50, 0)).toEqual([50]);
  });
});

describe('montarLancamentos', () => {
  const base = { description: 'Notebook', category: 'Tecnologia', paymentMethod: 'Cartão de Crédito' };

  it('à vista: um lançamento sem campos de parcelamento', () => {
    const [l, ...resto] = montarLancamentos({ ...base, dataYMD: '2026-10-01', valor: 300 });
    expect(resto).toHaveLength(0);
    expect(l).toMatchObject({ value: 300, month: 10, year: 2026 });
    expect(l.parcela).toBeUndefined();
    expect(l.grupoParcelamento).toBeUndefined();
  });

  it('dia 1º fica no mês certo para quem lê pelo prefixo e para new Date()', () => {
    const [l] = montarLancamentos({ ...base, dataYMD: '2026-10-01', valor: 300 });
    expect(paraData(l.date).getMonth()).toBe(9);
    expect(new Date(l.date).getMonth()).toBe(9);
  });

  it('parcelado: um lançamento por mês, virando o ano', () => {
    const ls = montarLancamentos({ ...base, dataYMD: '2026-11-15', valor: 1200, parcelas: 3, grupoId: 'g1' });
    expect(ls.map((l) => [l.month, l.year])).toEqual([[11, 2026], [12, 2026], [1, 2027]]);
    expect(ls.map((l) => l.parcela)).toEqual([1, 2, 3]);
    expect(ls.every((l) => l.parcelas === 3 && l.valorTotal === 1200 && l.grupoParcelamento === 'g1')).toBe(true);
    expect(ls[0].description).toBe('Notebook');
  });

  it('dia 31 trava no último dia do mês em vez de pular mês', () => {
    const ls = montarLancamentos({ ...base, dataYMD: '2026-01-31', valor: 90, parcelas: 3, grupoId: 'g' });
    expect(ls.map((l) => l.date.slice(0, 10))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('data inválida lança erro', () => {
    expect(() => montarLancamentos({ ...base, dataYMD: '2026-02-30', valor: 10 })).toThrow();
  });
});

describe('datas locais', () => {
  it('hojeLocalYMD usa o dia local, não o UTC', () => {
    expect(hojeLocalYMD(new Date(2026, 8, 30, 22, 30))).toBe('2026-09-30');
  });

  it('ymdParaData aceita prefixo de ISO', () => {
    expect(ymdParaData('2026-10-01T00:00:00.000Z').getDate()).toBe(1);
  });
});
