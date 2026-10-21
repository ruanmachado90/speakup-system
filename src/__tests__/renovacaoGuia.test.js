import {
  etapaAtual, variaveisDaCampanha, partesDoTexto, textoParaCopiar, modeloConvite,
  descontosDaCampanha, listaPorExtenso, somarDias, progressoChecklist,
} from '../utils/renovacaoGuia';
import { ETAPAS, CHECKLIST_PREPARACAO, MENSAGENS, DUVIDAS, SITUACOES, SIGNIFICADO_STATUS } from '../content/renovacaoGuia';
import { STATUS } from '../utils/renovacao';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

const campanha = { ...CAMPANHA_PADRAO_2027, abertura: '2026-11-16', encerramento: '2026-12-15' };

describe('etapa do dia', () => {
  it('fica em preparação sem datas configuradas', () => {
    expect(etapaAtual(CAMPANHA_PADRAO_2027, '2026-12-01')).toBe('preparacao');
  });

  it('segue as datas da campanha', () => {
    expect(etapaAtual(campanha, '2026-11-15')).toBe('preparacao');
    expect(etapaAtual(campanha, '2026-11-16')).toBe('envio');
    expect(etapaAtual(campanha, '2026-11-22')).toBe('envio');
    expect(etapaAtual(campanha, '2026-11-23')).toBe('acompanhamento');
    expect(etapaAtual(campanha, '2026-12-14')).toBe('acompanhamento');
    expect(etapaAtual(campanha, '2026-12-15')).toBe('encerramento');
    expect(etapaAtual(campanha, '2026-12-31')).toBe('encerramento');
    expect(etapaAtual(campanha, '2027-01-02')).toBe('virada');
  });

  it('toda etapa calculada existe no texto do guia', () => {
    const ids = ETAPAS.map((e) => e.id);
    ['2026-11-01', '2026-11-17', '2026-12-01', '2026-12-20', '2027-01-05']
      .forEach((dia) => expect(ids).toContain(etapaAtual(campanha, dia)));
  });

  it('soma dias atravessando o mês', () => {
    expect(somarDias('2026-11-28', 7)).toBe('2026-12-05');
  });
});

describe('valores da campanha no texto', () => {
  it('lê tudo da configuração', () => {
    const v = variaveisDaCampanha(campanha);
    expect(v).toMatchObject({
      ano: '2027', anoAtual: '2026', abertura: '16/11/2026', encerramento: '15/12/2026',
      fimBeneficio: '15/12/2026', pagamentoBeneficio: '10/01/2027', reajuste: '7%',
      planos: '12 parcelas, Semestralidade e À vista', formas: 'PIX, Boleto ou Dinheiro', diasVencimento: '5, 10 ou 15',
    });
    expect(v.beneficios).toContain('Renovação no prazo: 3,5% em 12 parcelas, para quem concluir até 15/12/2026 e pagar a 1ª mensalidade até 10/01/2027');
    expect(v.beneficios).toContain('Irmão: 10%');
    expect(v.beneficios).toContain('vale o maior');
  });

  it('o que não está configurado fica null (A definir)', () => {
    const v = variaveisDaCampanha({ anoLetivo: 2027, planos: [], formasPagamento: [], diasVencimento: [] });
    expect(v.abertura).toBeNull();
    expect(v.fimBeneficio).toBeNull();
    expect(v.reajuste).toBeNull();
    expect(v.beneficios).toBeNull();
    expect(v.planos).toBeNull();
    expect(v.formas).toBeNull();
    expect(v.diasVencimento).toBeNull();
  });

  it('prazo próprio do desconto vence o encerramento', () => {
    const c = { ...campanha, descontoRenovacaoNoPrazo: { ...campanha.descontoRenovacaoNoPrazo, respostaAte: '2026-12-01' } };
    expect(variaveisDaCampanha(c).fimBeneficio).toBe('01/12/2026');
    expect(descontosDaCampanha(c)[0]).toContain('até 01/12/2026');
  });

  it('lista por extenso', () => {
    expect(listaPorExtenso([])).toBeNull();
    expect(listaPorExtenso(['PIX'])).toBe('PIX');
    expect(listaPorExtenso([5, 10], 'ou')).toBe('5 ou 10');
  });
});

