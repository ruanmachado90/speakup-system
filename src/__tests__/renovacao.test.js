import {
  paraCentavos, paraReais, reajustar, diaEmBrasilia, descontoAplicavel, calcularPlano, opcoesDePlano,
  planoDaCampanha, datasDosPagamentos, montarParcelasRenovacao, parcelasAntigasDoAno, contratoVaiAte,
  pendencias, grupoDoCurso, precisaRevisarValor, telefoneDeEnvio, irmaosPorResponsavel, gerarCodigo,
  STATUS, podeMudarStatus, perdeuDescontoNoPrazo,
} from '../utils/renovacao';
import { montarParcelas } from '../utils/matricula';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

// Campanha com as decisões do Ruan e datas de exemplo
const campanha = { ...CAMPANHA_PADRAO_2027, encerramento: '2026-12-15' };
const brt = (iso) => new Date(iso).getTime(); // instantes em UTC explícito

describe('dinheiro e reajuste', () => {
  it('centavos ↔ reais sem erro de ponto flutuante', () => {
    expect(paraCentavos(189)).toBe(18900);
    expect(paraCentavos(0.1 + 0.2)).toBe(30);
    expect(paraReais(20223)).toBe(202.23);
  });

  it('7% arredondado ao centavo (decisão do Ruan)', () => {
    expect(reajustar(18900, 7)).toBe(20223);     // R$ 189 → R$ 202,23
    expect(reajustar(20900, 7)).toBe(22363);     // R$ 209 → R$ 223,63
    expect(reajustar(50, 7)).toBe(54);           // VIP por hora R$ 0,50 → R$ 0,54
    expect(reajustar(18900, 7, 'real')).toBe(20200);
  });
});

describe('prazo no fuso de Brasília', () => {
  it('23h de 15/12 em Brasília ainda é 15/12 (já é 16/12 em UTC)', () => {
    expect(diaEmBrasilia(brt('2026-12-16T02:00:00Z'))).toBe('2026-12-15');
    expect(diaEmBrasilia(brt('2026-12-16T03:00:00Z'))).toBe('2026-12-16');
  });
});

describe('desconto: vale um só, o maior', () => {
  const noPrazo = brt('2026-12-10T15:00:00Z');
  const foraDoPrazo = brt('2026-12-20T15:00:00Z');

  it('12x: renovação no prazo dá 5%; fora do prazo, nenhum', () => {
    expect(descontoAplicavel({ campanha, planoId: '12x', respondidaEm: noPrazo })).toMatchObject({ id: 'renovacao_no_prazo', pct: 5 });
    expect(descontoAplicavel({ campanha, planoId: '12x', respondidaEm: foraDoPrazo })).toBeNull();
    expect(descontoAplicavel({ campanha, planoId: '12x' })).toBeNull();
  });

  it('renovação no prazo leva a condição de pagar a 1ª até 10/01', () => {
    expect(descontoAplicavel({ campanha, planoId: '12x', respondidaEm: noPrazo }).condicao)
      .toEqual({ primeiraParcelaPagaAte: '2027-01-10' });
  });

  it('semestralidade: 5% do plano, nunca somado com a renovação no prazo', () => {
    const d = descontoAplicavel({ campanha, planoId: 'semestral', respondidaEm: noPrazo });
    expect(d).toMatchObject({ id: 'plano', pct: 5 });
  });

  it('à vista: 10% do plano', () => {
    expect(descontoAplicavel({ campanha, planoId: 'avista', respondidaEm: noPrazo })).toMatchObject({ id: 'plano', pct: 10 });
  });

  it('irmão (10%) ganha dos 5%, mas nunca soma', () => {
    expect(descontoAplicavel({ campanha, planoId: '12x', respondidaEm: noPrazo, irmao: true })).toMatchObject({ id: 'irmao', pct: 10 });
    expect(descontoAplicavel({ campanha, planoId: 'semestral', irmao: true })).toMatchObject({ id: 'irmao', pct: 10 });
    // à vista: empate em 10% fica com o do próprio plano
    expect(descontoAplicavel({ campanha, planoId: 'avista', irmao: true })).toMatchObject({ id: 'plano', pct: 10 });
  });

  it('nenhuma combinação passa do maior desconto configurado', () => {
    for (const planoId of ['12x', 'semestral', 'avista']) {
      for (const irmao of [true, false]) {
        const d = descontoAplicavel({ campanha, planoId, respondidaEm: noPrazo, irmao });
        expect(d.pct).toBeLessThanOrEqual(10);
      }
    }
  });

  it('plano inexistente é erro, não silêncio', () => {
    expect(() => planoDaCampanha(campanha, 'trimestral')).toThrow(/não existe/);
  });
});

