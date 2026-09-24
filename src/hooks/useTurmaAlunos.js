import { useState, useEffect } from 'react';
import { buscarAlunosPorIds } from '../utils/buscarAlunos';

/**
 * Retorna os alunos de uma turma, buscados pelo campo `alunosIds` da turma.
 * `turmaObj` deve ser o objeto completo da turma (com `alunosIds` e `id`).
 */
export function useTurmaAlunos(turmaObj) {
  const [alunos,  setAlunos]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!turmaObj?.alunosIds?.length) {
      setAlunos([]);
      return;
    }

    let cancelled = false;

    async function fetchAlunos() {
      setLoading(true);
      try {
        const docs = await buscarAlunosPorIds(turmaObj.alunosIds);
        if (cancelled) return;

        const found = docs
          // Normaliza para { id, nome } independente do campo usado no Firestore
          .map(s => ({ id: s.id, nome: s.name || s.nome || s.id }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        setAlunos(found);
      } catch {
        if (!cancelled) setAlunos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAlunos();
    return () => { cancelled = true; };
  }, [turmaObj?.id]);  // só re-busca quando muda a turma selecionada

  return { alunos, loading };
}
