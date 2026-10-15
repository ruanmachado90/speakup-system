/**
 * Painel "Renovação" (etapa 2): monta a lista de alunos com os valores da
 * campanha, filtra, resume e valida a configuração. Puro — a tela só exibe.
 * Regras de dinheiro em utils/renovacao.js; plano em docs/rematricula/PLANO.md.
 */
import {
  paraCentavos, reajustar, calcularPlano, planoDaCampanha, contratoVaiAte, parcelasAntigasDoAno,
  pendencias, grupoDoCurso, precisaRevisarValor, telefoneDeEnvio, irmaosPorResponsavel,
} from './renovacao';

const idDoMembro = (m) => (m && typeof m === 'object' ? m.id : m);
const normalizar = (s) => String(s || '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

/**
 * Uma linha por aluno ATIVO, ordenada por nome.
 * Nada aqui grava: é o que a secretaria confere antes de qualquer envio.
 */
export function montarLinhas({ students = [], payments = [], turmas = [], campanha, hoje = new Date() }) {
  const ativos = students.filter((s) => s.status === 'ativo');

  const parcelasPorAluno = new Map();
  payments.forEach((p) => {
    if (!p.studentId) return;
    parcelasPorAluno.set(p.studentId, [...(parcelasPorAluno.get(p.studentId) || []), p]);
  });

  const turmasPorAluno = new Map();
  turmas.forEach((t) => (t.alunosIds || []).forEach((m) => {
    const id = idDoMembro(m);
    if (id) turmasPorAluno.set(id, [...(turmasPorAluno.get(id) || []), t.nome || '(turma sem nome)']);
  }));

  const irmaos = irmaosPorResponsavel(ativos);
  const nomePorId = new Map(ativos.map((s) => [s.id, s.name]));
  const ano = campanha.anoLetivo;
  const pctNoPrazo = campanha.descontoRenovacaoNoPrazo?.pct || 0;
  const plano12 = campanha.planos.find((p) => p.meses.length === 12);

  return ativos.map((s) => {
    const parcelas = parcelasPorAluno.get(s.id) || [];
    const atual = paraCentavos(s.fee);
    const nova = reajustar(atual, campanha.reajustePct, campanha.arredondamento);
    const antigas = parcelasAntigasDoAno(parcelas, ano);
    const ate = contratoVaiAte(parcelas);
    const grupo = grupoDoCurso(s.course);
    return {
      id: s.id,
      nome: s.name || '(sem nome)',
      responsavel: s.responsibleName || '',
      telefone: telefoneDeEnvio(s),
      curso: String(s.course || '').trim(),
      grupo,
      turmas: turmasPorAluno.get(s.id) || [],
      mensalidadeAtual: atual,
      mensalidadeNova: nova,
      // 12x com o desconto de renovação no prazo (o caso mais comum)
      parcela12NoPrazo: plano12 && pctNoPrazo
        ? calcularPlano({ mensalidadeCentavos: nova, plano: plano12, desconto: { id: 'renovacao_no_prazo', pct: pctNoPrazo } }).valorPagamento
        : nova,
      contratoAte: ate,
      contratoInvadeAno: Boolean(ate && ate >= `${ano}-01`),
      antigas: { cancelar: antigas.cancelar.length, bloqueiam: antigas.bloqueiam.length },
      pendencia: pendencias(parcelas, hoje),
      revisarValor: precisaRevisarValor(s, campanha),
      irmaos: (irmaos[s.id] || []).map((id) => nomePorId.get(id)).filter(Boolean),
      sugerido: grupo === 'kids' || grupo === 'teens',
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export const GRUPOS_FILTRO = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'kids', rotulo: 'Kids' },
  { id: 'teens', rotulo: 'Teens' },
  { id: 'reforco', rotulo: 'Reforço' },
  { id: 'adulto', rotulo: 'Adultos e VIP' },
  { id: 'sem_curso', rotulo: 'Sem curso' },
];

/**
 * @param {Array} linhas
 * @param {{ busca?, grupo?, soPendencia?, soRevisar?, soContrato?, soSelecionados?, selecionados? }} f
 */
export function filtrarLinhas(linhas, f = {}) {
  const termos = normalizar(f.busca).split(/\s+/).filter(Boolean);
  return linhas.filter((l) => {
    if (f.grupo && f.grupo !== 'todos' && l.grupo !== f.grupo) return false;
    if (f.soPendencia && !l.pendencia.quantidade) return false;
    if (f.soRevisar && !l.revisarValor) return false;
    if (f.soContrato && !l.contratoInvadeAno) return false;
    if (f.soSelecionados && !f.selecionados?.has(l.id)) return false;
    if (f.soSemConvite && l.convite) return false;
    if (termos.length) {
      const texto = normalizar(`${l.nome} ${l.responsavel} ${l.curso} ${l.turmas.join(' ')}`);
      if (!termos.every((t) => texto.includes(t))) return false;
    }
    return true;
  });
}

/** Contagem por grupo (para os chips de filtro). */
export const contarPorGrupo = (linhas) => linhas.reduce(
  (acc, l) => ({ ...acc, [l.grupo]: (acc[l.grupo] || 0) + 1, todos: (acc.todos || 0) + 1 }), {}
);

/** Indicadores do topo do painel. */
export function resumoPainel(linhas, selecionados = new Set()) {
  const sel = linhas.filter((l) => selecionados.has(l.id));
  return {
    ativos: linhas.length,
    kidsTeens: linhas.filter((l) => l.sugerido).length,
    selecionados: sel.length,
    contratoInvadeAno: linhas.filter((l) => l.contratoInvadeAno).length,
    comPendencia: linhas.filter((l) => l.pendencia.quantidade).length,
    revisarValor: linhas.filter((l) => l.revisarValor).length,
    // receita do ano no valor cheio (12 × nova) dos selecionados, antes de descontos
    receitaCheiaSelecionados: sel.reduce((s, l) => s + (l.convite?.mensalidadeNovaCentavos ?? l.mensalidadeNova) * 12, 0),
    // convites (etapa 3): `l.convite` vem da página; sem ele, tudo zero
    convitesGerados: linhas.filter((l) => l.convite && l.convite.status !== 'nao_renovara').length,
    convitesEnviados: linhas.filter((l) => l.convite?.enviosQtd > 0).length,
    naoRenovam: linhas.filter((l) => l.convite?.status === 'nao_renovara').length,
  };
}

// ── Configuração ───────────────────────────────────────────────────────────

const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());
const ehPct = (v, max = 100) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

/** Erros da configuração (vazio = pode salvar). Mensagens prontas para a tela. */
export function validarCampanha(c) {
  const erros = [];
  if (!ehPct(c.reajustePct, 50)) erros.push('Reajuste deve ficar entre 0% e 50%.');
  if (!['centavos', 'real'].includes(c.arredondamento)) erros.push('Arredondamento inválido.');

  const planos = c.planos || [];
  if (!planos.length) erros.push('É preciso ao menos um plano.');
  if (new Set(planos.map((p) => p.id)).size !== planos.length) erros.push('Há planos repetidos.');
  planos.forEach((p) => {
    if (!p.meses?.length || 12 % p.meses.length !== 0) erros.push(`${p.rotulo || p.id}: o nº de pagamentos precisa dividir 12.`);
    if (!ehPct(p.descontoPct)) erros.push(`${p.rotulo || p.id}: desconto entre 0% e 100%.`);
  });

  const noPrazo = c.descontoRenovacaoNoPrazo || {};
  if (!ehPct(noPrazo.pct)) erros.push('Desconto de renovação no prazo entre 0% e 100%.');
  (noPrazo.planos || []).forEach((id) => {
    try { planoDaCampanha(c, id); } catch { erros.push(`Desconto de renovação aponta para um plano que não existe (${id}).`); }
  });
  if (noPrazo.primeiraParcelaPagaAte && !ehData(noPrazo.primeiraParcelaPagaAte)) erros.push('Data-limite de pagamento da 1ª parcela inválida.');
  if (!ehPct(c.descontoIrmao?.pct ?? 0)) erros.push('Desconto de irmão entre 0% e 100%.');

  if (!(c.formasPagamento || []).length) erros.push('Escolha ao menos uma forma de pagamento.');
  const dias = c.diasVencimento || [];
  if (!dias.length) erros.push('Escolha ao menos um dia de vencimento.');
  if (dias.some((d) => !Number.isInteger(d) || d < 1 || d > 28)) erros.push('Dias de vencimento entre 1 e 28.');

  if (c.abertura && !ehData(c.abertura)) erros.push('Data de abertura inválida.');
  if (c.encerramento && !ehData(c.encerramento)) erros.push('Data de encerramento inválida.');
  if (ehData(c.abertura) && ehData(c.encerramento) && c.abertura > c.encerramento) erros.push('A abertura precisa vir antes do encerramento.');
  if (c.status === 'aberta' && !(ehData(c.abertura) && ehData(c.encerramento))) erros.push('Para abrir a campanha, defina abertura e encerramento.');

  const faixa = c.faixaMensalidadeRegular || {};
  if (faixa.min != null && faixa.max != null && Number(faixa.min) > Number(faixa.max)) erros.push('Na faixa de mensalidade regular, o mínimo passa do máximo.');
  if (c.mensagemWhatsApp != null && !String(c.mensagemWhatsApp).includes('{links}')) erros.push('A mensagem do WhatsApp precisa conter {links}, onde entra o link de cada aluno.');
  return erros;
}
