import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, setDoc, Timestamp, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── 3 categorias fixas ────────────────────────────────────────────────────────
// Written = 50pts, Listening = 30pts, Speaking = 20pts → total 100pts
export const CATEGORIAS = [
  { tipo: 'written',   label: 'Written',   labelPt: 'Escrita', max: 50, prefix: 'W', bg: '#005DE4', bgMedia: '#0041a8' },
  { tipo: 'listening', label: 'Listening', labelPt: 'Áudio',   max: 30, prefix: 'L', bg: '#0284c7', bgMedia: '#0369a1' },
  { tipo: 'speaking',  label: 'Speaking',  labelPt: 'Oral',    max: 20, prefix: 'S', bg: '#6366f1', bgMedia: '#4f46e5' },
];

// ── Conceito ──────────────────────────────────────────────────────────────────
export function calcularConceito(total) {
  if (total >= 95) return 'A+';
  if (total >= 90) return 'A';
  if (total >= 85) return 'B+';
  if (total >= 80) return 'B';
  if (total >= 75) return 'C+';
  if (total >= 70) return 'C';
  if (total >= 60) return 'C-';
  if (total >= 50) return 'D';
  return 'F';
}

export function conceitoCor(c) {
  if (['A+', 'A'].includes(c)) return '#059669';
  if (['B+', 'B'].includes(c)) return '#2563eb';
  if (['C+', 'C'].includes(c)) return '#d97706';
  if (c === 'C-') return '#ea580c';
  return '#dc2626';
}

/**
 * Calcula a media da categoria para um aluno.
 * Formula: media das porcentagens de cada prova * max da categoria
 * Retorna null se nenhuma prova foi lancada.
 */
export function calcularMediaCategoria(avsCategoria, scores, categoriaMax) {
  const scored = avsCategoria.filter(av => scores[av.id] != null);
  if (scored.length === 0) return null;
  const avgPct = scored.reduce((s, av) => s + (scores[av.id] / av.pontos), 0) / scored.length;
  return parseFloat((avgPct * categoriaMax).toFixed(2));
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useGrades({ professorSlug, turmaId, semestre }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [gradesDocs, setGradesDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!professorSlug || !turmaId || !semestre) {
      setAvaliacoes([]);
      setGradesDocs([]);
      return;
    }
    setLoading(true);
    try {
      const [avSnap, gSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'avaliacoes'),
          where('turmaId', '==', turmaId),
          where('semestre', '==', semestre),
        )),
        getDocs(query(
          collection(db, 'grades'),
          where('turmaId', '==', turmaId),
          where('semestre', '==', semestre),
        )),
      ]);
      setAvaliacoes(
        avSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
      );
      setGradesDocs(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('useGrades fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [professorSlug, turmaId, semestre]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const gradesMapRef = useRef({});

  const gradesMap = useMemo(() => {
    const map = {};
    for (const g of gradesDocs) {
      map[g.studentId] = { scores: g.scores || {}, faltas: g.faltas ?? 0 };
    }
    gradesMapRef.current = map;
    return map;
  }, [gradesDocs]);

  const addAvaliacao = useCallback(async ({ tipo, pontos }) => {
    const cat = CATEGORIAS.find(c => c.tipo === tipo);
    const existingOfType = avaliacoes.filter(a => a.tipo === tipo).length;
    const label = `${cat.prefix}${existingOfType + 1}`;
    const ordem = avaliacoes.length;
    const data = {
      turmaId, professorSlug, semestre,
      tipo, pontos, label, ordem,
      createdAt: Timestamp.now(),
    };
    const ref = await addDoc(collection(db, 'avaliacoes'), data);
    setAvaliacoes(prev => [...prev, { id: ref.id, ...data }]);
  }, [turmaId, professorSlug, semestre, avaliacoes]);

  const deleteAvaliacao = useCallback(async (avId) => {
    await deleteDoc(doc(db, 'avaliacoes', avId));
    setAvaliacoes(prev => prev.filter(a => a.id !== avId));
    setGradesDocs(prev => prev.map(g => {
      const scores = { ...g.scores };
      delete scores[avId];
      return { ...g, scores };
    }));
  }, []);

  const upsertGrade = useCallback(async (studentId, updates) => {
    const gradeId = `${turmaId}_${semestre}_${studentId}`;
    const existingData = gradesMapRef.current[studentId];
    const merged = {
      studentId, turmaId, professorSlug, semestre,
      scores: {}, faltas: 0,
      ...(existingData ? { scores: existingData.scores, faltas: existingData.faltas } : {}),
      ...updates,
      updatedAt: Timestamp.now(),
    };
    await setDoc(doc(db, 'grades', gradeId), merged);
    gradesMapRef.current = {
      ...gradesMapRef.current,
      [studentId]: { scores: merged.scores, faltas: merged.faltas },
    };
    setGradesDocs(prev => {
      const idx = prev.findIndex(g => g.studentId === studentId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { id: gradeId, ...merged };
        return next;
      }
      return [...prev, { id: gradeId, ...merged }];
    });
  }, [turmaId, semestre, professorSlug]);

  const setScore = useCallback(async (studentId, avaliacaoId, score) => {
    const existing = gradesMapRef.current[studentId];
    const scores = { ...(existing?.scores || {}), [avaliacaoId]: score };
    await upsertGrade(studentId, { scores });
  }, [upsertGrade]);

  const setFaltas = useCallback(async (studentId, faltas) => {
    await upsertGrade(studentId, { faltas: parseInt(faltas) || 0 });
  }, [upsertGrade]);

  return {
    avaliacoes, gradesMap, loading,
    addAvaliacao, deleteAvaliacao,
    setScore, setFaltas,
  };
}
