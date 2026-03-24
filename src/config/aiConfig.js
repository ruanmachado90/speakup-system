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
    WELCOME: "Olá! Sou o assistente de IA do SpeakUp. Como posso ajudar você hoje?",
    ERROR_GENERIC: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
    ERROR_NETWORK: "Erro de conexão. Verifique sua internet e tente novamente.",
    ERROR_TIMEOUT: "A requisição demorou muito. Tente uma pergunta mais simples.",
    THINKING: "Pensando...",
  },
  
  // Prompts rápidos para análises comuns
  QUICK_PROMPTS: [
    {
      id: "inadimplencia",
      title: "📊 Análise de Inadimplência",
      prompt: "Faça uma análise completa da inadimplência atual. Identifique alunos com pagamentos atrasados, calcule o valor total em atraso (parcelas + multas), e sugira ações específicas para recuperação."
    },
    {
      id: "financeiro",
      title: "💰 Análise Financeira",
      prompt: "Analise a situação financeira atual: receitas vs despesas, fluxo de caixa, rentabilidade por curso, e sugira onde podemos economizar ou investir mais."
    },
    {
      id: "retencao",
      title: "📈 Taxa de Retenção",
      prompt: "Calcule a taxa de retenção de alunos, identifique padrões de evasão (por curso, idade, tempo de matrícula), e sugira estratégias para melhorar a retenção."
    },
    {
      id: "conversao",
      title: "🎯 Conversão de Leads",
      prompt: "Analise a conversão de leads em matrículas: taxa de conversão, tempo médio de decisão, leads perdidos e motivos, e sugira melhorias no processo."
    },
    {
      id: "despesas",
      title: "💸 Otimização de Despesas",
      prompt: "Analise as despesas por categoria, identifique gastos desnecessários ou excessivos, compare com benchmarks do setor, e sugira onde podemos reduzir custos."
    },
    {
      id: "previsao",
      title: "🔮 Previsão de Receitas",
      prompt: "Com base nos dados atuais, faça uma projeção de receitas para os próximos 3 meses, considerando sazonalidade, renovações esperadas, e leads em negociação."
    }
  ],
};

/**
 * Cria um resumo inteligente dos dados para contexto da IA
 * Reduz drasticamente o tamanho do prompt mantendo informações relevantes
 */
function summarizeData(data) {
  const { students = [], payments = [], expenses = [], leads = [] } = data;
  
  // ==== ALUNOS ====
  const activeStudents = students.filter(s => s.status === "Ativo");
  const inactiveStudents = students.filter(s => s.status === "Inativo");
  
  // Agrupar por curso
  const studentsByCourse = students.reduce((acc, s) => {
    const course = s.curso || "Não especificado";
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});
  
  // ==== PAGAMENTOS ====
  const paidPayments = payments.filter(p => p.status === "Pago");
  const pendingPayments = payments.filter(p => p.status === "Pendente");
  const latePayments = payments.filter(p => p.status === "Atrasado");
  
  const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
  const totalLate = latePayments.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
  
  // Agrupar por método de pagamento
  const paymentsByMethod = paidPayments.reduce((acc, p) => {
    const method = p.metodoPagamento || "Não especificado";
    acc[method] = (acc[method] || 0) + parseFloat(p.valor || 0);
    return acc;
  }, {});
  
  // ==== DESPESAS ====
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.valor || 0), 0);
  
  // Agrupar por categoria
  const expensesByCategory = expenses.reduce((acc, e) => {
    const category = e.categoria || "Não especificado";
    acc[category] = (acc[category] || 0) + parseFloat(e.valor || 0);
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
    students: {
      total: students.length,
      active: activeStudents.length,
      inactive: inactiveStudents.length,
      byCourse: studentsByCourse,
    },
    payments: {
      total: payments.length,
      paid: paidPayments.length,
      pending: pendingPayments.length,
      late: latePayments.length,
      revenue: totalRevenue,
      pendingAmount: totalPending,
      lateAmount: totalLate,
      byMethod: paymentsByMethod,
    },
    expenses: {
      total: expenses.length,
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
    }
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

📊 RESUMO DOS DADOS ATUAIS:

🎓 ALUNOS:
- Total: ${summary.students.total} (${summary.students.active} ativos, ${summary.students.inactive} inativos)
- Por curso: ${Object.entries(summary.students.byCourse).map(([c, n]) => `${c}: ${n}`).join(", ")}

💰 PAGAMENTOS:
- Total: ${summary.payments.total} registros
- Pagos: ${summary.payments.paid} (R$ ${summary.payments.revenue.toFixed(2)})
- Pendentes: ${summary.payments.pending} (R$ ${summary.payments.pendingAmount.toFixed(2)})
- Atrasados: ${summary.payments.late} (R$ ${summary.payments.lateAmount.toFixed(2)})
- Por método: ${Object.entries(summary.payments.byMethod).map(([m, v]) => `${m}: R$ ${v.toFixed(2)}`).join(", ")}

💸 DESPESAS:
- Total: ${summary.expenses.total} registros (R$ ${summary.expenses.amount.toFixed(2)})
- Por categoria: ${Object.entries(summary.expenses.byCategory).map(([c, v]) => `${c}: R$ ${v.toFixed(2)}`).join(", ")}

📈 LEADS:
- Total: ${summary.leads.total} leads
- Por status: ${Object.entries(summary.leads.byStatus).map(([s, n]) => `${s}: ${n}`).join(", ")}

💵 RESUMO FINANCEIRO:
- Receita: R$ ${summary.financial.revenue.toFixed(2)}
- Despesas: R$ ${summary.financial.expenses.toFixed(2)}
- Lucro: R$ ${summary.financial.profit.toFixed(2)}
- Margem: ${summary.financial.profitMargin}%

SUAS CAPACIDADES:
✓ Analisar inadimplência e sugerir ações de cobrança
✓ Calcular KPIs financeiros e tendências
✓ Identificar padrões e oportunidades
✓ Prever receitas e fluxo de caixa
✓ Sugerir otimizações operacionais
✓ Analisar conversão de leads

INSTRUÇÕES:
- Seja direto e objetivo nas análises
- Use dados concretos dos resumos acima
- Forneça números e percentuais precisos
- Sugira ações práticas e específicas
- Use emojis e markdown para melhor legibilidade
- Se precisar de detalhes específicos de um aluno/pagamento, pergunte o nome/ID`;
}
