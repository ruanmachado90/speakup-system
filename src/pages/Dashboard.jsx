import { useState, useMemo, useEffect, Fragment } from 'react';
import { Printer, Eye, EyeOff } from 'lucide-react';
import { Card, KPI, EvolutionChart, ProfitChart } from '../components';
import { EnrollmentsChart } from '../components/charts';
import { formatCurrency } from '../utils';
import { churnMensalPct } from '../utils/reportKPIs';
import { buildDelta, ehMatriculaReal } from '../utils/dashboardHelpers';
import RegistrationsModal from '../components/dashboard/RegistrationsModal';
import CancellationsModal from '../components/dashboard/CancellationsModal';
import OverduePaymentsModal from '../components/dashboard/OverduePaymentsModal';
import HighlightStrip from '../components/dashboard/HighlightStrip';
import MiniCalendar from '../components/dashboard/MiniCalendar';
import RecentEnrollments from '../components/dashboard/RecentEnrollments';
import DashboardSecretaria from './DashboardSecretaria';

const HIDE_VALUES_KEY = 'speakup:dashboard:hideValues';
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
// Marca + neutros do design system — mesma paleta de dados em todo o dashboard.
const CORES_DADOS = ['var(--su-blue)', 'var(--su-orange)', 'var(--su-pink)', 'var(--su-yellow)', 'var(--su-blue-300)', 'var(--gr-300)'];

/**
 * Dashboard de gestão — visão financeira e de desempenho completa
 * (professores, cursos, lucro). Só pra `role === 'admin'`; secretaria cai em
 * `DashboardSecretaria`, ver o roteador `Dashboard` no fim do arquivo.
 */
