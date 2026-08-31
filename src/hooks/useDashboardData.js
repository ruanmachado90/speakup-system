import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, where, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useFaltasHoje() {
  const [faltasHoje, setFaltasHoje] = useState([]);
  const [faltasLoading, setFaltasLoading] = useState(true);
  const [faltasErro, setFaltasErro] = useState(null);
  // Aulas do dia x aulas com chamada fechada: sem isso, "nenhuma falta" e
  // "ninguém registrou a chamada ainda" seriam a mesma tela.
  const [aulasHoje, setAulasHoje] = useState({ total: 0, registradas: 0 });
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregarFaltasHoje = () => {
    // toLocaleDateString('en-CA') retorna YYYY-MM-DD no fuso local (evita mismatch UTC após 21h)
    const hoje = new Date().toLocaleDateString('en-CA');
    setFaltasLoading(true);
    setFaltasErro(null);
    getDocs(query(collection(db, 'aulas'), where('data', '==', hoje)))
      .then(snap => {
        const faltas = [];
        let registradas = 0;

        snap.docs.forEach(d => {
          const aula = d.data();
          if (aula.status !== 'realizada') return;
          registradas++;
          (aula.chamadas || []).forEach(c => {
            if (c.status === 'falta') {
              faltas.push({
                id: `${d.id}-${c.alunoId}`,
                aulaId: d.id,
                alunoId: c.alunoId,
                alunoNome: c.alunoNome || c.alunoId,
                turmaNome: aula.turmaNome || aula.turmaId || '—',
                professor: aula.professor || '—',
                contatado: c.contatado || false,
              });
            }
          });
        });

        setFaltasHoje(faltas);
        setAulasHoje({ total: snap.docs.length, registradas });
        setAtualizadoEm(new Date());
      })
      .catch((err) => {
        console.error('[useFaltasHoje] Erro ao carregar faltas:', err);
        setFaltasErro(err);
      })
      .finally(() => setFaltasLoading(false));
  };

  useEffect(() => { carregarFaltasHoje(); }, []);

  const marcarContatado = async (falta) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const aulaRef = doc(db, 'aulas', falta.aulaId);
      const snap = await getDoc(aulaRef);
      if (!snap.exists()) return;
      const chamadas = (snap.data().chamadas || []).map(c =>
        c.alunoId === falta.alunoId ? { ...c, contatado: true } : c
      );
      await updateDoc(aulaRef, { chamadas });
      setFaltasHoje(prev => prev.map(f => f.id === falta.id ? { ...f, contatado: true } : f));
    } catch (err) {
      console.error('[useFaltasHoje] Erro ao marcar contato:', err);
      setFaltasErro(err);
    }
  };

  return { faltasHoje, faltasLoading, faltasErro, aulasHoje, atualizadoEm, carregarFaltasHoje, marcarContatado };
}

export function useLembretes() {
  const [lembretes, setLembretes] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'lembretes'), orderBy('criadoEm', 'desc'));
    return onSnapshot(q, snap => {
      setLembretes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const addLembrete = async (texto, cor) => {
    await addDoc(collection(db, 'lembretes'), {
      texto: texto.trim(),
      cor,
      criadoEm: Timestamp.now(),
    });
  };

  const deleteLembrete = async (id) => {
    await deleteDoc(doc(db, 'lembretes', id));
  };

  return { lembretes, addLembrete, deleteLembrete };
}

export function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'todos'), orderBy('criadoEm', 'desc'));
    return onSnapshot(q, snap => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const addTodo = async (texto) => {
    await addDoc(collection(db, 'todos'), {
      texto: texto.trim(),
      feito: false,
      criadoEm: Timestamp.now(),
    });
  };

  const toggleTodo = async (item) => {
    await updateDoc(doc(db, 'todos', item.id), { feito: !item.feito });
  };

  const deleteTodo = async (id) => {
    await deleteDoc(doc(db, 'todos', id));
  };

  return { todos, addTodo, toggleTodo, deleteTodo };
}

export function useAulasStats(dashboardRange) {
  const [aulasStats, setAulasStats] = useState({ mes: 0, freqMedia: 0 });

  useEffect(() => {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const aulasQuery = dashboardRange === 'month'
      ? query(collection(db, 'aulas'), where('data', '>=', `${anoAtual}-${String(now.getMonth() + 1).padStart(2, '0')}-01`), limit(500))
      : query(collection(db, 'aulas'), where('data', '>=', `${anoAtual}-01-01`), limit(500));

    getDocs(aulasQuery)
      .then(snap => {
        const aulas = snap.docs.map(d => d.data());
        const now2 = new Date();
        const mesAtual = now2.getMonth();
        const anoAtual2 = now2.getFullYear();

        const aulasPeriodo = aulas.filter(a => {
          if (!a.data) return false;
          const [ano, mes] = a.data.split('-').map(Number);
          return dashboardRange === 'month'
            ? ano === anoAtual2 && (mes - 1) === mesAtual
            : ano === anoAtual2;
        });

        const freqs = aulas
          .map(a => {
            const ch = a.chamadas || [];
            if (!ch.length) return null;
            return (ch.filter(c => c.status === 'presente').length / ch.length) * 100;
          })
          .filter(f => f !== null);

        const freqMedia = freqs.length
          ? Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length)
          : 0;

        setAulasStats({ mes: aulasPeriodo.length, freqMedia });
      })
      .catch((err) => {
        console.error('[useAulasStats] Erro ao carregar aulas:', err);
      });
  }, [dashboardRange]);

  return aulasStats;
}
