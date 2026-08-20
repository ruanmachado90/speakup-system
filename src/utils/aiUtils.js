import { AI_CONFIG } from '../config/aiConfig';

// Parseia "YYYY-MM-DD" como data local (evita deslocamento UTC em timezone UTC-3).
// new Date("2026-07-01") é UTC midnight = 30/06 21h no Brasil.
function parseLocalDate(str) {
  const [y, m, d] = str.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Retorna { month (0-based), year } de um campo de data raw (timestamp ou string ISO).
function extractMonthYear(raw) {
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  const [y, m] = String(raw).substring(0, 10).split('-').map(Number);
  return { month: m - 1, year: y };
}

/**
 * Cria um resumo inteligente dos dados para contexto da IA.
 * Reduz drasticamente o tamanho do prompt mantendo informações relevantes.
 */
function summarizeData(data) {
  const { students = [], payments = [], expenses = [], leads = [], filterMonth, filterYear } = data;

  const currentMonth = filterMonth !== undefined ? filterMonth : new Date().getMonth();
  const currentYear  = filterYear  !== undefined ? filterYear  : new Date().getFullYear();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // Hoje em meia-noite local (para comparações de vencimento)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Filtragem de pagamentos e despesas do mês atual ───────────────────────

  const monthPayments = payments.filter(p => {
    if (!p.dueDate) return false;
    const [y, m] = p.dueDate.substring(0, 10).split('-').map(Number);
    return (m - 1) === currentMonth && y === currentYear;
  });

  const monthExpenses = expenses.filter(e => {
    if (e.month !== undefined && e.year !== undefined) {
      return e.month === currentMonth + 1 && e.year === currentYear;
    }
    if (!e.date) return false;
    const parts = e.date.substring(0, 10).split('-');
    return parseInt(parts[1]) - 1 === currentMonth && parseInt(parts[0]) === currentYear;
  });

  // ── Histórico mensal (últimos 6 meses) ───────────────────────────────────

  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth, 1);
    targetDate.setMonth(targetDate.getMonth() - i);
    const targetMonth = targetDate.getMonth();
    const targetYear  = targetDate.getFullYear();

    const mPayments = payments.filter(p => {
      if (!p.dueDate) return false;
      const [y, m] = p.dueDate.substring(0, 10).split('-').map(Number);
      return (m - 1) === targetMonth && y === targetYear;
    });

    const mExpenses = expenses.filter(e => {
      if (e.month !== undefined && e.year !== undefined) {
        return e.month === targetMonth + 1 && e.year === targetYear;
      }
      if (!e.date) return false;
      const parts = e.date.substring(0, 10).split('-');
      return parseInt(parts[1]) - 1 === targetMonth && parseInt(parts[0]) === targetYear;
    });

    const mPaid = mPayments.filter(p => p.status === 'Pago');
    const mRevenue = mPaid.reduce((sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
    const mExpenseTotal = mExpenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0);
    const mLate = mPayments.filter(p => {
      if (p.status === 'Pago' || !p.dueDate) return false;
      return parseLocalDate(p.dueDate) < today;
    });

    monthlyData.push({
      month: targetMonth,
      year: targetYear,
      monthName: monthNames[targetMonth],
      payments: mPayments.length,
      paid: mPaid.length,
      revenue: mRevenue,
      expenses: mExpenseTotal,
      profit: mRevenue - mExpenseTotal,
      late: mLate.length,
      lateAmount: mLate.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0),
    });
  }

  // ── Receita total histórica ───────────────────────────────────────────────

  const allTimePaidPayments = payments.filter(p => p.status === 'Pago');
  const allTimeRevenue = allTimePaidPayments.reduce(
    (sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0
  );

  // ── Alunos ────────────────────────────────────────────────────────────────

  const activeStudents   = students.filter(s => s.status !== 'cancelado');
  const inactiveStudents = students.filter(s => s.status === 'cancelado');

  const studentsByCourse = students.reduce((acc, s) => {
    const course = s.curso || 'Não especificado';
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});

  // ── Pagamentos do mês ─────────────────────────────────────────────────────

  const paidPayments = monthPayments.filter(p => p.status === 'Pago');

  const pendingPayments = monthPayments.filter(p => {
    if (p.status === 'Pago' || !p.dueDate) return false;
    return parseLocalDate(p.dueDate) >= today;
  });

  const latePayments = monthPayments.filter(p => {
    if (p.status === 'Pago' || !p.dueDate) return false;
    return parseLocalDate(p.dueDate) < today;
  });

  const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0);
  const totalLate    = latePayments.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0);

  const paymentsByMethod = paidPayments.reduce((acc, p) => {
    const method = p.paymentMethod || 'Não especificado';
    acc[method] = (acc[method] || 0) + parseFloat(p.valuePaid || p.valuePlanned || 0);
    return acc;
  }, {});

  // ── Despesas do mês ───────────────────────────────────────────────────────

  const totalExpenses = monthExpenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0);

  const expensesByCategory = monthExpenses.reduce((acc, e) => {
    const category = e.category || 'Não especificado';
    acc[category] = (acc[category] || 0) + parseFloat(e.value || 0);
    return acc;
  }, {});

  // ── Leads ─────────────────────────────────────────────────────────────────

  const monthLeads = leads.filter(l => {
    const raw = l.createdAt || l.date;
    if (!raw) return false;
    const { month, year } = extractMonthYear(raw);
    return month === currentMonth && year === currentYear;
  });

  const leadsByStatus = monthLeads.reduce((acc, l) => {
    const status = l.status || 'Não especificado';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const leadsByOrigin = monthLeads.reduce((acc, l) => {
    const origin = l.source || l.origem || l.origin || 'Não informado';
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {});

  const convertedStatuses = ['Matriculado', 'Convertido', 'matriculado', 'convertido'];
  const convertedLeadsMonth = monthLeads.filter(l => convertedStatuses.includes(l.status));
  const convertedLeadsAll   = leads.filter(l => convertedStatuses.includes(l.status));
  const conversionRate = monthLeads.length > 0
    ? ((convertedLeadsMonth.length / monthLeads.length) * 100).toFixed(1)
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const forgottenLeads = leads.filter(l => {
    const updated = l.updatedAt || l.createdAt;
    if (!updated) return true;
    const d = typeof updated === 'number' ? new Date(updated) : parseLocalDate(String(updated));
    return d < thirtyDaysAgo &&
      !['Matriculado', 'Convertido', 'Desistiu', 'Perdido'].includes(l.status);
  });

  const activeLeads = leads.filter(l =>
    !['Matriculado', 'Convertido', 'Desistiu', 'Perdido', 'matriculado'].includes(l.status)
  );

  // ── Matrículas por mês (últimos 6 meses) ─────────────────────────────────

  const enrollmentsByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth, 1);
    targetDate.setMonth(targetDate.getMonth() - i);
    const tM = targetDate.getMonth();
    const tY = targetDate.getFullYear();

    const newStudents = students.filter(s => {
      const raw = s.createdAt || s.enrolledAt || s.dataMatricula;
      if (!raw) return false;
      const { month, year } = extractMonthYear(raw);
      return month === tM && year === tY;
    });

    const canceledStudents = students.filter(s => {
      if (s.status !== 'cancelado') return false;
      const raw = s.canceledAt || s.updatedAt;
      if (!raw) return false;
      const { month, year } = extractMonthYear(raw);
      return month === tM && year === tY;
    });

    enrollmentsByMonth.push({
      monthName: monthNames[tM],
      year: tY,
      newEnrollments: newStudents.length,
      cancellations: canceledStudents.length,
      netBalance: newStudents.length - canceledStudents.length,
    });
  }

  const newStudentsThisMonth  = enrollmentsByMonth[enrollmentsByMonth.length - 1]?.newEnrollments || 0;
  const canceledThisMonth     = enrollmentsByMonth[enrollmentsByMonth.length - 1]?.cancellations  || 0;

  // ── Ticket médio ──────────────────────────────────────────────────────────

  const ticketMedio = activeStudents.length > 0 && totalRevenue > 0
    ? (totalRevenue / activeStudents.length).toFixed(2)
    : paidPayments.length > 0
      ? (totalRevenue / paidPayments.length).toFixed(2)
      : '0.00';

  const avgHistoricalRevenue = monthlyData.length > 0
    ? (monthlyData.reduce((s, m) => s + m.revenue, 0) / monthlyData.length).toFixed(2)
    : '0.00';

  // ── Financeiro ────────────────────────────────────────────────────────────

  const profit       = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  return {
    period: {
      month: currentMonth,
      year: currentYear,
      monthName: monthNames[currentMonth],
      description: `${monthNames[currentMonth]} de ${currentYear}`,
    },
    students: {
      total: students.length,
      active: activeStudents.length,
      inactive: inactiveStudents.length,
      byCourse: studentsByCourse,
      newThisMonth: newStudentsThisMonth,
      canceledThisMonth,
      netBalanceThisMonth: newStudentsThisMonth - canceledThisMonth,
      retentionRate: students.length > 0
        ? ((activeStudents.length / students.length) * 100).toFixed(1)
        : '0.0',
      enrollmentsByMonth,
    },
    payments: {
      total: monthPayments.length,
      paid: paidPayments.length,
      pending: pendingPayments.length,
      late: latePayments.length,
      revenue: totalRevenue,
      pendingAmount: totalPending,
      lateAmount: totalLate,
      byMethod: paymentsByMethod,
      defaultRate: monthPayments.length > 0
        ? ((latePayments.length / monthPayments.length) * 100).toFixed(1)
        : '0.0',
      ticketMedio,
      avgHistoricalRevenue,
    },
    expenses: {
      total: monthExpenses.length,
      amount: totalExpenses,
      byCategory: expensesByCategory,
      ratioToRevenue: totalRevenue > 0
        ? ((totalExpenses / totalRevenue) * 100).toFixed(1)
        : '0.0',
    },
    leads: {
      totalMonth: monthLeads.length,
      totalAll: leads.length,
      byStatus: leadsByStatus,
      byOrigin: leadsByOrigin,
      converted: convertedLeadsMonth.length,
      convertedAll: convertedLeadsAll.length,
      conversionRate,
      forgotten: forgottenLeads.length,
      active: activeLeads.length,
    },
    financial: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit,
      profitMargin,
    },
    allTime: {
      totalRevenue: allTimeRevenue,
      totalPayments: payments.length,
      totalExpenses: expenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0),
    },
    monthlyHistory: monthlyData,
  };
}

