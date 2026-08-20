import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_MAX_ALUNOS, DEFAULT_TOTAL_AULAS } from '../constants/turmasConfig';
import { normalizarDias } from '../utils/turmas';

/**
 * Hook que centraliza todo o acesso a Firestore para turmas e aulas.
 * Garante esquema consistente, tempo real e operações CRUD seguras.
 */
export function useTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Schema fallback — garante que documentos antigos nunca causam crash
  const normalizarTurma = useCallback((id, data) => ({
    id,
    nome: data.nome ?? '',
    professor: data.professor ?? '',
    nivel: data.nivel ?? '',
    horario: data.horario ?? '',
    horarios: Array.isArray(data.horarios) ? data.horarios : [],
    dias: normalizarDias(data.dias ?? ''),
    maxAlunos: Math.max(1, Number(data.maxAlunos) || DEFAULT_MAX_ALUNOS),
    totalAulas: Math.max(1, Number(data.totalAulas) || DEFAULT_TOTAL_AULAS),
    alunosIds: Array.isArray(data.alunosIds) ? data.alunosIds : [],
    alunosCount: Number(data.alunosCount) || (Array.isArray(data.alunosIds) ? data.alunosIds.length : 0),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }), []);

  // Escuta turmas em tempo real
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'turmas'),
      (snap) => {
        setTurmas(snap.docs.map((d) => normalizarTurma(d.id, d.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useTurmas] Erro ao carregar turmas:', err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [normalizarTurma]);

  // Escuta aulas em tempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'aulas'),
      (snap) => {
        setAulas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('[useTurmas] Erro ao carregar aulas:', err);
      }
    );
    return unsub;
  }, []);

  // CRUD — Criar
  const criarTurma = useCallback(async (turmaData) => {
    const payload = {
      ...turmaData,
      dias: normalizarDias(turmaData.dias ?? ''),
      alunosCount: turmaData.alunosIds?.length ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const ref = await addDoc(collection(db, 'turmas'), payload);
      return ref.id;
    } catch (err) {
      console.error('[useTurmas] Erro ao criar turma:', err);
      throw err;
    }
  }, []);

  // CRUD — Editar
  const editarTurma = useCallback(async (id, turmaData, createdAtOriginal) => {
    const payload = {
      ...turmaData,
      dias: normalizarDias(turmaData.dias ?? ''),
      alunosCount: turmaData.alunosIds?.length ?? 0,
      updatedAt: new Date().toISOString(),
    };
    // Nunca sobrescrever createdAt
    if (createdAtOriginal) {
      payload.createdAt = createdAtOriginal;
    }
    try {
      await updateDoc(doc(db, 'turmas', id), payload);
    } catch (err) {
      console.error('[useTurmas] Erro ao editar turma:', err);
      throw err;
    }
  }, []);

  // CRUD — Excluir
  const excluirTurma = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'turmas', id));
    } catch (err) {
      console.error('[useTurmas] Erro ao excluir turma:', err);
      throw err;
    }
  }, []);

  // Verificar duplicidade antes de salvar
  const verificarDuplicata = useCallback(
    (turmaData, excludeId = null) => {
      const diasNorm = normalizarDias(turmaData.dias ?? '');
      return turmas.some(
        (t) =>
          t.id !== excludeId &&
          t.professor === turmaData.professor &&
          t.horario === turmaData.horario &&
          normalizarDias(t.dias) === diasNorm
      );
    },
    [turmas]
  );

  return {
    turmas,
    aulas,
    loading,
    error,
    criarTurma,
    editarTurma,
    excluirTurma,
    verificarDuplicata,
  };
}
