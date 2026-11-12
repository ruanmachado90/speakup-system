import {
  situacaoDoLink, deveMarcarAberto, opcoesDoConvite, vencimentosDaEscolha, cpfValido, validarEscolha,
  montarResposta, idContratoDoAno, montarContratoRenovacao, carimboDeAssinatura,
  paginaDaFamilia, condicoesDoDesconto, comparativoAntecipada, whatsappDaSecretaria,
} from '../utils/renovacaoFamilia';
import { validarCampanha } from '../utils/renovacaoPainel';
import { STATUS } from '../utils/renovacao';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

const campanha = { ...CAMPANHA_PADRAO_2027, status: 'aberta', abertura: '2026-11-16', encerramento: '2026-12-15' };
const convite = {
  codigo: 'abc123', anoLetivo: 2027, studentId: 'aluno1', alunoNome: 'Ana Souza', cursoAtual: 'TEENS',
  mensalidadeBaseCentavos: 25000, mensalidadeNovaCentavos: 26750, descontoIrmao: false, status: STATUS.ENVIADA,
};
const noPrazo = new Date('2026-12-01T12:00:00-03:00').getTime();
const CPF_OK = '529.982.247-25';

describe('situação do link', () => {
  const s = (c, camp = campanha, hoje = '2026-12-01') => situacaoDoLink({ convite: c, campanha: camp, hoje });

  it('aberto dentro da campanha', () => {
    expect(s(convite)).toBe('aberto');
    expect(s({ ...convite, status: STATUS.GERADA })).toBe('aberto');
    expect(s({ ...convite, status: STATUS.ABERTA })).toBe('aberto');
    expect(s(convite, campanha, '2026-12-15')).toBe('aberto'); // último dia ainda vale
  });

  it('fechada fora da campanha', () => {
    expect(s(convite, { ...campanha, status: 'rascunho' })).toBe('fechada');
    expect(s(convite, { ...campanha, status: 'encerrada' })).toBe('fechada');
    expect(s(convite, campanha, '2026-12-16')).toBe('fechada');
  });

  it('quem respondeu vê o comprovante mesmo depois', () => {
    [STATUS.RESPONDIDA, STATUS.AGUARDANDO, STATUS.EFETIVADA].forEach((status) => {
      expect(s({ ...convite, status }, { ...campanha, status: 'encerrada' }, '2027-01-05')).toBe('respondido');
    });
  });

  it('indisponível e inválido', () => {
    [STATUS.NAO_RENOVARA, STATUS.CANCELADA, STATUS.EXPIRADA].forEach((status) => expect(s({ ...convite, status })).toBe('indisponivel'));
    expect(s(null)).toBe('invalido');
    expect(situacaoDoLink({ convite, campanha: null })).toBe('invalido');
  });

  it('marca aberto só na primeira visita', () => {
    expect(deveMarcarAberto({ status: STATUS.GERADA })).toBe(true);
    expect(deveMarcarAberto({ status: STATUS.ENVIADA })).toBe(true);
    expect(deveMarcarAberto({ status: STATUS.ABERTA })).toBe(false);
    expect(deveMarcarAberto({ status: STATUS.RESPONDIDA })).toBe(false);
  });
});

describe('opções e vencimentos', () => {
  it('calcula a partir da base do convite, com o desconto que vale', () => {
    const { mensalidade, opcoes } = opcoesDoConvite({ convite, campanha, respondidaEm: noPrazo });
    expect(mensalidade).toBe(26750);
    const doze = opcoes.find((o) => o.planoId === '12x');
    expect(doze.desconto.id).toBe('renovacao_no_prazo');
    expect(doze.valorPagamento).toBe(Math.round(26750 * 0.965));
    const avista = opcoes.find((o) => o.planoId === 'avista');
    expect(avista.pagamentos).toBe(1);
    expect(avista.desconto.pct).toBe(10);
  });

  it('base ajustada pela secretaria muda os valores', () => {
    const { mensalidade } = opcoesDoConvite({ convite: { ...convite, mensalidadeBaseCentavos: 30000 }, campanha, respondidaEm: noPrazo });
    expect(mensalidade).toBe(32100);
  });

  it('irmão marcado vence o desconto no prazo', () => {
    const { opcoes } = opcoesDoConvite({ convite: { ...convite, descontoIrmao: true }, campanha, respondidaEm: noPrazo });
    expect(opcoes.find((o) => o.planoId === '12x').desconto.id).toBe('irmao');
  });

  it('vencimentos do plano no dia escolhido', () => {
    expect(vencimentosDaEscolha({ campanha, planoId: 'semestral', dia: 10 })).toEqual(['2027-01-10', '2027-07-10']);
    expect(vencimentosDaEscolha({ campanha, planoId: '12x', dia: 15 })).toHaveLength(12);
    expect(vencimentosDaEscolha({ campanha, planoId: null, dia: 15 })).toEqual([]);
  });
});

