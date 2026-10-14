import { recorrentesDoMes, baixaDeConta } from '../utils/despesasRecorrentes';
import { estaVencida, statusDe, vencimentoDe } from '../utils/despesasAnalise';

const despesa = (over = {}) => ({
  id: Math.random().toString(36).slice(2),
  description: 'Aluguel',
  category: 'Aluguel',
  value: 3000,
  paymentMethod: 'Pix',
  tipoSaida: 'operacional',
  recorrente: true,
  status: 'pago',
  date: '2026-09-10T12:00:00.000Z',
  month: 9,
  year: 2026,
  ...over,
});

const SET = { mes: 8, ano: 2026 };
const OUT = { mes: 9, ano: 2026 };

describe('recorrentesDoMes', () => {
  it('gera uma conta em aberto por recorrente, no mesmo dia do mês seguinte', () => {
    const { lancamentos, origem } = recorrentesDoMes([despesa()], { origem: SET, destino: OUT });
    expect(origem).toBe(1);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]).toMatchObject({
      description: 'Aluguel',
      value: 3000,
      status: 'pendente',
      month: 10,
      year: 2026,
      recorrente: true,
    });
    expect(lancamentos[0].vencimento.slice(0, 10)).toBe('2026-10-10');
    expect(lancamentos[0].date).toBe(lancamentos[0].vencimento);
  });

  it('não duplica conta que já existe no mês de destino, mesmo já paga', () => {
    const expenses = [
      despesa(),
      despesa({ date: '2026-10-10T12:00:00.000Z', month: 10, year: 2026 }),
    ];
    const r = recorrentesDoMes(expenses, { origem: SET, destino: OUT });
    expect(r.lancamentos).toHaveLength(0);
    expect(r.jaExistiam).toBe(1);
  });

  it('ignora despesa não recorrente e parcela de compra parcelada', () => {
    const expenses = [
      despesa({ description: 'Material', category: 'Materiais', recorrente: false }),
      despesa({ description: 'Notebook', category: 'Tecnologia', parcelas: 3, parcela: 1 }),
    ];
    expect(recorrentesDoMes(expenses, { origem: SET, destino: OUT }).lancamentos).toHaveLength(0);
  });

  it('mesma conta lançada duas vezes no mês de origem gera uma só', () => {
    const expenses = [despesa({ value: 3000 }), despesa({ value: 3100 })];
    expect(recorrentesDoMes(expenses, { origem: SET, destino: OUT }).lancamentos).toHaveLength(1);
  });

  it('dia 31 trava no último dia do mês de destino', () => {
    const e = despesa({ date: '2026-01-31T12:00:00.000Z', month: 1, year: 2026 });
    const r = recorrentesDoMes([e], { origem: { mes: 0, ano: 2026 }, destino: { mes: 1, ano: 2026 } });
    expect(r.lancamentos[0].vencimento.slice(0, 10)).toBe('2026-02-28');
  });

  it('vira o ano', () => {
    const e = despesa({ date: '2026-12-05T12:00:00.000Z', month: 12, year: 2026 });
    const r = recorrentesDoMes([e], { origem: { mes: 11, ano: 2026 }, destino: { mes: 0, ano: 2027 } });
    expect(r.lancamentos[0]).toMatchObject({ month: 1, year: 2027 });
  });
});

describe('baixaDeConta', () => {
  it('passa a paga e move a competência para o dia do pagamento', () => {
    expect(baixaDeConta('2026-11-03')).toMatchObject({
      status: 'pago',
      date: '2026-11-03T12:00:00.000Z',
      month: 11,
      year: 2026,
    });
  });
});

describe('status e vencimento', () => {
  const hoje = new Date(2026, 9, 15);

  it('lançamento legado sem status é pago', () => {
    expect(statusDe({ value: 10 })).toBe('pago');
    expect(estaVencida({ value: 10, date: '2020-01-01T12:00:00.000Z' }, hoje)).toBe(false);
  });

  it('em aberto com vencimento no passado está vencida', () => {
    expect(estaVencida({ status: 'pendente', vencimento: '2026-10-10T12:00:00.000Z' }, hoje)).toBe(true);
  });

  it('em aberto com vencimento futuro não está vencida', () => {
    expect(estaVencida({ status: 'pendente', vencimento: '2026-10-20T12:00:00.000Z' }, hoje)).toBe(false);
  });

  it('vencimento cai no dia certo em horário local', () => {
    expect(vencimentoDe({ vencimento: '2026-10-01T12:00:00.000Z' }).getDate()).toBe(1);
  });
});
