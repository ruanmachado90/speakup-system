/**
 * @jest-environment node
 */
import {
  MODO_PLANO,
  MODO_CORRECAO,
  classificarParcelas,
  sugerirVigencia,
  planoDeAlteracao,
  entradaHistorico,
  parcelaEmAberto,
} from '../utils/mensalidade';

// Cenário do usuário: aluno de R$ 200 matriculado em maio, 6 parcelas.
// Maio a julho pagas, agosto vencida e não paga, setembro e outubro a vencer.
// "Hoje" é 01/09/2026.
const HOJE = new Date(2026, 8, 1);

const parcela = (n, dia, over = {}) => ({
  id: `p${n}`,
  installmentNum: n,
  dueDate: `${dia}T00:00:00`,
  valuePlanned: 200,
  valuePaid: 0,
  status: 'Pendente',
  ...over,
});

const CARTEIRA = [
  parcela(1, '2026-05-10', { status: 'Pago', valuePaid: 200 }),
  parcela(2, '2026-06-10', { status: 'Pago', valuePaid: 200 }),
  parcela(3, '2026-07-10', { status: 'Pago', valuePaid: 200 }),
  parcela(4, '2026-08-10'), // vencida, em aberto
  parcela(5, '2026-09-10'), // a vencer
  parcela(6, '2026-10-10'), // a vencer
];

describe('parcelaEmAberto', () => {
  it('paga e cancelada são histórico; pendente e legado "Atrasado" estão em aberto', () => {
    expect(parcelaEmAberto({ status: 'Pago' })).toBe(false);
    expect(parcelaEmAberto({ status: 'cancelada' })).toBe(false);
    expect(parcelaEmAberto({ status: 'Pendente' })).toBe(true);
    expect(parcelaEmAberto({ status: 'Atrasado' })).toBe(true);
  });
});

