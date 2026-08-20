import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

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
        const snap = await getDocs(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'students')
        );
        if (cancelled) return;

        const ids = new Set(turmaObj.alunosIds);
        const found = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => ids.has(s.id))
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
