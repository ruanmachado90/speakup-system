import {
  montarConvite, convitePorAluno, podeAjustar, podeEnviar, patchEnvio, patchMensalidadeBase,
  patchNaoRenovara, patchDesfazerNaoRenovara, patchIrmao, conviteNaoRenovara, urlWhatsApp, gruposDeEnvio,
  mensagemDoGrupo, linkDoConvite, csvConvites, idade, MENSAGEM_PADRAO,
} from '../utils/renovacaoEnvio';
import { montarLinhas, validarCampanha, filtrarLinhas, resumoPainel } from '../utils/renovacaoPainel';
import { STATUS, telefoneDeEnvio } from '../utils/renovacao';
import { montarDadosFicticios } from '../../scripts/emulador/dadosFicticios';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

const hoje = new Date(2026, 10, 20);
const agora = hoje.getTime();
const dados = montarDadosFicticios({ hoje, contas: { equipe: [], professores: [] } });
const students = dados.students.map((s) => ({ id: s.id, ...s.data }));
const campanha = { ...CAMPANHA_PADRAO_2027, abertura: '2026-11-16', encerramento: '2026-12-15' };
const linhas = montarLinhas({
  students,
  payments: dados.payments.map((p) => ({ id: p.id, ...p.data })),
  turmas: dados.turmas.map((t) => ({ id: t.id, ...t.data })),
  campanha,
  hoje,
});
const aluno = (id) => students.find((s) => s.id === id);
const convite = (id, extra = {}) => ({
  ...montarConvite({ codigo: `cod-${id}`, student: aluno(id), linha: linhas.find((l) => l.id === id), campanha, por: 'uid-sec', agora }),
  ...extra,
});

describe('documento do convite', () => {
  it('leva valores em centavos e o histórico de criação', () => {
    const c = convite('al-01');
    expect(c).toMatchObject({
      codigo: 'cod-al-01', anoLetivo: 2027, studentId: 'al-01', alunoNome: 'Alice Ferreira Teste',
      responsavelNome: 'Marina Ferreira Teste', menorDeIdade: true,
      mensalidadeAtualCentavos: 18900, mensalidadeBaseCentavos: 18900, mensalidadeNovaCentavos: 20223,
      status: STATUS.GERADA, enviosQtd: 0, descontoIrmao: false, temPendencia: false,
    });
    expect(c.historico).toEqual([{ evento: 'gerada', em: agora, por: 'uid-sec' }]);
  });

  it('não guarda telefone, CPF nem anotação (o link é público)', () => {
    const texto = JSON.stringify(convite('al-01'));
    expect(texto).not.toMatch(/90001|111\.111|cpf|contact|telefone/i);
  });

  it('adulto é maior de idade; parcelas antigas e pendência vêm da linha', () => {
    expect(convite('al-15').menorDeIdade).toBe(false);
    expect(convite('al-05').parcelasAntigas.cancelar).toBe(7);
    expect(convite('al-04').temPendencia).toBe(true);
    expect(convite('al-16').revisarValor).toBe(true);
  });

  it('idade conta o aniversário', () => {
    expect(idade('2010-11-20', hoje)).toBe(16);
    expect(idade('2010-11-21', hoje)).toBe(15);
    expect(idade('', hoje)).toBeNull();
  });
});

describe('convite que vale para cada aluno', () => {
  it('o mais recente que não foi cancelado nem expirou', () => {
    const lista = [
      { codigo: 'a', studentId: 'x', status: 'enviada', criadaEm: 1 },
      { codigo: 'b', studentId: 'x', status: 'cancelada', criadaEm: 2 },
      { codigo: 'c', studentId: 'y', status: 'expirada', criadaEm: 1 },
    ];
    const mapa = convitePorAluno(lista);
    expect(mapa.get('x').codigo).toBe('a');
    expect(mapa.has('y')).toBe(false);
  });
});

