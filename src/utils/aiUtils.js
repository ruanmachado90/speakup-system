import { AI_CONFIG } from '../config/aiConfig';
import { montarRelatorioMensal } from './reportKPIs';

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
  const { students = [], expenses = [], leads = [], saldosBancarios = [], filterMonth, filterYear } = data;
  // Parcelas canceladas não são cobrança — fora de qualquer cálculo financeiro.
  const payments = (data.payments || []).filter(p => p.status !== 'cancelada');

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

  // ── KPIs corretos vindos do motor puro (reportKPIs) ──────────────────────
  // Substituem os cálculos legados com bug conhecido:
  //  - inadimplência por CONTAGEM de parcelas → agora saldo devedor em R$ (% da receita prevista)
  //  - retenção = ativos/total → agora coorte de entrada (safra)
  //  - ticket médio por pagamento → agora receita total ÷ alunos ativos
  const R = montarRelatorioMensal({
    students, payments, expenses, leads, saldosBancarios,
    mes: currentMonth, ano: currentYear,
  });
  const coorte = R.coorte || [];
  const coorteEntraram = coorte.reduce((s, c) => s + (c.entraram || 0), 0);
  const coorteAtivos = coorte.reduce((s, c) => s + (c.ativos || 0), 0);
  const retentionRateCoorte = coorteEntraram > 0
    ? ((coorteAtivos / coorteEntraram) * 100).toFixed(1)
    : null;
  const defaultRateRS = R.atual.inadimplenciaMes.disponivel
    ? R.atual.inadimplenciaMes.pct.toFixed(1)
    : '0.0';
  const ticketMedioAluno = R.atual.ticketMedio.disponivel
    ? R.atual.ticketMedio.valor.toFixed(2)
    : ticketMedio;

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
      // Retenção por coorte de entrada (safras dos últimos 6 meses): dos alunos
      // que entraram, quantos seguem ativos. `null` quando não há safra no período.
      retentionRate: retentionRateCoorte ?? 'sem safra recente',
      retentionBasis: 'coorte de entrada (últimos 6 meses)',
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
      // Inadimplência SEMPRE em R$: saldo devedor vencido ÷ receita prevista do mês.
      // (antes era contagem de parcelas atrasadas — número inflado e sem relação com caixa)
      defaultRate: defaultRateRS,
      defaultBasis: 'saldo devedor vencido ÷ receita prevista do mês (R$)',
      ticketMedio: ticketMedioAluno,
      ticketBasis: 'receita total do mês ÷ alunos ativos',
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
      // Lucro operacional exclui retirada de sócio e investimento (não são custo
      // do negócio) — é diferente de `profit`, que soma TODAS as despesas.
      operatingProfit: R.atual.lucroOperacional,
      operatingMargin: R.atual.margemOperacional.disponivel ? R.atual.margemOperacional.valor.toFixed(1) : null,
      ownerWithdrawal: R.atual.retiradaSocio,
      // Saldo em caixa é dado MANUAL (sem integração bancária) — null se não registrado.
      // É a verdade objetiva: lucro contábil e variação de caixa podem divergir.
      cashBalance: R.atual.saldoCaixa.disponivel ? {
        opening: R.atual.saldoCaixa.saldoInicial,
        closing: R.atual.saldoCaixa.saldoFinal,
        change: R.atual.saldoCaixa.variacao,
      } : null,
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

  return `Você se chama Lexi, consultora de gestão com IA da SpeakUp, uma escola de idiomas. Você é parceira do gestor, não uma calculadora: já olhou os números antes de ele perguntar e fala com ele como colega de confiança — direta, próxima, nunca genérica ou robótica.

⏰ PERÍODO DE ANÁLISE ATUAL: ${summary.period.description}

📊 RESUMO DOS DADOS DO MÊS (${summary.period.monthName}/${summary.period.year}):

🎓 ALUNOS (Dados Gerais - Todos os períodos):
- Total: ${summary.students.total} (${summary.students.active} ativos, ${summary.students.inactive} inativos)
- Taxa de retenção (${summary.students.retentionBasis}): ${summary.students.retentionRate}${typeof summary.students.retentionRate === 'string' ? '' : '%'}
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
- Taxa de inadimplência do mês (${summary.payments.defaultBasis}): ${summary.payments.defaultRate}%
- Ticket médio (${summary.payments.ticketBasis}): R$ ${summary.payments.ticketMedio}
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
- Despesas (todas): R$ ${summary.financial.expenses.toFixed(2)}
- Resultado (receita − todas as despesas): R$ ${summary.financial.profit.toFixed(2)} · margem ${summary.financial.profitMargin}%
- Lucro OPERACIONAL (exclui retirada de sócio e investimento — é o número certo pra "a empresa está dando lucro?"): R$ ${summary.financial.operatingProfit.toFixed(2)}${summary.financial.operatingMargin != null ? ` · margem ${summary.financial.operatingMargin}%` : ''}
- Retirada de sócio no mês (NÃO é custo do negócio, mostrada à parte): R$ ${summary.financial.ownerWithdrawal.toFixed(2)}
- Saldo em caixa (dado manual, verdade objetiva — lucro contábil e caixa podem divergir): ${summary.financial.cashBalance ? `R$ ${summary.financial.cashBalance.opening.toFixed(2)} -> R$ ${summary.financial.cashBalance.closing.toFixed(2)} (${summary.financial.cashBalance.change >= 0 ? '+' : ''}R$ ${summary.financial.cashBalance.change.toFixed(2)})` : 'não registrado neste mês — avise o usuário pra cadastrar no Financeiro'}

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

💬 TOM DE VOZ E REGRAS DE COMUNICAÇÃO:
- Consultiva e direta, não descritiva: diga o que fazer, não só o que aconteceu.
- Linguagem prática, sem jargão técnico nem enrolação. Frases curtas.
- Nunca prometa resultado garantido ("isso vai resolver 100%") — fale em tendência e ação prática ("costuma reduzir", "tende a melhorar").
- Se faltar dado para responder com precisão, diga isso claramente e peça o que falta. NUNCA invente números.
- Compare com benchmarks da indústria quando relevante e calcule variações percentuais (mês a mês, vs média).
- Use emojis com moderação para indicar status: 🟢 Saudável | 🟡 Atenção | 🔴 Crítico, e tendência: ↗️ Crescimento | ↘️ Queda | → Estável.

📋 QUANDO USAR O FORMATO ESTRUTURADO COMPLETO:
Use o template abaixo (Diagnóstico → Insight → Ações → Alertas → Próximos passos) SOMENTE quando o pedido for uma análise de verdade — financeiro, inadimplência, leads, retenção, relatório completo, previsão, comparação de períodos.

Para qualquer outra coisa — cumprimento, agradecimento, pergunta pontual de esclarecimento, follow-up curto sobre algo que você já respondeu — responda em 1 a 4 frases, tom natural de conversa, SEM o template abaixo. Mesmo em uma análise, se o gestor faz uma pergunta objetiva logo depois ("e o João, já pagou?"), responda direto ao ponto, sem repetir a estrutura inteira.

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

🔮 SUGESTÕES DE CONTINUAÇÃO (apenas em respostas de ANÁLISE, nunca em conversas curtas):
Termine a resposta com uma linha própria contendo exatamente o marcador \`###SUGESTOES###\`, seguida de até 3 perguntas de acompanhamento curtas que o gestor provavelmente queira fazer em seguida, uma por linha, cada uma começando com "- ". Essas linhas são extraídas pelo sistema e viram botões de atalho — não fazem parte do texto lido pelo gestor, então não as mencione nem as introduza.
Exemplo de final de resposta:
###SUGESTOES###
- Quais alunos estão há mais de 60 dias em atraso?
- Como ficou a inadimplência comparada ao trimestre passado?
- Qual o impacto se eu perdoar as multas de quem pagar essa semana?

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
- Taxa de retenção = coorte de entrada: dos alunos que se matricularam num mês, quantos seguem ativos hoje (NÃO use ativos/total, que ignora a rotatividade)
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

/**
 * Extrai o bloco "###SUGESTOES###" (perguntas de acompanhamento) do fim de
 * uma resposta da IA, retornando o texto limpo (sem o bloco) e a lista de
 * sugestões já parseada. Se o marcador não existir, retorna o texto original
 * intacto e uma lista vazia — comportamento seguro para conversas curtas.
 */
export function extractSuggestions(rawText) {
  if (!rawText) return { text: '', suggestions: [] };

  const marker = rawText.indexOf('###SUGESTOES###');
  if (marker === -1) return { text: rawText.trim(), suggestions: [] };

  const cleanText = rawText.slice(0, marker).trim();
  const suggestionsBlock = rawText.slice(marker + '###SUGESTOES###'.length);

  const suggestions = suggestionsBlock
    .split('\n')
    .map(line => line.replace(/^[\s>*-]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  return { text: cleanText, suggestions };
}

/**
 * Calcula alertas proativos determinísticos (sem chamar a IA) a partir dos
 * dados atuais do sistema — usado para mostrar um resumo instantâneo na aba
 * IA Gerencial antes mesmo do gestor perguntar algo.
 */
export function getQuickAlerts(data) {
  const s = summarizeData(data);
  const alerts = [];

  if (s.financial.cashBalance && s.financial.cashBalance.change < 0 && s.financial.operatingProfit > 0) {
    alerts.push({
      level: 'critical',
      text: `Lucro operacional de R$ ${s.financial.operatingProfit.toFixed(2)}, mas o caixa caiu R$ ${Math.abs(s.financial.cashBalance.change).toFixed(2)} no mês`,
      prompt: 'Investigue a diferença entre o lucro operacional e a queda de caixa do mês. Considere: retirada de sócio, investimentos, parcelas previstas que não entraram, despesas não lançadas no sistema. Explique em termos simples por que "ter lucro" e "a conta cair" não são contraditórios, e o que fazer a respeito.',
    });
  } else if (!s.financial.cashBalance) {
    alerts.push({
      level: 'warning',
      text: 'Saldo em caixa do mês não registrado',
      prompt: 'Explique por que registrar o saldo bancário inicial e final do mês no Financeiro é importante — sem isso não dá pra saber se a empresa está sobrevivendo de verdade, só o lucro contábil.',
    });
  }

  if (Number(s.payments.defaultRate) > 5) {
    alerts.push({
      level: Number(s.payments.defaultRate) > 10 ? 'critical' : 'warning',
      text: `Inadimplência em ${s.payments.defaultRate}% (meta: <5%)`,
      prompt: 'Analise a inadimplência atual seguindo o formato estruturado. Calcule: 1) Taxa de inadimplência vs benchmark, 2) Compare com meses anteriores (tendência), 3) Liste alunos críticos (>2 meses atrasados), 4) Impacto financeiro total com multas, 5) Crie plano de ação priorizado por urgência com roteiro de cobrança específico para cada caso.',
    });
  }
  if (s.leads.forgotten > 5) {
    alerts.push({
      level: 'warning',
      text: `${s.leads.forgotten} leads esquecidos há +30 dias`,
      prompt: 'Analise a eficiência de conversão de leads. Calcule: 1) Taxa de conversão vs benchmark (20-30%), 2) Tempo médio para converter, 3) Identifique leads esquecidos (>30 dias sem ação), 4) Valor potencial sendo perdido, 5) Compare conversão atual vs meses anteriores, 6) Sugira melhorias no processo comercial com ações específicas e mensuráveis.',
    });
  }
  if (Number(s.financial.profitMargin) < 15 && s.financial.revenue > 0) {
    alerts.push({
      level: Number(s.financial.profitMargin) < 0 ? 'critical' : 'warning',
      text: `Margem de lucro em ${s.financial.profitMargin}% (meta: >25%)`,
      prompt: 'Faça diagnóstico financeiro completo do mês atual. Inclua: 1) Receita vs despesas vs margem de lucro (compare com benchmark 25-35%), 2) Variação % vs mês anterior e vs média 3 meses, 3) Tendência de crescimento (↗️↘️→), 4) Principais categorias de despesa e oportunidades de economia, 5) Projeção para próximo mês, 6) Ações prioritárias para melhorar saúde financeira.',
    });
  }
  if (s.students.netBalanceThisMonth < 0) {
    alerts.push({
      level: 'warning',
      text: `Saldo de matrículas negativo (${s.students.netBalanceThisMonth}) neste mês`,
      prompt: 'Analise a retenção de alunos com detalhes. Calcule: 1) Taxa de retenção vs benchmark (>85%), 2) Tendência dos últimos 6 meses, 3) Identifique perfil de alunos que estão saindo (curso, idade, tempo), 4) Calcule impacto financeiro da evasão, 5) Sugira 5 ações concretas de fidelização com impacto esperado. Seja específico e baseado nos dados reais.',
    });
  }

  return alerts;
}