describe('classificarParcelas', () => {
  it('separa fechadas, vencidas e a vencer pelo dia', () => {
    const c = classificarParcelas(CARTEIRA, HOJE);
    expect(c.fechadas.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(c.vencidas.map((p) => p.id)).toEqual(['p4']);
    expect(c.aVencer.map((p) => p.id)).toEqual(['p5', 'p6']);
  });

  it('parcela que vence HOJE ainda não está vencida', () => {
    const c = classificarParcelas([parcela(1, '2026-09-01')], HOJE);
    expect(c.vencidas).toHaveLength(0);
    expect(c.aVencer).toHaveLength(1);
  });
});

describe('sugerirVigencia', () => {
  it('sugere o próximo vencimento ainda não vencido', () => {
    expect(sugerirVigencia(CARTEIRA, HOJE)).toBe('2026-09-10');
  });

  it('sem parcela a vencer, cai em hoje', () => {
    expect(sugerirVigencia([parcela(1, '2026-01-10')], HOJE)).toBe('2026-09-01');
  });
});

describe('planoDeAlteracao — mudança de plano (o aluno reduziu a carga)', () => {
  const r = planoDeAlteracao(CARTEIRA, { fee: 100, modo: MODO_PLANO, aPartirDe: '2026-09-10', hoje: HOJE });

  it('altera só as parcelas de vigência em diante', () => {
    expect(r.alterar.map((a) => a.id)).toEqual(['p5', 'p6']);
    expect(r.alterar.every((a) => a.de === 200 && a.para === 100)).toBe(true);
  });

  it('a vencida de agosto NÃO é tocada — ele assistiu aula a R$ 200 e deve isso', () => {
    expect(r.mantidas.map((m) => m.id)).toEqual(['p4']);
    expect(r.mantidas[0]).toMatchObject({ valor: 200, vencida: true });
    expect(r.resumo.vencidasAlteradas).toBe(0);
    expect(r.resumo.vencidasMantidas).toBe(1);
  });

  it('não toca em parcela paga', () => {
    expect(r.fechadas).toBe(3);
    expect(r.alterar.map((a) => a.id)).not.toContain('p1');
  });

  it('a dívida em aberto cai só o que de fato foi reduzido no futuro', () => {
    // Antes: p4+p5+p6 = 600. Depois: 200 + 100 + 100 = 400.
    expect(r.resumo).toMatchObject({ dividaAntes: 600, delta: -200, dividaDepois: 400 });
  });

  it('resumo traz o intervalo para a prévia da tela', () => {
    expect(r.resumo).toMatchObject({ quantidade: 2, primeiro: '2026-09-10', ultimo: '2026-10-10' });
  });

  it('sem data informada usa a sugerida', () => {
    const semData = planoDeAlteracao(CARTEIRA, { fee: 100, modo: MODO_PLANO, hoje: HOJE });
    expect(semData.vigenteDesde).toBe('2026-09-10');
    expect(semData.alterar.map((a) => a.id)).toEqual(['p5', 'p6']);
  });

  it('vigência mais à frente deixa setembro no valor antigo', () => {
    const r2 = planoDeAlteracao(CARTEIRA, { fee: 100, modo: MODO_PLANO, aPartirDe: '2026-10-01', hoje: HOJE });
    expect(r2.alterar.map((a) => a.id)).toEqual(['p6']);
    expect(r2.mantidas.map((m) => m.id)).toEqual(['p4', 'p5']);
  });
});

describe('planoDeAlteracao — correção de cadastro (secretária digitou errado)', () => {
  const r = planoDeAlteracao(CARTEIRA, { fee: 100, modo: MODO_CORRECAO, hoje: HOJE });

  it('altera TODAS as em aberto, vencida inclusive', () => {
    expect(r.alterar.map((a) => a.id)).toEqual(['p4', 'p5', 'p6']);
    expect(r.resumo.vencidasAlteradas).toBe(1);
    expect(r.mantidas).toHaveLength(0);
  });

  it('ignora a data de vigência', () => {
    const comData = planoDeAlteracao(CARTEIRA, { fee: 100, modo: MODO_CORRECAO, aPartirDe: '2026-10-01', hoje: HOJE });
    expect(comData.alterar).toHaveLength(3);
    expect(comData.vigenteDesde).toBeNull();
  });

  it('continua sem tocar em parcela paga', () => {
    expect(r.alterar.map((a) => a.id)).not.toContain('p1');
  });

  it('mostra o quanto a dívida muda — é o aviso que a tela precisa dar', () => {
    expect(r.resumo).toMatchObject({ dividaAntes: 600, delta: -300, dividaDepois: 300 });
  });
});

describe('planoDeAlteracao — casos de borda', () => {
  it('aumento de mensalidade funciona igual, com delta positivo', () => {
    const r = planoDeAlteracao(CARTEIRA, { fee: 250, modo: MODO_PLANO, aPartirDe: '2026-09-10', hoje: HOJE });
    expect(r.resumo.delta).toBe(100);
    expect(r.resumo.dividaDepois).toBe(700);
  });

  it('parcela já no valor novo não gera escrita', () => {
    const mista = [parcela(5, '2026-09-10', { valuePlanned: 100 }), parcela(6, '2026-10-10')];
    const r = planoDeAlteracao(mista, { fee: 100, modo: MODO_PLANO, aPartirDe: '2026-09-10', hoje: HOJE });
    expect(r.alterar.map((a) => a.id)).toEqual(['p6']);
  });

  it('valor igual ao atual não altera nada', () => {
    const r = planoDeAlteracao(CARTEIRA, { fee: 200, modo: MODO_CORRECAO, hoje: HOJE });
    expect(r.alterar).toHaveLength(0);
    expect(r.resumo.delta).toBe(0);
  });

  it('parcela paga parcialmente é histórico e não entra na conta', () => {
    const r = planoDeAlteracao(
      [parcela(4, '2026-08-10', { status: 'Pago', valuePaid: 150 })],
      { fee: 100, modo: MODO_CORRECAO, hoje: HOJE },
    );
    expect(r.alterar).toHaveLength(0);
    expect(r.resumo.dividaAntes).toBe(0);
  });

  it('parcela sem vencimento só é corrigida no modo correção', () => {
    const semData = [{ id: 'x', status: 'Pendente', valuePlanned: 200, valuePaid: 0 }];
    expect(planoDeAlteracao(semData, { fee: 100, modo: MODO_PLANO, hoje: HOJE }).alterar).toHaveLength(0);
    expect(planoDeAlteracao(semData, { fee: 100, modo: MODO_CORRECAO, hoje: HOJE }).alterar).toHaveLength(1);
  });

  it('carteira vazia não quebra', () => {
    const r = planoDeAlteracao([], { fee: 100, hoje: HOJE });
    expect(r.alterar).toHaveLength(0);
    expect(r.resumo.dividaAntes).toBe(0);
  });
});

describe('entradaHistorico', () => {
  it('guarda de onde para onde, o motivo e desde quando', () => {
    expect(entradaHistorico({
      fee: 100, feeAnterior: 200, modo: MODO_PLANO, vigenteDesde: '2026-09-10', por: 'ruan@x.com', agora: 1759276800000,
    })).toEqual({
      fee: 100,
      feeAnterior: 200,
      modo: MODO_PLANO,
      vigenteDesde: '2026-09-10',
      por: 'ruan@x.com',
      registradoEm: 1759276800000,
    });
  });

  it('correção não tem vigência: vale para tudo em aberto', () => {
    const e = entradaHistorico({ fee: 100, feeAnterior: 200, modo: MODO_CORRECAO, vigenteDesde: '2026-09-10' });
    expect(e.vigenteDesde).toBeNull();
    expect(e.modo).toBe(MODO_CORRECAO);
  });
});
