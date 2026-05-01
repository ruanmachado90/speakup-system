import React, { useRef, useEffect } from "react";
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

/**
 * AIManager - Interface de chat com IA para análises gerenciais
 * 
 * Componente principal responsável pela interface visual do chat com a IA.
 * A lógica de negócio está encapsulada no hook useAI.
 * As configurações estão centralizadas em AI_CONFIG.
 */

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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function AIManager({ students = [], payments = [], expenses = [], leads = [], filterMonth, filterYear }) {
  // Hook customizado para lógica do chat
  const {
    messages,
    inputValue,
    isLoading,
    sendMessage,
    clearChat,
    setInput,
    sendQuickPrompt
  } = useAI({ students, payments, expenses, leads, filterMonth, filterYear });

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handlers
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };

  const handleKeyPress = (e) => {
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
      {/* Google Font */}
      <link 
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" 
        rel="stylesheet" 
      />

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
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
      {/* PROMPTS RÁPIDOS */}
      {/* ============================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "10px",
        }}
      >
        {/* Relatório Mensal — full-width, destacado */}
        {AI_CONFIG.QUICK_PROMPTS.filter(p => p.id === "relatorio").map((item) => (
          <button
            key={item.id}
            onClick={() => sendQuickPrompt(item.prompt)}
            disabled={isLoading}
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 20px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #005DE4 0%, #0041a8 100%)",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              textAlign: "left",
              fontFamily: "'DM Sans', sans-serif",
              opacity: isLoading ? 0.6 : 1,
              boxShadow: "0 4px 16px rgba(0,93,228,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,93,228,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,93,228,0.3)";
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ICONS_MAP[item.id]}
            </div>
            <span style={{ flex: 1 }}>{item.title}</span>
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
          </button>
        ))}

        {/* Demais prompts */}
        {AI_CONFIG.QUICK_PROMPTS.filter(p => p.id !== "relatorio").map((item) => (
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
                e.currentTarget.style.borderColor = "#005DE4";
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
                color: "#005DE4",
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
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
                alignItems: "flex-start",
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

              {/* Mensagem */}
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
                {/* Renderização simples de markdown (bold com **) */}
                {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Indicador de Loading */}
          {isLoading && (
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
                {AI_CONFIG.MESSAGES.THINKING}
              </div>
            </div>
          )}
          
          {/* Ref para auto-scroll */}
          <div ref={bottomRef} />
        </div>

        {/* Área de Input */}
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
            value={inputValue}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Pergunte sobre alunos, finanças, inadimplência..."
            disabled={isLoading}
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
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: isLoading || !inputValue.trim() ? "#e2e8f0" : "#005DE4",
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
      `}</style>
    </div>
  );
}
