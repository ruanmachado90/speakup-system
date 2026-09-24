import { useState, useEffect } from 'react';
import { buscarAlunosDasTurmas } from '../utils/buscarAlunos';

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
        const porTurma = await buscarAlunosDasTurmas(turmas);
        if (cancelled) return;

        const mapa = {};
        Object.entries(porTurma).forEach(([turmaId, alunos]) => {
          mapa[turmaId] = alunos
            .map(s => ({ id: s.id, nome: s.name || s.nome || s.id }))
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
