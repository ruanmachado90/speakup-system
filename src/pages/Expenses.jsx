import { useMemo, useState, useEffect, useRef, useDeferredValue } from 'react';
import {
  PlusCircle, AlertCircle, TrendingDown, Eye, EyeOff, Search, ChevronLeft, ChevronRight, Repeat, CheckCircle2,
} from 'lucide-react';
import { Card, DonutChart, ExpenseEvolutionChart, PaymentMethodChart } from '../components';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EstruturaCustos from '../components/despesas/EstruturaCustos';
import TabelaDespesas from '../components/despesas/TabelaDespesas';
import MenuExportar from '../components/despesas/MenuExportar';
import Segmentado from '../components/despesas/Segmentado';
import KpisDespesas from '../components/despesas/KpisDespesas';
import FiltrosDespesas, { OUTRAS } from '../components/despesas/FiltrosDespesas';
import { formatCurrency, exportToExcel, exportToCSV, printExpenses, EXPENSE_CATEGORIES_TODAS } from '../utils';
import { receitaRecebidaNoMes } from '../utils/reportKPIs';
import { hojeLocalYMD } from '../utils/despesaParcelas';
import { recorrentesDoMes } from '../utils/despesasRecorrentes';
import {
  tipoDe, ehOperacional, grupoDe, estaPaga, estaVencida, inicioDeHoje, vencimentoDe,
  num, soma, normalizar, dataDe, noPeriodo,
  resumirPeriodo, estruturaDeCustos, marcarAtipicos, indexarBusca, ordenarDespesas,
} from '../utils/despesasAnalise';
import { useData } from '../context/DataContext';
import { useAuthContext } from '../context/AuthContext';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const HIDE_VALUES_KEY = 'speakup:despesas:hideValues';
const POR_PAGINA = 50;

const selectCls = 'border border-strong bg-surface-card rounded-su-sm px-3 py-2 text-su-sm font-semibold text-content-body focus:outline-none focus-visible:shadow-ring-accent';
const iconBtnCls = 'p-2 rounded-su-sm text-content-muted hover:text-content-body hover:bg-surface-sunken transition-colors focus:outline-none focus-visible:shadow-ring-accent';
const primaryBtnCls = 'px-4 py-2 bg-accent text-white text-su-sm font-semibold rounded-su-sm flex items-center gap-2 hover:bg-accent-hover transition-colors focus:outline-none focus-visible:shadow-ring-accent';
const ghostBtnCls = 'px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body flex gap-2 items-center hover:bg-gr-50 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';

const SemDados = ({ children }) => (
  <div className="py-12 text-center text-content-muted text-su-sm">
    <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
    {children}
  </div>
);

