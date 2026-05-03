import React, { useMemo, useRef, useState } from "react";
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

  const [selectedMonth, setSelectedMonth] = useState(filterMonth !== undefined ? filterMonth : new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(filterYear !== undefined ? filterYear : new Date().getFullYear());

  // Build list of available year options (current year - 2 to current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  const data = useMemo(() => {
    const currentMonth = selectedMonth;
    const currentYear = selectedYear;
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
  }, [students, payments, expenses, leads, selectedMonth, selectedYear]);

  const handlePrint = () => {
    const d = data;
    const pm = d.prevMonth;
    const pmMargin = pm && pm.revenue > 0 ? (pm.profit / pm.revenue) * 100 : 0;
    const pmTicket = pm && pm.paid > 0 ? pm.revenue / pm.paid : 0;

    const fmtCur = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtP = n => `${Number(n).toFixed(1)}%`;
    const momStr = (curr, prev) => {
      if (!prev || prev === 0) return '—';
      const p = ((curr - prev) / Math.abs(prev)) * 100;
      return (p >= 0 ? '▲ +' : '▼ ') + Math.abs(p).toFixed(1) + '%';
    };

    // Chart data arrays (JSON strings for embedding)
    const hist3 = d.history.slice(-3);
    const hlabels = JSON.stringify(hist3.map(h => h.label));
    const hrev    = JSON.stringify(hist3.map(h => Math.round(h.revenue)));
    const hexp    = JSON.stringify(hist3.map(h => Math.round(h.expenses)));
    const hpro    = JSON.stringify(hist3.map(h => Math.round(h.profit)));
    const hmar    = JSON.stringify(hist3.map(h => h.revenue > 0 ? +(h.profit/h.revenue*100).toFixed(1) : 0));
    const hpaid   = JSON.stringify(hist3.map(h => h.paid));
    const hlate   = JSON.stringify(hist3.map(h => h.late));
    const htick   = JSON.stringify(hist3.map(h => h.paid > 0 ? Math.round(h.revenue/h.paid) : 0));
    const inad4   = d.history.slice(-4);
    const inadLabels = JSON.stringify(inad4.map(h => h.label));
    const inadPct = JSON.stringify(inad4.map(h => { const t = h.paid + h.late; return t > 0 ? +(h.late/t*100).toFixed(1) : 0; }));
    const inadVal = JSON.stringify(inad4.map(h => Math.round(h.lateAmt)));
    const leadK   = Object.keys(d.leadsByStatus);
    const leadV   = Object.values(d.leadsByStatus);
    const leadKJ  = JSON.stringify(leadK.length ? leadK : ['Sem dados']);
    const leadVJ  = JSON.stringify(leadV.length ? leadV : [1]);
    const compVJ  = JSON.stringify([Math.round(d.revenue), Math.round(d.pendingAmt), Math.round(d.lateAmt)]);
    const momDS   = hist3.map((h, i) => {
      const a = ((i+1)/hist3.length).toFixed(2);
      return `{label:'${h.label}',data:[${(h.revenue/1000).toFixed(1)},${(h.expenses/1000).toFixed(1)},${(h.profit/1000).toFixed(1)},${h.paid}],backgroundColor:'rgba(0,93,228,${a})',borderRadius:3}`;
    }).join(',');

    // Expense donut data
    const expCats = Object.entries(d.expByCategory).sort((a,b) => b[1]-a[1]).slice(0,6);
    const expCJ = JSON.stringify(expCats.map(([k]) => k));
    const expVjson = JSON.stringify(expCats.map(([,v]) => Math.round(v)));

    // Auto insights
    const ins = [];
    if (d.defaultRate > 5) ins.push({t:'alert', h:'🚨 Inadimplência acima da meta', x:`Taxa de ${fmtP(d.defaultRate)} (meta: &lt;5%). ${fmtCur(d.lateAmt)} em atraso — cobrança imediata necessária para evitar escalada.`});
    if (d.newThisMonth < 10) ins.push({t:'alert', h:'🔴 Captação baixa no mês', x:`Apenas ${d.newThisMonth} novas matrículas este mês. Follow-up nos leads ativos e intensificação de marketing.`});
    if (d.margin >= 40) ins.push({t:'good', h:'✅ Margem excelente', x:`Margem de ${fmtP(d.margin)} — recorde de eficiência. Operação altamente lucrativa e escalável.`});
    else if (d.margin >= 25) ins.push({t:'good', h:'✅ Margem saudável', x:`Margem de ${fmtP(d.margin)} — dentro do intervalo saudável (meta: &gt;25%). Continue controlando despesas.`});
    if (d.canceledThisMonth === 0) ins.push({t:'good', h:'✅ Zero cancelamentos', x:'Nenhum cancelamento este mês — excelente retenção de alunos. Base estável e crescente.'});
    if (d.forgottenLeads > 5) ins.push({t:'warn', h:`⚠️ ${d.forgottenLeads} leads esquecidos`, x:'Leads sem contato há mais de 30 dias. Reengajar imediatamente pode gerar conversões sem custo adicional.'});
    if (pm && d.totalExpenses < pm.expenses) ins.push({t:'good', h:'✅ Despesas controladas', x:`Despesas caíram ${fmtP((pm.expenses-d.totalExpenses)/pm.expenses*100)} vs. mês anterior — controle de custos eficaz.`});
    if (d.conversionRate > 0 && d.conversionRate < 20) ins.push({t:'warn', h:'⚠️ Conversão de leads baixa', x:`Taxa de ${fmtP(d.conversionRate)} — meta acima de 20%. Revisar abordagem e oferecer aula experimental gratuita.`});
    ins.push({t:'info', h:'📈 Oportunidade de crescimento', x:`Com ${d.activeStudents} alunos ativos, programa de indicação pode gerar 5–10 novos leads qualificados por mês sem custo.`});

    // Auto actions
    const acts = [];
    if (d.late > 0) acts.push({pr:'u', n:1, title:`Cobrança ativa dos ${d.late} inadimplentes — primeiros 3 dias`, desc:`Contato individual via WhatsApp e ligação. Oferecer renegociação. Meta: recuperar 60%+ dos ${fmtCur(d.lateAmt)} até dia 10.`, tag:'🔴 Urgente', tc:'tu'});
    if (d.forgottenLeads > 0) acts.push({pr:'u', n:acts.length+1, title:`Follow-up nos ${d.forgottenLeads} leads sem contato recente`, desc:'Reengajar com novo script e oferta de aula experimental. Potencial de conversão imediata com custo zero.', tag:'🔴 Urgente', tc:'tu'});
    if (d.newThisMonth < 10) acts.push({pr:'m', n:acts.length+1, title:'Intensificar campanha de captação', desc:'Investir em tráfego pago, indicações e presença em redes sociais. Meta: pelo menos 15 novos leads qualificados por semana.', tag:'🟡 Médio prazo', tc:'tm'});
    acts.push({pr:'p', n:acts.length+1, title:'Campanha de indicação para alunos ativos', desc:`Com ${d.activeStudents} alunos ativos, programa "Indique e Ganhe" pode gerar leads qualificados com custo mínimo.`, tag:'🔵 Crescimento', tc:'tg'});
    if (d.ticketMedio < 250) acts.push({pr:'m', n:acts.length+1, title:'Revisão de precificação — criar planos premium', desc:`Ticket médio atual ${fmtCur(d.ticketMedio)} está abaixo do mercado (R$250–500). Planos premium podem aumentar receita sem novos alunos.`, tag:'🟡 Médio prazo', tc:'tm'});
    acts.push({pr:'p', n:acts.length+1, title:'Automatizar régua de cobrança preventiva', desc:'Alertas automáticos 5 dias antes do vencimento reduzem inadimplência em até 70% sem esforço manual adicional.', tag:'🔵 Crescimento', tc:'tg'});

    const nextMLabel = `${MONTH_NAMES[(d.period.month + 1) % 12]} ${d.period.month === 11 ? d.period.year + 1 : d.period.year}`;

    // Inadimplência table rows
    const inadRows = inad4.map((h, i) => {
      const tot = h.paid + h.late;
      const rate = tot > 0 ? h.late/tot*100 : 0;
      const isLast = i === inad4.length - 1;
      const cls = rate <= 5 ? 'bg' : rate <= 10 ? 'ba' : 'br';
      const sl = rate <= 5 ? 'Saudável' : rate <= 10 ? 'Atenção' : 'Crítico';
      return `<tr${isLast ? ' style="background:#fff5f5"':''}><td><strong>${h.label}</strong></td><td style="text-align:center">${tot}</td><td style="text-align:center">${h.paid}</td><td style="text-align:center"><strong>${h.late}</strong></td><td style="text-align:right"><strong>${fmtCur(h.lateAmt)}</strong></td><td style="text-align:center"><span class="b ${cls}">${fmtP(rate)}</span></td><td style="text-align:center"><span class="b ${cls}">${sl}</span></td></tr>`;
    }).join('');

    // Expense table rows
    const expRows = expCats.map(([cat,val]) =>
      `<tr><td><strong>${cat}</strong></td><td style="text-align:right">${fmtCur(val)}</td><td style="text-align:right">${d.totalExpenses > 0 ? fmtP(val/d.totalExpenses*100) : '—'}</td></tr>`
    ).join('');

    // Leads progress bars
    const leadsProgress = Object.entries(d.leadsByStatus).slice(0,5).map(([status, count]) => {
      const pv = d.totalLeadsAll > 0 ? Math.min(count/d.totalLeadsAll*100, 100) : 0;
      return `<div class="pi"><div class="pi-h"><span class="pi-n">${status}</span><span class="pi-v">${count} (${fmtP(pv)})</span></div><div class="pt"><div class="pf" style="width:${pv}%"></div></div></div>`;
    }).join('');

    // Insights HTML
    const insHTML = ins.slice(0,6).map(i =>
      `<div class="ic ${i.t}"><div class="ic-t">${i.h}</div><div class="ic-x">${i.x}</div></div>`
    ).join('');

    // Actions HTML
    const actsHTML = acts.slice(0,7).map(a =>
      `<div class="ai"><div class="an ${a.pr === 'u' ? 'u' : a.pr === 'm' ? 'm' : ''}">${a.n}</div><div><div class="ac-t">${a.title}</div><div class="ac-x">${a.desc}</div></div><div class="atag ${a.tc}">${a.tag}</div></div>`
    ).join('');

    // MoM comparison rows
    const momRows = pm ? [
      {label:'Receita', prev:pm.revenue, curr:d.revenue, lowerGood:false, currColor:'var(--blue)'},
      {label:'Despesas', prev:pm.expenses, curr:d.totalExpenses, lowerGood:true, currColor:'var(--blue)'},
      {label:'Lucro', prev:pm.profit, curr:d.profit, lowerGood:false, currColor:'var(--blue)'},
      {label:'Margem', prev:pmMargin, curr:d.margin, lowerGood:false, fmt:(v)=>fmtP(v), currColor:'var(--blue)'},
      {label:'Ticket Médio', prev:pmTicket, curr:d.ticketMedio, lowerGood:false, currColor:'var(--amber)'},
      {label:'Inadimplentes', prev:pm.late, curr:d.late, lowerGood:true, currColor:'var(--red)', noCur:true},
    ].map(row => {
      const fv = row.fmt || fmtCur;
      const good = row.lowerGood ? row.curr <= row.prev : row.curr >= row.prev;
      const bg = good ? 'var(--green-l)' : 'var(--red-l)';
      const col = good ? 'var(--green)' : 'var(--red)';
      return `<div class="mr"><div class="mv" style="color:var(--s500)">${fv(row.prev)}</div><div class="mc"><div class="ml">${row.label}</div><div class="mb2" style="background:${bg};color:${col}">${momStr(row.curr,row.prev)}</div></div><div class="mv" style="color:${row.currColor}">${fv(row.curr)}</div></div>`;
    }).join('') : '<div style="text-align:center;padding:20px;color:var(--s500);font-size:9px">Dados insuficientes para comparativo</div>';

    // Positive & Negative points
    const posPoints = [];
    if (d.margin >= 25) posPoints.push(`✓ Margem ${fmtP(d.margin)} — operação lucrativa`);
    if (d.canceledThisMonth === 0) posPoints.push('✓ Zero cancelamentos no mês');
    if (pm && d.totalExpenses < pm.expenses) posPoints.push(`✓ Despesas caíram ${fmtP((pm.expenses-d.totalExpenses)/pm.expenses*100)} vs. mês anterior`);
    if (d.defaultRate <= 5) posPoints.push('✓ Inadimplência dentro da meta (&lt;5%)');
    if (d.retentionRate >= 85) posPoints.push(`✓ Retenção excelente: ${fmtP(d.retentionRate)}`);
    posPoints.push(`✓ ${d.activeStudents} alunos ativos na base`);
    const negPoints = [];
    if (d.defaultRate > 5) negPoints.push(`✗ Inadimplência em ${fmtP(d.defaultRate)} — acima da meta de 5%`);
    if (d.newThisMonth < 10) negPoints.push(`✗ Apenas ${d.newThisMonth} novas matrículas no mês`);
    if (d.ticketMedio < 250) negPoints.push(`✗ Ticket médio ${fmtCur(d.ticketMedio)} abaixo do mercado`);
    if (d.forgottenLeads > 5) negPoints.push(`✗ ${d.forgottenLeads} leads esquecidos há +30 dias`);
    if (d.conversionRate < 20) negPoints.push(`✗ Conversão de leads em ${fmtP(d.conversionRate)} — abaixo de 20%`);
    if (negPoints.length === 0) negPoints.push('✓ Nenhum alerta crítico identificado!');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório — SpeakUp — ${d.period.label}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{--blue:#005DE4;--blue-d:#0041a8;--blue-l:#e8f0fd;--green:#10b981;--green-l:#d1fae5;--red:#ef4444;--red-l:#fee2e2;--amber:#f59e0b;--amber-l:#fef3c7;--s900:#0f172a;--s700:#334155;--s500:#64748b;--s300:#cbd5e1;--s100:#f1f5f9;--white:#fff;--font:'Montserrat',sans-serif;--mono:'DM Mono',monospace;}
body{font-family:var(--font);background:#d1d5db;color:var(--s900);font-size:10px;line-height:1.4;}
.a4{width:210mm;height:297mm;background:var(--white);margin:5mm auto;padding:10mm 12mm 14mm;position:relative;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.2);page-break-after:always;break-after:page;}
.a4:last-of-type{page-break-after:auto;break-after:auto;}
.fab{position:fixed;bottom:22px;right:22px;z-index:999;background:var(--blue);color:#fff;border:none;border-radius:40px;padding:11px 20px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 6px 24px rgba(0,93,228,0.45);}
.cover-bar{background:var(--blue);padding:8px 12mm;display:flex;align-items:center;justify-content:space-between;margin:-10mm -12mm 0;flex-shrink:0;}
.cbar-logo{display:flex;align-items:center;gap:9px;}
.cbar-mark{width:30px;height:30px;background:rgba(255,255,255,0.2);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;}
.cbar-name{font-size:14px;font-weight:800;color:#fff;}
.cbar-sub{font-size:8px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.8px;}
.cbar-badge{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:3px 12px;font-size:8px;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1.8px;font-weight:600;}
.cover-hero{display:grid;grid-template-columns:1fr 200px;gap:0;padding:10mm 0 8mm;position:relative;flex:1;align-content:center;}
.cover-hero::after{content:'';position:absolute;top:0;right:-12mm;bottom:0;width:230px;background:linear-gradient(160deg,var(--blue-l) 0%,#eff6ff 100%);clip-path:polygon(20% 0,100% 0,100% 100%,0% 100%);z-index:0;}
.cover-left{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;}
.cover-right{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;}
.c-eyebrow{display:inline-flex;align-items:center;gap:6px;background:var(--blue-l);border:1.5px solid var(--blue);border-radius:20px;padding:3px 12px;font-size:8px;color:var(--blue);text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:10px;width:fit-content;}
.c-dot{width:5px;height:5px;border-radius:50%;background:var(--amber);}
.c-title{font-size:44px;font-weight:900;color:var(--s900);line-height:.88;letter-spacing:-3px;margin-bottom:8px;}
.c-title span{color:var(--blue);}
.c-desc{font-size:10px;color:var(--s500);line-height:1.65;max-width:230px;}
.cover-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6mm;flex-shrink:0;}
.ck{border:1.5px solid var(--s300);border-radius:8px;padding:9px 10px;border-top:3px solid var(--blue);}
.ck.g{border-top-color:var(--green);}
.ck.r{border-top-color:var(--red);}
.ck.a{border-top-color:var(--amber);}
.ck-val{font-size:17px;font-weight:800;color:var(--s900);line-height:1;}
.ck-label{font-size:7.5px;text-transform:uppercase;letter-spacing:1px;color:var(--s500);font-weight:600;margin-top:3px;}
.ck-delta{display:inline-flex;align-items:center;gap:3px;margin-top:4px;font-size:7.5px;font-weight:700;padding:2px 5px;border-radius:7px;}
.du{background:var(--green-l);color:var(--green);}
.dd{background:var(--red-l);color:var(--red);}
.dw{background:var(--amber-l);color:var(--amber);}
.cover-foot{background:var(--s900);padding:6px 12mm;display:flex;justify-content:space-between;align-items:center;margin:0 -12mm -14mm;flex-shrink:0;}
.cf-brand{font-size:11px;font-weight:800;color:#fff;}
.cf-meta{font-size:8px;color:rgba(255,255,255,0.45);margin-top:2px;}
.cf-right{font-size:8px;color:rgba(255,255,255,0.45);text-align:right;}
.ph{display:flex;align-items:center;justify-content:space-between;padding-bottom:5px;margin-bottom:8px;border-bottom:2px solid var(--s300);}
.ph-l{display:flex;align-items:center;gap:7px;}
.ph-icon{width:26px;height:26px;background:var(--blue);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;}
.ph-title{font-size:14px;font-weight:800;letter-spacing:-.5px;}
.ph-period{font-size:7.5px;color:var(--s500);background:var(--s100);padding:2px 8px;border-radius:20px;font-family:var(--mono);}
.kg{display:grid;gap:5px;margin-bottom:6px;}
.kg4{grid-template-columns:repeat(4,1fr);}
.kg3{grid-template-columns:repeat(3,1fr);}
.kg2{grid-template-columns:repeat(2,1fr);}
.kc{background:var(--white);border:1.5px solid var(--s300);border-radius:8px;padding:8px 9px;position:relative;overflow:hidden;}
.kc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--blue);}
.kc.g::before{background:var(--green);}
.kc.r::before{background:var(--red);}
.kc.a::before{background:var(--amber);}
.k-lbl{font-size:7.5px;text-transform:uppercase;letter-spacing:1px;color:var(--s500);font-weight:600;margin-bottom:3px;}
.k-val{font-size:19px;font-weight:800;color:var(--s900);line-height:1;}
.k-val.md{font-size:15px;}
.k-sub{font-size:7.5px;color:var(--s500);margin-top:2px;}
.k-d{display:inline-flex;align-items:center;gap:2px;margin-top:4px;font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:7px;}
.k-d.up{background:var(--green-l);color:var(--green);}
.k-d.dn{background:var(--red-l);color:var(--red);}
.k-d.wn{background:var(--amber-l);color:var(--amber);}
.k-d.nt{background:var(--s100);color:var(--s500);}
.cc{background:var(--white);border:1.5px solid var(--s300);border-radius:8px;padding:8px 10px;}
.cc-t{font-size:9px;font-weight:700;margin-bottom:1px;}
.cc-s{font-size:7.5px;color:var(--s500);margin-bottom:5px;}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;}
.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:5px;}
.tbl{width:100%;border-collapse:collapse;font-size:8px;}
.tbl th{background:var(--s900);color:#fff;padding:5px 8px;text-align:left;font-size:7.5px;text-transform:uppercase;letter-spacing:.7px;font-weight:600;}
.tbl th:first-child{border-radius:5px 0 0 0;}
.tbl th:last-child{border-radius:0 5px 0 0;}
.tbl td{padding:5px 8px;border-bottom:1px solid var(--s100);color:var(--s700);}
.tbl tr:last-child td{border-bottom:none;}
.b{display:inline-flex;align-items:center;padding:1px 7px;border-radius:7px;font-size:8px;font-weight:700;}
.bg{background:var(--green-l);color:var(--green);}
.br{background:var(--red-l);color:var(--red);}
.ba{background:var(--amber-l);color:var(--amber);}
.bb{background:var(--blue-l);color:var(--blue);}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:6px;}
.ic{border-radius:7px;padding:8px 10px;border-left:3px solid;}
.ic.alert{background:var(--red-l);border-color:var(--red);}
.ic.good{background:var(--green-l);border-color:var(--green);}
.ic.warn{background:var(--amber-l);border-color:var(--amber);}
.ic.info{background:var(--blue-l);border-color:var(--blue);}
.ic-t{font-size:8.5px;font-weight:700;margin-bottom:2px;}
.ic-x{font-size:7.5px;line-height:1.45;opacity:.85;}
.al{display:flex;flex-direction:column;gap:5px;}
.ai{display:flex;align-items:flex-start;gap:8px;background:var(--white);border:1.5px solid var(--s300);border-radius:7px;padding:7px 9px;}
.an{width:20px;height:20px;min-width:20px;border-radius:5px;background:var(--blue);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;}
.an.u{background:var(--red);}
.an.m{background:var(--amber);color:var(--s900);}
.ac-t{font-size:8.5px;font-weight:700;margin-bottom:1px;}
.ac-x{font-size:7.5px;color:var(--s500);line-height:1.4;}
.atag{margin-left:auto;align-self:flex-start;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;padding:2px 7px;border-radius:6px;white-space:nowrap;}
.tu{background:var(--red-l);color:var(--red);}
.tm{background:var(--amber-l);color:var(--amber);}
.tg{background:var(--blue-l);color:var(--blue);}
.pi{margin-bottom:6px;}
.pi-h{display:flex;justify-content:space-between;margin-bottom:3px;}
.pi-n{font-size:8.5px;font-weight:600;}
.pi-v{font-family:var(--mono);font-size:7.5px;color:var(--s500);}
.pt{height:4px;background:var(--s100);border-radius:3px;overflow:hidden;}
.pf{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--blue),#60a5fa);}
.pf.g{background:linear-gradient(90deg,var(--green),#34d399);}
.pf.r{background:linear-gradient(90deg,var(--red),#f87171);}
.mr{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--s100);}
.mv{font-size:13px;font-weight:800;text-align:center;min-width:72px;}
.mc{flex:1;text-align:center;}
.ml{font-size:7.5px;color:var(--s500);text-transform:uppercase;letter-spacing:.7px;margin-bottom:2px;}
.mb2{display:inline-block;font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:7px;}
.pn-g{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px;}
.pn-b{border-radius:7px;padding:8px 10px;}
.pn-b.pos{background:var(--green-l);}
.pn-b.neg{background:var(--red-l);}
.pn-title{font-size:9px;font-weight:700;margin-bottom:5px;}
.pn-title.pos{color:var(--green);}
.pn-title.neg{color:var(--red);}
.pn-item{display:flex;align-items:flex-start;gap:5px;font-size:7.5px;margin-bottom:4px;line-height:1.35;}
.ab{background:#450a0a;border:1px solid var(--red);border-radius:7px;padding:7px 10px;display:flex;align-items:center;gap:9px;margin-bottom:6px;}
.ab-icon{font-size:16px;}
.ab-t{font-size:9px;font-weight:700;color:#fca5a5;margin-bottom:1px;}
.ab-x{font-size:7.5px;color:#fecaca;line-height:1.45;}
.pfoot{position:absolute;bottom:5mm;left:12mm;right:12mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--s300);padding-top:3px;}
.pf-l{font-size:7px;color:var(--s500);}
.pf-r{font-size:7px;color:var(--s500);font-family:var(--mono);}
.div{height:1px;background:var(--s300);margin:6px 0;}
.gap{height:5px;}
@media print{@page{size:A4 portrait;margin:0;}body{background:white;}.fab{display:none!important;}.a4{margin:0;box-shadow:none;width:210mm;height:297mm;padding:10mm 12mm 14mm;page-break-after:always;break-after:page;overflow:hidden;}.a4:last-of-type{page-break-after:auto;break-after:auto;}}
</style>
</head>
<body>
<button class="fab" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

<!-- PÁG 1 — FINANCEIRO -->
<div class="a4">
  <div class="ph"><div class="ph-l"><div class="ph-icon">💰</div><div class="ph-title">Desempenho Financeiro</div></div><div class="ph-period">${d.period.label}</div></div>
  <div class="kg kg4">
    <div class="kc a"><div class="k-lbl">Receita Realizada</div><div class="k-val md">${fmtCur(d.revenue)}</div><div class="k-sub">${d.paid} pagamentos efetivos</div><div class="k-d ${pm && d.revenue >= pm.revenue ? 'up' : 'dn'}">${pm ? momStr(d.revenue, pm.revenue) : '→ Mês atual'}</div></div>
    <div class="kc r"><div class="k-lbl">Despesas Totais</div><div class="k-val md">${fmtCur(d.totalExpenses)}</div><div class="k-sub">${d.revenue > 0 ? fmtP(d.totalExpenses/d.revenue*100) : '—'} da receita</div><div class="k-d ${pm && d.totalExpenses <= pm.expenses ? 'up' : 'dn'}">${pm ? momStr(d.totalExpenses, pm.expenses) : '→ Mês atual'}</div></div>
    <div class="kc g"><div class="k-lbl">Lucro Líquido</div><div class="k-val md">${fmtCur(d.profit)}</div><div class="k-sub">Margem: ${fmtP(d.margin)}</div><div class="k-d up">${d.margin >= 25 ? '✅ Saudável' : d.margin >= 15 ? '⚠️ Atenção' : '🔴 Crítico'}</div></div>
    <div class="kc"><div class="k-lbl">Ticket Médio</div><div class="k-val md">${fmtCur(d.ticketMedio)}</div><div class="k-sub">Por pagamento recebido</div><div class="k-d ${d.ticketMedio >= 250 ? 'up' : 'wn'}">${d.ticketMedio >= 250 ? '✓ Bom' : '⚠ Abaixo de R$250'}</div></div>
  </div>
  <div class="r2">
    <div class="cc"><div class="cc-t">Receita · Despesas · Lucro</div><div class="cc-s">Evolução dos últimos 3 meses</div><canvas id="receitaChart" height="110"></canvas></div>
    <div class="cc"><div class="cc-t">Margem de Lucro (%)</div><div class="cc-s">Evolução — meta mínima: 25%</div><canvas id="margemChart" height="110"></canvas></div>
  </div>
  <div class="cc" style="margin-bottom:5px">
    <div class="cc-t">Composição da Receita — ${d.period.label}</div>
    <div class="cc-s">Status das ${d.totalMonthPayments} cobranças do mês</div>
    <div style="display:grid;grid-template-columns:130px 1fr;gap:14px;align-items:center">
      <canvas id="composicaoChart" style="width:110px!important;height:110px!important;max-width:110px"></canvas>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--green-l);border-radius:7px"><div><div style="font-weight:700;color:var(--green);font-size:9px">✅ Pagamentos Realizados</div><div style="font-size:8px;color:var(--s500)">${d.paid} cobranças pagas</div></div><div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--green)">${fmtCur(d.revenue)}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--amber-l);border-radius:7px"><div><div style="font-weight:700;color:var(--amber);font-size:9px">⏳ Pendentes</div><div style="font-size:8px;color:var(--s500)">${d.pending} a vencer</div></div><div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--amber)">${fmtCur(d.pendingAmt)}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--red-l);border-radius:7px"><div><div style="font-weight:700;color:var(--red);font-size:9px">⚠️ Em Atraso</div><div style="font-size:8px;color:var(--s500)">${d.late} vencidas</div></div><div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--red)">${fmtCur(d.lateAmt)}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--s100);border-radius:7px"><div><div style="font-weight:700;font-size:9px">💸 Despesas</div><div style="font-size:8px;color:var(--s500)">${d.revenue > 0 ? fmtP(d.totalExpenses/d.revenue*100) : '—'} da receita</div></div><div style="font-family:var(--mono);font-size:11px;font-weight:700">${fmtCur(d.totalExpenses)}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--blue-l);border-radius:7px;border:1.5px solid var(--blue)"><div><div style="font-weight:700;color:var(--blue);font-size:9px">📊 Lucro Líquido</div><div style="font-size:8px;color:var(--s500)">Margem ${fmtP(d.margin)}</div></div><div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--blue)">${fmtCur(d.profit)}</div></div>
      </div>
    </div>
  </div>
  ${expCats.length > 0 ? `<div class="cc"><div class="cc-t">Despesas por Categoria</div><div class="cc-s">${expCats.length} categorias · Total ${fmtCur(d.totalExpenses)}</div><div style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center"><canvas id="expCatChart" style="width:100px!important;height:100px!important;max-width:100px"></canvas><table class="tbl"><thead><tr><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead><tbody>${expRows}</tbody></table></div></div>` : ''}
  <div class="pfoot"><div class="pf-l">SpeakUp — Relatório Executivo · ${d.period.label} · Uso interno</div><div class="pf-r">Pág. 1 / 5</div></div>
</div>

<!-- PÁG 3 — INADIMPLÊNCIA -->
<div class="a4">
  <div class="ph"><div class="ph-l"><div class="ph-icon">⚠️</div><div class="ph-title">Inadimplência</div></div><div class="ph-period">${d.period.label}</div></div>
  ${d.defaultRate > 5 ? `<div class="ab"><div class="ab-icon">🚨</div><div><div class="ab-t">ALERTA CRÍTICO: Inadimplência acima da meta de 5%</div><div class="ab-x">Taxa atual de ${fmtP(d.defaultRate)} — ${d.late} cobranças vencidas totalizando ${fmtCur(d.lateAmt)}. Ação imediata de cobrança necessária para evitar escalada no próximo mês.</div></div></div>` : ''}
  <div class="kg kg3">
    <div class="kc ${d.defaultRate <= 5 ? 'g' : 'r'}"><div class="k-lbl">Taxa de Inadimplência</div><div class="k-val">${fmtP(d.defaultRate)}</div><div class="k-sub">Meta máxima: 5,0%</div><div class="k-d ${d.defaultRate <= 5 ? 'up' : 'dn'}">${d.defaultRate <= 5 ? '✅ Saudável' : d.defaultRate <= 10 ? '⚠️ Atenção' : '🚨 Crítico'}</div></div>
    <div class="kc ${d.late === 0 ? 'g' : 'r'}"><div class="k-lbl">Valor em Atraso</div><div class="k-val md">${fmtCur(d.lateAmt)}</div><div class="k-sub">${d.late} cobranças vencidas</div><div class="k-d ${d.late === 0 ? 'up' : 'dn'}">${d.late === 0 ? '✓ Nenhum atraso' : '⚠ Ação necessária'}</div></div>
    <div class="kc a"><div class="k-lbl">Total Cobranças</div><div class="k-val md">${d.totalMonthPayments}</div><div class="k-sub">${d.paid} pagas · ${d.pending} pendentes · ${d.late} atrasadas</div><div class="k-d nt">→ Mês atual</div></div>
  </div>
  <div class="cc" style="margin-bottom:5px">
    <div class="cc-t">Evolução da Inadimplência — Últimos 4 Meses</div>
    <div class="cc-s">Taxa % (eixo esq.) e valor R$ (eixo dir.) — linha tracejada = meta 5%</div>
    <canvas id="inadChart" height="100"></canvas>
  </div>
  <div class="cc">
    <div class="cc-t">Histórico Mensal de Inadimplência</div>
    <div class="cc-s">Evolução das cobranças — últimos 4 meses</div>
    <table class="tbl"><thead><tr><th>Mês</th><th style="text-align:center">Cobranças</th><th style="text-align:center">Pagas</th><th style="text-align:center">Atrasadas</th><th style="text-align:right">Valor Atraso</th><th style="text-align:center">Taxa</th><th style="text-align:center">Status</th></tr></thead><tbody>${inadRows}</tbody></table>
  </div>
  <div class="gap"></div>
  <div style="padding:10px 12px;background:${d.late > 0 ? 'var(--amber-l)' : 'var(--green-l)'};border-radius:8px;border-left:3px solid ${d.late > 0 ? 'var(--amber)' : 'var(--green)'}">
    <div style="font-size:9px;font-weight:700;color:${d.late > 0 ? 'var(--amber)' : 'var(--green)'};margin-bottom:3px">${d.late > 0 ? '📋 Próximos Passos Imediatos' : '✅ Inadimplência Sob Controle'}</div>
    <div style="font-size:8px;color:var(--s700);line-height:1.55">${d.late > 0 ? `Contatar os ${d.late} inadimplentes nos primeiros 3 dias via WhatsApp e ligação. Oferecer renegociação com parcelamento. Meta: recuperar 60%+ dos ${fmtCur(d.lateAmt)} até dia 10. Implementar régua de cobrança preventiva para evitar recorrência.` : 'Parabéns! Nenhuma cobrança em atraso no mês. Continue com a régua de cobrança preventiva para manter esse excelente resultado.'}</div>
  </div>
  <div class="pfoot"><div class="pf-l">SpeakUp — Relatório Executivo · ${d.period.label} · Uso interno</div><div class="pf-r">Pág. 2 / 5</div></div>
</div>

<!-- PÁG 4 — MATRÍCULAS & LEADS -->
<div class="a4">
  <div class="ph"><div class="ph-l"><div class="ph-icon">🎓</div><div class="ph-title">Matrículas & Leads</div></div><div class="ph-period">${d.period.label}</div></div>
  <div class="kg kg4">
    <div class="kc ${d.newThisMonth < 5 ? 'r' : ''}"><div class="k-lbl">Novas Matrículas</div><div class="k-val">${d.newThisMonth}</div><div class="k-sub">Mês atual</div><div class="k-d ${d.newThisMonth >= 10 ? 'up' : 'dn'}">${d.newThisMonth >= 10 ? '✓ Boa captação' : '⚠ Captação baixa'}</div></div>
    <div class="kc g"><div class="k-lbl">Cancelamentos</div><div class="k-val">${d.canceledThisMonth}</div><div class="k-sub">Mês atual</div><div class="k-d ${d.canceledThisMonth === 0 ? 'up' : 'dn'}">${d.canceledThisMonth === 0 ? '✓ Zero cancelamentos' : '⚠ ' + d.canceledThisMonth + ' saída(s)'}</div></div>
    <div class="kc"><div class="k-lbl">Alunos Ativos</div><div class="k-val">${d.activeStudents}</div><div class="k-sub">de ${d.totalStudents} totais</div><div class="k-d nt">→ Retenção: ${fmtP(d.retentionRate)}</div></div>
    <div class="kc ${d.conversionRate >= 20 ? '' : 'a'}"><div class="k-lbl">Conversão de Leads</div><div class="k-val">${fmtP(d.conversionRate)}</div><div class="k-sub">${d.convertedLeads} de ${d.leads} leads do mês</div><div class="k-d ${d.conversionRate >= 20 ? 'up' : 'wn'}">${d.conversionRate >= 20 ? '✓ Boa conversão' : '⚠ Melhorar'}</div></div>
  </div>
  <div class="r2">
    <div class="cc"><div class="cc-t">Distribuição de Leads por Status</div><div class="cc-s">Base acumulada: ${d.totalLeadsAll} leads totais</div><div style="display:flex;justify-content:center"><canvas id="leadsChart" style="width:150px!important;height:150px!important;max-width:150px"></canvas></div></div>
    <div class="cc">
      <div class="cc-t">Matrículas vs. Cancelamentos</div>
      <div class="cc-s">Saldo do mês: ${d.netBalance > 0 ? '+' : ''}${d.netBalance} aluno(s)</div>
      <div style="display:flex;flex-direction:column;gap:8px;padding-top:6px">
        <div style="background:var(--green-l);border-radius:8px;padding:10px 14px"><div style="font-size:8px;color:var(--green);font-weight:700;margin-bottom:2px">📈 NOVAS MATRÍCULAS</div><div style="font-size:32px;font-weight:900;color:var(--green)">${d.newThisMonth}</div></div>
        <div style="background:var(--red-l);border-radius:8px;padding:10px 14px"><div style="font-size:8px;color:var(--red);font-weight:700;margin-bottom:2px">📉 CANCELAMENTOS</div><div style="font-size:32px;font-weight:900;color:var(--red)">${d.canceledThisMonth}</div></div>
        <div style="background:${d.netBalance >= 0 ? 'var(--green-l)' : 'var(--red-l)'};border-radius:8px;padding:10px 14px;border:1.5px solid ${d.netBalance >= 0 ? 'var(--green)' : 'var(--red)'}"><div style="font-size:8px;color:${d.netBalance >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700;margin-bottom:2px">📊 SALDO LÍQUIDO</div><div style="font-size:32px;font-weight:900;color:${d.netBalance >= 0 ? 'var(--green)' : 'var(--red)'}">${d.netBalance > 0 ? '+' : ''}${d.netBalance}</div></div>
      </div>
    </div>
  </div>
  <div class="cc">
    <div class="cc-t">Pipeline de Conversão</div>
    <div class="cc-s">${d.totalLeadsAll} leads acumulados — funil de conversão por status</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      <canvas id="funilChart" style="width:100%!important;height:105px!important"></canvas>
      <div>${leadsProgress}</div>
    </div>
    ${d.forgottenLeads > 0 ? `<div style="margin-top:7px;padding:7px 10px;background:var(--amber-l);border-radius:7px;border-left:3px solid var(--amber);display:flex;align-items:center;gap:8px"><span style="font-size:14px">⚠️</span><div><div style="font-size:8.5px;font-weight:700;color:var(--amber)">${d.forgottenLeads} Leads Esquecidos</div><div style="font-size:7.5px;color:var(--s700)">Sem contato há mais de 30 dias. Reengajar imediatamente para converter sem custo.</div></div></div>` : ''}
  </div>
  <div class="pfoot"><div class="pf-l">SpeakUp — Relatório Executivo · ${d.period.label} · Uso interno</div><div class="pf-r">Pág. 3 / 5</div></div>
</div>

<!-- PÁG 5 — COMPARATIVO -->
<div class="a4">
  <div class="ph"><div class="ph-l"><div class="ph-icon">📊</div><div class="ph-title">Comparativo & Histórico</div></div><div class="ph-period">Últimos 3 Meses</div></div>
  <div class="cc" style="margin-bottom:5px">
    <div class="cc-t">Evolução dos KPIs — Últimos 3 Meses</div>
    <div class="cc-s">Receita, despesas, lucro e cobranças comparadas</div>
    <canvas id="momChart" height="105"></canvas>
  </div>
  <div class="r2" style="margin-bottom:5px">
    <div class="cc">
      <div class="cc-t">Variação MoM${pm ? ' — ' + pm.label + ' → ' + d.period.label : ''}</div>
      <div class="cc-s">Principais indicadores comparados</div>
      ${momRows}
    </div>
    <div>
      <div class="cc" style="margin-bottom:5px"><div class="cc-t">Ticket Médio (R$)</div><div class="cc-s">Tendência histórica</div><canvas id="ticketChart" height="88"></canvas></div>
      <div class="cc"><div class="cc-t">Cobranças: pagas vs atrasadas</div><div class="cc-s">Volume histórico</div><canvas id="cobChart" height="88"></canvas></div>
    </div>
  </div>
  <div class="pn-g">
    <div class="pn-b pos">
      <div class="pn-title pos">✅ Pontos Positivos</div>
      ${posPoints.map(p => `<div class="pn-item"><span style="color:var(--green)">✓</span> ${p.replace('✓ ', '')}</div>`).join('')}
    </div>
    <div class="pn-b neg">
      <div class="pn-title neg">🔴 Pontos de Alerta</div>
      ${negPoints.map(p => `<div class="pn-item"><span style="color:var(--red)">✗</span> ${p.replace('✗ ', '')}</div>`).join('')}
    </div>
  </div>
  <div class="pfoot"><div class="pf-l">SpeakUp — Relatório Executivo · ${d.period.label} · Uso interno</div><div class="pf-r">Pág. 4 / 5</div></div>
</div>

<!-- PÁG 6 — INSIGHTS & PLANO DE AÇÃO -->
<div class="a4">
  <div class="ph"><div class="ph-l"><div class="ph-icon">🚀</div><div class="ph-title">Insights & Plano de Ação — ${nextMLabel}</div></div><div class="ph-period">Análise Executiva</div></div>
  <div class="ig">${insHTML}</div>
  <div class="div"></div>
  <div style="font-size:10px;font-weight:800;margin-bottom:5px;letter-spacing:-.3px">🎯 Plano de Ação — ${nextMLabel}</div>
  <div class="al">${actsHTML}</div>
  <div class="pfoot"><div class="pf-l">SpeakUp — Relatório Executivo · ${d.period.label} · Uso interno e confidencial</div><div class="pf-r">Pág. 5 / 5</div></div>
</div>

<script>
Chart.defaults.font.family="'Montserrat',sans-serif";
Chart.defaults.font.size=9;
const B='#005DE4',G='#10b981',R='#ef4444',A='#f59e0b',S='#94a3b8',B2='#60a5fa';
const leg={labels:{font:{family:"'Montserrat',sans-serif",size:9},boxWidth:9,padding:9}};
const tip={bodyFont:{family:"'Montserrat',sans-serif",size:9},titleFont:{family:"'Montserrat',sans-serif",size:9}};
const xAx={grid:{display:false},ticks:{font:{size:8}}};
const yAx={grid:{color:'#f1f5f9'},ticks:{font:{size:8}}};

new Chart(document.getElementById('receitaChart'),{type:'bar',data:{labels:${hlabels},datasets:[{label:'Receita',data:${hrev},backgroundColor:'rgba(0,93,228,.75)',borderRadius:4},{label:'Despesas',data:${hexp},backgroundColor:'rgba(239,68,68,.7)',borderRadius:4},{label:'Lucro',data:${hpro},backgroundColor:'rgba(16,185,129,.8)',borderRadius:4}]},options:{plugins:{legend:leg,tooltip:tip},scales:{y:{...yAx,beginAtZero:true,ticks:{...yAx.ticks,callback:v=>'R$'+(v/1000).toFixed(1)+'k'}},x:xAx}}});

new Chart(document.getElementById('margemChart'),{type:'line',data:{labels:${hlabels},datasets:[{label:'Margem %',data:${hmar},borderColor:G,backgroundColor:'rgba(16,185,129,.08)',borderWidth:2.5,pointBackgroundColor:G,pointRadius:5,tension:.3,fill:true},{label:'Meta 25%',data:[25,25,25],borderColor:A,borderWidth:1.5,borderDash:[5,4],pointRadius:0}]},options:{plugins:{legend:leg,tooltip:tip},scales:{y:{...yAx,min:0,max:80,ticks:{...yAx.ticks,callback:v=>v+'%'}},x:xAx}}});

new Chart(document.getElementById('composicaoChart'),{type:'doughnut',data:{labels:['Recebido','Pendente','Em Atraso'],datasets:[{data:${compVJ},backgroundColor:[G,A,R],borderWidth:0,hoverOffset:3}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{...leg,position:'bottom'},tooltip:{...tip,callbacks:{label:ctx=>ctx.label+': R$'+ctx.parsed.toLocaleString('pt-BR',{minimumFractionDigits:0})}}}}});

new Chart(document.getElementById('inadChart'),{type:'line',data:{labels:${inadLabels},datasets:[{label:'Taxa (%)',data:${inadPct},borderColor:R,backgroundColor:'rgba(239,68,68,.07)',borderWidth:2.5,pointBackgroundColor:R,pointRadius:5,tension:.3,fill:true,yAxisID:'y'},{label:'Valor (R$)',data:${inadVal},borderColor:A,borderWidth:1.8,borderDash:[4,3],pointRadius:4,pointBackgroundColor:A,tension:.3,yAxisID:'y1'},{label:'Meta 5%',data:[5,5,5,5],borderColor:'rgba(148,163,184,.6)',borderWidth:1.5,borderDash:[6,4],pointRadius:0,yAxisID:'y'}]},options:{plugins:{legend:leg,tooltip:tip},scales:{y:{min:0,...yAx,ticks:{...yAx.ticks,callback:v=>v+'%'}},y1:{position:'right',min:0,grid:{display:false},ticks:{font:{size:8},callback:v=>'R$'+v}},x:xAx}}});

new Chart(document.getElementById('leadsChart'),{type:'doughnut',data:{labels:${leadKJ},datasets:[{data:${leadVJ},backgroundColor:[G,B,A,R,S,'#8b5cf6'],borderWidth:0,hoverOffset:3}]},options:{maintainAspectRatio:false,cutout:'52%',plugins:{legend:{...leg,position:'bottom'},tooltip:tip}}});

new Chart(document.getElementById('funilChart'),{type:'bar',data:{labels:${leadKJ},datasets:[{data:${leadVJ},backgroundColor:[G,B,A,R,S,'#8b5cf6'],borderRadius:5}]},options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:tip},scales:{x:{...yAx,beginAtZero:true},y:{grid:{display:false},ticks:{font:{size:8}}}}}});

