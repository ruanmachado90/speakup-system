/**
 * Leitura das despesas para a tela de Despesas: classificação em grupos da
 * DRE, comparação com referência do setor, lançamentos atípicos e índice de
 * busca. Puro — sem React, sem Firestore.
 */
import { paraData } from './reportKPIs';
import { formatDate } from './formatters';

/**
 * Conta a pagar. Lançamento antigo não tem `status` — é algo que já saiu do
 * caixa, então ausente vale 'pago'. `date` é sempre a data de CAIXA (é o que
 * todo relatório soma); numa conta em aberto ela carrega o vencimento como
 * previsão, e a baixa reescreve as duas com o dia do pagamento real.
 */
export const STATUS_DESPESA = { pago: 'Paga', pendente: 'A pagar' };
export const statusDe = (e) => (e.status === 'pendente' ? 'pendente' : 'pago');
export const estaPaga = (e) => statusDe(e) === 'pago';
export const vencimentoDe = (e) => paraData(e.vencimento ?? e.date);

/** Conta em aberto cujo vencimento já passou. `hoje` deve vir zerado (00:00). */
export const estaVencida = (e, hoje) => {
  if (estaPaga(e)) return false;
  const v = vencimentoDe(e);
  return !!v && v < hoje;
};

export const inicioDeHoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const TIPO_SAIDA = {
  operacional: 'Operacional',
  imposto: 'Imposto',
  retiradaSocio: 'Retirada de sócio',
  investimento: 'Investimento',
};
export const tipoDe = (e) => e.tipoSaida || 'operacional';
export const ehOperacional = (e) => ['operacional', 'imposto'].includes(tipoDe(e));

/**
 * Estrutura de custos de uma escola de idiomas, agrupada como numa DRE.
 * `faixa` é a referência de mercado em % da RECEITA RECEBIDA para escolas de
 * pequeno/médio porte — ponto de partida, não verdade absoluta. Ajuste aqui.
 * Classificação: tipoSaida 'imposto' → Impostos; senão categoria padrão;
 * senão palavra-chave na categoria personalizada ou na descrição.
 */
export const GRUPOS = [
  {
    id: 'docente', nome: 'Folha docente', faixa: [30, 40], categorias: ['Professores'],
    nota: 'Hora-aula, encargos e provisões dos professores. É o maior custo de uma escola de idiomas.',
    padrao: /professor|hora[- ]?aula|docente/i,
  },
  {
    id: 'equipe', nome: 'Equipe administrativa', faixa: [8, 12], categorias: ['Equipe administrativa'],
    nota: 'Secretaria e coordenação, com encargos.',
    padrao: /secretar|coordena|administrativ|recepc/i,
  },
  {
    // Lançamento antigo em 'Salários': não dá para saber se é professor ou
    // equipe, então fica sem faixa de referência em vez de ser comparado com
    // uma faixa errada. O aviso na tela pede a reclassificação.
    id: 'pessoalLegado', nome: 'Pessoal (a reclassificar)', faixa: null, categorias: ['Salários'],
    legado: true,
    nota: 'Lançado no antigo "Salários". Reclassifique em Professores ou Equipe administrativa para comparar a folha docente com o mercado.',
    padrao: /sal[aá]rio|folha|inss|fgts|f[eé]rias|rescis|vale[- ]?(transporte|refei)|benef[ií]cio/i,
  },
  {
    id: 'ocupacao', nome: 'Ocupação', faixa: [10, 15], categorias: ['Aluguel'],
    padrao: /aluguel|condom|iptu|energia|\bluz\b|[aá]gua|internet|telefon|limpeza|manuten|seguro/i,
  },
  {
    id: 'material', nome: 'Material e licenças', faixa: [3, 8], categorias: ['Materiais'],
    padrao: /livro|material|apostila|plataforma|royalt|licen[cç]a|papelaria/i,
  },
  {
    id: 'marketing', nome: 'Marketing e captação', faixa: [5, 10], categorias: ['Marketing'],
    padrao: /marketing|an[uú]ncio|\bads\b|tr[aá]fego|instagram|facebook|google|panfleto|evento|comiss[aã]o/i,
  },
  {
    id: 'tecnologia', nome: 'Tecnologia', faixa: [1, 3], categorias: ['Tecnologia'],
    padrao: /software|sistema|hospedagem|dom[ií]nio|tecnologia|computador|assinatura|app\b/i,
  },
  {
    id: 'administrativo', nome: 'Administrativo e serviços', faixa: [2, 5], categorias: ['Serviços', 'Transporte'],
    padrao: /contador|contab|banc[aá]ri|tarifa|taxa|jur[ií]dic|advoga|servi[cç]o|transporte|combust|uber|correio|cart[oó]rio/i,
  },
  {
    id: 'impostos', nome: 'Impostos', faixa: [6, 11], categorias: [],
    padrao: /imposto|\bdas\b|simples nacional|\biss\b|irpj|csll/i,
  },
  { id: 'outros', nome: 'Outros', faixa: null, categorias: [], padrao: null },
];
export const GRUPO_POR_ID = Object.fromEntries(GRUPOS.map((g) => [g.id, g]));

