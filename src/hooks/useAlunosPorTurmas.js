import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

// Busca os alunos de várias turmas de uma vez (usado no diário do mês,
// que precisa da lista de alunos de todas as turmas do professor).
export function useAlunosPorTurmas(turmas) {
  const idsKey = turmas.map(t => t.id).sort().join(',');
  const [alunosPorTurma, setAlunosPorTurma] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!turmas.length) {
      setAlunosPorTurma({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAlunos() {
      setLoading(true);
      try {
        const snap = await getDocs(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'students')
        );
        if (cancelled) return;

        const todos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .map(s => ({ id: s.id, nome: s.name || s.nome || s.id }));

        const mapa = {};
        turmas.forEach(t => {
          const ids = new Set(t.alunosIds || []);
          mapa[t.id] = todos
            .filter(a => ids.has(a.id))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        });

        setAlunosPorTurma(mapa);
      } catch {
        if (!cancelled) setAlunosPorTurma({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAlunos();
    return () => { cancelled = true; };
  }, [idsKey]);

  return { alunosPorTurma, loading };
}
