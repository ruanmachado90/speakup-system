import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const norm = str => str.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

export function useProfessorTurmas(professorSlug) {
  const [turmas,  setTurmas]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!professorSlug) { setLoading(false); return; }

    setLoading(true);
    const primeiroNome = professorSlug.split('-')[0];

    const unsub = onSnapshot(
      collection(db, 'turmas'),
      snap => {
        const filtered = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => {
            if (t.professorSlug) return t.professorSlug === professorSlug;
            return norm(t.professor || '').includes(norm(primeiroNome));
          })
          .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
        setTurmas(filtered);
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err);
        setLoading(false);
      }
    );

    return unsub;
  }, [professorSlug]);

  return { turmas, loading, error };
}
