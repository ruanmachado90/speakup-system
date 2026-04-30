/**
 * Configurações centralizadas para o módulo de IA
 * Facilita manutenção e mudanças futuras
 */

export const AI_CONFIG = {
  // URL da Cloud Function
  API_ENDPOINT: "https://us-central1-speakup-system.cloudfunctions.net/chatWithAI",
  
  // Timeout para requisições (em milissegundos)
  REQUEST_TIMEOUT: 20000, // 20 segundos
  
  // Configurações de retry
  RETRY: {
    MAX_ATTEMPTS: 2,
    DELAY: 1000, // 1 segundo entre tentativas
  },
  
  // Configurações de UI
  UI: {
    MAX_MESSAGE_LENGTH: 5000,
    TEXTAREA_MIN_HEIGHT: 80,
    ANIMATION_DURATION: 300,
  },
  
  // Mensagens do sistema
  MESSAGES: {
    WELCOME: "👋 Olá! Sou seu **Consultor de Gestão com IA** da SpeakUp.\n\nEstou conectado aos dados em tempo real da escola e posso ajudar você a:\n\n📊 Analisar inadimplência e criar planos de cobrança\n💰 Diagnosticar saúde financeira vs benchmarks da indústria\n📈 Identificar tendências e oportunidades de crescimento\n🎯 Otimizar conversão de leads e retenção de alunos\n💡 Sugerir ações estratégicas priorizadas por impacto\n\nMinhas análises são baseadas em dados reais e sempre incluem comparações com meses anteriores e benchmarks do mercado de idiomas.\n\n**Como posso ajudar você hoje?**",
    ERROR_GENERIC: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
    ERROR_NETWORK: "Erro de conexão. Verifique sua internet e tente novamente.",
    ERROR_TIMEOUT: "A requisição demorou muito. Tente uma pergunta mais simples.",
    THINKING: "Analisando dados...",
  },
  
  // Prompts rápidos para análises comuns
  QUICK_PROMPTS: [
    {
      id: "inadimplencia",
      title: "📊 Análise de Inadimplência",
      prompt: "Analise a inadimplência atual seguindo o formato estruturado. Calcule: 1) Taxa de inadimplência vs benchmark, 2) Compare com meses anteriores (tendência), 3) Liste alunos críticos (>2 meses atrasados), 4) Impacto financeiro total com multas, 5) Crie plano de ação priorizado por urgência com roteiro de cobrança específico para cada caso."
    },
    {
      id: "financeiro",
      title: "💰 Análise Financeira Completa",
      prompt: "Faça diagnóstico financeiro completo do mês atual. Inclua: 1) Receita vs despesas vs margem de lucro (compare com benchmark 25-35%), 2) Variação % vs mês anterior e vs média 3 meses, 3) Tendência de crescimento (↗️↘️→), 4) Principais categorias de despesa e oportunidades de economia, 5) Projeção para próximo mês, 6) Ações prioritárias para melhorar saúde financeira."
    },
    {
      id: "retencao",
      title: "📈 Análise de Retenção",
      prompt: "Analise a retenção de alunos com detalhes. Calcule: 1) Taxa de retenção vs benchmark (>85%), 2) Tendência dos últimos 6 meses, 3) Identifique perfil de alunos que estão saindo (curso, idade, tempo), 4) Calcule impacto financeiro da evasão, 5) Sugira 5 ações concretas de fidelização com impacto esperado. Seja específico e baseado nos dados reais."
    },
    {
      id: "conversao",
      title: "🎯 Conversão de Leads",
      prompt: "Analise a eficiência de conversão de leads. Calcule: 1) Taxa de conversão vs benchmark (20-30%), 2) Tempo médio para converter, 3) Identifique leads esquecidos (>30 dias sem ação), 4) Valor potencial sendo perdido, 5) Compare conversão atual vs meses anteriores, 6) Sugira melhorias no processo comercial com ações específicas e mensuráveis."
    },
    {
      id: "despesas",
      title: "💸 Otimização de Despesas",
      prompt: "Faça auditoria de despesas completa. Analise: 1) Despesas por categoria com % do total, 2) Compare com mês anterior (identifique aumentos suspeitos), 3) Calcule % de despesas vs receita (ideal <70%), 4) Identifique 3 maiores oportunidades de redução, 5) Sugira cortes sem impactar qualidade, 6) Estime economia potencial em R$ e % para cada ação."
    },
    {
      id: "previsao",
      title: "🔮 Projeção de Receitas",
      prompt: "Faça projeção de receitas para próximos 3 meses. Baseie-se em: 1) Tendência dos últimos 6 meses, 2) Sazonalidade identificada, 3) Alunos com renovação prevista, 4) Leads em negociação e taxa de conversão histórica, 5) Calcule cenários: otimista, realista e pessimista, 6) Sugira ações para atingir cenário otimista. Use dados reais do histórico."
    }
  ],
};

