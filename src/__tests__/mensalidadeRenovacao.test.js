import { planoDeAlteracao, sugerirVigencia, ehRenovacaoFutura, MODO_PLANO, MODO_CORRECAO } from '../utils/mensalidade';

// Aluno com o contrato de 2026 em aberto e a renovação de 2027 já efetivada
// (com reajuste e desconto). Em novembro a secretaria muda a mensalidade de 2026.
const p = (id, dueDate, extra = {}) => ({ id, dueDate: `${dueDate}T00:00:00`, status: 'Pendente', valuePlanned: 189, valuePaid: 0, ...extra });
const parcelas = [
  p('nov26', '2026-11-10'),
  p('dez26', '2026-12-10'),
  p('jan27', '2027-01-10', { valuePlanned: 192.12, origem: 'renovacao', anoLetivo: 2027 }),
  p('fev27', '2027-02-10', { valuePlanned: 192.12, origem: 'renovacao', anoLetivo: 2027 }),
];
const novembro = new Date(2026, 10, 5);

describe('trava: mudar a mensalidade de 2026 não mexe na renovação de 2027', () => {
  it('modo plano: altera só 2026', () => {
    const plano = planoDeAlteracao(parcelas, { fee: 150, modo: MODO_PLANO, aPartirDe: '2026-11-01', hoje: novembro });
    expect(plano.alterar.map((a) => a.id)).toEqual(['nov26', 'dez26']);
    expect(plano.mantidas.filter((m) => m.renovacaoFutura).map((m) => m.id)).toEqual(['jan27', 'fev27']);
  });

  it('modo correção (que mexe em tudo em aberto) também respeita a renovação', () => {
    const plano = planoDeAlteracao(parcelas, { fee: 150, modo: MODO_CORRECAO, hoje: novembro });
    expect(plano.alterar.map((a) => a.id)).toEqual(['nov26', 'dez26']);
  });

  it('vigência sugerida ignora a renovação futura', () => {
    const so2027 = parcelas.filter((x) => x.origem === 'renovacao');
    expect(sugerirVigencia(so2027, novembro)).toBe('2026-11-05'); // cai em hoje, não em jan/2027
  });

  it('em 2027 a renovação é o contrato vigente e volta a ser alterável', () => {
    const fevereiro = new Date(2027, 1, 1);
    expect(ehRenovacaoFutura(parcelas[2], fevereiro)).toBe(false);
    const plano = planoDeAlteracao(parcelas, { fee: 200, modo: MODO_PLANO, aPartirDe: '2027-02-01', hoje: fevereiro });
    expect(plano.alterar.map((a) => a.id)).toEqual(['fev27']);
  });
});
