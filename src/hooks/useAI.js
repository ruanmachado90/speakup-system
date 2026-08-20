import { useState, useCallback, useRef, useMemo } from 'react';
import { AI_CONFIG } from '../config/aiConfig';
import { buildSystemPrompt } from '../utils/aiUtils';

// Fora do hook — função pura sem dependências de closure.
// Evita ser recriada a cada render.
async function fetchWithRetry(url, options, attempt = 1) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err.name !== 'AbortError' && attempt < AI_CONFIG.RETRY.MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, AI_CONFIG.RETRY.DELAY));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

export function useAI(appData) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: AI_CONFIG.MESSAGES.WELCOME, type: 'welcome' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref para cancelar requisições em andamento
  const abortControllerRef = useRef(null);

  // Ref para acessar isLoading sem causar stale closure nas deps do useCallback
  const isLoadingRef = useRef(false);

  // Ref para acessar messages sem stale closure
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Memoiza o system prompt — só recalcula quando os dados relevantes mudam
  const systemPrompt = useMemo(
    () => buildSystemPrompt(appData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appData.students?.length, appData.payments?.length, appData.expenses?.length, appData.leads?.length, appData.filterMonth, appData.filterYear]
  );

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoadingRef.current) return;

    const newMessage = { role: 'user', content: messageText.trim() };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    // Cancela requisição anterior se existir
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const timeoutId = setTimeout(
      () => abortControllerRef.current?.abort(),
      AI_CONFIG.REQUEST_TIMEOUT
    );

    try {
      // Filtra a mensagem de boas-vindas pelo tipo, não pelo conteúdo (mais robusto)
      const conversationMessages = [...messagesRef.current, newMessage]
        .filter(m => m.type !== 'welcome');

      const response = await fetchWithRetry(AI_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: conversationMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.content?.[0]?.text || 'Resposta vazia da IA';

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

    } catch (err) {
      let errorMessage = AI_CONFIG.MESSAGES.ERROR_GENERIC;

      if (err.name === 'AbortError') {
        errorMessage = AI_CONFIG.MESSAGES.ERROR_TIMEOUT;
      } else if (
        err.message.includes('fetch') ||
        err.message.includes('network') ||
        err.message.includes('Failed to fetch')
      ) {
        errorMessage = AI_CONFIG.MESSAGES.ERROR_NETWORK;
      } else {
        errorMessage = `Erro: ${err.message}`;
      }

      setError(errorMessage);
      console.error('Erro ao enviar mensagem:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errorMessage}` }]);

    } finally {
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [systemPrompt]); // isLoading removido das deps — controlado via ref

  const clearChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: AI_CONFIG.MESSAGES.WELCOME, type: 'welcome' }]);
    setInputValue('');
    setError(null);
  }, []);

  const setInput = useCallback((value) => {
    if (value.length <= AI_CONFIG.UI.MAX_MESSAGE_LENGTH) {
      setInputValue(value);
    }
  }, []);

  // Alias mantido para compatibilidade com AIManager.jsx
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
