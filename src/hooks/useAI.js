import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AI_CONFIG } from '../config/aiConfig';
import { buildSystemPrompt, extractSuggestions } from '../utils/aiUtils';

// Quantas mensagens ficam salvas no Firestore por usuário — suficiente para
// retomar o contexto recente sem deixar o documento crescer sem limite.
const MAX_STORED_MESSAGES = 40;

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

const WELCOME_MESSAGE = { role: 'assistant', content: AI_CONFIG.MESSAGES.WELCOME, type: 'welcome' };

export function useAI(appData, { uid } = {}) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
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

  // Só persiste no Firestore depois que o histórico salvo (se houver) já
  // terminou de carregar — evita sobrescrever o histórico real com a
  // mensagem de boas-vindas default antes da leitura terminar.
  const hasLoadedHistoryRef = useRef(false);

  // Marca se o usuário já mandou alguma mensagem nesta sessão — se o
  // carregamento do histórico do Firestore só terminar DEPOIS disso, ele não
  // deve sobrescrever a conversa em andamento (perderia a mensagem enviada).
  const hasUserInteractedRef = useRef(false);

  // Memoiza o system prompt — só recalcula quando os dados relevantes mudam
  const systemPrompt = useMemo(
    () => buildSystemPrompt(appData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appData.students?.length, appData.payments?.length, appData.expenses?.length, appData.leads?.length, appData.filterMonth, appData.filterYear]
  );

  // Carrega o histórico salvo do Firestore ao montar (uma vez por uid)
  useEffect(() => {
    hasLoadedHistoryRef.current = false;
    if (!uid) {
      hasLoadedHistoryRef.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'aiChats', uid));
        const saved = snap.exists() ? snap.data().messages : null;
        if (!cancelled && !hasUserInteractedRef.current && Array.isArray(saved) && saved.length > 0) {
          // Descarta qualquer mensagem presa em "streaming" de uma sessão
          // anterior interrompida — sem processo ativo, ela nunca resolveria
          // sozinha e ficaria mostrando "Analisando dados..." para sempre.
          const sanitized = saved.filter(m => !m.streaming);
          setMessages(sanitized.length > 0 ? sanitized : [WELCOME_MESSAGE]);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico da IA:', err);
      } finally {
        if (!cancelled) hasLoadedHistoryRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // Persiste o histórico no Firestore (com debounce) sempre que as mensagens
  // mudam — cobre novas mensagens, respostas da IA e "Limpar conversa".
  useEffect(() => {
    if (!uid || !hasLoadedHistoryRef.current) return;
    const timeoutId = setTimeout(() => {
      // Nunca persiste uma mensagem ainda em streaming — se a aba fechar ou
      // o processo for interrompido no meio, ela ficaria presa "carregando"
      // para sempre na próxima sessão, sem nenhum processo ativo para resolvê-la.
      const toSave = messages.filter(m => !m.streaming).slice(-MAX_STORED_MESSAGES);
      setDoc(doc(db, 'aiChats', uid), { messages: toSave, updatedAt: serverTimestamp() })
        .catch(err => console.error('Erro ao salvar histórico da IA:', err));
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [messages, uid]);

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoadingRef.current) return;

    hasUserInteractedRef.current = true;
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

    // Índice da mensagem-placeholder do assistente, preenchida aos poucos
    // conforme os pedaços da resposta chegam via streaming.
    let assistantIndex = null;

    try {
      // Filtra a mensagem de boas-vindas pelo tipo, não pelo conteúdo (mais robusto)
      const conversationMessages = [...messagesRef.current, newMessage]
        .filter(m => m.type !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetchWithRetry(AI_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, messages: conversationMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Resposta sem corpo de streaming');
      }

      setMessages(prev => {
        assistantIndex = prev.length;
        return [...prev, { role: 'assistant', content: '', streaming: true }];
      });

      // ── Leitura do stream SSE bruto da Anthropic, repassado sem alteração
      // pela Cloud Function. Formato: blocos "event: X\ndata: {...}\n\n".
      // Só nos importam eventos content_block_delta com delta.type === 'text_delta'
      // — blocos de "thinking" (raciocínio interno do modelo) são ignorados.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;

          let evt;
          try {
            evt = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }

          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullText += evt.delta.text;
            const liveIndex = assistantIndex;
            setMessages(prev => {
              const next = [...prev];
              next[liveIndex] = { role: 'assistant', content: fullText, streaming: true };
              return next;
            });
          } else if (evt.type === 'error') {
            throw new Error(evt.error?.message || 'Erro na resposta da IA');
          }
        }
      }

      const { text: cleanText, suggestions } = extractSuggestions(fullText);
      const finalIndex = assistantIndex;
      setMessages(prev => {
        const next = [...prev];
        next[finalIndex] = {
          role: 'assistant',
          content: cleanText || 'Resposta vazia da IA',
          suggestions,
        };
        return next;
      });

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

      const errorContent = `❌ ${errorMessage}`;
      if (assistantIndex !== null) {
        // Já existia um placeholder de streaming — substitui pelo erro em vez de duplicar
        setMessages(prev => {
          const next = [...prev];
          next[assistantIndex] = { role: 'assistant', content: errorContent };
          return next;
        });
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: errorContent }]);
      }

    } finally {
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [systemPrompt]); // isLoading removido das deps — controlado via ref

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
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
