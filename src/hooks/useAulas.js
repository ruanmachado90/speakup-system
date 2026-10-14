import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeNome } from '../utils/normalizeNome';

// Lê por turmaId (lote de até 30, como buscarAlunosDasTurmas), não por nome do
// professor: duas turmas do mesmo professor gravadas com grafias diferentes
// ("Barbara Dias" vs "Bárbara Dias") faziam a busca por nome perder aulas
// inteiras. turmaIds já vem filtrado corretamente (professorSlug ou nome),
// então basta usar as turmas que o professor já tem — sem repetir o problema.
export function useAulas(professorNome, turmaIds = []) {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const idsKey = (turmaIds || []).slice().sort().join(',');

  // Troca de professor/turmas: zera a lista durante o render (padrão
  // recomendado pelo React) em vez de chamar setState dentro do effect, que
  // causa render em cascata.
  const [chaveAnterior, setChaveAnterior] = useState(idsKey);
  if (chaveAnterior !== idsKey) {
    setChaveAnterior(idsKey);
    setAulas([]);
    setLoading(true);
  }

  // Escuta aulas das turmas do professor em tempo real via onSnapshot
  useEffect(() => {
    if (!idsKey) {
      setAulas([]);
      setLoading(false);
      return;
    }
    const ids = idsKey.split(',');
    const blocos = [];
    for (let i = 0; i < ids.length; i += 30) blocos.push(ids.slice(i, i + 30));

    const resultadosPorBloco = {};
    let pendentes = blocos.length;
    const unsubs = blocos.map((bloco, idx) => {
      const q = query(collection(db, 'aulas'), where('turmaId', 'in', bloco));
      return onSnapshot(
        q,
        (snapshot) => {
          resultadosPorBloco[idx] = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          const todas = Object.values(resultadosPorBloco).flat()
            .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
          setAulas(todas);
          setError(null);
          setLoading(false);
        },
        (err) => {
          console.error('Erro ao escutar aulas:', err);
          resultadosPorBloco[idx] = [];
          setError(err.message);
          pendentes -= 1;
          if (pendentes <= 0) setLoading(false);
        }
      );
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [idsKey]);

  /**
   * Registrar nova aula com chamada
   */
  const registrarAula = useCallback(async (aulaData) => {
    try {
      const novaAula = {
        ...aulaData,
        professor: professorNome,
        professorKey: normalizeNome(professorNome),
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