new Chart(document.getElementById('momChart'),{type:'bar',data:{labels:['Receita(R$k)','Despesas(R$k)','Lucro(R$k)','Pagamentos'],datasets:[${momDS}]},options:{plugins:{legend:leg,tooltip:tip},scales:{y:{...yAx,beginAtZero:true},x:xAx}}});

new Chart(document.getElementById('ticketChart'),{type:'line',data:{labels:${hlabels},datasets:[{label:'Ticket Médio',data:${htick},borderColor:A,backgroundColor:'rgba(245,158,11,.08)',borderWidth:2.5,pointBackgroundColor:A,pointRadius:5,tension:.3,fill:true}]},options:{plugins:{legend:{display:false},tooltip:tip},scales:{y:{...yAx,ticks:{...yAx.ticks,callback:v=>'R$'+v.toLocaleString()}},x:xAx}}});

new Chart(document.getElementById('cobChart'),{type:'bar',data:{labels:${hlabels},datasets:[{label:'Pagas',data:${hpaid},backgroundColor:'rgba(16,185,129,.75)',borderRadius:4},{label:'Atrasadas',data:${hlate},backgroundColor:'rgba(239,68,68,.8)',borderRadius:4}]},options:{plugins:{legend:leg,tooltip:tip},scales:{y:{...yAx,beginAtZero:true,ticks:{...yAx.ticks,stepSize:10}},x:xAx}}});

${expCats.length > 0 ? `new Chart(document.getElementById('expCatChart'),{type:'doughnut',data:{labels:${expCJ},datasets:[{data:${expVjson},backgroundColor:['#005DE4','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'],borderWidth:0,hoverOffset:3}]},options:{maintainAspectRatio:false,cutout:'55%',plugins:{legend:{...leg,position:'bottom'},tooltip:tip}}});` : ''}
<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 900);
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Month/Year selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 8px" }}>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{ background: "transparent", border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none", appearance: "none", paddingRight: 2 }}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i} style={{ background: "#0041a8", color: "white" }}>{m}</option>
                ))}
              </select>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>/</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{ background: "transparent", border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none", appearance: "none" }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y} style={{ background: "#0041a8", color: "white" }}>{y}</option>
                ))}
              </select>
            </div>
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
