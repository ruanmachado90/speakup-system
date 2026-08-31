import { useState, useMemo, useEffect } from 'react';
import { Printer, Plus, Trash2, ListTodo, PhoneCall, UserX, RefreshCw, AlertTriangle, AlertCircle, Clock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Card, Table, KPI, EvolutionChart, ProfitChart } from '../components';
import { formatCurrency, formatDate } from '../utils';
import { useFaltasHoje, useLembretes, useTodos, useAulasStats } from '../hooks/useDashboardData';
import RegistrationsModal from '../components/dashboard/RegistrationsModal';
import CancellationsModal from '../components/dashboard/CancellationsModal';
import OverduePaymentsModal from '../components/dashboard/OverduePaymentsModal';
import { PaymentRow } from '../components/dashboard/PaymentRow';
import { enviarWhatsAppCobranca } from '../components/dashboard/enviarWhatsAppCobranca';

const HIDE_VALUES_KEY = 'speakup:dashboard:hideValues';

const horaCurta = (date) =>
  date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

/**
 * Só existe base de comparação para os valores financeiros, e só na visão
 * mensal — não há série histórica de alunos em lugar nenhum do sistema.
 */
const buildDelta = (serie, dashboardRange) => {
  if (dashboardRange !== 'month' || !serie) return null;
  const mesAtual = new Date().getMonth();
  if (mesAtual === 0) return null;
  const anterior = Number(serie[mesAtual - 1] || 0);
  const atual = Number(serie[mesAtual] || 0);
  if (!anterior) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return { direction: 'flat', text: 'igual ao mês anterior' };
  return {
    direction: pct > 0 ? 'up' : 'down',
    text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% vs. mês anterior`,
  };
};

export const Dashboard = ({
  dashboardRange,
  setDashboardRange,
  printDashboard,
  stats,
  monthlyData,
  teacherStats,
  filteredExpenses,
  students,
  payments,
  professores,
  role,
  dataLoading = false
}) => {
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showCancellationsModal, setShowCancellationsModal] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [hideValues, setHideValues] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_VALUES_KEY, hideValues ? '1' : '0');
    } catch {
      // Modo privativo ou storage bloqueado: a preferência vale só nesta sessão.
    }
  }, [hideValues]);

  const {
    faltasHoje,
    faltasLoading,
    faltasErro,
    aulasHoje,
    atualizadoEm,
    carregarFaltasHoje,
    marcarContatado: handleMarcarContatado
  } = useFaltasHoje();
  const { lembretes, addLembrete, deleteLembrete: handleDeleteLembrete } = useLembretes();
  const { todos, addTodo, toggleTodo: handleToggleTodo, deleteTodo: handleDeleteTodo } = useTodos();
  const aulasStats = useAulasStats(dashboardRange);

  // ── Lembretes local UI state ───────────────────────────────────────────────
  const [novoTexto, setNovoTexto] = useState('');
  const [novaCor, setNovaCor] = useState('yellow');
  const [showAddLembrete, setShowAddLembrete] = useState(false);
  const [addingLembrete, setAddingLembrete] = useState(false);

  const handleAddLembrete = async (e) => {
    e.preventDefault();
    if (!novoTexto.trim()) return;
    setAddingLembrete(true);
    try {
      await addLembrete(novoTexto, novaCor);
      setNovoTexto('');
      setNovaCor('yellow');
      setShowAddLembrete(false);
    } finally {
      setAddingLembrete(false);
    }
  };

  // ── To-Do local UI state ───────────────────────────────────────────────────
  const [novoTodo, setNovoTodo] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!novoTodo.trim()) return;
    setAddingTodo(true);
    try {
      await addTodo(novoTodo);
      setNovoTodo('');
    } finally {
      setAddingTodo(false);
    }
  };

  const COR_MAP = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-400', label: 'Atenção' },
    red:    { bg: 'bg-red-50',   border: 'border-red-300',   dot: 'bg-red-500',   label: 'Urgente' },
    blue:   { bg: 'bg-blue-50',  border: 'border-blue-300',  dot: 'bg-blue-500',  label: 'Info' },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500', label: 'OK' },
  };

  // Filtrar alunos matriculados no período (otimizado com Map lookup)
  const registeredStudents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      if (dashboardRange === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return d.getFullYear() === currentYear;
    };

    // Criar Map de payments por studentId para lookup O(1)
    const paymentsByStudent = new Map();
    payments.forEach(payment => {
      if (!paymentsByStudent.has(payment.studentId)) {
        paymentsByStudent.set(payment.studentId, []);
      }
      paymentsByStudent.get(payment.studentId).push(payment);
    });

    return students
      .filter(s => inPeriod(s.createdAt))
      .map(student => {
        const studentPayments = paymentsByStudent.get(student.id) || [];
        const sortedPayments = studentPayments
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const firstPayment = sortedPayments[0];

        return {
          ...student,
          matriculaDate: student.createdAt ? new Date(Number(student.createdAt)) : null,
          firstPayment: firstPayment || null,
          paymentStatus: firstPayment?.status || 'Sem pagamento'
        };
      })
      .sort((a, b) => (b.matriculaDate?.getTime() || 0) - (a.matriculaDate?.getTime() || 0));
  }, [students, payments, dashboardRange]);

  // Filtrar alunos cancelados no período
  const cancelledStudents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      if (dashboardRange === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return d.getFullYear() === currentYear;
    };

    return students
      .filter(s => s.status === 'cancelado' && inPeriod(s.canceledAt))
      .map(student => ({
        ...student,
        cancelDate: student.canceledAt ? new Date(Number(student.canceledAt)) : null,
      }))
      .sort((a, b) => (b.cancelDate?.getTime() || 0) - (a.cancelDate?.getTime() || 0));
  }, [students, dashboardRange]);

  // "R$ 4.320" sozinho não diz o que fazer: uma dívida grande e sete pequenas
  // pedem respostas diferentes.
  const vencidasSub = useMemo(() => {
    const n = stats.overdueCount || 0;
    if (!n) return null;
    return `${n} cobrança${n !== 1 ? 's' : ''}`;
  }, [stats.overdueCount]);

  const deltaRecebida = useMemo(
    () => buildDelta(monthlyData?.paid, dashboardRange),
    [monthlyData, dashboardRange]
  );
  const deltaPrevista = useMemo(
    () => buildDelta(monthlyData?.planned, dashboardRange),
    [monthlyData, dashboardRange]
  );

  return (
    <>
      {/* ── Central do Dia ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-content-body mb-3">Central do Dia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ── Vencimentos ─────────────────────────────────────────── */}
        <Card>
          {(() => {
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const em5dias = new Date(hoje); em5dias.setDate(em5dias.getDate() + 5);
            const vencendoHoje = payments.filter(p => {
              if (p.status === 'Pago') return false;
              const d = new Date(p.dueDate); d.setHours(0,0,0,0);
              return d.getTime() === hoje.getTime();
            });
            const proximosVencimentos = payments.filter(p => {
              if (p.status === 'Pago') return false;
              const d = new Date(p.dueDate); d.setHours(0,0,0,0);
              return d > hoje && d <= em5dias;
            }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            const avisar = (payment) => enviarWhatsAppCobranca(payment, students);
            const diaMes = (p) => (p.dueDate ? `${p.dueDate.substring(8, 10)}/${p.dueDate.substring(5, 7)}` : '');

            return (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="font-bold">Vencimentos</h3>
                  <span className="ml-auto text-xs text-content-muted">{vencendoHoje.length + proximosVencimentos.length} cobrança{vencendoHoje.length + proximosVencimentos.length !== 1 ? 's' : ''}</span>
                </div>
                {vencendoHoje.length === 0 && proximosVencimentos.length === 0 ? (
                  <p className="text-sm text-content-body text-center py-4">Nenhum vencimento nos próximos 5 dias</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {vencendoHoje.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Vencem hoje</p>
                        {vencendoHoje.map(p => (
                          <PaymentRow key={p.id} payment={p} tone="red" onAvisar={avisar} />
                        ))}
                      </>
                    )}
                    {proximosVencimentos.length > 0 && (
                      <>
                        <p className={`text-xs font-semibold text-amber-700 uppercase tracking-wide ${vencendoHoje.length > 0 ? 'mt-3' : ''}`}>Próximos 5 dias</p>
                        {proximosVencimentos.map(p => (
                          <PaymentRow key={p.id} payment={p} tone="amber" meta={diaMes(p)} onAvisar={avisar} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </Card>

        {/* ── Faltas Hoje ─────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <UserX size={16} className="text-red-500" />
              Faltas Hoje
            </h3>
            <div className="flex items-center gap-2">
              {faltasHoje.length > 0 && (
                <span className="text-xs text-content-body">
                  {faltasHoje.filter(f => f.contatado).length}/{faltasHoje.length} contatados
                  {aulasHoje.total > 0 && ` · ${aulasHoje.registradas}/${aulasHoje.total} chamadas`}
                </span>
              )}
              <button
                onClick={carregarFaltasHoje}
                className="p-1.5 text-content-muted hover:text-accent hover:bg-surface-sunken rounded-su-sm transition-colors focus:outline-none focus-visible:shadow-ring-accent"
                title="Atualizar"
                aria-label="Atualizar faltas de hoje"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {faltasLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="sr-only">Carregando faltas de hoje</span>
            </div>
          ) : faltasErro ? (
            <div className="text-center py-6">
              <AlertCircle size={28} className="text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-content-strong">Não foi possível carregar as faltas</p>
              <p className="text-xs text-content-body mt-1">Verifique a conexão e tente de novo.</p>
              <button
                onClick={carregarFaltasHoje}
                className="mt-3 text-su-xs px-3 py-1.5 rounded-su-sm bg-ink text-white hover:bg-gr-800 transition-colors focus:outline-none focus-visible:shadow-ring-accent"
              >
                Tentar de novo
              </button>
            </div>
          ) : faltasHoje.length === 0 ? (
            aulasHoje.registradas === 0 ? (
              /* Zero faltas porque ninguém fechou a chamada ainda ≠ zero faltas de verdade */
              <div className="text-center py-6">
                <Clock size={28} className="text-content-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-content-strong">Chamada ainda não registrada</p>
                <p className="text-xs text-content-body mt-1">
                  {aulasHoje.total === 0
                    ? 'Nenhuma aula marcada para hoje'
                    : `0 de ${aulasHoje.total} aula${aulasHoje.total !== 1 ? 's' : ''} de hoje`}
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle size={28} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-content-strong">Nenhuma falta hoje</p>
                <p className="text-xs text-content-body mt-1">
                  {aulasHoje.registradas} de {aulasHoje.total} aula{aulasHoje.total !== 1 ? 's' : ''} com chamada registrada
                </p>
              </div>
            )
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {faltasHoje.map(f => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-su-md border transition-colors ${
                    f.contatado ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${
                      f.contatado ? 'text-emerald-700 line-through' : 'text-content-strong'
                    }`}>
                      {f.alunoNome}
                    </p>
                    <p className="text-xs text-content-muted mt-0.5 truncate">
                      {f.turmaNome} · {f.professor}
                    </p>
                  </div>
                  {f.contatado ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium flex-shrink-0">
                      <CheckCircle size={13} /> Contatado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarcarContatado(f)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-ink text-white rounded-su-sm hover:bg-gr-800 transition-colors flex-shrink-0"
                    >
                      <PhoneCall size={12} /> Contatar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── To-Do List ──────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <ListTodo size={16} className="text-accent" />
              To-Do
            </h3>
            <span className="text-xs text-content-muted">{todos.filter(t => !t.feito).length} pendente{todos.filter(t => !t.feito).length !== 1 ? 's' : ''}</span>
          </div>

          <form onSubmit={handleAddTodo} className="flex gap-2 mb-3">
            <input
              value={novoTodo}
              onChange={e => setNovoTodo(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 border border-strong rounded-su-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={addingTodo || !novoTodo.trim()}
              className="px-3 py-1.5 bg-ink text-white text-su-xs rounded-su-sm hover:bg-gr-800 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Plus size={13} />
            </button>
          </form>

          {todos.length === 0 ? (
            <p className="text-sm text-content-muted text-center py-4">Nenhuma tarefa</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {todos.map(t => (
                <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-su-md border transition-colors ${t.feito ? 'bg-surface-sunken border-subtle' : 'bg-white border-subtle hover:border-strong'}`}>
                  <button
                    onClick={() => handleToggleTodo(t)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      t.feito ? 'bg-emerald-500 border-emerald-500' : 'border-strong hover:border-accent'
                    }`}
                  >
                    {t.feito && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${t.feito ? 'line-through text-content-muted' : 'text-content-strong'}`}>
                    {t.texto}
                  </span>
                  <button
                    onClick={() => handleDeleteTodo(t.id)}
                    className="p-1 rounded-su-sm text-content-faint hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
      </div>

      {/* ── Toggle Mês/Ano + KPIs ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDashboardRange('month')}
            className={`px-3 py-1 rounded ${dashboardRange === 'month' ? 'bg-ink text-white' : 'bg-surface-sunken text-content-body hover:bg-gr-200'}`}
          >
            Mês atual
          </button>
          <button
            onClick={() => setDashboardRange('year')}
            className={`px-3 py-1 rounded ${dashboardRange === 'year' ? 'bg-ink text-white' : 'bg-surface-sunken text-content-body hover:bg-gr-200'}`}
          >
            Ano
          </button>
          <button
            onClick={() => setHideValues(v => !v)}
            className="p-1.5 rounded-su-sm text-content-muted hover:text-content-body hover:bg-surface-sunken transition-colors"
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={printDashboard}
            className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card flex gap-2 items-center hover:bg-gr-50 focus:outline-none focus-visible:shadow-ring-accent"
          >
            <Printer size={16}/> Imprimir
          </button>
          <div className="text-xs text-content-body">
            Visão: {dashboardRange === 'month' ? 'Mês atual' : 'Ano'}
            {atualizadoEm && !dataLoading && (
              <span className="text-content-muted"> · atualizado às {horaCurta(atualizadoEm)}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          label="Receita prevista"
          value={stats.planned}
          accent="blue"
          delta={deltaPrevista}
          hidden={hideValues}
          loading={dataLoading}
        />
        <KPI
          label="Receita recebida"
          value={stats.paid}
          accent="green"
          delta={deltaRecebida}
          hidden={hideValues}
          loading={dataLoading}
        />
        <KPI
          label="Pendências"
          value={stats.pending}
          accent="yellow"
          hidden={hideValues}
          loading={dataLoading}
        />
        <KPI
          label="Cobranças vencidas"
          value={stats.overdue}
          accent="red"
          badge={!dataLoading && stats.overdue > 0 ? 'Alerta' : undefined}
          sub={vencidasSub}
          hidden={hideValues}
          loading={dataLoading}
          onClick={() => setShowOverdueModal(true)}
          actionLabel="Cobranças vencidas: ver quem está devendo"
        />
        <KPI
          label="Alunos ativos"
          value={stats.students}
          format="number"
          accent="blue"
          loading={dataLoading}
        />
        <KPI
          label="Matrículas"
          value={stats.registrations}
          format="number"
          accent="green"
          loading={dataLoading}
          onClick={() => setShowRegistrationsModal(true)}
          actionLabel="Matrículas: ver detalhes"
        />
        <KPI
          label="Cancelamentos"
          value={stats.cancellations}
          format="number"
          accent="red"
          loading={dataLoading}
          onClick={() => setShowCancellationsModal(true)}
          actionLabel="Cancelamentos: ver detalhes"
        />
        <KPI
          label="Inadimplência"
          value={stats.inadimplenciaPercent}
          format="percent"
          accent="yellow"
          loading={dataLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h3 className="font-bold mb-2">Evolução Mensal (Previsto vs Realizado)</h3>
          <EvolutionChart labels={monthlyData.labels} planned={monthlyData.planned} paid={monthlyData.paid} hidden={hideValues} />
        </Card>

        {role === 'admin' && (
          <Card>
            <h3 className="font-bold mb-2">Evolução do Lucro (Mensal)</h3>
            <ProfitChart labels={monthlyData.labels} profit={monthlyData.profit} hidden={hideValues} />
          </Card>
        )}

        {role === 'admin' && (() => {
          // Normaliza o nome do curso para as categorias principais
          const normalizeCourse = (raw) => {
            const c = (raw || '').toUpperCase().trim();
            if (c.includes('TEEN')) return 'TEENS';
            if (c.includes('KID')) return 'KIDS';
            if (c.includes('VIP')) return 'VIP';
            if (c.includes('INCOMPANY') || c.includes('IN COMPANY') || c.includes('IN-COMPANY')) return 'IN COMPANY';
            return 'OUTROS';
          };

          // Estatísticas por curso (alunos ativos)
          const courseMap = {};
          (students || []).filter(s => s.status !== 'cancelado').forEach(s => {
            const c = normalizeCourse(s.course);
            courseMap[c] = (courseMap[c] || 0) + 1;
          });
          const courseStats = Object.entries(courseMap)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);

          // Paleta de dados = marca + neutros do design system.
          const COLORS = ['var(--su-blue)','var(--su-orange)','var(--su-yellow)','var(--su-pink)','var(--gr-300)','var(--gr-400)'];
          const maxCount   = Math.max(...(teacherStats || []).map(t => t.count), 1);
          const maxRevenue = Math.max(...(teacherStats || []).map(t => t.revenue), 1);

          // Doughnut
          const total = courseStats.reduce((s, d) => s + d.value, 0) || 1;
          const DCX = 90, DCY = 90, D_OUTER = 82, D_INNER = 46;
          let dStartAngle = -Math.PI / 2;
          const segments = courseStats.map((d, i) => {
            const angle = (d.value / total) * 2 * Math.PI;
            const endAngle = dStartAngle + angle;
            const cos1 = Math.cos(dStartAngle), sin1 = Math.sin(dStartAngle);
            const cos2 = Math.cos(endAngle), sin2 = Math.sin(endAngle);
            const largeArc = angle > Math.PI ? 1 : 0;
            const path = [
              `M ${DCX + D_OUTER*cos1} ${DCY + D_OUTER*sin1}`,
              `A ${D_OUTER} ${D_OUTER} 0 ${largeArc} 1 ${DCX + D_OUTER*cos2} ${DCY + D_OUTER*sin2}`,
              `L ${DCX + D_INNER*cos2} ${DCY + D_INNER*sin2}`,
              `A ${D_INNER} ${D_INNER} 0 ${largeArc} 0 ${DCX + D_INNER*cos1} ${DCY + D_INNER*sin1}`,
              'Z'
            ].join(' ');
            const seg = { path, color: COLORS[i % COLORS.length], label: d.label, value: d.value };
            dStartAngle = endAngle;
            return seg;
          });

          return (
            <div key="charts3col" className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 1. Barra vertical — alunos por professor */}
              <Card>
                <h3 className="font-bold text-sm text-content-body mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-pill bg-brand-blue inline-block" />
                  Alunos por professor
                </h3>
                {(() => {
                  const VW = 300, VH = 180, VPL = 8, VPR = 8, VPT = 28, VPB = 28;
                  const vChartW = VW - VPL - VPR;
                  const vChartH = VH - VPT - VPB;
                  const n = (teacherStats || []).length || 1;
                  const bW = Math.max(10, (vChartW / n) * 0.55);
                  const xV = (i) => VPL + (i + 0.5) * (vChartW / n);
                  const yV = (v) => VPT + (1 - v / maxCount) * vChartH;
                  return (
                    <div className="flex-1 flex items-center justify-start">
                      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full">
                        {[0,1,2,3,4].map(gi => (
                        <line key={gi} x1={VPL} x2={VW-VPR}
                          y1={VPT + (gi/4)*vChartH} y2={VPT + (gi/4)*vChartH}
                          stroke="var(--ink-04)" strokeWidth={1} />
                      ))}
                      {(teacherStats || []).map((t, i) => {
                        const x   = xV(i);
                        const bH  = Math.max((t.count / maxCount) * vChartH, 2);
                        const barY = yV(t.count);
                        const firstName = t.teacher.split(' ')[0];
                        return (
                          <g key={i}>
                            <rect x={x - bW/2} y={barY} width={bW} height={bH}
                              fill={i === 0 ? 'var(--su-blue)' : i === (teacherStats||[]).length - 1 ? 'var(--gr-300)' : 'var(--su-blue-300)'} rx={5} />
                            <text x={x} y={VH - 8} fontSize={9} textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">{firstName}</text>
                            <text x={x} y={Math.max(barY - 5, VPT - 4)} fontSize={8.5} textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">{t.count}</text>
                          </g>
                        );
                      })}
                      </svg>
                    </div>
                  );
                })()}
              </Card>

              {/* 2. Pizza — receita por professor */}
              <Card>
                <h3 className="font-bold text-sm text-content-body mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-pill bg-success inline-block" />
                  Receita por professor
                </h3>
                {(() => {
                  const PCX = 90, PCY = 90, PIE_R = 82;
                  const totalRev = (teacherStats || []).reduce((s, t) => s + t.revenue, 0) || 1;
                  const fmtRev = (v) => hideValues ? '••••' : (v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`);
                  let startAngle = -Math.PI / 2;
                  const pieSegs = (teacherStats || []).map((t, i) => {
                    const angle = (t.revenue / totalRev) * 2 * Math.PI;
                    const endAngle = startAngle + angle;
                    const x1 = PCX + PIE_R * Math.cos(startAngle);
                    const y1 = PCY + PIE_R * Math.sin(startAngle);
                    const x2 = PCX + PIE_R * Math.cos(endAngle);
                    const y2 = PCY + PIE_R * Math.sin(endAngle);
                    const largeArc = angle > Math.PI ? 1 : 0;
                    const d = `M ${PCX} ${PCY} L ${x1} ${y1} A ${PIE_R} ${PIE_R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                    const seg = { d, color: COLORS[i % COLORS.length], label: t.teacher.split(' ')[0], revenue: t.revenue };
                    startAngle = endAngle;
                    return seg;
                  });
                  return (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <svg viewBox="0 0 180 180" className="w-48 flex-shrink-0">
                        {pieSegs.map((seg, i) => (
                          <path key={i} d={seg.d} fill={seg.color} stroke="var(--surface-card)" strokeWidth={2} />
                        ))}
                      </svg>
                      <div className="flex flex-col gap-2.5 min-w-0">
                        {pieSegs.map((seg, i) => (
                          <div key={i} className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                            <span className="text-[11px] text-content-body font-medium truncate flex-1">{seg.label}</span>
                            <span className="text-[11px] text-content-muted font-semibold tabular-nums flex-shrink-0">{fmtRev(seg.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* 3. Doughnut — alunos por curso */}
              <Card>
                <h3 className="font-bold text-sm text-content-body mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-pill bg-brand-yellow inline-block" />
                  Alunos por curso
                </h3>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <svg viewBox="0 0 180 180" className="w-48 flex-shrink-0">
                    {segments.map((seg, i) => (
                      <path key={i} d={seg.path} fill={seg.color} stroke="var(--surface-card)" strokeWidth={2} />
                    ))}
                    <text x={DCX} y={DCY - 6} fontSize={18} fontWeight="700" fontFamily="var(--font-display)" textAnchor="middle" fill="var(--ink)">{total}</text>
                    <text x={DCX} y={DCY + 12} fontSize={9} fontFamily="var(--font-body)" textAnchor="middle" fill="var(--gr-500)">alunos</text>
                  </svg>
                  <div className="flex flex-col gap-2.5 min-w-0">
                    {segments.map((seg, i) => (
                      <div key={i} className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                        <span className="text-[11px] text-content-body font-medium truncate flex-1">{seg.label}</span>
                        <span className="text-[11px] text-content-muted font-semibold tabular-nums flex-shrink-0">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

            </div>
          );
        })()}

      </div>

      <RegistrationsModal
        isOpen={showRegistrationsModal}
        onClose={() => setShowRegistrationsModal(false)}
        students={registeredStudents}
        dashboardRange={dashboardRange}
      />
      <CancellationsModal
        isOpen={showCancellationsModal}
        onClose={() => setShowCancellationsModal(false)}
        students={cancelledStudents}
        professores={professores}
        dashboardRange={dashboardRange}
      />
      <OverduePaymentsModal
        isOpen={showOverdueModal}
        onClose={() => setShowOverdueModal(false)}
        payments={stats.overduePayments || []}
        students={students}
        dashboardRange={dashboardRange}
      />
    </>
  );
};

export default Dashboard;
