import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Coleção `vendas` (material didático, uniforme, avulsos) em tempo real.
 * Usada pelos relatórios para separar receita não-recorrente da mensalidade.
 */
export function useVendas() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'vendas'),
      (snap) => {
        setVendas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useVendas] Erro ao carregar vendas:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { vendas, loading, error };
}