/**
 * Cria um resumo inteligente dos dados para contexto da IA
 * Reduz drasticamente o tamanho do prompt mantendo informações relevantes
 */
function summarizeData(data) {
  const { students = [], payments = [], expenses = [], leads = [], filterMonth, filterYear } = data;
  
  // ==== FILTRAR DADOS POR MÊS/ANO SE FORNECIDO ====
  const currentMonth = filterMonth !== undefined ? filterMonth : new Date().getMonth();
  const currentYear = filterYear !== undefined ? filterYear : new Date().getFullYear();
  
  // Nomes dos meses em português
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  // Filtrar pagamentos pelo mês/ano
  const monthPayments = payments.filter(p => {
    if (!p.dueDate) return false;
    const date = new Date(p.dueDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  // Filtrar despesas pelo mês/ano  
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  // Data de hoje para comparações
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // ==== HISTÓRICO MENSAL (últimos 6 meses para comparações) ====
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth, 1);
    targetDate.setMonth(targetDate.getMonth() - i);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    const monthPayments = payments.filter(p => {
      if (!p.dueDate) return false;
      const date = new Date(p.dueDate);
      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
    });
    
    const monthExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const date = new Date(e.date);
      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
    });
    
    const monthPaid = monthPayments.filter(p => p.status === "Pago");
    const monthRevenue = monthPaid.reduce((sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
    const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0);
    const monthLate = monthPayments.filter(p => {
      if (p.status === "Pago") return false;
      if (!p.dueDate) return false;
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    monthlyData.push({
      month: targetMonth,
      year: targetYear,
      monthName: monthNames[targetMonth],
      payments: monthPayments.length,
      paid: monthPaid.length,
      revenue: monthRevenue,
      expenses: monthExpenseTotal,
      profit: monthRevenue - monthExpenseTotal,
      late: monthLate.length,
      lateAmount: monthLate.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0)
    });
  }
  
  // IMPORTANTE: Também calcular totais gerais para comparação
  const allTimePaidPayments = payments.filter(p => p.status === "Pago");
  const allTimeRevenue = allTimePaidPayments.reduce((sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
  
  // ==== ALUNOS ====
  const activeStudents = students.filter(s => s.status === "Ativo");
  const inactiveStudents = students.filter(s => s.status === "Inativo");
  
  // Agrupar por curso
  const studentsByCourse = students.reduce((acc, s) => {
    const course = s.curso || "Não especificado";
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});
  
  // ==== PAGAMENTOS DO MÊS ====
  const paidPayments = monthPayments.filter(p => p.status === "Pago");
  const pendingPayments = monthPayments.filter(p => p.status !== "Pago" && (!p.dueDate || new Date(p.dueDate) >= new Date()));
  
  // Identificar pagamentos atrasados (vencidos)
  const latePayments = monthPayments.filter(p => {
    if (p.status === "Pago") return false;
    if (!p.dueDate) return false;
    const dueDate = new Date(p.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });
  
  const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.valuePaid || p.valuePlanned || 0), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0);
  const totalLate = latePayments.reduce((sum, p) => sum + parseFloat(p.valuePlanned || 0), 0);
  
  // Agrupar por método de pagamento
  const paymentsByMethod = paidPayments.reduce((acc, p) => {
    const method = p.paymentMethod || "Não especificado";
    acc[method] = (acc[method] || 0) + parseFloat(p.valuePaid || p.valuePlanned || 0);
    return acc;
  }, {});
  
  // ==== DESPESAS DO MÊS ====
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0);
  
  // Agrupar por categoria
  const expensesByCategory = monthExpenses.reduce((acc, e) => {
    const category = e.category || "Não especificado";
    acc[category] = (acc[category] || 0) + parseFloat(e.value || 0);
    return acc;
  }, {});
  
  // ==== LEADS ====
  const leadsByStatus = leads.reduce((acc, l) => {
    const status = l.status || "Não especificado";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  // ==== FINANCEIRO ====
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;
  
  return {
    period: {
      month: currentMonth,
      year: currentYear,
      monthName: monthNames[currentMonth],
      description: `${monthNames[currentMonth]} de ${currentYear}`
    },
    students: {
      total: students.length,
      active: activeStudents.length,
      inactive: inactiveStudents.length,
      byCourse: studentsByCourse,
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
    },
    expenses: {
      total: monthExpenses.length,
      amount: totalExpenses,
      byCategory: expensesByCategory,
    },
    leads: {
      total: leads.length,
      byStatus: leadsByStatus,
    },
    financial: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: profit,
      profitMargin: profitMargin,
    },
    allTime: {
      totalRevenue: allTimeRevenue,
      totalPayments: payments.length,
      totalExpenses: expenses.reduce((sum, e) => sum + parseFloat(e.value || 0), 0),
    },
    monthlyHistory: monthlyData
  };
}

/**
 * Constrói o contexto do sistema com dados em tempo real
 * Otimizado para enviar resumo ao invés de JSON completo
 * @param {Object} data - Dados da aplicação
 * @returns {string} - Prompt do sistema formatado
 */
export function buildSystemPrompt(data) {
  const summary = summarizeData(data);
  
  return `Você é um assistente de IA especializado em análise de dados para o SpeakUp, uma escola de idiomas.

⏰ PERÍODO DE ANÁLISE ATUAL: ${summary.period.description}

📊 RESUMO DOS DADOS DO MÊS (${summary.period.monthName}/${summary.period.year}):

🎓 ALUNOS (Dados Gerais - Todos os períodos):
- Total: ${summary.students.total} (${summary.students.active} ativos, ${summary.students.inactive} inativos)
- Por curso: ${Object.entries(summary.students.byCourse).map(([c, n]) => `${c}: ${n}`).join(", ")}

💰 PAGAMENTOS (${summary.period.monthName}/${summary.period.year}):
- Total de cobranças do mês: ${summary.payments.total} registros
- ✅ Pagos: ${summary.payments.paid} cobranças (R$ ${summary.payments.revenue.toFixed(2)} recebidos)
- ⏳ Pendentes (no prazo): ${summary.payments.pending} (R$ ${summary.payments.pendingAmount.toFixed(2)})
- ❌ ATRASADOS/VENCIDOS: ${summary.payments.late} (R$ ${summary.payments.lateAmount.toFixed(2)})
- Por método de pagamento: ${Object.entries(summary.payments.byMethod).map(([m, v]) => `${m}: R$ ${v.toFixed(2)}`).join(", ") || "Nenhum"}

💸 DESPESAS (${summary.period.monthName}/${summary.period.year}):
- Total: ${summary.expenses.total} registros (R$ ${summary.expenses.amount.toFixed(2)})
- Por categoria: ${Object.entries(summary.expenses.byCategory).map(([c, v]) => `${c}: R$ ${v.toFixed(2)}`).join(", ") || "Nenhuma"}

📈 LEADS (Dados Gerais):
- Total: ${summary.leads.total} leads
- Por status: ${Object.entries(summary.leads.byStatus).map(([s, n]) => `${s}: ${n}`).join(", ")}

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
