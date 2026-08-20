import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const TIPO_MAP = { written: 'Written', listening: 'Listening', speaking: 'Speaking' };

// Converte '1º Semestre' / '2º Semestre' para '2026-1' / '2026-2'
export function etapaToSemestre(etapa) {
  const ano = new Date().getFullYear();
  return etapa === '1º Semestre' ? `${ano}-1` : `${ano}-2`;
}

// Lê as avaliações e notas das coleções de produção: 'avaliacoes' + 'grades'.
// Retorna o mesmo formato que NotasParciais e RelatorioNotas esperam:
// avaliacoes: { Written: [{ id, pontos, notas: { [studentId]: score } }], ... }
export function useAvaliacoesParciais(turmaId, etapa) {
  const [avDocs, setAvDocs] = useState(null);
  const [grDocs, setGrDocs] = useState(null);

  useEffect(() => {
    if (!turmaId || !etapa) {
      setAvDocs([]);
      setGrDocs([]);
      return;
    }

    setAvDocs(null);
    setGrDocs(null);

    const semestre = etapaToSemestre(etapa);

    const unsubAv = onSnapshot(
      query(
        collection(db, 'avaliacoes'),
        where('turmaId',  '==', turmaId),
        where('semestre', '==', semestre),
      ),
      snap => setAvDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      ()   => setAvDocs([]),
    );

    const unsubGr = onSnapshot(
      query(
        collection(db, 'grades'),
        where('turmaId',  '==', turmaId),
        where('semestre', '==', semestre),
      ),
      snap => setGrDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      ()   => setGrDocs([]),
    );

    return () => { unsubAv(); unsubGr(); };
  }, [turmaId, etapa]);

  const loading = avDocs === null || grDocs === null;

  const avaliacoes = useMemo(() => {
    if (!avDocs || !grDocs) return { Written: [], Listening: [], Speaking: [] };

    // Agrupar por tipo e ordenar por ordem
    const grouped = { Written: [], Listening: [], Speaking: [] };
    avDocs.forEach(av => {
      const tipo = TIPO_MAP[av.tipo];
      if (tipo) grouped[tipo].push(av);
    });
    Object.keys(grouped).forEach(tipo => {
      grouped[tipo].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    });

    // Injetar as notas de cada aluno em cada avaliação
    Object.keys(grouped).forEach(tipo => {
      grouped[tipo] = grouped[tipo].map(av => {
        const notas = {};
        grDocs.forEach(g => {
          const score = g.scores?.[av.id];
          if (score != null) notas[g.studentId] = score;
        });
        return { ...av, notas };
      });
    });

    return grouped;
  }, [avDocs, grDocs]);

  return { avaliacoes, loading };
}
