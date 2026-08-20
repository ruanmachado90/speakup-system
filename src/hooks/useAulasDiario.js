import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Lê as entradas do diário do professor em tempo real.
// Filtra por turmaId no Firestore (índice simples) e por etapa em JS,
// evitando necessidade de índice composto na coleção 'diario'.
export function useAulasDiario(turmaId, etapa) {
  const [aulas,   setAulas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!turmaId || !etapa) {
      setAulas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'diario'),
      where('turmaId', '==', turmaId),
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.etapa === etapa)
        .sort((a, b) => new Date(b.registradoEm) - new Date(a.registradoEm));
      setAulas(list);
      setLoading(false);
    }, () => {
      setAulas([]);
      setLoading(false);
    });

    return unsub;
  }, [turmaId, etapa]);

  return { aulas, loading };
}
