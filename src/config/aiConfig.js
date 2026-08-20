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
    },
    {
      id: "relatorio",
      title: "📋 Relatório Mensal Completo",
      prompt: "Gere o RELATÓRIO MENSAL COMPLETO com todos os KPIs disponíveis. Organize exatamente nesta estrutura:\n\n# 📋 RELATÓRIO MENSAL — [MÊS/ANO]\n\n## 1. RESUMO EXECUTIVO (3 linhas)\n\n## 2. FINANCEIRO\n- Receita do mês vs mês anterior (variação %)\n- Despesas vs mês anterior\n- Lucro líquido e margem (%)\n- Ticket médio por aluno\n- Projeção para próximo mês\n\n## 3. INADIMPLÊNCIA\n- Total em atraso (R$ e %)\n- Comparação vs benchmark (<5% = saudável)\n- Tendência (melhorando/piorando)\n\n## 4. ALUNOS & MATRÍCULAS\n- Total de alunos ativos\n- Novas matrículas no mês\n- Cancelamentos/inativos no período\n- Saldo líquido (entradas - saídas)\n- Taxa de retenção (%)\n\n## 5. LEADS & CONVERSÃO\n- Total de leads e por status\n- Taxa de conversão (%)\n- Leads esquecidos (>30 dias)\n- Receita potencial dos leads em negociação\n\n## 6. DESPESAS DETALHADAS\n- Top 3 categorias de despesa\n- % das despesas sobre a receita\n- Variação vs mês anterior por categoria\n\n## 7. HISTÓRICO DOS ÚLTIMOS 6 MESES (tabela)\n\n## 8. ALERTAS & RISCOS (ordenados por urgência)\n\n## 9. PLANO DE AÇÃO — PRÓXIMOS 30 DIAS\n(Liste 5 ações prioritárias com responsável e prazo)\n\n## 10. PONTUAÇÃO DE SAÚDE DO NEGÓCIO\n(Score 0-100 baseado nos KPIs, com justificativa)\n\nSeja específico com números reais dos dados. Inclua emojis de status 🟢🟡🔴 para cada KPI."
    }
  ],
};

// Lógica de dados e prompt movida para src/utils/aiUtils.js