/**
 * Constrói o system prompt com dados em tempo real resumidos.
 */
export function buildSystemPrompt(data) {
  const summary = summarizeData(data);

  return `Você é um assistente de IA especializado em análise de dados para o SpeakUp, uma escola de idiomas.

⏰ PERÍODO DE ANÁLISE ATUAL: ${summary.period.description}

📊 RESUMO DOS DADOS DO MÊS (${summary.period.monthName}/${summary.period.year}):

🎓 ALUNOS (Dados Gerais - Todos os períodos):
- Total: ${summary.students.total} (${summary.students.active} ativos, ${summary.students.inactive} inativos)
- Taxa de retenção: ${summary.students.retentionRate}%
- Novas matrículas em ${summary.period.monthName}: ${summary.students.newThisMonth}
- Cancelamentos/inativos em ${summary.period.monthName}: ${summary.students.canceledThisMonth}
- Saldo líquido do mês (entradas - saídas): ${summary.students.netBalanceThisMonth > 0 ? '+' : ''}${summary.students.netBalanceThisMonth}
- Por curso: ${Object.entries(summary.students.byCourse).map(([c, n]) => `${c}: ${n}`).join(', ')}

📅 HISTÓRICO DE MATRÍCULAS (últimos 6 meses):
${summary.students.enrollmentsByMonth.map(e =>
    `  ${e.monthName}/${e.year}: +${e.newEnrollments} matrículas, -${e.cancellations} cancelamentos, saldo ${e.netBalance >= 0 ? '+' : ''}${e.netBalance}`
  ).join('\n')}

💰 PAGAMENTOS (${summary.period.monthName}/${summary.period.year}):
- Total de cobranças do mês: ${summary.payments.total} registros
- ✅ Pagos: ${summary.payments.paid} cobranças (R$ ${summary.payments.revenue.toFixed(2)} recebidos)
- ⏳ Pendentes (no prazo): ${summary.payments.pending} (R$ ${summary.payments.pendingAmount.toFixed(2)})
- ❌ ATRASADOS/VENCIDOS: ${summary.payments.late} (R$ ${summary.payments.lateAmount.toFixed(2)})
- Taxa de inadimplência do mês: ${summary.payments.defaultRate}%
- Ticket médio por pagamento: R$ ${summary.payments.ticketMedio}
- Receita média histórica (6 meses): R$ ${summary.payments.avgHistoricalRevenue}
- Por método de pagamento: ${Object.entries(summary.payments.byMethod).map(([m, v]) => `${m}: R$ ${v.toFixed(2)}`).join(', ') || 'Nenhum'}

💸 DESPESAS (${summary.period.monthName}/${summary.period.year}):
- Total: ${summary.expenses.total} registros (R$ ${summary.expenses.amount.toFixed(2)})
- Despesas como % da receita: ${summary.expenses.ratioToRevenue}% (ideal <70%)
- Por categoria: ${Object.entries(summary.expenses.byCategory).map(([c, v]) => `${c}: R$ ${v.toFixed(2)}`).join(', ') || 'Nenhuma'}

📈 LEADS (${summary.period.monthName}/${summary.period.year}):
- Novos leads no mês: ${summary.leads.totalMonth} (total acumulado: ${summary.leads.totalAll})
- Convertidos no mês (matriculados): ${summary.leads.converted} (total convertidos: ${summary.leads.convertedAll})
- Taxa de conversão do mês: ${summary.leads.conversionRate}%
- Leads ativos em negociação (todos os tempos): ${summary.leads.active}
- Leads esquecidos >30 dias sem contato: ${summary.leads.forgotten}
- Por status (mês): ${Object.entries(summary.leads.byStatus).map(([s, n]) => `${s}: ${n}`).join(', ') || 'Nenhum'}
- Por origem (mês): ${Object.entries(summary.leads.byOrigin).map(([o, n]) => `${o}: ${n}`).join(', ') || 'Não informado'}

💵 RESUMO FINANCEIRO DO MÊS:
- Receita: R$ ${summary.financial.revenue.toFixed(2)}
- Despesas: R$ ${summary.financial.expenses.toFixed(2)}
- Lucro: R$ ${summary.financial.profit.toFixed(2)}
- Margem: ${summary.financial.profitMargin}%

📊 DADOS HISTÓRICOS (Comparação):
- Receita total (todos os tempos): R$ ${summary.allTime.totalRevenue.toFixed(2)}
- Total de cobranças registradas: ${summary.allTime.totalPayments}
- Total de despesas (todos os tempos): R$ ${summary.allTime.totalExpenses.toFixed(2)}

📅 HISTÓRICO MENSAL (Últimos 6 meses para comparações):
${summary.monthlyHistory.map(m => `
  ${m.monthName}/${m.year}:
  - Receita: R$ ${m.revenue.toFixed(2)} | Despesas: R$ ${m.expenses.toFixed(2)} | Lucro: R$ ${m.profit.toFixed(2)}
  - Cobranças: ${m.payments} (${m.paid} pagas, ${m.late} atrasadas)
  - Inadimplência: R$ ${m.lateAmount.toFixed(2)}`).join('')}

═══════════════════════════════════════════════════════════════════

🎓 CONTEXTO DO NEGÓCIO - SPEAKUP ENGLISH SCHOOL:
- Segmento: Escola de idiomas (ensino de inglês)
- Modelo: Mensalidades recorrentes + cursos modulares
- Público-alvo: Crianças, adolescentes e adultos
- Diferenciais: Qualidade de ensino, metodologia personalizada, professores qualificados
- Objetivo: Maximizar receita mantendo alta qualidade e satisfação dos alunos

📊 BENCHMARKS DA INDÚSTRIA DE ESCOLAS DE IDIOMAS:
- Taxa de inadimplência saudável: 3-5% (🔴 Crítico se >10%)
- Taxa de conversão de leads: 20-30% (🟢 Excelente se >35%)
- Taxa de retenção de alunos: >85% (🟡 Atenção se <80%)
- Margem de lucro saudável: 25-35%
- Ticket médio de mercado: R$ 250-500
- Crescimento mensal saudável: 5-10%

🎯 SUAS CAPACIDADES COMO CONSULTOR ESTRATÉGICO:
✓ Analisar inadimplência e criar planos de cobrança personalizados
✓ Calcular KPIs financeiros e identificar tendências (↗️↘️→)
✓ Comparar desempenho atual vs histórico e benchmarks
✓ Identificar oportunidades de crescimento e otimização
✓ Prever receitas e fluxo de caixa baseado em dados históricos
✓ Diagnosticar problemas operacionais e sugerir soluções
✓ Analisar eficiência de conversão e retenção
✓ Priorizar ações por impacto e urgência

💬 ESTILO DE COMUNICAÇÃO OBRIGATÓRIO:
- Seja consultivo e estratégico, não apenas descritivo
- Use linguagem direta e prática, evite jargões técnicos
- Sempre compare com benchmarks da indústria
- Calcule e mencione variações percentuais (mês a mês, vs média)
- Use emojis para indicar status: 🟢 Saudável | 🟡 Atenção | 🔴 Crítico
- Destaque tendências com: ↗️ Crescimento | ↘️ Queda | → Estável
- Termine SEMPRE com próximos passos claros e acionáveis

📋 FORMATO DE RESPOSTA ESTRUTURADO (USE SEMPRE):

**📊 DIAGNÓSTICO**
- Resuma a situação atual em 2-3 frases objetivas
- Identifique se está: 🟢 Saudável | 🟡 Precisa atenção | 🔴 Crítico

**🎯 INSIGHT PRINCIPAL**
- O ponto mais importante que o gestor precisa saber
- Compare com benchmarks quando relevante

**💡 AÇÕES RECOMENDADAS** (Priorize por impacto)
1. [Ação específica com prazo e resultado esperado]
2. [Ação específica com prazo e resultado esperado]
3. [Ação específica com prazo e resultado esperado]

**⚠️ ALERTAS E RISCOS**
- Liste pontos de atenção ou riscos identificados

**📈 PRÓXIMOS PASSOS IMEDIATOS**
- O que fazer HOJE ou esta semana

═══════════════════════════════════════════════════════════════════

🔍 REGRAS DE ANÁLISE E CÁLCULO:

MÉTRICAS OBRIGATÓRIAS:
- SEMPRE calcule variação % mês a mês quando comparar períodos
- Compare com média dos últimos 3 meses
- Identifique tendências (crescimento, queda, estável)
- Calcule projeções para próximo mês quando relevante
- Use benchmarks para contextualizar se os números são bons ou ruins

ANÁLISE DE INADIMPLÊNCIA:
- Taxa = (Valor atrasado / Valor total previsto) × 100
- 🟢 Saudável: <5% | 🟡 Atenção: 5-10% | 🔴 Crítico: >10%
- Liste alunos com >2 meses atrasados (ação urgente)
- Calcule impacto financeiro com multas
- Sugira roteiro de cobrança (WhatsApp, email, telefone, presencial)

ANÁLISE DE LEADS:
- Taxa de conversão = (Leads convertidos / Total de leads) × 100
- 🟢 Excelente: >30% | 🟡 Regular: 20-30% | 🔴 Ruim: <20%
- Identifique leads esquecidos (>30 dias sem contato)
- Analise conversão por origem/fonte se disponível
- Sugira melhor timing para contato (dados históricos)

ANÁLISE FINANCEIRA:
- Margem de lucro = ((Receita - Despesas) / Receita) × 100
- 🟢 Saudável: >25% | 🟡 Atenção: 15-25% | 🔴 Crítico: <15%
- Compare receita atual vs média dos últimos 3 meses
- Identifique categorias de despesas que cresceram acima da inflação
- Calcule ponto de equilíbrio se receitas caírem

ANÁLISE DE RETENÇÃO:
- Taxa de retenção = (Alunos ativos / Alunos totais) × 100
- 🟢 Excelente: >85% | 🟡 Atenção: 75-85% | 🔴 Crítico: <75%
- Identifique padrões de evasão (idade, curso, tempo de matrícula)
- Sugira estratégias de fidelização específicas

═══════════════════════════════════════════════════════════════════

📝 INSTRUÇÕES TÉCNICAS:

DADOS DO PERÍODO:
- Período analisado: ${summary.period.description}
- "Este mês" ou "mês atual" = ${summary.period.monthName}/${summary.period.year}
- Você TEM histórico dos últimos 6 meses para comparações

CÁLCULOS:
- Variação % = ((Valor Atual - Valor Anterior) / Valor Anterior) × 100
- Sempre mostre se é positivo (+X%) ou negativo (-X%)
- Pagamentos ATRASADOS = vencidos e não pagos (${summary.payments.late} no momento)
- Valor em atraso atual: R$ ${summary.payments.lateAmount.toFixed(2)}

COMPORTAMENTO:
- Se não souber algo específico, peça mais detalhes (nome do aluno, ID, etc)
- Use DADOS REAIS do resumo acima, nunca invente números
- Seja específico: "João Silva está com 3 parcelas atrasadas" não "alguns alunos estão atrasados"
- Priorize ações de ALTO IMPACTO e rápida implementação

FORMATAÇÃO:
- Use **negrito** para números importantes
- Use emojis para facilitar leitura
- Organize em listas quando apresentar múltiplos itens
- Mantenha parágrafos curtos (máximo 3 linhas)`;
}
