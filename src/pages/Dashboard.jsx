import { useState, useMemo } from 'react';
import { Printer, Plus, Trash2, ListTodo, PhoneCall, UserX, RefreshCw, MessageCircle, AlertTriangle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Card, Table, KPI, EvolutionChart, ProfitChart } from '../components';
import { formatCurrency, formatDate } from '../utils';
import { useFaltasHoje, useLembretes, useTodos, useAulasStats } from '../hooks/useDashboardData';
import RegistrationsModal from '../components/dashboard/RegistrationsModal';
import CancellationsModal from '../components/dashboard/CancellationsModal';

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
  role
}) => {
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showCancellationsModal, setShowCancellationsModal] = useState(false);
  const [hideValues, setHideValues] = useState(false);

  const { faltasHoje, faltasLoading, carregarFaltasHoje, marcarContatado: handleMarcarContatado } = useFaltasHoje();
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

  return (
    <>
      {/* ── Central do Dia ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Central do Dia</h2>
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

            const enviarWhatsApp = (payment) => {
              const student = students.find(s => s.id === payment.studentId);
              const paymentLink = `${window.location.origin}/pagamento/${payment.id}`;
              const nome = student?.responsibleName || payment.studentName || 'Cliente';
              const valor = Number(payment.valuePlanned || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const dVenc = new Date(payment.dueDate);
              const dataFmt = dVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              const dias = Math.ceil((dVenc - new Date()) / 86400000);
              const diasTexto = dias === 0 ? 'vence hoje' : `daqui a ${dias} dia${dias !== 1 ? 's' : ''}`;
              const statusMsg = dias === 0 ? 'Cobranca vence hoje' : 'Lembrete de cobranca';
              const descricao = payment.description || 'Mensalidade - SpeakUp English School';
              let pixInfo = '';
              if (payment.pixCode) pixInfo += `\n\n*PIX Copia e Cola:*\n${payment.pixCode}`;
              if (payment.pixQRCode) pixInfo += `\n\n*QR Code PIX disponivel no link acima.*`;
              const msg = `*${statusMsg}*\n\nOla, ${nome}\n\nLembramos que a sua cobranca no valor de *${valor}* ${diasTexto} (${dataFmt}).\n\n*Descricao:* ${descricao}\n\nClique no link abaixo para visualizar a cobranca:\n${paymentLink}${pixInfo}\n\nAtenciosamente,\n*Equipe SpeakUp*`;
              const tel = (student?.responsiblePhone || student?.phone || '').replace(/\D/g, '');
              window.open(tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            };

            const RenderItem = ({ p, cor }) => (
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${cor === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${cor === 'red' ? 'text-red-800' : 'text-amber-900'}`}>{p.studentName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.description || 'Mensalidade'} · {Number(p.valuePlanned||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    {cor !== 'red' && <span className="ml-1 text-amber-600 font-medium">· {p.dueDate ? p.dueDate.substring(8,10) + '/' + p.dueDate.substring(5,7) : ''}</span>}
                  </p>
                </div>
                <button
                  onClick={() => enviarWhatsApp(p)}
                  className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-white transition-colors ${cor === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                  title="Enviar aviso por WhatsApp"
                >
                  <MessageCircle size={12} /> Avisar
                </button>
              </div>
            );

            return (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="font-bold">Vencimentos</h3>
                  <span className="ml-auto text-xs text-slate-400">{vencendoHoje.length + proximosVencimentos.length} cobrança{vencendoHoje.length + proximosVencimentos.length !== 1 ? 's' : ''}</span>
                </div>
                {vencendoHoje.length === 0 && proximosVencimentos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum vencimento nos próximos 5 dias</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {vencendoHoje.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Vencem hoje</p>
                        {vencendoHoje.map(p => <RenderItem key={p.id} p={p} cor="red" />)}
                      </>
                    )}
                    {proximosVencimentos.length > 0 && (
                      <>
                        <p className={`text-xs font-semibold text-amber-600 uppercase tracking-wide ${vencendoHoje.length > 0 ? 'mt-3' : ''}`}>Próximos 5 dias</p>
                        {proximosVencimentos.map(p => <RenderItem key={p.id} p={p} cor="amber" />)}
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
                <span className="text-xs text-slate-400">
                  {faltasHoje.filter(f => f.contatado).length}/{faltasHoje.length} contatados
                </span>
              )}
              <button
                onClick={carregarFaltasHoje}
                className="p-1.5 text-slate-400 hover:text-[#005DE4] hover:bg-slate-100 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {faltasLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#005DE4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : faltasHoje.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhuma falta registrada hoje</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {faltasHoje.map(f => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    f.contatado ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${
                      f.contatado ? 'text-emerald-700 line-through' : 'text-slate-800'
                    }`}>
                      {f.alunoNome}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
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
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-colors flex-shrink-0"
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
              <ListTodo size={16} className="text-[#005DE4]" />
              To-Do
            </h3>
            <span className="text-xs text-slate-400">{todos.filter(t => !t.feito).length} pendente{todos.filter(t => !t.feito).length !== 1 ? 's' : ''}</span>
          </div>

          <form onSubmit={handleAddTodo} className="flex gap-2 mb-3">
            <input
              value={novoTodo}
              onChange={e => setNovoTodo(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
            <button
              type="submit"
              disabled={addingTodo || !novoTodo.trim()}
              className="px-3 py-1.5 bg-[#005DE4] text-white text-xs rounded-lg hover:bg-[#0041a8] disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Plus size={13} />
            </button>
          </form>

          {todos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {todos.map(t => (
                <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${t.feito ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-[#005DE4]/30'}`}>
                  <button
                    onClick={() => handleToggleTodo(t)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      t.feito ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-[#005DE4]'
                    }`}
                  >
                    {t.feito && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${t.feito ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {t.texto}
                  </span>
                  <button
                    onClick={() => handleDeleteTodo(t.id)}
                    className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
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
            className={`px-3 py-1 rounded ${dashboardRange === 'month' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Mês atual
          </button>
          <button
            onClick={() => setDashboardRange('year')}
            className={`px-3 py-1 rounded ${dashboardRange === 'year' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Ano
          </button>
          <button
            onClick={() => setHideValues(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={printDashboard}
            className="px-4 py-2 rounded-full bg-slate-100 flex gap-2 items-center hover:bg-slate-200"
          >
            <Printer size={16}/> Imprimir
          </button>
          <div className="text-xs text-slate-400">Visão: {dashboardRange === 'month' ? 'Mês atual' : 'Ano'}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Linha 1: métricas financeiras principais */}
        <KPI label="Receita prevista" value={stats.planned} accent="blue" hidden={hideValues} />
        <KPI label="Receita recebida" value={stats.paid} accent="green" hidden={hideValues} />
        <KPI label="Pendências" value={stats.pending} accent="yellow" hidden={hideValues} />
        <KPI label="Cobranças vencidas" value={stats.overdue} accent="red" badge={stats.overdue > 0 ? 'Alerta' : undefined} hidden={hideValues} />

        {/* Linha 2: métricas operacionais */}
        <KPI label="Alunos ativos" value={stats.students} format="number" accent="blue" />
        <div
          onClick={() => setShowRegistrationsModal(true)}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          title="Clique para ver detalhes das matrículas"
        >
          <KPI label="Matrículas" value={stats.registrations} format="number" accent="green" />
        </div>
        <div
          onClick={() => setShowCancellationsModal(true)}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          title="Clique para ver detalhes dos cancelamentos"
        >
          <KPI label="Cancelamentos" value={stats.cancellations} format="number" accent="red" />
        </div>
        <KPI label="Inadimplência" value={stats.inadimplenciaPercent} format="percent" accent="yellow" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h3 className="font-bold mb-2">Evolução Mensal (Previsto vs Realizado)</h3>
          <EvolutionChart labels={monthlyData.labels} planned={monthlyData.planned} paid={monthlyData.paid} />
        </Card>

        {role === 'admin' && (
          <Card>
            <h3 className="font-bold mb-2">Evolução do Lucro (Mensal)</h3>
            <ProfitChart labels={monthlyData.labels} profit={monthlyData.profit} />
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

          const COLORS = ['#0e48fe','#fc6e1f','#ffae1e','#f30961','#d1d5db','#9ca3af'];
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
                <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-[#0e48fe] inline-block" />
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
                          stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
                      ))}
                      {(teacherStats || []).map((t, i) => {
                        const x   = xV(i);
                        const bH  = Math.max((t.count / maxCount) * vChartH, 2);
                        const barY = yV(t.count);
                        const firstName = t.teacher.split(' ')[0];
                        return (
                          <g key={i}>
                            <rect x={x - bW/2} y={barY} width={bW} height={bH}
                              fill={i === 0 ? '#0e48fe' : i === (teacherStats||[]).length - 1 ? '#d1d5db' : 'rgba(14,72,254,0.45)'} rx={5} />
                            <text x={x} y={VH - 8} fontSize={9} textAnchor="middle" fill="#9ca3af" fontFamily="Montserrat,sans-serif">{firstName}</text>
                            <text x={x} y={Math.max(barY - 5, VPT - 4)} fontSize={8.5} textAnchor="middle" fill="#9ca3af" fontFamily="Montserrat,sans-serif">{t.count}</text>
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
                <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-emerald-500 inline-block" />
                  Receita por professor
                </h3>
                {(() => {
                  const PCX = 90, PCY = 90, PIE_R = 82;
                  const totalRev = (teacherStats || []).reduce((s, t) => s + t.revenue, 0) || 1;
                  const fmtRev = (v) => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`;
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
                          <path key={i} d={seg.d} fill={seg.color} stroke="white" strokeWidth={2} />
                        ))}
                      </svg>
                      <div className="flex flex-col gap-2.5 min-w-0">
                        {pieSegs.map((seg, i) => (
                          <div key={i} className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                            <span className="text-[11px] text-slate-600 font-medium truncate flex-1">{seg.label}</span>
                            <span className="text-[11px] text-slate-400 font-semibold tabular-nums flex-shrink-0">{fmtRev(seg.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* 3. Doughnut — alunos por curso */}
              <Card>
                <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-amber-400 inline-block" />
                  Alunos por curso
                </h3>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <svg viewBox="0 0 180 180" className="w-48 flex-shrink-0">
                    {segments.map((seg, i) => (
                      <path key={i} d={seg.path} fill={seg.color} stroke="white" strokeWidth={2} />
                    ))}
                    <text x={DCX} y={DCY - 6} fontSize={18} fontWeight="700" fontFamily="Montserrat,sans-serif" textAnchor="middle" fill="#111827">{total}</text>
                    <text x={DCX} y={DCY + 12} fontSize={9} fontFamily="Montserrat,sans-serif" textAnchor="middle" fill="#9ca3af">alunos</text>
                  </svg>
                  <div className="flex flex-col gap-2.5 min-w-0">
                    {segments.map((seg, i) => (
                      <div key={i} className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                        <span className="text-[11px] text-slate-600 font-medium truncate flex-1">{seg.label}</span>
                        <span className="text-[11px] text-slate-400 font-semibold tabular-nums flex-shrink-0">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

            </div>
          );
        })()}

        <Card>
          <h3 className="font-bold mb-2">Despesas do {dashboardRange === 'month' ? 'Mês' : 'Ano'}</h3>
          <Table
            header={["Descrição", "Categoria", "Data", "Valor"]}
            data={filteredExpenses}
            render={x => (
              <>
                <td key="description" className="px-6 py-3 font-semibold">{x.description}</td>
                <td key="category" className="px-6 py-3 text-sm text-slate-600">{x.category}</td>
                <td key="date" className="px-6 py-3 text-sm">
                  {x.date ? new Date(x.date).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td key="value" className="px-6 py-3 font-semibold">
                  R$ {Number(x.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
              </>
            )}
          />
          {filteredExpenses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma despesa registrada</p>
          )}
        </Card>
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
        dashboardRange={dashboardRange}
      />
    </>
  );
};

export default Dashboard;
