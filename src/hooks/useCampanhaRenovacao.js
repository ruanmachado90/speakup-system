import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';
import { validarCampanha } from '../utils/renovacaoPainel';

const refCampanha = (ano) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'renovacao-campanhas', String(ano));

/**
 * Configuração da campanha de renovação (`renovacao-campanhas/{ano}`), em tempo real.
 * Único ponto de gravação da etapa 2 — o resto do painel só lê.
 */
export function useCampanhaRenovacao(ano = CAMPANHA_PADRAO_2027.anoLetivo) {
  const [campanha, setCampanha] = useState(undefined); // undefined = carregando; null = não existe
  const [erro, setErro] = useState(null);

  useEffect(() => onSnapshot(
    refCampanha(ano),
    (snap) => { setCampanha(snap.exists() ? { id: snap.id, ...snap.data() } : null); setErro(null); },
    (err) => { console.error('[renovacao] campanha:', err); setErro(err.message); setCampanha(null); }
  ), [ano]);

  /** Cria a campanha com os valores padrão — só se ainda não existir. */
  const criar = useCallback(async (por) => {
    const ref = refCampanha(ano);
    if ((await getDoc(ref)).exists()) return;
    const agora = Date.now();
    await setDoc(ref, { ...CAMPANHA_PADRAO_2027, anoLetivo: ano, criadoEm: agora, criadoPor: por || null, atualizadoEm: agora, atualizadoPor: por || null });
  }, [ano]);

  /** Salva a configuração inteira; recusa (sem gravar) se houver erro de validação. */
  const salvar = useCallback(async (dados, por) => {
    const erros = validarCampanha(dados);
    if (erros.length) return { ok: false, erros };
    // `guia` (checklist da aba "Como funciona") não passa pela configuração:
    // a cópia do modal pode estar velha e apagaria marcações feitas enquanto isso.
    const { id, criadoEm, criadoPor, guia, ...resto } = dados; // eslint-disable-line no-unused-vars
    await updateDoc(refCampanha(ano), { ...resto, atualizadoEm: Date.now(), atualizadoPor: por || null });
    return { ok: true, erros: [] };
  }, [ano]);

  /**
   * Marca/desmarca um item do checklist da preparação (`guia.checklist.{id}`).
   * Grava só o item: duas pessoas marcando ao mesmo tempo não se atrapalham.
   * Admin e secretaria gravam (regra geral de artifacts/.../data); se a
   * campanha ganhar regra própria "só admin", liberar este campo à secretaria.
   */
  const marcarItemGuia = useCallback(
    (itemId, feito, por) => updateDoc(refCampanha(ano), { [`guia.checklist.${itemId}`]: { feito, por: por || null, em: Date.now() } }),
    [ano]
  );

  return { campanha, carregando: campanha === undefined, erro, criar, salvar, marcarItemGuia };
}
