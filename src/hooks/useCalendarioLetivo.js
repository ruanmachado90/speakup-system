import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Lê e escreve as datas específicas da escola (recesso, semanas de prova,
 * recuperação, início/fim do ano letivo) de calendarioLetivo/{ano}.
 * Feriados nacionais NÃO ficam aqui — são calculados em utils/calendarioLetivo.js.
 */
export function useCalendarioLetivo(ano) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'calendarioLetivo', String(ano)),
      (snap) => {
        setDados(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error('[useCalendarioLetivo] Erro ao carregar calendário:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [ano]);

  const salvarCalendario = useCallback(async (novoDados) => {
    await setDoc(doc(db, 'calendarioLetivo', String(ano)), {
      ...novoDados,
      ano,
      updatedAt: new Date().toISOString(),
    });
  }, [ano]);

  return { dados, loading, salvarCalendario };
}
