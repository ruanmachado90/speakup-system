import { useState, useCallback, useRef, useMemo } from "react";
import { AI_CONFIG, buildSystemPrompt } from "../config/aiConfig";

/**
 * Hook customizado para gerenciar comunicação com a IA
 * Encapsula toda a lógica de chat, estado e requisições
 * Otimizado com useMemo e retry automático
 * 
 * @param {Object} appData - Dados da aplicação (students, payments, expenses, leads)
 * @returns {Object} - Estado e métodos do chat
 */
export function useAI(appData) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: AI_CONFIG.MESSAGES.WELCOME,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref para cancelar requisições em andamento
  const abortControllerRef = useRef(null);
  // Ref para acessar mensagens sem causar stale closure
  const messagesRef = useRef(messages);
  
  // Atualiza ref sempre que messages muda
  messagesRef.current = messages;
  
  // Memoiza o system prompt para evitar recalcular a cada render
  const systemPrompt = useMemo(() => {
    return buildSystemPrompt(appData);
  }, [appData.students?.length, appData.payments?.length, appData.expenses?.length, appData.leads?.length, appData.filterMonth, appData.filterYear]);

  /**
   * Função auxiliar para fazer requisição com retry
   */
  const fetchWithRetry = async (url, options, attempt = 1) => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      // Se não é AbortError e ainda tem tentativas, tenta novamente
      if (err.name !== "AbortError" && attempt < AI_CONFIG.RETRY.MAX_ATTEMPTS) {
        console.log(`Tentativa ${attempt} falhou, tentando novamente em ${AI_CONFIG.RETRY.DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, AI_CONFIG.RETRY.DELAY));
        return fetchWithRetry(url, options, attempt + 1);
      }
      throw err;
    }
  };

  /**
   * Envia mensagem para a IA com retry automático
   * @param {string} messageText - Texto da mensagem
   */
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const newMessage = { role: "user", content: messageText.trim() };
    
    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    // Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Cria novo AbortController
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, AI_CONFIG.REQUEST_TIMEOUT);

    try {
      // Prepara mensagens usando ref para evitar stale closure
      const conversationMessages = [...messagesRef.current, newMessage]
        .filter(m => m.role !== "assistant" || m.content !== AI_CONFIG.MESSAGES.WELCOME);

      // Faz requisição com retry
      const response = await fetchWithRetry(AI_CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: conversationMessages,
        }),
        signal: abortControllerRef.current?.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extrai resposta da IA
      const aiResponse = data.content?.[0]?.text || "Resposta vazia da IA";
      
      // Adiciona resposta da IA
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      let errorMessage = AI_CONFIG.MESSAGES.ERROR_GENERIC;
      
      if (err.name === "AbortError") {
        errorMessage = AI_CONFIG.MESSAGES.ERROR_TIMEOUT;
      } else if (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Failed to fetch")) {
        errorMessage = AI_CONFIG.MESSAGES.ERROR_NETWORK;
      } else {
        errorMessage = `Erro: ${err.message}`;
      }
      
      setError(errorMessage);
      console.error("Erro ao enviar mensagem:", err);
      
      // Adiciona mensagem de erro no chat
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `❌ ${errorMessage}` 
      }]);
      
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, systemPrompt]); // Removido 'messages' das dependências

  /**
   * Limpa o histórico de chat
   */
  const clearChat = useCallback(() => {
    setMessages([{
      role: "assistant",
      content: AI_CONFIG.MESSAGES.WELCOME,
    }]);
    setInputValue("");
    setError(null);
  }, []);

  /**
   * Define valor do input
   */
  const setInput = useCallback((value) => {
    if (value.length <= AI_CONFIG.UI.MAX_MESSAGE_LENGTH) {
      setInputValue(value);
    }
  }, []);

  /**
   * Envia prompt rápido
   */
  const sendQuickPrompt = useCallback((promptText) => {
    sendMessage(promptText);
  }, [sendMessage]);

  return {
    messages,
    inputValue,
    isLoading,
    error,
    sendMessage,
    clearChat,
    setInput,
    sendQuickPrompt,
  };
}