describe('patches', () => {
  it('envio: gerada → enviada e conta; aberta continua aberta', () => {
    expect(patchEnvio(convite('al-01'), { agora, por: 'u' })).toMatchObject({ status: 'enviada', enviosQtd: 1, enviadaEm: agora });
    expect(patchEnvio(convite('al-01', { status: 'aberta', enviosQtd: 2 }), { agora }).status).toBe('aberta');
    expect(patchEnvio(convite('al-01', { enviosQtd: 2 }), { agora, canal: 'manual' }).entradaHistorico.canal).toBe('manual');
  });

  it('nova base recalcula o reajuste e tira a marcação de revisão', () => {
    const p = patchMensalidadeBase(convite('al-16'), 1250, campanha, { agora });
    expect(p).toMatchObject({ mensalidadeBaseCentavos: 125000, mensalidadeNovaCentavos: 133750, revisarValor: false });
    expect(p.entradaHistorico).toMatchObject({ evento: 'valor_ajustado', de: 120000, para: 125000 });
    expect(() => patchMensalidadeBase(convite('al-16'), 0, campanha)).toThrow(/maior que zero/);
  });

  it('valor e irmão não mudam depois da resposta', () => {
    const respondida = convite('al-01', { status: 'respondida' });
    expect(podeAjustar(respondida)).toBe(false);
    expect(() => patchMensalidadeBase(respondida, 200, campanha)).toThrow(/já respondeu/);
    expect(() => patchIrmao(respondida, true)).toThrow(/já respondeu/);
    expect(patchIrmao(convite('al-01'), true)).toMatchObject({ descontoIrmao: true });
  });

  it('não renovará exige motivo; o motivo vai na nota interna, nunca no convite', () => {
    expect(() => patchNaoRenovara(convite('al-01'), {})).toThrow(/motivo/);
    const { nota, entradaHistorico, ...campos } = patchNaoRenovara(convite('al-01'), { motivo: 'Mudança de cidade', observacao: '  vai para BH ', agora });
    expect(campos).toEqual({ status: 'nao_renovara' });
    expect(JSON.stringify(entradaHistorico)).not.toMatch(/cidade|BH/);
    expect(nota).toMatchObject({ codigo: 'cod-al-01', anoLetivo: 2027, studentId: 'al-01', motivo: 'Mudança de cidade', observacao: 'vai para BH' });
    expect(() => patchNaoRenovara(convite('al-01', { status: 'efetivada' }), { motivo: 'x' })).toThrow();
  });

  it('desfazer volta a "gerada" e apaga a nota', () => {
    expect(patchDesfazerNaoRenovara(convite('al-01', { status: 'nao_renovara' }))).toMatchObject({ status: 'gerada', nota: null });
    expect(() => patchDesfazerNaoRenovara(convite('al-01'))).toThrow();
  });

  it('convite que já nasce como "não renovará"', () => {
    const r = conviteNaoRenovara({ codigo: 'x1', student: aluno('al-15'), linha: linhas.find((l) => l.id === 'al-15'), campanha, por: 'u', agora, motivo: 'Financeiro' });
    expect(r.convite).toMatchObject({ status: 'nao_renovara', studentId: 'al-15' });
    expect(r.convite.historico.map((h) => h.evento)).toEqual(['gerada', 'nao_renovara']);
    expect(JSON.stringify(r.convite)).not.toMatch(/Financeiro/);
    expect(r.nota.motivo).toBe('Financeiro');
  });

  it('fila aceita gerada, enviada e aberta', () => {
    expect(['gerada', 'enviada', 'aberta'].every((s) => podeEnviar({ status: s }))).toBe(true);
    expect(['respondida', 'nao_renovara', 'efetivada'].some((s) => podeEnviar({ status: s }))).toBe(false);
  });
});