describe('textos e condições da página', () => {
  it('textos editáveis com o padrão no que ficar vazio', () => {
    expect(paginaDaFamilia(campanha).whatsapp).toBe('32999414548');
    const t = paginaDaFamilia({ ...campanha, paginaFamilia: { assinatura: 'Equipe SpeakUp', atendimento: '  ' } });
    expect(t.assinatura).toBe('Equipe SpeakUp');
    expect(t.atendimento).toMatch(/13h às 17h20/);
    expect(paginaDaFamilia({}).apresentacao).toMatch(/planejamento/);
  });

  it('condições do desconto na ordem da carta', () => {
    expect(condicoesDoDesconto(campanha)).toEqual([
      'Estar em dia com as mensalidades de 2026.',
      'Renovar por este link até 15/12/2026.',
      'Pagar a 1ª mensalidade até 10/01/2027.',
    ]);
    const semEmDia = { ...campanha, descontoRenovacaoNoPrazo: { ...campanha.descontoRenovacaoNoPrazo, exigeEmDia: false } };
    expect(condicoesDoDesconto(semEmDia)).toHaveLength(2);
    expect(condicoesDoDesconto({ ...campanha, descontoRenovacaoNoPrazo: { pct: 0 } })).toEqual([]);
  });

  it('comparativo com x sem renovação antecipada', () => {
    const calculo = opcoesDoConvite({ convite, campanha, respondidaEm: noPrazo });
    const c = comparativoAntecipada(calculo, campanha);
    expect(c).toMatchObject({ planoId: '12x', pagamentos: 12, cheio: 26750, comDesconto: Math.round(26750 * 0.965) });
    expect(c.economia).toBe(26750 * 12 - c.comDesconto * 12);
    // Depois do prazo o desconto não entra: sem comparativo
    const depois = opcoesDoConvite({ convite, campanha, respondidaEm: new Date('2026-12-20T12:00:00-03:00').getTime() });
    expect(comparativoAntecipada(depois, campanha)).toBeNull();
  });

  it('WhatsApp da secretaria com a mensagem começada', () => {
    const url = whatsappDaSecretaria(campanha, 'Ana Souza');
    expect(url.startsWith('https://wa.me/5532999414548?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toContain('Ana Souza');
  });

  it('configuração recusa WhatsApp incompleto', () => {
    expect(validarCampanha({ ...campanha, paginaFamilia: { whatsapp: '9999' } }).join()).toMatch(/WhatsApp da secretaria/);
    expect(validarCampanha({ ...campanha, paginaFamilia: { whatsapp: '(32) 99941-4548' } })).toEqual([]);
  });
});

describe('validação', () => {
  const ok = { planoId: '12x', formaPagamento: 'PIX', diaVencimento: 10, nome: 'Maria Souza', cpf: CPF_OK, aceite: true };

  it('CPF', () => {
    expect(cpfValido(CPF_OK)).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });

  it('aceita escolha completa', () => {
    expect(validarEscolha(ok, campanha)).toEqual([]);
    expect(validarEscolha({ ...ok, diaVencimento: '15', email: 'maria@ex.com' }, campanha)).toEqual([]);
  });

  it('recusa o que não está na campanha ou falta', () => {
    expect(validarEscolha({ ...ok, planoId: 'trimestral' }, campanha)).toEqual(['Escolha o plano.']);
    expect(validarEscolha({ ...ok, formaPagamento: 'Cartão de crédito' }, campanha)).toEqual(['Escolha a forma de pagamento.']);
    expect(validarEscolha({ ...ok, diaVencimento: 20 }, campanha)).toEqual(['Escolha o dia de vencimento.']);
    expect(validarEscolha({ ...ok, nome: 'Maria' }, campanha)).toEqual(['Informe o nome completo de quem assina.']);
    expect(validarEscolha({ ...ok, cpf: '000' }, campanha)).toEqual(['Informe um CPF válido.']);
    expect(validarEscolha({ ...ok, email: 'maria@' }, campanha)).toEqual(['O e-mail parece incompleto.']);
    expect(validarEscolha({ ...ok, aceite: false }, campanha)).toEqual(['Marque que leu e concorda com o contrato.']);
  });
});

describe('documentos gravados', () => {
  it('resposta só com as escolhas (o horário é do servidor)', () => {
    expect(montarResposta({ planoId: '12x', formaPagamento: 'PIX', diaVencimento: '10' }))
      .toEqual({ planoId: '12x', formaPagamento: 'PIX', diaVencimento: 10, canal: 'link' });
  });

  it('contrato do ano com os valores mostrados', () => {
    const escolha = { planoId: 'semestral', formaPagamento: 'Boleto', diaVencimento: 5 };
    const { opcoes } = opcoesDoConvite({ convite, campanha, respondidaEm: noPrazo });
    const opcao = opcoes.find((o) => o.planoId === 'semestral');
    const vencimentos = vencimentosDaEscolha({ campanha, ...{ planoId: 'semestral', dia: 5 } });
    const c = montarContratoRenovacao({
      convite, campanha, escolha, opcao, vencimentos,
      assinatura: { nome: ' Maria Souza ', cpf: CPF_OK, timestamp: '01/12/2026, 12:00:00 (BRT)', ip: '1.2.3.4' },
    });
    expect(idContratoDoAno('aluno1', 2027)).toBe('aluno1_2027');
    expect(c).toMatchObject({
      nome: 'Maria Souza', cpf: '52998224725', alunoId: 'aluno1', anoLetivo: 2027, renovacaoId: 'abc123',
      planoId: 'semestral', planoRotulo: 'Semestralidade', formaPagamento: 'Boleto', diaVencimento: 5,
      mensalidadeCentavos: 26750, pagamentos: 2, vencimentos: ['2027-01-05', '2027-07-05'],
      desconto: { id: 'plano', pct: 5 },
    });
    expect(c.totalCentavos).toBe(c.valorPagamentoCentavos * 2);
  });

  it('carimbo no horário de Brasília', () => {
    expect(carimboDeAssinatura(new Date('2026-12-01T15:00:00Z'))).toBe('01/12/2026, 12:00:00 (BRT)');
  });
});