export const grupoDe = (e) => {
  if (tipoDe(e) === 'imposto') return 'impostos';
  const cat = e.category || '';
  const porCategoria = GRUPOS.find((g) => g.categorias.includes(cat));
  if (porCategoria) return porCategoria.id;
  const texto = `${cat} ${e.description || ''}`;
  return GRUPOS.find((g) => g.padrao?.test(texto))?.id || 'outros';
};

// "Acima do usual": valor ≥ 1,5× a média da mesma categoria nos 6 meses
// anteriores, com pelo menos 3 lançamentos de base. Substitui o corte fixo de
// R$ 1.000, que marcava todo aluguel e nunca marcava um material caro.
export const FATOR_ATIPICO = 1.5;
const JANELA_ATIPICO_DIAS = 180;
const MIN_BASE_ATIPICO = 3;

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const soma = (lista) => lista.reduce((s, e) => s + num(e.value), 0);
export const pct = (v) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Data do lançamento em horário local. `new Date(x.date)` lê o ISO como UTC e
// joga a despesa do dia 1º para o mês anterior no fuso de Brasília.
export const dataDe = (e) => paraData(e.date);

export const noPeriodo = (e, view, mes, ano) => {
  const d = dataDe(e);
  if (!d || d.getFullYear() !== ano) return false;
  return view === 'year' || d.getMonth() === mes;
};

/**
 * Totais do período para os KPIs. Recebe só lançamentos PAGOS — conta em
 * aberto é previsão, não custo realizado, e tem KPI próprio.
 */
export function resumirPeriodo(doPeriodo, doAnterior) {
  const operacionais = doPeriodo.filter(ehOperacional);
  return {
    total: soma(doPeriodo),
    totalAnterior: soma(doAnterior),
    custoOperacional: soma(operacionais),
    temFlagRecorrente: doPeriodo.some((e) => typeof e.recorrente === 'boolean'),
    fixos: soma(operacionais.filter((e) => e.recorrente === true)),
    foraOperacional: {
      retiradaSocio: soma(doPeriodo.filter((e) => tipoDe(e) === 'retiradaSocio')),
      investimento: soma(doPeriodo.filter((e) => tipoDe(e) === 'investimento')),
    },
  };
}

/**
 * Peso de cada grupo. Com receita (> 0) compara com a faixa do setor;
 * sem receita mostra a participação no custo operacional, sem faixa.
 */
