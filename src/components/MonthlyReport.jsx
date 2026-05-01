import React, { useMemo, useRef } from "react";
import {
  X,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  UserCheck,
  UserMinus,
  Activity,
} from "lucide-react";

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function fmt(n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(n) { return `${Number(n).toFixed(1)}%`; }

function statusColor(value, thresholds) {
  // thresholds: [green_max, yellow_max] — values above yellow = red
  if (value <= thresholds[0]) return { color: "#16a34a", bg: "#dcfce7", label: "🟢" };
  if (value <= thresholds[1]) return { color: "#d97706", bg: "#fef3c7", label: "🟡" };
  return { color: "#dc2626", bg: "#fee2e2", label: "🔴" };
}

function Badge({ color, bg, label, children }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
      {label} {children}
    </span>
  );
}

function KpiCard({ title, value, sub, statusEl, icon }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>{title}</div>
        {icon && <div style={{ color: "#94a3b8" }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{sub}</div>}
      {statusEl && <div style={{ marginTop: 6 }}>{statusEl}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Trend({ current, prev }) {
  if (!prev || prev === 0) return null;
  const diff = ((current - prev) / Math.abs(prev)) * 100;
  if (diff > 1) return <span style={{ color: "#16a34a", fontSize: 12 }}>↗ +{pct(diff)}</span>;
  if (diff < -1) return <span style={{ color: "#dc2626", fontSize: 12 }}>↘ {pct(diff)}</span>;
  return <span style={{ color: "#64748b", fontSize: 12 }}>→ Estável</span>;
}

export default function MonthlyReport({ onClose, students = [], payments = [], expenses = [], leads = [], filterMonth, filterYear }) {
  const printRef = useRef(null);

  const data = useMemo(() => {
    const currentMonth = filterMonth !== undefined ? filterMonth : new Date().getMonth();
    const currentYear = filterYear !== undefined ? filterYear : new Date().getFullYear();
    const today = new Date(); today.setHours(0,0,0,0);

    // ── helper date filter ──
    const inMonth = (raw, m, y) => {
      if (!raw) return false;
      const d = new Date(typeof raw === "number" ? raw : raw);
      return d.getMonth() === m && d.getFullYear() === y;
    };

    // ── Pagamentos do mês atual ──
    const monthPayments = payments.filter(p => inMonth(p.dueDate, currentMonth, currentYear));
    const paid = monthPayments.filter(p => p.status === "Pago");
    const late = monthPayments.filter(p => {
      if (p.status === "Pago") return false;
      if (!p.dueDate) return false;
      const d = new Date(p.dueDate); d.setHours(0,0,0,0);
      return d < today;
    });
    const pending = monthPayments.filter(p => p.status !== "Pago" && (!p.dueDate || new Date(p.dueDate) >= today));
    const revenue = paid.reduce((s, p) => s + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
    const lateAmt = late.reduce((s, p) => s + parseFloat(p.valuePlanned || 0), 0);
    const pendingAmt = pending.reduce((s, p) => s + parseFloat(p.valuePlanned || 0), 0);

    // ── Despesas do mês atual ──
    // Usa campos month/year salvos diretamente (1-based) para evitar deslocamento de fuso UTC
    const monthExpenses = expenses.filter(e => {
      if (e.month !== undefined && e.year !== undefined) {
        return e.month === currentMonth + 1 && e.year === currentYear;
      }
      if (!e.date) return false;
      const parts = e.date.substring(0, 10).split('-');
      return parseInt(parts[1]) - 1 === currentMonth && parseInt(parts[0]) === currentYear;
    });
    const totalExpenses = monthExpenses.reduce((s, e) => s + parseFloat(e.value || 0), 0);
    const expByCategory = monthExpenses.reduce((acc, e) => {
      const cat = e.category || "Outros";
      acc[cat] = (acc[cat] || 0) + parseFloat(e.value || 0);
      return acc;
    }, {});

    // ── Alunos ──
    const activeStudents = students.filter(s => s.status !== "cancelado");
    const inactiveStudents = students.filter(s => s.status === "cancelado");
    const retentionRate = students.length > 0 ? (activeStudents.length / students.length) * 100 : 0;
    const studentsByCourse = students.reduce((acc, s) => {
      const c = s.curso || "Não especificado";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    // Matrículas e cancelamentos do mês (usando createdAt / updatedAt)
    const newStudentsThisMonth = students.filter(s => {
      const raw = s.createdAt || s.enrolledAt || s.dataMatricula;
      return inMonth(raw, currentMonth, currentYear);
    });
    const canceledThisMonth = students.filter(s => {
      if (s.status !== "cancelado") return false;
      const raw = s.canceledAt || s.updatedAt;
      return inMonth(raw, currentMonth, currentYear);
    });

    // ── Leads (filtrados pelo mês selecionado) ──
    const monthLeads = leads.filter(l => inMonth(l.createdAt || l.date, currentMonth, currentYear));
    const leadsByStatus = monthLeads.reduce((acc, l) => {
      acc[l.status || "Sem status"] = (acc[l.status || "Sem status"] || 0) + 1;
      return acc;
    }, {});
    const leadsByOrigin = monthLeads.reduce((acc, l) => {
      const o = l.source || l.origem || l.origin || "Não informado";
      acc[o] = (acc[o] || 0) + 1;
      return acc;
    }, {});
    // Conversão: total histórico (convertidos acumulados / total de leads)
    const convertedLeadsAll = leads.filter(l => ["Matriculado","Convertido","matriculado","convertido"].includes(l.status));
    const convertedLeadsMonth = monthLeads.filter(l => ["Matriculado","Convertido","matriculado","convertido"].includes(l.status));
    const conversionRate = monthLeads.length > 0 ? (convertedLeadsMonth.length / monthLeads.length) * 100 : 0;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const forgottenLeads = leads.filter(l => {
      const u = l.updatedAt || l.createdAt;
      if (!u) return true;
      return new Date(u) < thirtyDaysAgo && !["Matriculado","Convertido","Desistiu","Perdido","matriculado"].includes(l.status);
    });

    // ── Histórico 6 meses ──
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, 1);
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth(), y = d.getFullYear();
      const mPay = payments.filter(p => inMonth(p.dueDate, m, y));
      const mPaid = mPay.filter(p => p.status === "Pago");
      const mExp = expenses.filter(e => {
        if (e.month !== undefined && e.year !== undefined) return e.month === m + 1 && e.year === y;
        if (!e.date) return false;
        const parts = e.date.substring(0, 10).split('-');
        return parseInt(parts[1]) - 1 === m && parseInt(parts[0]) === y;
      });
      const mRev = mPaid.reduce((s,p) => s + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
      const mExpTotal = mExp.reduce((s,e) => s + parseFloat(e.value || 0), 0);
      const mLate = mPay.filter(p => {
        if (p.status === "Pago") return false;
        if (!p.dueDate) return false;
        const dd = new Date(p.dueDate); dd.setHours(0,0,0,0);
        return dd < today;
      });
      history.push({
        label: `${MONTH_NAMES[m].slice(0,3)}/${y}`,
        revenue: mRev,
        expenses: mExpTotal,
        profit: mRev - mExpTotal,
        paid: mPaid.length,
        late: mLate.length,
        lateAmt: mLate.reduce((s,p) => s + parseFloat(p.valuePlanned || 0), 0),
      });
    }
    const prevMonth = history[history.length - 2];

    // ── Financeiro ──
    const profit = revenue - totalExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const defaultRate = monthPayments.length > 0 ? (late.length / monthPayments.length) * 100 : 0;
    const ticketMedio = paid.length > 0 ? revenue / paid.length : 0;

    return {
      period: { month: currentMonth, year: currentYear, label: `${MONTH_NAMES[currentMonth]} de ${currentYear}` },
      revenue, totalExpenses, profit, margin, defaultRate, ticketMedio,
      lateAmt, pendingAmt, paid: paid.length, late: late.length, pending: pending.length,
      totalMonthPayments: monthPayments.length,
      expByCategory,
      activeStudents: activeStudents.length,
      inactiveStudents: inactiveStudents.length,
      totalStudents: students.length,
      retentionRate,
      studentsByCourse,
      newThisMonth: newStudentsThisMonth.length,
      canceledThisMonth: canceledThisMonth.length,
      netBalance: newStudentsThisMonth.length - canceledThisMonth.length,
      leads: monthLeads.length, totalLeadsAll: leads.length,
      convertedLeads: convertedLeadsMonth.length, convertedLeadsAll: convertedLeadsAll.length,
      conversionRate,
      forgottenLeads: forgottenLeads.length, leadsByStatus, leadsByOrigin,
      history, prevMonth,
    };
  }, [students, payments, expenses, leads, filterMonth, filterYear]);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Relatório Mensal — SpeakUp — ${data.period.label}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 20px; }
          h1 { font-size: 18px; color: #005DE4; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 700; border-bottom: 2px solid #005DE4; padding-bottom: 4px; margin: 16px 0 10px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px; }
          .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
          .card-label { font-size: 10px; color: #64748b; margin-bottom: 2px; }
          .card-value { font-size: 16px; font-weight: 700; }
          .card-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; color: #64748b; }
          td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
          .green { color: #16a34a; }
          .red { color: #dc2626; }
          .yellow { color: #d97706; }
          .badge { border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; }
          .badge-green { background: #dcfce7; color: #16a34a; }
          .badge-yellow { background: #fef3c7; color: #d97706; }
          .badge-red { background: #fee2e2; color: #dc2626; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const { defaultRate, margin, conversionRate, retentionRate } = data;

  const defaultStatus = defaultRate <= 5 ? { label: "🟢 Saudável", cls: "badge-green" }
    : defaultRate <= 10 ? { label: "🟡 Atenção", cls: "badge-yellow" }
    : { label: "🔴 Crítico", cls: "badge-red" };
  const marginStatus = margin >= 25 ? { label: "🟢 Saudável", cls: "badge-green" }
    : margin >= 15 ? { label: "🟡 Atenção", cls: "badge-yellow" }
    : { label: "🔴 Crítico", cls: "badge-red" };
  const convStatus = conversionRate >= 30 ? { label: "🟢 Excelente", cls: "badge-green" }
    : conversionRate >= 20 ? { label: "🟡 Regular", cls: "badge-yellow" }
    : { label: "🔴 Baixa", cls: "badge-red" };
  const retStatus = retentionRate >= 85 ? { label: "🟢 Excelente", cls: "badge-green" }
    : retentionRate >= 75 ? { label: "🟡 Atenção", cls: "badge-yellow" }
    : { label: "🔴 Crítico", cls: "badge-red" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "20px", overflowY: "auto",
    }}>
      <div style={{
        background: "white", borderRadius: 16, width: "100%", maxWidth: 900,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        fontFamily: "'DM Sans', Arial, sans-serif",
      }}>
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(135deg,#005DE4,#0041a8)", borderRadius: "16px 16px 0 0", color: "white",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>📋 Relatório Mensal — SpeakUp</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{data.period.label}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
              color: "white", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.1)", border: "none", color: "white",
              borderRadius: 8, padding: "8px 10px", cursor: "pointer",
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Report content (also used for printing) */}
        <div ref={printRef} style={{ padding: "24px" }}>

          {/* Print-only header */}
          <div className="print-header" style={{ display: "none" }}>
            <h1>Relatório Mensal — SpeakUp</h1>
            <div className="subtitle">Período: {data.period.label} • Gerado em {new Date().toLocaleDateString("pt-BR")}</div>
          </div>

          {/* ── 1. FINANCEIRO ── */}
          <div className="section-title" style={{ fontWeight: 700, fontSize: 14, borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12, color: "#0f172a" }}>
            💰 1. Financeiro
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Receita do Mês</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmt(data.revenue)}</div>
              {data.prevMonth && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                Mês anterior: {fmt(data.prevMonth.revenue)} &nbsp;
                <Trend current={data.revenue} prev={data.prevMonth.revenue} />
              </div>}
            </div>
            <div className="card" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Despesas</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{fmt(data.totalExpenses)}</div>
              {data.prevMonth && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                Mês anterior: {fmt(data.prevMonth.expenses)} &nbsp;
                <Trend current={data.totalExpenses} prev={data.prevMonth.expenses} />
              </div>}
            </div>
            <div className="card" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Lucro Líquido</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: data.profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(data.profit)}</div>
              <div style={{ fontSize: 11, marginTop: 3 }}>
                <span style={{ marginRight: 6 }}>Margem: {pct(data.margin)}</span>
                <span className={`badge ${marginStatus.cls}`} style={{ background: marginStatus.cls.includes("green") ? "#dcfce7" : marginStatus.cls.includes("yellow") ? "#fef3c7" : "#fee2e2", color: marginStatus.cls.includes("green") ? "#16a34a" : marginStatus.cls.includes("yellow") ? "#d97706" : "#dc2626", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{marginStatus.label}</span>
              </div>
            </div>
            <div className="card" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Ticket Médio</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{fmt(data.ticketMedio)}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{data.paid} pgtos recebidos</div>
            </div>
          </div>

          {/* Pagamentos detalhado */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 10, padding: "10px 14px", background: "#f0fdf4" }}>
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✅ Recebido</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(data.revenue)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{data.paid} pagamentos</div>
            </div>
            <div style={{ border: "1px solid #fef3c7", borderRadius: 10, padding: "10px 14px", background: "#fffbeb" }}>
              <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>⏳ Pendente</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(data.pendingAmt)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{data.pending} cobranças</div>
            </div>
            <div style={{ border: "1px solid #fee2e2", borderRadius: 10, padding: "10px 14px", background: "#fef2f2" }}>
              <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>❌ Inadimplente</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(data.lateAmt)}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{data.late} em atraso — {pct(data.defaultRate)} &nbsp;
                <span style={{ background: defaultStatus.cls.includes("green") ? "#dcfce7" : defaultStatus.cls.includes("yellow") ? "#fef3c7" : "#fee2e2", color: defaultStatus.cls.includes("green") ? "#16a34a" : defaultStatus.cls.includes("yellow") ? "#d97706" : "#dc2626", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 600 }}>{defaultStatus.label}</span>
              </div>
            </div>
          </div>

          {/* ── 2. DESPESAS POR CATEGORIA ── */}
          {Object.keys(data.expByCategory).length > 0 && (
            <>
              <div className="section-title" style={{ fontWeight: 700, fontSize: 14, borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12, color: "#0f172a" }}>
                💸 2. Despesas por Categoria
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 12 }}>Categoria</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#64748b", fontSize: 12 }}>Valor</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#64748b", fontSize: 12 }}>% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.expByCategory)
                    .sort((a,b) => b[1]-a[1])
                    .map(([cat, val]) => (
                    <tr key={cat} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px" }}>{cat}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(val)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748b" }}>
                        {data.totalExpenses > 0 ? pct((val / data.totalExpenses) * 100) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td style={{ padding: "8px 10px" }}>Total</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(data.totalExpenses)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* ── 3. ALUNOS & MATRÍCULAS ── */}
          <div className="section-title" style={{ fontWeight: 700, fontSize: 14, borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12, color: "#0f172a" }}>
            🎓 3. Alunos & Matrículas
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Total de Alunos</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.totalStudents}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{data.activeStudents} ativos / {data.inactiveStudents} inativos</div>
            </div>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 10, padding: "12px 14px", background: "#f0fdf4" }}>
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>📈 Novas Matrículas</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.newThisMonth}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>no mês atual</div>
            </div>
            <div style={{ border: "1px solid #fee2e2", borderRadius: 10, padding: "12px 14px", background: "#fef2f2" }}>
              <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>📉 Cancelamentos</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.canceledThisMonth}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>no mês atual</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", background: data.netBalance > 0 ? "#f0fdf4" : data.netBalance < 0 ? "#fef2f2" : "white" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Saldo Líquido</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: data.netBalance > 0 ? "#16a34a" : data.netBalance < 0 ? "#dc2626" : "#0f172a" }}>
                {data.netBalance > 0 ? "+" : ""}{data.netBalance}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>entradas - saídas</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 13 }}>Taxa de Retenção: <strong>{pct(data.retentionRate)}</strong></div>
            <span style={{ background: retStatus.cls.includes("green") ? "#dcfce7" : retStatus.cls.includes("yellow") ? "#fef3c7" : "#fee2e2", color: retStatus.cls.includes("green") ? "#16a34a" : retStatus.cls.includes("yellow") ? "#d97706" : "#dc2626", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{retStatus.label}</span>
            {Object.entries(data.studentsByCourse).map(([c,n]) => (
              <span key={c} style={{ background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#334155" }}>{c}: {n}</span>
            ))}
          </div>

          {/* ── 4. LEADS & CONVERSÃO ── */}
          <div className="section-title" style={{ fontWeight: 700, fontSize: 14, borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12, color: "#0f172a" }}>
            🎯 4. Leads & Conversão
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Novos Leads no Mês</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.leads}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Total acumulado: {data.totalLeadsAll}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Convertidos</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{data.convertedLeads}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Taxa de Conversão</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pct(data.conversionRate)}</div>
              <span style={{ background: convStatus.cls.includes("green") ? "#dcfce7" : convStatus.cls.includes("yellow") ? "#fef3c7" : "#fee2e2", color: convStatus.cls.includes("green") ? "#16a34a" : convStatus.cls.includes("yellow") ? "#d97706" : "#dc2626", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{convStatus.label}</span>
            </div>
            <div style={{ border: "1px solid #fef3c7", borderRadius: 10, padding: "12px 14px", background: "#fffbeb" }}>
              <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>⚠️ Leads Esquecidos</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{data.forgottenLeads}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>&gt;30 dias sem contato</div>
            </div>
          </div>
          {Object.keys(data.leadsByOrigin).length > 0 && (
            <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Por origem:</span>
              {Object.entries(data.leadsByOrigin).map(([o,n]) => (
                <span key={o} style={{ background: "#f1f5f9", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#334155" }}>{o}: <strong>{n}</strong></span>
              ))}
            </div>
          )}

          {/* ── 5. HISTÓRICO 6 MESES ── */}
          <div className="section-title" style={{ fontWeight: 700, fontSize: 14, borderBottom: "2px solid #005DE4", paddingBottom: 6, marginBottom: 12, color: "#0f172a" }}>
            📅 5. Histórico — Últimos 6 Meses
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Mês","Receita","Despesas","Lucro","Recebidos","Inadimplentes"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: h === "Mês" ? "left" : "right", fontWeight: 600, color: "#64748b", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.history.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i === data.history.length - 1 ? "#eff6ff" : "white" }}>
                  <td style={{ padding: "8px 10px", fontWeight: i === data.history.length - 1 ? 700 : 400 }}>{row.label}{i === data.history.length - 1 ? " ★" : ""}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{fmt(row.revenue)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#dc2626" }}>{fmt(row.expenses)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: row.profit >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(row.profit)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.paid}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: row.late > 0 ? "#dc2626" : "#64748b" }}>{row.late} ({fmt(row.lateAmt)})</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Relatório gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} — SpeakUp English Academy
          </div>
        </div>
      </div>
    </div>
  );
}
