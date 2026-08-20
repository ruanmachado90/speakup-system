import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Lê a coleção antiga 'aulas' (lançada pela secretaria/admin em AulasAdmin.jsx,
// com chamada em array `chamadas` e data em ISO) para uma ou várias turmas.
// Usado para complementar o Histórico do professor, que hoje só lê o 'diario'
// novo — turmas com aulas lançadas antes da migração ficavam sem histórico.
export function useAulasLegadoTurmas(turmaIds) {
  const idsKey = (turmaIds || []).slice().sort().join(',');
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!turmaIds || turmaIds.length === 0) {
      setAulas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const blocos = [];
    for (let i = 0; i < turmaIds.length; i += 30) blocos.push(turmaIds.slice(i, i + 30));

    const resultadosPorBloco = {};
    const unsubs = blocos.map((bloco, idx) => {
      const q = query(collection(db, 'aulas'), where('turmaId', 'in', bloco));
      return onSnapshot(q, snap => {
        resultadosPorBloco[idx] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAulas(Object.values(resultadosPorBloco).flat());
        setLoading(false);
      }, () => {
        resultadosPorBloco[idx] = [];
        setLoading(false);
      });
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [idsKey]);

  return { aulas, loading };
}
