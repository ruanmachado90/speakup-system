import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useAulas(professorNome) {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Escuta aulas do professor em tempo real via onSnapshot
  useEffect(() => {
    if (!professorNome) return;
    setLoading(true);
    const q = query(collection(db, 'aulas'), where('professor', '==', professorNome));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const aulasData = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
        setAulas(aulasData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao escutar aulas:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [professorNome]);

  /**
   * Registrar nova aula com chamada
   */
  const registrarAula = useCallback(async (aulaData) => {
    try {
      const novaAula = {
        ...aulaData,
        professor: professorNome,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'aulas'), novaAula);
      // onSnapshot atualiza a lista automaticamente
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('Erro ao registrar aula:', err);
      return { success: false, error: err.message };
    }
  }, [professorNome]);

  /**
   * Calcular estatísticas de frequência por aluno
   */
  const calcularFrequencia = useCallback((alunoId) => {
    const aulasDoAluno = aulas.filter(aula => 
      aula.chamadas?.some(c => c.alunoId === alunoId)
    );
    
    const totalAulas = aulasDoAluno.length;
    const presencas = aulasDoAluno.filter(aula =>
      aula.chamadas.find(c => c.alunoId === alunoId)?.status === 'presente'
    ).length;
    
    const faltas = aulasDoAluno.filter(aula =>
      aula.chamadas.find(c => c.alunoId === alunoId)?.status === 'falta'
    ).length;
    
    const faltasJustificadas = aulasDoAluno.filter(aula =>
      aula.chamadas.find(c => c.alunoId === alunoId)?.status === 'justificada'
    ).length;
    
    const percentualPresenca = totalAulas > 0 ? (presencas / totalAulas) * 100 : 0;
    
    return {
      totalAulas,
      presencas,
      faltas,
      faltasJustificadas,
      percentualPresenca: percentualPresenca.toFixed(1)
    };
  }, [aulas]);

  /**
   * Atualizar aula existente
   */
  const atualizarAula = useCallback(async (aulaId, dadosAtualizados) => {
    try {
      const aulaRef = doc(db, 'aulas', aulaId);
      await updateDoc(aulaRef, { ...dadosAtualizados, updatedAt: Timestamp.now() });
      setAulas(prev => prev.map(a => a.id === aulaId ? { ...a, ...dadosAtualizados } : a));
      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar aula:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Excluir aula
   */
  const excluirAula = useCallback(async (aulaId) => {
    try {
      await deleteDoc(doc(db, 'aulas', aulaId));
      setAulas(prev => prev.filter(a => a.id !== aulaId));
      return { success: true };
    } catch (err) {
      console.error('Erro ao excluir aula:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Buscar aulas de uma turma específica
   */
  const getAulasPorTurma = useCallback((turmaId) => {
    return aulas.filter(aula => aula.turmaId === turmaId);
  }, [aulas]);

  /**
   * Buscar aulas de uma data específica
   */
  const getAulasPorData = useCallback((data) => {
    return aulas.filter(aula => aula.data === data);
  }, [aulas]);

  return {
    aulas,
    loading,
    error,
    registrarAula,
    atualizarAula,
    excluirAula,
    calcularFrequencia,
    getAulasPorTurma,
    getAulasPorData,
  };
}
