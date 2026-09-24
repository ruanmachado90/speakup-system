import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';

/**
 * Saldo em caixa por mês — entrada manual (por ora não há integração bancária).
 * Um doc por competência ("YYYY-MM"): { competencia, conta, saldoInicial, saldoFinal }.
 * É o dado que falta pro relatório responder "sobrevivo?" — lucro contábil e
 * variação de caixa são coisas diferentes (ver PENDÊNCIAS do relatório).
 */
const colRef = () => collection(db, 'artifacts', APP_ID, 'public', 'data', 'saldosBancarios');
const competenciaId = (mes, ano) => `${ano}-${String(mes + 1).padStart(2, '0')}`;

export function useSaldosBancarios() {
  const [porCompetencia, setPorCompetencia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      colRef(),
      (snap) => {
        const mapa = {};
        snap.forEach((d) => { mapa[d.id] = { id: d.id, ...d.data() }; });
        setPorCompetencia(mapa);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useSaldosBancarios] Erro ao carregar saldos:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const salvarSaldo = useCallback(async (mes, ano, { conta = 'Principal', saldoInicial, saldoFinal }) => {
    const id = competenciaId(mes, ano);
    await setDoc(doc(colRef(), id), {
      competencia: id,
      conta,
      saldoInicial: saldoInicial === '' || saldoInicial == null ? null : Number(saldoInicial),
      saldoFinal: saldoFinal === '' || saldoFinal == null ? null : Number(saldoFinal),
      atualizadoEm: Date.now(),
    }, { merge: true });
  }, []);

  const doMes = useCallback((mes, ano) => porCompetencia[competenciaId(mes, ano)] || null, [porCompetencia]);

  return { porCompetencia, doMes, salvarSaldo, loading, error };
}

export { competenciaId };
