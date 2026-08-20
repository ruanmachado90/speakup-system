import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Fonte única da lista de professores cadastrados (coleção `professores`).
 * Substitui a derivação de nomes únicos varrendo turmas/students.
 */
export function useProfessores() {
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'professores'),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        setProfessores(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('[useProfessores] Erro ao carregar professores:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { professores, loading, error };
}