describe('valores dos planos (mensalidade de R$ 189 → R$ 202,23)', () => {
  const m = 20223;
  const plano = (id) => planoDaCampanha(campanha, id);

  it('12x cheio: 12 × R$ 202,23', () => {
    expect(calcularPlano({ mensalidadeCentavos: m, plano: plano('12x') }))
      .toMatchObject({ pagamentos: 12, valorPagamento: 20223, total: 242676, desconto: null });
  });

  it('12x com 5%: 12 parcelas iguais de R$ 192,12', () => {
    const r = calcularPlano({ mensalidadeCentavos: m, plano: plano('12x'), desconto: { id: 'renovacao_no_prazo', pct: 5 } });
    expect(r).toMatchObject({ valorPagamento: 19212, total: 230544 });
    expect(r.desconto.valor).toBe(242676 - 230544);
  });

  it('semestralidade com 5%: 2 × R$ 1.152,71', () => {
    expect(calcularPlano({ mensalidadeCentavos: m, plano: plano('semestral'), desconto: { id: 'plano', pct: 5 } }))
      .toMatchObject({ pagamentos: 2, valorPagamento: 115271, total: 230542 });
  });

  it('à vista com 10%: 1 × R$ 2.184,08', () => {
    expect(calcularPlano({ mensalidadeCentavos: m, plano: plano('avista'), desconto: { id: 'plano', pct: 10 } }))
      .toMatchObject({ pagamentos: 1, valorPagamento: 218408, total: 218408 });
  });

  it('plano com nº de pagamentos que não divide 12 é recusado', () => {
    expect(() => calcularPlano({ mensalidadeCentavos: m, plano: { id: 'x', meses: [1, 5, 9, 12, 2] } })).toThrow(/dividir 12/);
  });

  it('opções da página: reajuste aplicado e economia em relação ao 12x cheio', () => {
    const { mensalidade, opcoes } = opcoesDePlano({ campanha, mensalidadeBaseCentavos: 18900, respondidaEm: brt('2026-12-01T12:00:00Z') });
    expect(mensalidade).toBe(20223);
    expect(opcoes.map((o) => [o.planoId, o.total])).toEqual([['12x', 230544], ['semestral', 230542], ['avista', 218408]]);
    expect(opcoes.find((o) => o.planoId === 'avista').economia).toBe(242676 - 218408);
  });
});

describe('datas dos pagamentos em 2027', () => {
  it('12x: janeiro a dezembro no dia escolhido', () => {
    const d = datasDosPagamentos({ ano: 2027, meses: planoDaCampanha(campanha, '12x').meses, dia: 10 });
    expect(d).toHaveLength(12);
    expect(d[0]).toBe('2027-01-10');
    expect(d[11]).toBe('2027-12-10');
  });

  it('semestralidade: janeiro e julho; à vista: janeiro', () => {
    expect(datasDosPagamentos({ ano: 2027, meses: [1, 7], dia: 5 })).toEqual(['2027-01-05', '2027-07-05']);
    expect(datasDosPagamentos({ ano: 2027, meses: [1], dia: 15 })).toEqual(['2027-01-15']);
  });

  it('dia 31 em fevereiro cai no último dia do mês', () => {
    expect(datasDosPagamentos({ ano: 2027, meses: [2], dia: 31 })).toEqual(['2027-02-28']);
    expect(datasDosPagamentos({ ano: 2028, meses: [2], dia: 31 })).toEqual(['2028-02-29']);
  });
});

