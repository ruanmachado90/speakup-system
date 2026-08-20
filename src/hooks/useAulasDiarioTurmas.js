import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Lê as entradas do diário de várias turmas de uma vez (usado para imprimir
// o diário do mês inteiro do professor, com todas as suas turmas juntas).
// Firestore limita o operador 'in' a 30 valores, então os ids são divididos em blocos.
export function useAulasDiarioTurmas(turmaIds) {
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
      const q = query(collection(db, 'diario'), where('turmaId', 'in', bloco));
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