const Expenses = ({
  expenseView,
  setExpenseView,
  expenseMonth,
  setExpenseMonth,
  expenseYear,
  setExpenseYear,
  expenses = [],
  setModal,
  handleDeleteExpense,
  marcarDespesaPaga,
  reabrirDespesa,
  gerarRecorrentes,
}) => {
  const { payments = [], parametros, dataLoading } = useData();
  const { role } = useAuthContext();
  // Receita e margem são leitura de gestão — a secretaria vê só as saídas,
  // como no dashboard dela.
  const verReceita = role === 'admin';
  // Gráficos de análise (estrutura de custos, categorias, formas de pagamento,
  // evolução): só admin. A secretaria fica com indicadores + lançamentos.
  const verAnalises = role === 'admin';

  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);
  const [escopoBusca, setEscopoBusca] = useState('periodo'); // 'periodo' | 'todos'
  // null = automático. As despesas chegam depois do primeiro render, então o
  // padrão não pode ser decidido no useState — é resolvido em `statusEfetivo`,
  // já com os dados em mão e sem efeito que cause re-render em cascata.
  const [statusFiltro, setStatusFiltro] = useState(null); // null | pagas | aPagar | vencidas | todas
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [ordem, setOrdem] = useState({ campo: 'data', dir: 'desc' });
  const [paginacao, setPaginacao] = useState({ assinatura: '', limite: POR_PAGINA });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, expense: null });
  const [hideValues, setHideValues] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === '1';
    } catch {
      return false;
    }
  });

  const buscaRef = useRef(null);
  const hoje = useMemo(() => inicioDeHoje(), []);

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_VALUES_KEY, hideValues ? '1' : '0');
    } catch {
      // Storage bloqueado: a preferência vale só nesta sessão.
    }
  }, [hideValues]);

  // "/" foca a busca (padrão de apps de listagem); Esc dentro dela limpa.
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = ev.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || ev.target?.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      ev.preventDefault();
      buscaRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Período ──────────────────────────────────────────────────────────
  const rotuloPeriodo = expenseView === 'month' ? `${MESES[expenseMonth]} de ${expenseYear}` : `Ano ${expenseYear}`;
  // Memoizado: entra como dependência dos useMemo de período e de recorrentes.
  const periodoAnterior = useMemo(() => (expenseView === 'month'
    ? (expenseMonth === 0 ? { mes: 11, ano: expenseYear - 1 } : { mes: expenseMonth - 1, ano: expenseYear })
    : { mes: expenseMonth, ano: expenseYear - 1 }
  ), [expenseView, expenseMonth, expenseYear]);
  const rotuloAnterior = expenseView === 'month' ? MESES[periodoAnterior.mes].toLowerCase() : String(periodoAnterior.ano);

  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    let min = atual;
    let max = Math.max(atual + 1, expenseYear);
    for (const e of expenses) {
      // Parcela futura (ex.: 24x) e conta a pagar também precisam do ano delas.
      for (const d of [dataDe(e), vencimentoDe(e)]) {
        if (!d) continue;
        if (d.getFullYear() < min) min = d.getFullYear();
        if (d.getFullYear() > max) max = d.getFullYear();
      }
    }
    return Array.from({ length: max - Math.min(min, expenseYear) + 1 }, (_, i) => max - i);
  }, [expenses, expenseYear]);

  const navegar = (passo) => {
    if (expenseView === 'year') {
      setExpenseYear(expenseYear + passo);
      return;
    }
    const alvo = expenseMonth + passo;
    if (alvo < 0) { setExpenseMonth(11); setExpenseYear(expenseYear - 1); }
    else if (alvo > 11) { setExpenseMonth(0); setExpenseYear(expenseYear + 1); }
    else setExpenseMonth(alvo);
  };

  // ── Realizado x a pagar ──────────────────────────────────────────────
  // Pagas entram pela competência (data de caixa); contas em aberto, pelo
  // vencimento. É a mesma separação do relatório: previsão não é custo.
  const pagasDoPeriodo = useMemo(
    () => expenses.filter((e) => estaPaga(e) && noPeriodo(e, expenseView, expenseMonth, expenseYear)),
    [expenses, expenseView, expenseMonth, expenseYear]
  );
  const pagasDoAnterior = useMemo(
    () => expenses.filter((e) => estaPaga(e) && noPeriodo(e, expenseView, periodoAnterior.mes, periodoAnterior.ano)),
    [expenses, expenseView, periodoAnterior.mes, periodoAnterior.ano]
  );
  const emAberto = useMemo(() => expenses.filter((e) => !estaPaga(e)), [expenses]);
  const aPagarDoPeriodo = useMemo(() => {
    return emAberto.filter((e) => {
      const v = vencimentoDe(e);
      if (!v || v.getFullYear() !== expenseYear) return false;
      return expenseView === 'year' || v.getMonth() === expenseMonth;
    });
  }, [emAberto, expenseView, expenseMonth, expenseYear]);
  // Vencidas não respeitam o período: conta atrasada de outro mês continua devendo.
  const vencidasTodas = useMemo(() => emAberto.filter((e) => estaVencida(e, hoje)), [emAberto, hoje]);

  // Quem abre a tela todo dia vai pagar conta, não revisar o que já pagou:
  // havendo conta vencida, a lista já abre nelas.
  const statusEfetivo = statusFiltro ?? (vencidasTodas.length > 0 ? 'vencidas' : 'pagas');
  const emDia = statusEfetivo === 'vencidas' && vencidasTodas.length === 0;

  const receita = useMemo(() => {
    if (!verReceita) return 0;
    const meses = expenseView === 'month' ? [expenseMonth] : Array.from({ length: 12 }, (_, i) => i);
    return meses.reduce((s, m) => s + receitaRecebidaNoMes(payments, m, expenseYear), 0);
  }, [verReceita, payments, expenseView, expenseMonth, expenseYear]);

  // ── KPIs e análise ───────────────────────────────────────────────────
  const resumo = useMemo(() => resumirPeriodo(pagasDoPeriodo, pagasDoAnterior), [pagasDoPeriodo, pagasDoAnterior]);
  // Na visão anual o orçamento (mensal) é multiplicado pelos 12 meses.
  const orcamento = useMemo(() => {
    const base = parametros?.orcamentoDespesas || {};
    if (expenseView === 'month') return base;
    return Object.fromEntries(Object.entries(base).map(([g, v]) => [g, Number(v) * 12]));
  }, [parametros, expenseView]);
  const estrutura = useMemo(
    () => estruturaDeCustos(pagasDoPeriodo, verReceita ? receita : 0, orcamento),
    [pagasDoPeriodo, verReceita, receita, orcamento]
  );
  const atipicos = useMemo(() => marcarAtipicos(expenses), [expenses]);
  const indiceBusca = useMemo(() => indexarBusca(expenses), [expenses]);

  const aPagarResumo = { total: soma(aPagarDoPeriodo), quantidade: aPagarDoPeriodo.length };
  const vencidasResumo = {
    total: soma(vencidasTodas),
    quantidade: vencidasTodas.length,
    rotuloTotal: formatCurrency(soma(vencidasTodas)),
  };

  // Direção real da variação; o KPI recebe `invertDelta` para pintar subida de
  // despesa em tom de alerta em vez de verde.
  const deltaTotal = (() => {
    if (!resumo.totalAnterior) return null;
    const v = Math.round(((resumo.total - resumo.totalAnterior) / resumo.totalAnterior) * 100);
    if (v === 0) return { direction: 'flat', text: `igual a ${rotuloAnterior}` };
    return {
      direction: v > 0 ? 'up' : 'down',
      text: `${v > 0 ? '+' : '−'}${Math.abs(v)}% vs. ${rotuloAnterior}`,
    };
  })();

  const margem = verReceita && receita > 0 ? ((receita - resumo.custoOperacional) / receita) * 100 : null;

  // ── Contas fixas do mês ──────────────────────────────────────────────
  const recorrentesPendentes = useMemo(() => {
    if (expenseView !== 'month') return 0;
    return recorrentesDoMes(expenses, {
      origem: periodoAnterior,
      destino: { mes: expenseMonth, ano: expenseYear },
    }).lancamentos.length;
  }, [expenses, expenseView, expenseMonth, expenseYear, periodoAnterior]);

  // ── Busca e filtros ──────────────────────────────────────────────────
  const termos = useMemo(() => normalizar(buscaAdiada).split(/\s+/).filter(Boolean), [buscaAdiada]);
  const buscandoEmTudo = termos.length > 0 && escopoBusca === 'todos';

  const baseLista = useMemo(() => {
    if (buscandoEmTudo) return expenses;
    if (statusEfetivo === 'aPagar') return aPagarDoPeriodo;
    if (statusEfetivo === 'vencidas') return vencidasTodas;
    if (statusEfetivo === 'todas') return [...pagasDoPeriodo, ...aPagarDoPeriodo];
    return pagasDoPeriodo;
  }, [buscandoEmTudo, expenses, statusEfetivo, pagasDoPeriodo, aPagarDoPeriodo, vencidasTodas]);

  const opcoesCategoria = useMemo(() => {
    const personalizadas = new Set();
    for (const e of baseLista) if (e.category && !EXPENSE_CATEGORIES_TODAS.includes(e.category)) personalizadas.add(e.category);
    return [...personalizadas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [baseLista]);

  const filtradas = useMemo(() => {
    return baseLista.filter((e) => {
      if (categoriaFiltro === OUTRAS) {
        if (EXPENSE_CATEGORIES_TODAS.includes(e.category)) return false;
      } else if (categoriaFiltro && e.category !== categoriaFiltro) return false;
      if (tipoFiltro && tipoDe(e) !== tipoFiltro) return false;
      if (grupoFiltro && (!ehOperacional(e) || grupoDe(e) !== grupoFiltro)) return false;
      if (termos.length) {
        const texto = indiceBusca.get(e.id) || '';
        if (!termos.every((t) => texto.includes(t))) return false;
      }
      return true;
    });
  }, [baseLista, categoriaFiltro, tipoFiltro, grupoFiltro, termos, indiceBusca]);

  const ordenadas = useMemo(() => ordenarDespesas(filtradas, ordem), [filtradas, ordem]);
  const totalFiltrado = useMemo(() => soma(filtradas), [filtradas]);

  // Paginação volta ao início quando qualquer filtro muda, sem efeito extra.
  const assinatura = [expenseView, expenseMonth, expenseYear, buscaAdiada, escopoBusca, statusEfetivo, categoriaFiltro, tipoFiltro, grupoFiltro, ordem.campo, ordem.dir].join('|');
  const limite = paginacao.assinatura === assinatura ? paginacao.limite : POR_PAGINA;
  const visiveis = ordenadas.slice(0, limite);

  const filtrosAtivos = Boolean(busca || categoriaFiltro || tipoFiltro || grupoFiltro || statusEfetivo !== 'pagas');
  const limparFiltros = () => {
    setBusca('');
    setCategoriaFiltro('');
    setTipoFiltro('');
    setGrupoFiltro('');
    setStatusFiltro('pagas');
  };

  const alternarOrdem = (campo) => {
    setOrdem((o) => (o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: campo === 'descricao' ? 'asc' : 'desc' }));
  };

  const mask = (texto) => (hideValues ? '••••' : texto);

  // ── Ações ────────────────────────────────────────────────────────────
  const novaDespesa = () => setModal({ open: true, type: 'expense' });

  // Parcela de compra: remove a compra inteira (todas as parcelas). Apagar só
  // uma deixaria a compra pela metade nos relatórios dos outros meses.
  const despesaRemover = confirmDialog.expense;
  const parcelaRemover = despesaRemover?.parcelas > 1 && despesaRemover?.grupoParcelamento;
  const fecharConfirmacao = () => setConfirmDialog({ isOpen: false, expense: null });
  const confirmDelete = () => {
    if (despesaRemover) handleDeleteExpense(despesaRemover.id, parcelaRemover ? despesaRemover.grupoParcelamento : null);
    fecharConfirmacao();
  };

  const rotuloExportacao = buscandoEmTudo ? 'todos os períodos' : rotuloPeriodo;
  const nomeArquivo = buscandoEmTudo
    ? 'despesas_busca'
    : `despesas_${expenseView === 'month' ? `${MESES[expenseMonth]}_${expenseYear}` : expenseYear}`;

  const exportar = (tipo) => {
    if (tipo === 'excel') exportToExcel(ordenadas, nomeArquivo);
    else if (tipo === 'csv') exportToCSV(ordenadas, nomeArquivo);
    else printExpenses(ordenadas, rotuloExportacao);
  };

  // ── Evolução (só realizado, com data em horário local) ───────────────
  const evolucao = useMemo(() => {
    const values = Array(12).fill(0);
    for (const e of expenses) {
      if (!estaPaga(e)) continue;
      const d = dataDe(e);
      if (d && d.getFullYear() === expenseYear) values[d.getMonth()] += num(e.value);
    }
    return { labels: MESES_CURTO, values };
  }, [expenses, expenseYear]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Controles de período ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado
            rotulo="Visualização"
            valor={expenseView}
            onChange={setExpenseView}
            opcoes={[{ valor: 'month', rotulo: 'Mensal' }, { valor: 'year', rotulo: 'Anual' }]}
          />

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => navegar(-1)} className={iconBtnCls} aria-label={expenseView === 'month' ? 'Mês anterior' : 'Ano anterior'}>
              <ChevronLeft size={18} />
            </button>
            {expenseView === 'month' && (
              <select value={expenseMonth} onChange={(e) => setExpenseMonth(Number(e.target.value))} className={selectCls} aria-label="Mês">
                {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            )}
            <select value={expenseYear} onChange={(e) => setExpenseYear(Number(e.target.value))} className={selectCls} aria-label="Ano">
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="button" onClick={() => navegar(1)} className={iconBtnCls} aria-label={expenseView === 'month' ? 'Próximo mês' : 'Próximo ano'}>
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHideValues((v) => !v)}
            className={iconBtnCls}
            aria-pressed={hideValues}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button type="button" onClick={novaDespesa} className={primaryBtnCls}>
          <PlusCircle size={16} /> Nova despesa
        </button>
      </div>

      <KpisDespesas
        resumo={resumo}
        aPagar={aPagarResumo}
        vencidas={vencidasResumo}
        receita={receita}
        verReceita={verReceita}
        margem={margem}
        rotuloAnterior={rotuloAnterior}
        deltaTotal={deltaTotal}
        qtdLancamentos={pagasDoPeriodo.length}
        hideValues={hideValues}
        loading={dataLoading}
      />

      {/* Contas fixas do mês anterior que ainda não foram lançadas neste. */}
      {!dataLoading && recorrentesPendentes > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-su-md border border-subtle bg-info-bg px-4 py-3">
          <p className="text-su-sm text-info-fg">
            <span className="font-semibold">{recorrentesPendentes} conta(s) fixa(s)</span> de {rotuloAnterior} ainda
            não existem em {rotuloPeriodo.toLowerCase()} — aluguel, folha e assinaturas marcados como recorrentes.
          </p>
          <button
            type="button"
            onClick={() => gerarRecorrentes(expenses, periodoAnterior, { mes: expenseMonth, ano: expenseYear })}
            className={`${ghostBtnCls} shrink-0`}
          >
            <Repeat size={16} /> Gerar em aberto
          </button>
        </div>
      )}

      {/* ── Estrutura de custos + categorias e formas de pagamento ───────
          Só admin: a secretaria lança e confere despesas, não analisa a
          estrutura de custos (decisão do Ruan, 14/10/2026). */}
      {verAnalises && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <EstruturaCustos
            className="lg:col-span-3"
            estrutura={estrutura}
            rotuloPeriodo={rotuloPeriodo}
            verReceita={verReceita}
            foraOperacional={resumo.foraOperacional}
            grupoFiltro={grupoFiltro}
            onFiltrarGrupo={setGrupoFiltro}
            hideValues={hideValues}
            loading={dataLoading}
          />

          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <h3 className="font-display font-bold text-base text-content-strong mb-1">Por categoria</h3>
              <p className="text-su-sm text-content-muted mb-4">{rotuloPeriodo} · só o que já foi pago</p>
              {pagasDoPeriodo.length > 0 ? <DonutChart data={pagasDoPeriodo} /> : <SemDados>Sem dados para exibir</SemDados>}
            </Card>

            <Card>
              <h3 className="font-display font-bold text-base text-content-strong mb-1">Formas de pagamento</h3>
              <p className="text-su-sm text-content-muted mb-4">{rotuloPeriodo} · só o que já foi pago</p>
              {pagasDoPeriodo.length > 0 ? <PaymentMethodChart data={pagasDoPeriodo} /> : <SemDados>Sem dados para exibir</SemDados>}
            </Card>
          </div>
        </div>
      )}

      {/* ── Lista ────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div className="p-6 pb-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-content-strong">Lançamentos</h3>
              <p className="text-su-sm text-content-muted" aria-live="polite">
                {filtradas.length} lançamento{filtradas.length !== 1 ? 's' : ''}
                {' · '}Total {mask(formatCurrency(totalFiltrado))}
                {buscandoEmTudo && ' · todos os períodos'}
                {statusEfetivo === 'vencidas' && ' · todos os períodos'}
              </p>
              {!verReceita && (
                <p className="text-su-xs text-content-muted mt-0.5">
                  Retiradas de sócio não aparecem neste perfil.
                </p>
              )}
            </div>
            <MenuExportar quantidade={ordenadas.length} onExportar={exportar} />
          </div>

          <FiltrosDespesas
            busca={busca}
            setBusca={setBusca}
            buscaRef={buscaRef}
            statusFiltro={statusEfetivo}
            setStatusFiltro={setStatusFiltro}
            contagens={{
              pagas: pagasDoPeriodo.length,
              aPagar: aPagarDoPeriodo.length,
              vencidas: vencidasTodas.length,
              todas: pagasDoPeriodo.length + aPagarDoPeriodo.length,
            }}
            categoriaFiltro={categoriaFiltro}
            setCategoriaFiltro={setCategoriaFiltro}
            categoriasPadrao={EXPENSE_CATEGORIES_TODAS}
            opcoesCategoria={opcoesCategoria}
            tipoFiltro={tipoFiltro}
            setTipoFiltro={setTipoFiltro}
            grupoFiltro={grupoFiltro}
            setGrupoFiltro={setGrupoFiltro}
            termos={termos}
            escopoBusca={escopoBusca}
            setEscopoBusca={setEscopoBusca}
            rotuloPeriodo={rotuloPeriodo}
            filtrosAtivos={filtrosAtivos}
            limparFiltros={limparFiltros}
          />
        </div>

        {dataLoading ? (
          <div className="px-6 pb-6 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-su-xs bg-surface-sunken animate-pulse" />)}
          </div>
        ) : ordenadas.length > 0 ? (
          <TabelaDespesas
            linhas={visiveis}
            ordem={ordem}
            onOrdenar={alternarOrdem}
            atipicos={atipicos}
            total={totalFiltrado}
            rotuloTotal={filtrosAtivos ? 'Total filtrado' : 'Total do período'}
            hoje={hoje}
            hideValues={hideValues}
            onEditar={(x) => setModal({ open: true, type: 'expense', data: x })}
            onRemover={(x) => setConfirmDialog({ isOpen: true, expense: x })}
            onBaixar={(x) => marcarDespesaPaga(x.id, hojeLocalYMD())}
            onReabrir={(x) => reabrirDespesa(x.id, x.vencimento ?? x.date)}
            restantes={ordenadas.length - visiveis.length}
            onMostrarMais={() => setPaginacao({ assinatura, limite: limite + POR_PAGINA })}
          />
        ) : filtrosAtivos ? (
          <div className="py-12 px-6 text-center">
            {/* "Nenhuma conta vencida" é uma boa notícia, não uma busca sem
                resultado — lupa comunicava o contrário. */}
            {emDia ? (
              <>
                <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
                <p className="text-content-body font-medium">Nenhuma conta vencida. Está tudo em dia.</p>
              </>
            ) : (
              <>
                <Search size={40} className="mx-auto mb-3 text-content-muted" />
                <p className="text-content-body font-medium">Nenhuma despesa encontrada com esses filtros</p>
              </>
            )}
            {termos.length > 0 && escopoBusca === 'periodo' && (
              <button type="button" onClick={() => setEscopoBusca('todos')} className="mt-3 text-su-sm font-semibold text-accent hover:underline">
                Buscar em todos os períodos
              </button>
            )}
            <div>
              <button type="button" onClick={limparFiltros} className="mt-2 text-su-sm font-semibold text-content-muted hover:text-content-body hover:underline">
                Limpar filtros
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="bg-surface-sunken rounded-pill p-5 mb-4">
              <TrendingDown size={36} className="text-content-faint" />
            </div>
            <h3 className="font-display font-bold text-content-strong mb-1">Nenhuma despesa em {rotuloPeriodo.toLowerCase()}</h3>
            <p className="text-su-sm text-content-muted mb-5 max-w-sm">
              Registre aluguel, folha e demais saídas para acompanhar a estrutura de custos da escola.
            </p>
            <button type="button" onClick={novaDespesa} className={primaryBtnCls}>
              <PlusCircle size={16} /> Adicionar despesa
            </button>
          </div>
        )}
      </Card>

      {/* ── Evolução (só admin) ──────────────────────────────────────── */}
      {verAnalises && (
        <Card>
          <h3 className="font-display font-bold text-base text-content-strong mb-1">Evolução das saídas</h3>
          <p className="text-su-sm text-content-muted mb-4">Mês a mês em {expenseYear} · só o que já foi pago</p>
          {evolucao.values.some((v) => v > 0)
            ? <ExpenseEvolutionChart labels={evolucao.labels} values={evolucao.values} year={expenseYear} />
            : <SemDados>Sem dados de evolução para exibir</SemDados>}
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onCancel={fecharConfirmacao}
        onConfirm={confirmDelete}
        title={parcelaRemover ? 'Remover compra parcelada' : 'Remover despesa'}
        message={parcelaRemover
          ? `"${despesaRemover.description}" foi parcelada em ${despesaRemover.parcelas}x. Todas as ${despesaRemover.parcelas} parcelas serão removidas. Esta ação não pode ser desfeita.`
          : `Remover "${despesaRemover?.description ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel={parcelaRemover ? `Remover ${despesaRemover.parcelas} parcelas` : 'Remover'}
        cancelLabel="Cancelar"
        variant="danger"
      />
    </>
  );
};

export { Expenses };
export default Expenses;