export function estruturaDeCustos(doPeriodo, receita, orcamento = {}) {
  const operacionais = doPeriodo.filter(ehOperacional);
  const porGrupo = new Map(GRUPOS.map((g) => [g.id, 0]));
  for (const e of operacionais) {
    const g = grupoDe(e);
    porGrupo.set(g, porGrupo.get(g) + num(e.value));
  }
  const modo = receita > 0 ? 'receita' : 'saidas';
  const base = modo === 'receita' ? receita : soma(operacionais);
  const linhas = GRUPOS
    .map((g) => {
      const valor = porGrupo.get(g.id);
      const p = base > 0 ? (valor / base) * 100 : 0;
      let status = null;
      if (modo === 'receita' && g.faixa) status = p > g.faixa[1] ? 'acima' : p < g.faixa[0] ? 'abaixo' : 'dentro';
      // Orçamento próprio da escola, quando definido em Parâmetros. Manda na
      // leitura de "estourou?" — a faixa do setor é só referência externa.
      const meta = Number(orcamento[g.id]) || 0;
      const orcamentoPct = meta > 0 ? (valor / meta) * 100 : null;
      if (meta > 0) status = valor > meta ? 'acima' : 'dentro';
      return { ...g, valor, pct: p, status, meta, orcamentoPct };
    })
    .filter((l) => l.valor > 0 || l.meta > 0 || (modo === 'receita' && l.faixa));
  const escala = Math.max(10, ...linhas.map((l) => Math.max(l.pct, modo === 'receita' && l.faixa ? l.faixa[1] : 0))) * 1.1;

  // Geometria da barra, já em 0–100 da largura: quem desenha não precisa saber
  // qual escala valeu. Com orçamento a barra é realizado/orçamento (escala
  // própria da linha); sem ele, é % da receita na escala comum do painel —
  // misturar as duas colocaria barra e marcador em réguas diferentes.
  const comGeometria = linhas.map((l) => {
    if (l.meta > 0) {
      const local = Math.max(100, l.orcamentoPct) * 1.05;
      return { ...l, barra: { preenchido: (l.orcamentoPct / local) * 100, marcadores: [(100 / local) * 100] } };
    }
    const preenchido = Math.min(100, (l.pct / escala) * 100);
    const marcadores = modo === 'receita' && l.faixa ? l.faixa.map((f) => (f / escala) * 100) : [];
    return { ...l, barra: { preenchido, marcadores } };
  });

  return { modo, linhas: comGeometria, escala, acima: comGeometria.filter((l) => l.status === 'acima') };
}

/** Ids dos lançamentos acima do usual para a categoria. */
export function marcarAtipicos(expenses) {
  const porCategoria = new Map();
  for (const e of expenses) {
    const d = dataDe(e);
    if (!d) continue;
    const chave = e.category || '';
    if (!porCategoria.has(chave)) porCategoria.set(chave, []);
    porCategoria.get(chave).push({ id: e.id, t: d.getTime(), v: num(e.value) });
  }
  const marcados = new Set();
  const janela = JANELA_ATIPICO_DIAS * 86400000;
  for (const lista of porCategoria.values()) {
    if (lista.length <= MIN_BASE_ATIPICO) continue;
    lista.sort((a, b) => a.t - b.t);
    for (let i = 0; i < lista.length; i++) {
      const base = [];
      for (let j = i - 1; j >= 0 && lista[i].t - lista[j].t <= janela; j--) base.push(lista[j].v);
      if (base.length < MIN_BASE_ATIPICO) continue;
      const media = base.reduce((s, v) => s + v, 0) / base.length;
      if (media > 0 && lista[i].v >= media * FATOR_ATIPICO) marcados.add(lista[i].id);
    }
  }
  return marcados;
}

/** id → texto normalizado com tudo que a busca deve achar. */
export function indexarBusca(expenses) {
  const m = new Map();
  for (const e of expenses) {
    const v = num(e.value);
    m.set(e.id, normalizar([
      e.description, e.category, e.paymentMethod, TIPO_SAIDA[tipoDe(e)],
      GRUPO_POR_ID[grupoDe(e)].nome, formatDate(e.date),
      v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), v.toFixed(2).replace('.', ','),
      e.recorrente ? 'recorrente fixa' : '',
      e.parcelas > 1 ? `parcelado parcela ${e.parcela}/${e.parcelas}` : '',
    ].join(' ')));
  }
  return m;
}

/** Ordena por data (desempate: cadastro), valor ou descrição. */
export function ordenarDespesas(lista, { campo, dir }) {
  const sinal = dir === 'asc' ? 1 : -1;
  const tempo = (e) => dataDe(e)?.getTime() ?? 0;
  const cmp = {
    data: (a, b) => tempo(a) - tempo(b) || (a.createdAt || 0) - (b.createdAt || 0),
    valor: (a, b) => num(a.value) - num(b.value),
    descricao: (a, b) => (a.description || '').localeCompare(b.description || '', 'pt-BR'),
  }[campo];
  return [...lista].sort((a, b) => cmp(a, b) * sinal);
}