describe('WhatsApp', () => {
  it('número com máscara ganha o 55; sem número abre a escolha de contato', () => {
    expect(urlWhatsApp('(32) 90001-0001', 'oi')).toBe('https://wa.me/5532900010001?text=oi');
    expect(urlWhatsApp('5532900010001', 'a b')).toBe('https://wa.me/5532900010001?text=a%20b');
    expect(urlWhatsApp('123', 'oi')).toBe('https://wa.me/?text=oi');
  });

  it('irmãos com o mesmo telefone viram UMA mensagem; sem telefone fica à parte', () => {
    const itens = ['al-01', 'al-02', 'al-03'].map((id) => ({
      convite: convite(id), telefone: telefoneDeEnvio(aluno(id)), responsavel: aluno(id).responsibleName,
    }));
    itens.push({ convite: convite('al-09'), telefone: '', responsavel: 'X' });
    const { grupos, semTelefone } = gruposDeEnvio(itens);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].itens.map((i) => i.convite.studentId)).toEqual(['al-01', 'al-02']);
    expect(semTelefone).toHaveLength(1);
  });

  it('mensagem com um link por aluno, sem emoji', () => {
    const itens = ['al-01', 'al-02'].map((id) => ({ convite: convite(id), telefone: '(32) 90001-0001', responsavel: 'Marina Ferreira Teste' }));
    const [grupo] = gruposDeEnvio(itens).grupos;
    const msg = mensagemDoGrupo({ modelo: campanha.mensagemWhatsApp, grupo, campanha, origem: 'https://gestao.x' });
    expect(msg).toContain('Olá, Marina!');
    expect(msg).toContain('de Alice e Bento para 2027');
    expect(msg).toContain('até 15/12/2026');
    expect(msg).toContain('Alice: https://gestao.x/renovar/cod-al-01');
    expect(msg).toContain('Bento: https://gestao.x/renovar/cod-al-02');
    expect(msg).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('um aluno só: link solto; sem modelo usa o padrão', () => {
    const grupo = { responsavel: 'Paulo Ramos', itens: [{ convite: convite('al-03') }] };
    const msg = mensagemDoGrupo({ grupo, campanha, origem: 'https://g' });
    expect(msg).toContain('\nhttps://g/renovar/cod-al-03\n');
    expect(MENSAGEM_PADRAO).toContain('{links}');
  });

  it('a configuração exige {links} na mensagem', () => {
    expect(validarCampanha(campanha)).toEqual([]);
    expect(validarCampanha({ ...campanha, mensagemWhatsApp: 'Olá' }).join()).toMatch(/\{links\}/);
  });
});

describe('painel com convites', () => {
  const comConvite = linhas.map((l) => {
    if (l.id === 'al-01') return { ...l, convite: convite('al-01', { enviosQtd: 1, status: 'enviada' }) };
    if (l.id === 'al-15') return { ...l, convite: convite('al-15', { status: 'nao_renovara' }) };
    if (l.id === 'al-16') return { ...l, convite: convite('al-16', { mensalidadeNovaCentavos: 133750 }) };
    return { ...l, convite: null };
  });

  it('filtro "Sem convite"', () => {
    const r = filtrarLinhas(comConvite, { soSemConvite: true });
    expect(r).toHaveLength(17);
    expect(r.some((l) => ['al-01', 'al-15', 'al-16'].includes(l.id))).toBe(false);
  });

  it('resumo conta gerados, enviados e quem não renova; receita usa o valor ajustado', () => {
    const r = resumoPainel(comConvite, new Set(['al-16']));
    expect(r).toMatchObject({ convitesGerados: 2, convitesEnviados: 1, naoRenovam: 1, receitaCheiaSelecionados: 133750 * 12 });
  });
});

describe('planilha', () => {
  it('CSV com ; , BOM e vírgula decimal; aspas quando precisa', () => {
    const csv = csvConvites([{
      aluno: 'Alice; Teste', responsavel: 'Marina', telefone: '(32) 9', curso: 'KIDS',
      mensalidadeAtual: 18900, mensalidadeNova: 20223, status: 'Enviado', link: linkDoConvite('https://g', 'abc'),
    }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Alice; Teste";Marina;(32) 9;KIDS;189,00;202,23;Enviado;https://g/renovar/abc');
  });
});
