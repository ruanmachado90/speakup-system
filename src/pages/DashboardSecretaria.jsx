import { useMemo, useState } from 'react';
import { ListTodo, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Card, KPI } from '../components';
import { EnrollmentsChart } from '../components/charts';
import HighlightStrip from '../components/dashboard/HighlightStrip';
import MiniCalendar from '../components/dashboard/MiniCalendar';
import RecentEnrollments from '../components/dashboard/RecentEnrollments';
import { buildDelta, ehMatriculaReal } from '../utils/dashboardHelpers';
import { useTurmas } from '../hooks/useTurmas';
import { useTodos } from '../hooks/useDashboardData';

const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Extrai "HH:MM" do começo de "HH:MM-HH:MM" (ou de horarios[0]) pra ordenar. */
const horaInicio = (turma) => {
  const raw = turma.horario || (turma.horarios || [])[0] || '';
  const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 99999;
};

/**
 * Dashboard da secretaria — visão operacional do dia a dia, sem os números
 * de gestão (lucro, margem, desempenho por professor). Mesmo shell/header do
 * Dashboard de Gestão; só a tela muda, junto com a permissão de role.
 */
export default function DashboardSecretaria({
  stats,
  monthlyData,
  students = [],
  payments = [],
  dashboardRange = 'month',
  dataLoading = false,
}) {
  const { turmas, loading: turmasLoading } = useTurmas();
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [novoTodo, setNovoTodo] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  const deltaRecebida = useMemo(() => buildDelta(monthlyData?.paid, dashboardRange), [monthlyData, dashboardRange]);
  const deltaPrevista = useMemo(() => buildDelta(monthlyData?.planned, dashboardRange), [monthlyData, dashboardRange]);

  const vencidasSub = useMemo(() => {
    const n = stats.overdueCount || 0;
    if (!n) return null;
    return `${n} cobrança${n !== 1 ? 's' : ''} em atraso`;
  }, [stats.overdueCount]);

  // ── Evolução de matrículas: contagem por mês, ano corrente ──────────────
  // Exclui os cadastros da migração pro sistema (não são matrícula nova de verdade).
  const enrollmentsData = useMemo(() => {
    const ano = new Date().getFullYear();
    const counts = Array(12).fill(0);
    students.filter(ehMatriculaReal).forEach((s) => {
      const d = new Date(Number(s.createdAt));
      if (d.getFullYear() === ano) counts[d.getMonth()] += 1;
    });
    return { labels: MESES_CURTO.map((m) => m[0].toUpperCase() + m.slice(1)), values: counts };
  }, [students]);

  // ── Central do dia: turmas de hoje, por horário ──────────────────────────
  const turmasHoje = useMemo(() => {
    const nomeHoje = DIAS_SEMANA[new Date().getDay()];
    return (turmas || [])
      .filter((t) => (t.dias || '').includes(nomeHoje))
      .sort((a, b) => horaInicio(a) - horaInicio(b));
  }, [turmas]);

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

  return (
    <>
      <HighlightStrip
        receita={stats.paid}
        deltaReceita={deltaRecebida}
        vencidas={stats.overdue}
        vencidasSub={vencidasSub}
        dashboardRange={dashboardRange}
        dataLoading={dataLoading}
      />

      {/* ── KPIs operacionais ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Receita prevista" value={stats.planned} accent="blue" delta={deltaPrevista} loading={dataLoading} />
        <KPI label="Pendências" value={stats.pending} accent="yellow" loading={dataLoading} />
        <KPI label="Alunos ativos" value={stats.students} format="number" accent="blue" loading={dataLoading} />
        <KPI label="Matrículas" value={stats.registrations} format="number" accent="green" loading={dataLoading} />
      </div>

      {/* ── Evolução de matrículas ────────────────────────────────────── */}
      <Card>
        <h3 className="font-display font-bold text-base text-content-strong mb-1">Evolução de matrículas</h3>
        <p className="text-su-sm text-content-muted mb-4">Novas matrículas por mês, {new Date().getFullYear()}</p>
        <EnrollmentsChart labels={enrollmentsData.labels} values={enrollmentsData.values} />
      </Card>

      {/* ── Calendário + Central do dia + Tarefas ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniCalendar />

        <Card>
          <h3 className="font-bold text-content-strong mb-3">Central do dia</h3>
          {turmasLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-su-sm bg-surface-sunken animate-pulse" />)}
            </div>
          ) : turmasHoje.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={26} className="text-content-faint mx-auto mb-2" />
              <p className="text-su-sm text-content-muted">Nenhuma turma hoje</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {turmasHoje.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-sunken rounded-su-sm">
                  <div className="font-display font-bold text-su-sm text-content-strong w-12 flex-shrink-0">
                    {(t.horario || (t.horarios || [])[0] || '—').split('-')[0].trim()}
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-su-sm text-content-strong truncate">{t.nome || 'Turma'}</p>
                    <p className="text-su-xs text-content-muted truncate">{t.professor || 'Sem professor'}</p>
                  </div>
                  <span className="text-su-2xs font-semibold px-2 py-1 rounded-pill bg-gr-100 text-content-body flex-shrink-0 whitespace-nowrap">
                    {t.alunosCount} aluno{t.alunosCount === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-content-strong flex items-center gap-2">
              <ListTodo size={16} className="text-accent" />
              Tarefas
            </h3>
            <span className="text-su-xs text-content-muted">
              {todos.filter((t) => !t.feito).length} pendente{todos.filter((t) => !t.feito).length !== 1 ? 's' : ''}
            </span>
          </div>

          <form onSubmit={handleAddTodo} className="flex gap-2 mb-3">
            <input
              value={novoTodo}
              onChange={(e) => setNovoTodo(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 border border-strong rounded-su-sm px-3 py-1.5 text-su-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
            <p className="text-su-sm text-content-muted text-center py-4">Nenhuma tarefa</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {todos.map((t) => (
                <div key={t.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-su-sm border transition-colors ${t.feito ? 'bg-surface-sunken border-subtle' : 'bg-surface-card border-subtle hover:border-strong'}`}>
                  <button
                    onClick={() => toggleTodo(t)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${t.feito ? 'bg-success border-success' : 'border-strong hover:border-accent'}`}
                  >
                    {t.feito && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-su-sm leading-snug ${t.feito ? 'line-through text-content-muted' : 'text-content-strong'}`}>
                    {t.texto}
                  </span>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="p-1 rounded-su-sm text-content-faint hover:text-danger-fg hover:bg-danger-bg transition-colors flex-shrink-0"
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

      <RecentEnrollments students={students} payments={payments} />
    </>
  );
}
