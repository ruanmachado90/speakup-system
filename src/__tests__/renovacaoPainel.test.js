import { montarLinhas, filtrarLinhas, contarPorGrupo, resumoPainel, validarCampanha } from '../utils/renovacaoPainel';
import { montarDadosFicticios } from '../../scripts/emulador/dadosFicticios';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

const contas = { equipe: [], professores: [] };
const hoje = new Date(2026, 10, 20); // 20/11/2026, campanha em andamento
const dados = montarDadosFicticios({ hoje, contas });
const campanha = { ...CAMPANHA_PADRAO_2027, abertura: '2026-11-16', encerramento: '2026-12-15' };
const linhas = montarLinhas({
  students: dados.students.map((s) => ({ id: s.id, ...s.data })),
  payments: dados.payments.map((p) => ({ id: p.id, ...p.data })),
  turmas: dados.turmas.map((t) => ({ id: t.id, ...t.data })),
  campanha,
  hoje,
});
const linha = (id) => linhas.find((l) => l.id === id);

describe('lista do painel', () => {
  it('só alunos ativos, em ordem alfabética', () => {
    expect(linhas).toHaveLength(20);
    expect(linhas.find((l) => l.id === 'al-21')).toBeUndefined(); // cancelado
    const nomes = linhas.map((l) => l.nome);
    expect([...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(nomes);
  });

  it('mensalidade atual → nova (+7%) e 12x com o desconto no prazo (3,5%)', () => {
    expect(linha('al-01')).toMatchObject({ mensalidadeAtual: 18900, mensalidadeNova: 20223, parcela12NoPrazo: 19515 });
  });

  it('turma vem de turmas.alunosIds; telefone do responsável, ou do aluno adulto', () => {
    expect(linha('al-01').turmas).toEqual(['Kids 2 — Seg/Qua 14h']);
    expect(linha('al-01').telefone).toBe('(32) 90001-0001');
    expect(linha('al-15').telefone).toBe('(32) 90002-0015'); // adulto sem responsável
  });

  it('contrato que invade 2027: até quando, quantas antigas cancelar e as que bloqueiam', () => {
    expect(linha('al-05')).toMatchObject({ contratoAte: '2027-07', contratoInvadeAno: true });
    expect(linha('al-05').antigas.cancelar).toBe(7);           // jan–jul/2027 em aberto
    expect(linha('al-07').antigas.bloqueiam).toBeGreaterThan(0); // pagou 2027 adiantado
    expect(linha('al-01')).toMatchObject({ contratoAte: '2026-12', contratoInvadeAno: false });
  });

  it('pendência, revisão de valor, irmãos e sugestão Kids/Teens', () => {
    expect(linha('al-04').pendencia.quantidade).toBeGreaterThan(0);
    expect(linha('al-16').revisarValor).toBe(true); // VIP R$ 1.200
    expect(linha('al-01').revisarValor).toBe(false);
    expect(linha('al-01').irmaos).toEqual(['Bento Ferreira Teste']);
    expect(linha('al-01').sugerido).toBe(true);
    expect(linha('al-15').sugerido).toBe(false); // adulto
    expect(linha('al-19').grupo).toBe('sem_curso');
  });
});

describe('filtros e indicadores', () => {
  it('por grupo, com contagem para os chips', () => {
    expect(filtrarLinhas(linhas, { grupo: 'kids' }).every((l) => l.grupo === 'kids')).toBe(true);
    const n = contarPorGrupo(linhas);
    expect(n.todos).toBe(20);
    expect((n.kids || 0) + (n.teens || 0) + (n.reforco || 0) + (n.adulto || 0) + (n.sem_curso || 0)).toBe(20);
  });

  it('busca sem acento por aluno, responsável, curso ou turma', () => {
    expect(filtrarLinhas(linhas, { busca: 'cecilia' }).map((l) => l.id)).toEqual(['al-03']);
    expect(filtrarLinhas(linhas, { busca: 'marina ferreira' })).toHaveLength(2); // irmãos
    expect(filtrarLinhas(linhas, { busca: 'seg/qua' }).length).toBeGreaterThan(0);
  });

  it('marcadores: pendência, revisar valor, contrato até 2027, só selecionados', () => {
    expect(filtrarLinhas(linhas, { soPendencia: true }).every((l) => l.pendencia.quantidade > 0)).toBe(true);
    expect(filtrarLinhas(linhas, { soRevisar: true }).every((l) => l.revisarValor)).toBe(true);
    expect(filtrarLinhas(linhas, { soContrato: true }).every((l) => l.contratoInvadeAno)).toBe(true);
    const sel = new Set(['al-01', 'al-02']);
    expect(filtrarLinhas(linhas, { soSelecionados: true, selecionados: sel }).map((l) => l.id)).toEqual(['al-01', 'al-02']);
  });

  it('resumo: contagens e receita cheia dos selecionados', () => {
    const r = resumoPainel(linhas, new Set(['al-01', 'al-02']));
    expect(r.ativos).toBe(20);
    expect(r.selecionados).toBe(2);
    expect(r.receitaCheiaSelecionados).toBe((20223 + 22363) * 12);
    expect(r.kidsTeens).toBe(linhas.filter((l) => l.grupo === 'kids' || l.grupo === 'teens').length);
  });
});

describe('validação da configuração', () => {
  it('a configuração padrão (decisões do Ruan) é válida', () => {
    expect(validarCampanha(CAMPANHA_PADRAO_2027)).toEqual([]);
    expect(validarCampanha(campanha)).toEqual([]);
  });

  it('recusa desconto próprio do 12x que anula o de renovação no prazo', () => {
    const comDesconto = (pct) => ({ ...campanha, planos: campanha.planos.map((p) => (p.id === '12x' ? { ...p, descontoPct: pct } : p)) });
    expect(validarCampanha(comDesconto(3.5)).join()).toMatch(/anula o de renovação no prazo/);
    expect(validarCampanha(comDesconto(5)).join()).toMatch(/anula o de renovação no prazo/);
    expect(validarCampanha(comDesconto(2))).toEqual([]);
  });

  it('recusa valores absurdos e datas trocadas', () => {
    expect(validarCampanha({ ...campanha, reajustePct: 700 })).toContain('Reajuste deve ficar entre 0% e 50%.');
    expect(validarCampanha({ ...campanha, abertura: '2026-12-20' })).toContain('A abertura precisa vir antes do encerramento.');
    expect(validarCampanha({ ...campanha, diasVencimento: [] })).toContain('Escolha ao menos um dia de vencimento.');
    expect(validarCampanha({ ...campanha, diasVencimento: [31] })).toContain('Dias de vencimento entre 1 e 28.');
    expect(validarCampanha({ ...campanha, formasPagamento: [] })).toContain('Escolha ao menos uma forma de pagamento.');
  });

  it('plano com nº de pagamentos que não divide 12, ou desconto inválido', () => {
    const planos = campanha.planos.map((p) => (p.id === 'semestral' ? { ...p, meses: [1, 5, 9, 12, 2] } : p));
    expect(validarCampanha({ ...campanha, planos }).join(' ')).toMatch(/dividir 12/);
    const planos2 = campanha.planos.map((p) => (p.id === 'avista' ? { ...p, descontoPct: 120 } : p));
    expect(validarCampanha({ ...campanha, planos: planos2 }).join(' ')).toMatch(/desconto entre 0% e 100%/);
  });

  it('abrir a campanha exige as duas datas', () => {
    expect(validarCampanha({ ...CAMPANHA_PADRAO_2027, status: 'aberta' }))
      .toContain('Para abrir a campanha, defina abertura e encerramento.');
  });
});
