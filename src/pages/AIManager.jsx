import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────
const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const buildContext = (students, payments, expenses, leads) => {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  const activeStudents = students.filter((s) => s.status === "Ativo" || s.status === "ativo");
  const inactiveStudents = students.filter((s) => s.status !== "Ativo" && s.status !== "ativo");

  const thisMonthPayments = payments.filter(
    (p) => Number(p.month) === thisMonth && Number(p.year) === thisYear
  );
  const paidThisMonth = thisMonthPayments.filter((p) => p.status === "Pago");
  const pendingThisMonth = thisMonthPayments.filter((p) => p.status !== "Pago");
  const overduePayments = payments.filter(
    (p) => p.status !== "Pago" && p.dueDate && new Date(p.dueDate) < now
  );

  const receitaMes = paidThisMonth.reduce((s, p) => s + Number(p.valuePlanned || 0), 0);
  const inadimplencia = overduePayments.reduce((s, p) => s + Number(p.valuePlanned || 0), 0);
  const despesasMes = expenses
    .filter((e) => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((s, e) => s + Number(e.value || e.amount || 0), 0);

  // Professores
  const teacherMap = {};
  activeStudents.forEach((s) => {
    if (s.teacher) teacherMap[s.teacher] = (teacherMap[s.teacher] || 0) + 1;
  });

  // Cursos
  const courseMap = {};
  activeStudents.forEach((s) => {
    if (s.course) courseMap[s.course] = (courseMap[s.course] || 0) + 1;
  });

  // Leads
  const leadsThisMonth = (leads || []).filter((l) => {
    const d = new Date(l.createdAt || l.date);
    return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear;
  });

  return `
Você é um assistente gerencial especializado em escolas de inglês. Responda SEMPRE em português brasileiro.
Seja direto, prático e objetivo. Use dados reais abaixo para embasar análises.

=== DADOS DO SISTEMA SPEAKUP (${now.toLocaleDateString("pt-BR")}) ===

ALUNOS:
- Total de alunos: ${students.length}
- Alunos ativos: ${activeStudents.length}
- Alunos inativos/cancelados: ${inactiveStudents.length}
- Taxa de retenção: ${students.length > 0 ? ((activeStudents.length / students.length) * 100).toFixed(1) : 0}%

PROFESSORES (alunos por professor):
${Object.entries(teacherMap).map(([t, n]) => `- ${t}: ${n} alunos`).join("\n") || "- Nenhum dado"}

CURSOS (alunos por curso):
${Object.entries(courseMap).map(([c, n]) => `- ${c}: ${n} alunos`).join("\n") || "- Nenhum dado"}

FINANCEIRO (${thisMonth}/${thisYear}):
- Receita recebida no mês: R$ ${receitaMes.toFixed(2)}
- Inadimplência total: R$ ${inadimplencia.toFixed(2)}
- Pagamentos pendentes no mês: ${pendingThisMonth.length} alunos
- Pagamentos recebidos no mês: ${paidThisMonth.length} alunos
- Despesas no mês: R$ ${despesasMes.toFixed(2)}
- Lucro estimado do mês: R$ ${(receitaMes - despesasMes).toFixed(2)}

INADIMPLÊNCIA DETALHADA:
- Parcelas vencidas e não pagas: ${overduePayments.length}
- Valor total em atraso: R$ ${inadimplencia.toFixed(2)}
${overduePayments.slice(0, 5).map((p) => {
  const aluno = students.find((s) => s.id === p.studentId);
  return `  • ${aluno?.name || "Aluno desconhecido"} — R$ ${Number(p.valuePlanned || 0).toFixed(2)} (venc. ${p.dueDate ? new Date(p.dueDate).toLocaleDateString("pt-BR") : "?"})`;
}).join("\n")}
${overduePayments.length > 5 ? `  ... e mais ${overduePayments.length - 5} inadimplentes` : ""}

LEADS (${thisMonth}/${thisYear}):
- Leads no mês: ${leadsThisMonth.length}
- Total de leads: ${(leads || []).length}

=== FIM DOS DADOS ===
`;
};

const QUICK_PROMPTS = [
  { icon: <AlertTriangle size={14} />, label: "Alunos inadimplentes", prompt: "Quais alunos estão inadimplentes? Liste os principais e sugira ações de cobrança." },
  { icon: <TrendingUp size={14} />, label: "Análise financeira", prompt: "Faça uma análise financeira completa do mês atual com insights e sugestões de melhoria." },
  { icon: <Users size={14} />, label: "Retenção de alunos", prompt: "Analise a retenção de alunos e sugira estratégias para reduzir cancelamentos." },
  { icon: <BarChart3 size={14} />, label: "Relatório gerencial", prompt: "Gere um relatório gerencial completo com os principais KPIs e recomendações para a escola." },
  { icon: <Brain size={14} />, label: "Oportunidades", prompt: "Identifique as principais oportunidades de crescimento e melhoria para a escola agora." },
  { icon: <DollarSign size={14} />, label: "Aumentar receita", prompt: "Sugira estratégias práticas para aumentar a receita da escola no próximo mês." },
];

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function AIManager({ students = [], payments = [], expenses = [], leads = [] }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Olá! 👋 Sou o **Assistente IA da SpeakUp**.\n\nAnalisei os dados do sistema e estou pronto para te ajudar com:\n- 📊 Relatórios e análises\n- 💰 Gestão financeira e inadimplência\n- 👥 Retenção e captação de alunos\n- 💡 Sugestões estratégicas\n\nO que você quer saber hoje?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemPrompt = buildContext(students, payments, expenses, leads);
      const history = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": "sk-ant-api03-VqFX6n5dYKWN4_3MgMcfG04GjOCfBIy4-vLJGN0L5L_jmOQCX5kHq74Fg1C7CqbojT5SSnpOxrFV-bZhFHC40Q-5eaWYAAA",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: history,
        }),
      });

      const data = await response.json();
      const reply = data.content?.map((b) => b.text || "").join("") || "Não consegui processar sua pergunta.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Erro ao conectar com a IA. Verifique sua conexão e tente novamente." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Chat reiniciado! Como posso te ajudar?`,
      },
    ]);
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#f8fafc",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "0",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER CARD */}
      <div
        style={{
          background: "linear-gradient(135deg, #005DE4 0%, #0041a8 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 32px rgba(0,93,228,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(255,255,255,0.15)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Assistente IA — SpeakUp</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
              Análises gerenciais em tempo real
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {[
            { label: "Alunos Ativos", value: students.filter(s => s.status === "Ativo" || s.status === "ativo").length },
            { label: "Inadimplentes", value: [...new Set(payments.filter(p => p.status !== "Pago" && p.dueDate && new Date(p.dueDate) < new Date()).map(p => p.studentId))].length },
            { label: "Leads", value: (leads || []).length },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK PROMPTS */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => sendMessage(q.prompt)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "20px",
              border: "1.5px solid #e2e8f0",
              background: "white",
              color: "#334155",
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.15s",
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#005DE4";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.borderColor = "#005DE4";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#334155";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            {q.icon}
            {q.label}
          </button>
        ))}
      </div>

      {/* CHAT AREA */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flex: 1,
          minHeight: 400,
          boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>IA conectada aos dados do sistema</span>
          </div>
          <button
            onClick={clearChat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <RefreshCw size={12} /> Limpar
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxHeight: 480,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #005DE4, #0041a8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <Sparkles size={14} color="white" />
                </div>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  background: msg.role === "user" ? "#005DE4" : "#f8fafc",
                  color: msg.role === "user" ? "white" : "#1e293b",
                  fontSize: 14,
                  lineHeight: 1.65,
                  border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #005DE4, #0041a8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={14} color="white" />
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "4px 16px 16px 16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                Analisando os dados...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Pergunte sobre alunos, finanças, inadimplência..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: 14,
              color: "#1e293b",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#005DE4")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: loading || !input.trim() ? "#e2e8f0" : "#005DE4",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              color: loading || !input.trim() ? "#94a3b8" : "white",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
