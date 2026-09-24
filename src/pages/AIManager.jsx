import React, { useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Brain,
  FileText,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAI } from "../hooks/useAI";
import { AI_CONFIG } from "../config/aiConfig";
import { getQuickAlerts } from "../utils/aiUtils";
import { useAuthContext } from "../context/AuthContext";
import { useSaldosBancarios } from "../hooks/useSaldosBancarios";

// ─────────────────────────────────────────────
// MAPEAMENTO DE ÍCONES
// ─────────────────────────────────────────────
const ICONS_MAP = {
  inadimplencia: <AlertTriangle size={16} />,
  financeiro: <TrendingUp size={16} />,
  retencao: <Users size={16} />,
  conversao: <BarChart3 size={16} />,
  despesas: <DollarSign size={16} />,
  previsao: <Brain size={16} />,
  relatorio: <FileText size={16} />,
};

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// Suporta: # headings, - listas, 1. numeradas, --- divisores, **bold**, *italic*
// ─────────────────────────────────────────────
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={`${keyPrefix}-i${i}`}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = (key) => {
    if (!listItems.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag key={key} style={{ paddingLeft: 18, margin: "4px 0 4px 0", lineHeight: 1.7 }}>
        {listItems.map((item, j) => (
          <li key={j} style={{ marginBottom: 2 }}>{renderInline(item, `${key}-${j}`)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    // H1
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      flushList(`fl${idx}`);
      elements.push(
        <div key={idx} style={{ fontWeight: 700, fontSize: 15, marginTop: 14, marginBottom: 4, color: "#0f172a", borderBottom: "2px solid #0e48fe", paddingBottom: 4 }}>
          {renderInline(h1[1], `h1${idx}`)}
        </div>
      );
      return;
    }
    // H2
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      flushList(`fl${idx}`);
      elements.push(
        <div key={idx} style={{ fontWeight: 700, fontSize: 13, marginTop: 10, marginBottom: 3, color: "#1e293b" }}>
          {renderInline(h2[1], `h2${idx}`)}
        </div>
      );
      return;
    }
    // H3
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      flushList(`fl${idx}`);
      elements.push(
        <div key={idx} style={{ fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 2, color: "#334155" }}>
          {renderInline(h3[1], `h3${idx}`)}
        </div>
      );
      return;
    }
    // Divisor
    if (/^---+$/.test(line.trim())) {
      flushList(`fl${idx}`);
      elements.push(<hr key={idx} style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />);
      return;
    }
    // Bullet list
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (listType !== "ul") { flushList(`fl${idx}`); listType = "ul"; }
      listItems.push(bullet[1]);
      return;
    }
    // Numbered list
    const num = line.match(/^\d+\.\s+(.+)/);
    if (num) {
      if (listType !== "ol") { flushList(`fl${idx}`); listType = "ol"; }
      listItems.push(num[1]);
      return;
    }
    // Linha vazia
    flushList(`fl${idx}`);
    if (line.trim() === "") {
      elements.push(<div key={idx} style={{ height: 6 }} />);
      return;
    }
    // Texto normal
    elements.push(
      <span key={idx} style={{ display: "block" }}>
        {renderInline(line, `ln${idx}`)}
      </span>
    );
  });

  flushList("fl-end");
  return elements;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function AIManager({ students = [], payments = [], expenses = [], leads = [], filterMonth, filterYear }) {
  const { user } = useAuthContext();
  const { porCompetencia } = useSaldosBancarios();
  const saldosBancarios = useMemo(() => Object.values(porCompetencia), [porCompetencia]);
  const {
    messages,
    inputValue,
    isLoading,
    sendMessage,
    clearChat,
    setInput,
    sendQuickPrompt
  } = useAI({ students, payments, expenses, leads, saldosBancarios, filterMonth, filterYear }, { uid: user?.uid });

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Alertas proativos — calculados na hora, sem chamar a IA, a partir dos
  // dados já carregados. Aparecem antes mesmo do gestor perguntar algo.
  const quickAlerts = useMemo(
    () => getQuickAlerts({ students, payments, expenses, leads, saldosBancarios, filterMonth, filterYear }),
    [students, payments, expenses, leads, saldosBancarios, filterMonth, filterYear]
  );

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize do textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputValue]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      }}
    >
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div
        style={{
          background: "linear-gradient(135deg, #0e48fe 0%, #0b3ad4 100%)",
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.1)",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 13,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
          <span>{students.length} alunos • {payments.length} pagamentos</span>
        </div>
      </div>

      {/* ============================================ */}
      {/* ALERTAS PROATIVOS — calculados na hora, sem IA */}
      {/* ============================================ */}
      {quickAlerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quickAlerts.map((alert, i) => (
            <button
              key={i}
              onClick={() => sendQuickPrompt(alert.prompt)}
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${alert.level === "critical" ? "#fecaca" : "#fde68a"}`,
                background: alert.level === "critical" ? "#fef2f2" : "#fffbeb",
                cursor: isLoading ? "not-allowed" : "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <AlertTriangle size={15} color={alert.level === "critical" ? "#dc2626" : "#d97706"} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: alert.level === "critical" ? "#991b1b" : "#92400e" }}>
                {alert.text}
              </span>
              <span style={{ fontSize: 11, color: alert.level === "critical" ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                Analisar →
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* PROMPTS RÁPIDOS */}
      {/* ============================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "10px",
        }}
      >
        {/* Prompts de IA (os relatórios em PDF ficam na página Financeiro) */}
        {AI_CONFIG.QUICK_PROMPTS.map((item) => (
          <button
            key={item.id}
            onClick={() => sendQuickPrompt(item.prompt)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "white",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              fontSize: "13px",
              fontWeight: 500,
              color: "#334155",
              textAlign: "left",
              fontFamily: "'DM Sans', sans-serif",
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = "#0e48fe";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,93,228,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0e48fe",
              }}
            >
              {ICONS_MAP[item.id]}
            </div>
            <span style={{ flex: 1 }}>{item.title}</span>
            <ChevronRight size={14} color="#94a3b8" />
          </button>
        ))}
      </div>

      {/* ============================================ */}
      {/* CHAT CONTAINER */}
      {/* ============================================ */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          minHeight: 520,
          maxHeight: 520,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header do Chat */}
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
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
              IA conectada aos dados do sistema
            </span>
          </div>
          <button
            onClick={clearChat}
            disabled={isLoading}
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
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={12} /> Limpar
          </button>
        </div>

        {/* Área de Mensagens */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 10,
                  alignItems: "flex-start",
                  width: "100%",
                }}
              >
                {/* Avatar da IA */}
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #0e48fe, #0b3ad4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Sparkles size={14} color="white" />
                  </div>
                )}

                {/* Mensagem */}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "#0e48fe" : "#f8fafc",
                    color: msg.role === "user" ? "white" : "#1e293b",
                    fontSize: 14,
                    lineHeight: 1.65,
                    border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : msg.streaming && !msg.content ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      {AI_CONFIG.MESSAGES.THINKING}
                    </span>
                  ) : (
                    <>
                      {renderMarkdown(msg.content)}
                      {msg.streaming && (
                        <span style={{ display: "inline-block", width: 7, height: 14, background: "#0e48fe", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-start infinite" }} />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sugestões de continuação — clicáveis, enviam a pergunta direto */}
              {msg.role === "assistant" && !msg.streaming && msg.suggestions?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 42, maxWidth: "78%" }}>
                  {msg.suggestions.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => !isLoading && sendMessage(s)}
                      disabled={isLoading}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#0e48fe",
                        background: "#eef2ff",
                        border: "1px solid #dbe4ff",
                        borderRadius: 20,
                        padding: "6px 12px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                        fontFamily: "'DM Sans', sans-serif",
                        textAlign: "left",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Indicador de Loading — só quando ainda não há mensagem de streaming na lista */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0e48fe, #0b3ad4)",
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
                {AI_CONFIG.MESSAGES.THINKING}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Área de Input */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre alunos, finanças, inadimplência… (Shift+Enter para nova linha)"
            disabled={isLoading}
            rows={1}
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
              resize: "none",
              overflow: "hidden",
              lineHeight: 1.5,
              minHeight: 44,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0e48fe")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: "12px",
              background: isLoading || !inputValue.trim() ? "#e2e8f0" : "#0e48fe",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              color: isLoading || !inputValue.trim() ? "#94a3b8" : "white",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* CSS para animações */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
