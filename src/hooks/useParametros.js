import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { resolverParametros } from '../config/parametros';

/**
 * Parâmetros de negócio (preço cheio, mensalidade padrão, custo de professor,
 * metas de alerta). Ficam num único doc no Firestore; os padrões de
 * `config/parametros.js` cobrem qualquer campo ausente.
 */
const parametrosRef = () =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', 'config', 'parametros');

export function useParametros() {
  const [salvos, setSalvos] = useState(null); // null = ainda carregando
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      parametrosRef(),
      (snap) => {
        setSalvos(snap.exists() ? snap.data() : {});
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useParametros] Erro ao carregar parâmetros:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const salvarParametros = useCallback(async (novos) => {
    // `resolverParametros` valida e descarta campos inválidos antes de gravar.
    const limpo = resolverParametros(novos);
    await setDoc(parametrosRef(), { ...limpo, updatedAt: Date.now() }, { merge: true });
  }, []);

  return {
    parametros: resolverParametros(salvos),
    parametrosSalvos: salvos,
    loading,
    error,
    salvarParametros,
  };
}