describe('parcelas da renovação', () => {
  const valores = calcularPlano({ mensalidadeCentavos: 20223, plano: planoDaCampanha(campanha, '12x'), desconto: { id: 'renovacao_no_prazo', pct: 5 } });
  const datas = datasDosPagamentos({ ano: 2027, meses: planoDaCampanha(campanha, '12x').meses, dia: 10 });
  const parcelas = montarParcelasRenovacao({
    studentId: 'al-1', studentName: 'Aluno', course: 'TEENS', professorId: 'p1', valores, datas, renovacaoId: 'cod123', anoLetivo: 2027,
  });

  it('mesmo formato da matrícula + anoLetivo, origem e renovacaoId', () => {
    const matricula = montarParcelas({ studentId: 'x', studentName: 'x', fee: 1, installmentDates: ['2027-01-10'], course: 'x', professorId: 'x' })[0];
    expect(Object.keys(parcelas[0]).sort()).toEqual([...Object.keys(matricula), 'anoLetivo', 'origem', 'renovacaoId'].sort());
  });

  it('12 parcelas de R$ 192,12, numeradas, em aberto, com vencimento de 2027', () => {
    expect(parcelas).toHaveLength(12);
    expect(parcelas.every((p) => p.valuePlanned === 192.12 && p.status === 'Pendente' && p.valuePaid === 0)).toBe(true);
    expect(parcelas.map((p) => p.installmentNum)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(parcelas[0]).toMatchObject({ dueDate: '2027-01-10T00:00:00', month: 1, year: 2027, origem: 'renovacao', anoLetivo: 2027 });
  });
});

describe('contrato de 2026 que invade 2027 (os 47)', () => {
  const p = (dueDate, extra = {}) => ({ id: dueDate, dueDate: `${dueDate}T00:00:00`, status: 'Pendente', valuePlanned: 209, valuePaid: 0, ...extra });
  const parcelas = [
    p('2026-12-10', { status: 'Pago', valuePaid: 209 }),
    p('2027-01-10'), p('2027-02-10'),
    p('2027-03-10', { status: 'Pago', valuePaid: 209 }),         // paga adiantado
    p('2027-04-10', { valuePaid: 100 }),                          // pagamento parcial
    p('2027-05-10', { status: 'cancelada' }),
    p('2027-01-10', { id: 'nova', origem: 'renovacao' }),         // já é da renovação
  ];

  it('cancela só as de 2027 em aberto e sem pagamento; ignora 2026 e as da renovação', () => {
    const { cancelar } = parcelasAntigasDoAno(parcelas, 2027);
    expect(cancelar.map((x) => x.id)).toEqual(['2027-01-10', '2027-02-10']);
  });

  it('paga inteira OU em parte bloqueia (a secretaria decide)', () => {
    const { bloqueiam } = parcelasAntigasDoAno(parcelas, 2027);
    expect(bloqueiam.map((x) => x.id)).toEqual(['2027-03-10', '2027-04-10']);
  });

  it('contrato vai até: último mês com parcela não cancelada (fora a renovação)', () => {
    expect(contratoVaiAte(parcelas)).toBe('2027-04');
    expect(contratoVaiAte([p('2026-12-10')])).toBe('2026-12');
    expect(contratoVaiAte([])).toBeNull();
  });
});

describe('pendência', () => {
  const hoje = new Date(2026, 10, 20); // 20/11/2026
  it('conta só vencidas em aberto, com o saldo devedor', () => {
    const r = pendencias([
      { dueDate: '2026-10-10T00:00:00', status: 'Pendente', valuePlanned: 189, valuePaid: 0 },
      { dueDate: '2026-11-10T00:00:00', status: 'Pendente', valuePlanned: 189, valuePaid: 89 },
      { dueDate: '2026-09-10T00:00:00', status: 'Pago', valuePlanned: 189, valuePaid: 189 },
      { dueDate: '2026-08-10T00:00:00', status: 'cancelada', valuePlanned: 189, valuePaid: 0 },
      { dueDate: '2026-12-10T00:00:00', status: 'Pendente', valuePlanned: 189, valuePaid: 0 },
    ], hoje);
    expect(r).toEqual({ quantidade: 2, valor: 18900 + 10000 });
  });
});

describe('seleção pela secretaria (nomes de curso reais)', () => {
  it('grupo do curso', () => {
    expect(grupoDoCurso('KIDS')).toBe('kids');
    expect(grupoDoCurso('TEENS')).toBe('teens');
    expect(grupoDoCurso('REFORÇO ')).toBe('reforco');
    expect(grupoDoCurso('VIP -  Adulto')).toBe('adulto');
    expect(grupoDoCurso('BUSINESS INCOMPANY')).toBe('adulto');
    expect(grupoDoCurso('')).toBe('sem_curso');
    expect(grupoDoCurso(undefined)).toBe('sem_curso');
  });

  it('revisar valor: VIP, In Company, fora da faixa ou sem valor', () => {
    expect(precisaRevisarValor({ fee: 189, course: 'TEENS' }, campanha)).toBe(false);
    expect(precisaRevisarValor({ fee: 189, course: 'VIP-ADULTO' }, campanha)).toBe(true);
    expect(precisaRevisarValor({ fee: 189, course: 'BUSINESS INCOMPANY' }, campanha)).toBe(true);
    expect(precisaRevisarValor({ fee: 2700, course: 'GENERAL ENGLISH' }, campanha)).toBe(true);
    expect(precisaRevisarValor({ fee: 0.5, course: 'TEENS' }, campanha)).toBe(true);
    expect(precisaRevisarValor({ fee: null, course: 'KIDS' }, campanha)).toBe(true);
  });

  it('telefone de envio: responsável, senão o aluno', () => {
    expect(telefoneDeEnvio({ responsibleContact: '(32) 99999-0001', contact: '(32) 98888-0002' })).toBe('(32) 99999-0001');
    expect(telefoneDeEnvio({ responsibleContact: '', contact: '(32) 98888-0002' })).toBe('(32) 98888-0002');
    expect(telefoneDeEnvio({ responsibleContact: '123', contact: '(32) 98888-0002' })).toBe('(32) 98888-0002');
  });

  it('irmãos pelo CPF do responsável (dica; o desconto é manual)', () => {
    const r = irmaosPorResponsavel([
      { id: 'a', responsibleCpf: '111.111.111-01' },
      { id: 'b', responsibleCpf: '11111111101' },
      { id: 'c', responsibleCpf: '222.222.222-02' },
      { id: 'd', responsibleCpf: '' },
    ]);
    expect(r).toEqual({ a: ['b'], b: ['a'] });
  });
});

describe('código do link e status', () => {
  it('32 caracteres [a-z0-9], sem o ID do aluno', () => {
    const c = gerarCodigo();
    expect(c).toMatch(/^[a-z0-9]{32}$/);
    expect(gerarCodigo((n) => new Uint8Array(n).fill(0))).toBe('a'.repeat(32));
  });

  it('transições permitidas e proibidas', () => {
    expect(podeMudarStatus(STATUS.ENVIADA, STATUS.RESPONDIDA)).toBe(true);
    expect(podeMudarStatus(STATUS.RESPONDIDA, STATUS.EFETIVADA)).toBe(true);
    expect(podeMudarStatus(STATUS.RESPONDIDA, STATUS.ABERTA)).toBe(true); // reabrir
    expect(podeMudarStatus(STATUS.EFETIVADA, STATUS.ABERTA)).toBe(false); // efetivada não reabre
    expect(podeMudarStatus(STATUS.EXPIRADA, STATUS.RESPONDIDA)).toBe(false);
    expect(podeMudarStatus(STATUS.NAO_RENOVARA, STATUS.GERADA)).toBe(true); // desfazer
  });
});

describe('regra de 10/01: pagar a 1ª parcela para manter o desconto', () => {
  const desconto = { id: 'renovacao_no_prazo', pct: 5, condicao: { primeiraParcelaPagaAte: '2027-01-10' } };
  const parcelas = (primeira) => [
    { dueDate: '2027-02-15T00:00:00', status: 'Pendente' },
    { dueDate: '2027-01-15T00:00:00', ...primeira },
  ];
  const em = (iso) => new Date(iso);

  it('antes de 11/01 ainda não perdeu', () => {
    expect(perdeuDescontoNoPrazo({ desconto, parcelasDaRenovacao: parcelas({ status: 'Pendente' }), hoje: em('2027-01-10T20:00:00Z') })).toBe(false);
  });

  it('pagou até 10/01 (mesmo vencendo dia 15): mantém', () => {
    expect(perdeuDescontoNoPrazo({ desconto, parcelasDaRenovacao: parcelas({ status: 'Pago', paymentDate: '2027-01-09' }), hoje: em('2027-01-11T15:00:00Z') })).toBe(false);
  });

  it('não pagou ou pagou depois de 10/01: perde', () => {
    expect(perdeuDescontoNoPrazo({ desconto, parcelasDaRenovacao: parcelas({ status: 'Pendente' }), hoje: em('2027-01-11T15:00:00Z') })).toBe(true);
    expect(perdeuDescontoNoPrazo({ desconto, parcelasDaRenovacao: parcelas({ status: 'Pago', paymentDate: '2027-01-12' }), hoje: em('2027-01-13T15:00:00Z') })).toBe(true);
  });

  it('outros descontos (plano, irmão) não têm essa regra', () => {
    expect(perdeuDescontoNoPrazo({ desconto: { id: 'irmao', pct: 10 }, parcelasDaRenovacao: parcelas({ status: 'Pendente' }), hoje: em('2027-02-01T12:00:00Z') })).toBe(false);
    expect(perdeuDescontoNoPrazo({ desconto: null, parcelasDaRenovacao: [], hoje: em('2027-02-01T12:00:00Z') })).toBe(false);
  });
});