describe('texto do guia', () => {
  const vars = variaveisDaCampanha(campanha);

  it('separa negrito, variável da campanha e campo do aluno', () => {
    expect(partesDoTexto('Oi {responsavel}, até **{encerramento}** ou {abertura}.', { ...vars, abertura: null })).toEqual([
      { texto: 'Oi ' }, { campoAluno: 'responsavel' }, { texto: ', até ' }, { negrito: '{encerramento}' },
      { texto: ' ou ' }, { variavel: 'abertura', valor: null }, { texto: '.' },
    ]);
  });

  it('copia com a campanha preenchida e os campos do aluno visíveis', () => {
    expect(textoParaCopiar('Olá, {responsavel}! Até {encerramento}. {link}', vars)).toBe('Olá, {responsavel}! Até 15/12/2026. {link}');
    expect(textoParaCopiar('Abre em {abertura}.', { ...vars, abertura: null })).toBe('Abre em [a definir].');
  });

  it('o convite usa o texto salvo na campanha', () => {
    const c = { ...campanha, mensagemWhatsApp: 'Oi {responsavel}, {alunos} até {prazo}: {links}' };
    expect(textoParaCopiar(modeloConvite(c), vars)).toBe('Oi {responsavel}, {aluno} até 15/12/2026: {link}');
  });

  it('nenhum texto tem valor da campanha escrito à mão', () => {
    const textos = [
      ...ETAPAS.flatMap((e) => [e.quando, ...e.grupos.flatMap((g) => g.tarefas)]),
      ...CHECKLIST_PREPARACAO.map((i) => i.texto),
      ...SITUACOES.map((s) => s.texto),
      ...MENSAGENS.map((m) => m.texto || ''),
      ...DUVIDAS.map((d) => d.resposta),
      ...Object.values(SIGNIFICADO_STATUS).flat(),
    ];
    textos.forEach((t) => {
      expect(t).not.toMatch(/\d+(,\d+)?\s?%/);   // percentuais
      expect(t).not.toMatch(/\b20\d\d\b/);       // anos
      expect(t).not.toMatch(/\d{1,2}\/\d{1,2}/); // datas
      expect(t).not.toMatch(/R\$/);              // valores
    });
  });

  it('toda variável usada no texto existe (campanha ou aluno)', () => {
    const doAluno = ['responsavel', 'aluno', 'link'];
    const textos = [
      ...ETAPAS.flatMap((e) => [e.quando, ...e.grupos.flatMap((g) => g.tarefas)]),
      ...CHECKLIST_PREPARACAO.map((i) => i.texto),
      ...SITUACOES.map((s) => s.texto),
      ...MENSAGENS.map((m) => m.texto || ''),
      ...DUVIDAS.map((d) => d.resposta),
      ...Object.values(SIGNIFICADO_STATUS).flat(),
    ];
    textos.forEach((t) => partesDoTexto(t, vars)
      .filter((p) => 'campoAluno' in p)
      .forEach((p) => expect(doAluno).toContain(p.campoAluno)));
  });

  it('explica todos os status do convite', () => {
    Object.values(STATUS).forEach((s) => expect(SIGNIFICADO_STATUS[s]).toBeDefined());
  });
});

describe('checklist', () => {
  it('conta só os itens da lista', () => {
    const itens = [{ id: 'a' }, { id: 'b' }];
    expect(progressoChecklist(itens, { a: { feito: true }, b: { feito: false }, velho: { feito: true } })).toEqual({ feitos: 1, total: 2 });
    expect(progressoChecklist(itens)).toEqual({ feitos: 0, total: 2 });
  });

  it('ids únicos', () => {
    const ids = CHECKLIST_PREPARACAO.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