const DashboardGestao = ({
  dashboardRange,
  setDashboardRange,
  printDashboard,
  stats,
  monthlyData,
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

  // ── Evolução de matrículas: contagem por mês, ano corrente ────────────────
  // Exclui os cadastros da migração pro sistema (não são matrícula nova de verdade).
  const enrollmentsData = useMemo(() => {
    const ano = new Date().getFullYear();
    const counts = Array(12).fill(0);
    (students || []).filter(ehMatriculaReal).forEach((s) => {
      const d = new Date(Number(s.createdAt));
      if (d.getFullYear() === ano) counts[d.getMonth()] += 1;
    });
    return { labels: MESES_CURTO, values: counts };
  }, [students]);

  // ── Churn do mês corrente (sempre mensal — é um "termômetro do agora") ────
  const churn = useMemo(() => {
    const hoje = new Date();
    return churnMensalPct(students || [], hoje.getMonth(), hoje.getFullYear());
  }, [students]);
  const churnPctClamped = Math.min(100, Math.max(0, churn.disponivel ? churn.valor : 0));

  // ── Alunos por curso (normaliza pro rótulo principal) ──────────────────────
  const courseStats = useMemo(() => {
    const normalizeCourse = (raw) => {
      const c = (raw || '').toUpperCase().trim();
      if (c.includes('TEEN')) return 'TEENS';
      if (c.includes('KID')) return 'KIDS';
      if (c.includes('VIP')) return 'VIP';
      if (c.includes('INCOMPANY') || c.includes('IN COMPANY') || c.includes('IN-COMPANY')) return 'IN COMPANY';
      return 'OUTROS';
    };
    const courseMap = {};
    (students || []).filter((s) => s.status !== 'cancelado').forEach((s) => {
      const c = normalizeCourse(s.course);
      courseMap[c] = (courseMap[c] || 0) + 1;
    });
    return Object.entries(courseMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [students]);
  const totalCourseStats = courseStats.reduce((s, d) => s + d.value, 0) || 1;

  // ── Receita e alunos por professor, com tendência de 3 meses ───────────────
  const professorTable = useMemo(() => {
    const activeStudentsMap = new Map();
    (students || []).forEach((s) => { if ((s.status || 'ativo') === 'ativo') activeStudentsMap.set(s.id, s); });
    const nomePorProfessorId = new Map((professores || []).map((p) => [p.id, p.nome]));

    const agruparNoMes = (mes, ano) => {
      const grouped = {};
      (payments || []).forEach((payment) => {
        if (!payment.dueDate || !payment.studentId) return;
        const d = new Date(payment.dueDate);
        if (d.getFullYear() !== ano || d.getMonth() !== mes) return;
        const student = activeStudentsMap.get(payment.studentId);
        if (!student) return;
        const chave = student.professorId || student.teacher || 'Sem professor';
        const nomeExibido = (student.professorId && nomePorProfessorId.get(student.professorId)) || student.teacher || 'Sem professor';
        if (!grouped[chave]) grouped[chave] = { nome: nomeExibido, ids: new Set(), revenue: 0 };
        grouped[chave].ids.add(payment.studentId);
        grouped[chave].revenue += Number(payment.valuePlanned || 0);
      });
      return grouped;
    };

    const hoje = new Date();
    const gruposPorMes = [2, 1, 0].map((offset) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
      return agruparNoMes(d.getMonth(), d.getFullYear());
    });
    const atual = gruposPorMes[gruposPorMes.length - 1];

    const sparkline = (vals) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      return vals.map((v, i) => `${(i / (vals.length - 1 || 1)) * 72},${22 - ((v - min) / range) * 20}`).join(' ');
    };

    return Object.entries(atual)
      .map(([chave, dados]) => {
        const count = dados.ids.size;
        const trend = gruposPorMes.map((g) => g[chave]?.ids.size || 0);
        return {
          chave,
          nome: dados.nome,
          students: count,
          revenuePerStudent: count > 0 ? dados.revenue / count : 0,
          sparklinePoints: sparkline(trend),
          trendUp: trend[trend.length - 1] >= trend[0],
        };
      })
      .sort((a, b) => b.students - a.students);
  }, [students, payments, professores]);

  return (
    <>
      {/* ── Controles: Mês/Ano, ocultar valores, imprimir ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <button
          onClick={printDashboard}
          className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card flex gap-2 items-center hover:bg-gr-50 focus:outline-none focus-visible:shadow-ring-accent"
        >
          <Printer size={16}/> Imprimir
        </button>
      </div>

      {/* ── Faixa de destaque ─────────────────────────────────────────── */}
      <HighlightStrip
        receita={stats.paid}
        deltaReceita={deltaRecebida}
        vencidas={stats.overdue}
        vencidasSub={vencidasSub}
        dashboardRange={dashboardRange}
        dataLoading={dataLoading}
        onClickVencidas={() => setShowOverdueModal(true)}
      />

      {/* ── KPIs operacionais ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Receita prevista" value={stats.planned} accent="blue" delta={deltaPrevista} hidden={hideValues} loading={dataLoading} />
        <KPI label="Pendências" value={stats.pending} accent="yellow" hidden={hideValues} loading={dataLoading} />
        <KPI label="Alunos ativos" value={stats.students} format="number" accent="blue" loading={dataLoading} />
        <KPI
          label="Matrículas"
          value={stats.registrations}
          format="number"
          accent="green"
          loading={dataLoading}
          onClick={() => setShowRegistrationsModal(true)}
          actionLabel="Matrículas: ver detalhes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-display font-bold text-base text-content-strong mb-1">Evolução mensal</h3>
          <p className="text-su-sm text-content-muted mb-4">
            Realizado até {new Date().toLocaleString('pt-BR', { month: 'long' })} · previsto (meta) até dezembro
          </p>
          <EvolutionChart labels={monthlyData.labels} planned={monthlyData.planned} paid={monthlyData.paid} hidden={hideValues} />
        </Card>

        {role === 'admin' && (
          <Card>
            <h3 className="font-display font-bold text-base text-content-strong mb-1">Evolução do lucro</h3>
            <p className="text-su-sm text-content-muted mb-4">Lucro líquido mensal</p>
            <ProfitChart labels={monthlyData.labels} profit={monthlyData.profit} hidden={hideValues} />
          </Card>
        )}

      </div>

      {/* ── Desempenho por professor & curso ────────────────────────────── */}
      {role === 'admin' && (
        <div>
          <h2 className="text-su-xs font-bold uppercase tracking-caps text-content-muted mb-3">Desempenho por professor &amp; curso</h2>
          <div className="flex flex-col gap-4">

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-3">
                <h3 className="font-bold text-sm text-content-body mb-1">Evolução de matrículas</h3>
                <p className="text-su-sm text-content-muted mb-3">Novas matrículas por mês, {new Date().getFullYear()}</p>
                <EnrollmentsChart labels={enrollmentsData.labels} values={enrollmentsData.values} />
              </Card>

              <Card className="lg:col-span-2">
                <h3 className="font-bold text-sm text-content-body mb-3">Retenção</h3>
                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  <button
                    onClick={() => setShowRegistrationsModal(true)}
                    className="text-left bg-surface-sunken rounded-su-sm p-3 hover:bg-gr-100 transition-colors focus:outline-none focus-visible:shadow-ring-accent"
                  >
                    <p className="text-su-2xs font-bold uppercase tracking-caps text-content-faint mb-1.5">Matrículas</p>
                    <span className="font-display font-extrabold text-2xl text-content-strong leading-none">{stats.registrations}</span>
                  </button>
                  <button
                    onClick={() => setShowCancellationsModal(true)}
                    className="text-left bg-surface-sunken rounded-su-sm p-3 hover:bg-gr-100 transition-colors focus:outline-none focus-visible:shadow-ring-accent"
                  >
                    <p className="text-su-2xs font-bold uppercase tracking-caps text-content-faint mb-1.5">Cancelamentos</p>
                    <span className="font-display font-extrabold text-2xl text-content-strong leading-none">{stats.cancellations}</span>
                  </button>
                </div>
                <div className="flex items-center gap-4 bg-danger-bg border border-danger rounded-su-sm p-4">
                  <div
                    className="relative w-16 h-16 flex-shrink-0 rounded-full"
                    style={{ background: `conic-gradient(var(--su-danger-fg) 0% ${churnPctClamped}%, var(--gr-200) ${churnPctClamped}% 100%)` }}
                  >
                    <div className="absolute inset-2 bg-surface-card rounded-full" />
                  </div>
                  <div>
                    <p className="text-su-2xs font-bold uppercase tracking-caps text-danger-fg mb-1">Churn do mês</p>
                    <span className="font-display font-extrabold text-2xl text-danger-fg leading-none">
                      {churn.disponivel ? `${churn.valor.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-3">
                <h3 className="font-bold text-sm text-content-body mb-1">Receita e alunos por professor</h3>
                <p className="text-su-sm text-content-muted mb-4">Receita por aluno, por professor</p>
                {professorTable.length === 0 ? (
                  <p className="text-su-sm text-content-muted text-center py-6">Sem cobranças no mês para nenhum professor.</p>
                ) : (
                  <div className="grid gap-x-4 gap-y-1 items-center" style={{ gridTemplateColumns: '1.1fr .6fr .8fr .8fr' }}>
                    <div className="text-su-2xs font-bold uppercase tracking-caps text-content-faint pb-2 border-b border-subtle">Professor</div>
                    <div className="text-su-2xs font-bold uppercase tracking-caps text-content-faint pb-2 border-b border-subtle text-right">Alunos</div>
                    <div className="text-su-2xs font-bold uppercase tracking-caps text-content-faint pb-2 border-b border-subtle text-right">Receita/aluno</div>
                    <div className="text-su-2xs font-bold uppercase tracking-caps text-content-faint pb-2 border-b border-subtle">Tendência (3m)</div>
                    {professorTable.map((p) => (
                      <Fragment key={p.chave}>
                        <div className="font-bold text-su-sm text-content-strong py-2 border-b border-subtle truncate">{p.nome}</div>
                        <div className="text-right text-su-sm text-content-body py-2 border-b border-subtle">{p.students}</div>
                        <div className="text-right font-bold text-su-sm text-content-strong py-2 border-b border-subtle">
                          {hideValues ? '••••' : formatCurrency(p.revenuePerStudent)}
                        </div>
                        <div className="py-2 border-b border-subtle">
                          <svg width="72" height="24" viewBox="0 0 72 24">
                            <polyline
                              points={p.sparklinePoints}
                              fill="none"
                              stroke={p.trendUp ? 'var(--su-blue)' : 'var(--su-danger-fg)'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="lg:col-span-2">
                <h3 className="font-bold text-sm text-content-body mb-1">Alunos por curso</h3>
                <p className="text-su-sm text-content-muted mb-4">{totalCourseStats} alunos ativos</p>
                <div className="flex flex-col gap-3.5">
                  {courseStats.map((c, i) => {
                    const pct = Math.round((c.value / totalCourseStats) * 100);
                    return (
                      <div key={c.label}>
                        <div className="flex justify-between text-su-sm mb-1.5">
                          <span className="font-bold text-content-strong">{c.label}</span>
                          <span className="text-content-muted font-semibold">{c.value} · {pct}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-pill bg-gr-100 overflow-hidden">
                          <div className="h-full rounded-pill" style={{ background: CORES_DADOS[i % CORES_DADOS.length], width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

          </div>
        </div>
      )}

      {/* ── Calendário + Matrículas recentes ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MiniCalendar />
        <RecentEnrollments students={students} payments={payments} limit={4} />
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

/**
 * Roteador por role — sem hooks próprios de propósito, pra poder decidir
 * entre as duas telas com um `if` simples e seguro (Rules of Hooks: nenhum
 * hook do Gestão pode rodar condicionalmente por trás de um `role` que, na
 * prática, nunca muda durante uma sessão montada, mas não vale o risco).
 */
export const Dashboard = (props) => {
  if (props.role === 'secretaria') {
    return (
      <DashboardSecretaria
        stats={props.stats}
        monthlyData={props.monthlyData}
        students={props.students}
        payments={props.payments}
        dashboardRange={props.dashboardRange}
        dataLoading={props.dataLoading}
      />
    );
  }
  return <DashboardGestao {...props} />;
};

export default Dashboard;
