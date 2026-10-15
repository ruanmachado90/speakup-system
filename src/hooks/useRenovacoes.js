import { useEffect, useState, useCallback } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, runTransaction, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { gerarCodigo } from '../utils/renovacao';
import {
  montarConvite, conviteNaoRenovara, convitePorAluno, patchEnvio, patchMensalidadeBase,
  patchNaoRenovara, patchDesfazerNaoRenovara, patchIrmao,
} from '../utils/renovacaoEnvio';

const col = (nome) => collection(db, 'artifacts', APP_ID, 'public', 'data', nome);
const refConvite = (codigo) => doc(col('renovacoes'), codigo);
// Anotações internas (motivo de "não renovará"): só a equipe lê; o convite
// em si será público para quem tiver o link (etapa 4).
const refNota = (codigo) => doc(col('renovacoes-notas'), codigo);
const LOTE = 400; // writeBatch aceita 500 operações; folga de segurança

/** Escuta uma coleção do ano em tempo real; undefined enquanto carrega. */
function useColecaoDoAno(nome, ano, idCampo) {
  const [docs, setDocs] = useState(undefined);
  const [erro, setErro] = useState(null);
  useEffect(() => onSnapshot(
    query(col(nome), where('anoLetivo', '==', ano)),
    (snap) => { setDocs(snap.docs.map((d) => ({ ...d.data(), [idCampo]: d.id }))); setErro(null); },
    (err) => { console.error(`[renovacao] ${nome}:`, err); setErro(err.message); setDocs([]); }
  ), [nome, ano, idCampo]);
  return [docs, erro];
}

/**
 * Convites de renovação do ano (`renovacoes/{codigo}`), em tempo real, e as
 * gravações da secretaria (etapa 3). Toda alteração de um convite lê o
 * documento atual numa transação: se a família respondeu nesse meio-tempo,
 * a regra do patch recusa e nada é gravado.
 */
export function useRenovacoes(ano) {
  const [convites, erro] = useColecaoDoAno('renovacoes', ano, 'codigo');
  const [notas] = useColecaoDoAno('renovacoes-notas', ano, 'codigo');

  /**
   * Gera convites para os alunos que ainda não têm um válido no ano
   * (chamar de novo com os mesmos alunos não duplica). Devolve quantos gerou.
   * @param {{ itens: Array<{ student, linha }>, campanha, por }} p
   */
  const gerarConvites = useCallback(async ({ itens, campanha, por }) => {
    const jaTem = convitePorAluno(convites || []);
    const agora = Date.now();
    const novos = itens
      .filter(({ student }) => student && !jaTem.has(student.id))
      .map(({ student, linha }) => montarConvite({ codigo: gerarCodigo(), student, linha, campanha, por, agora }));
    for (let i = 0; i < novos.length; i += LOTE) {
      const lote = writeBatch(db);
      novos.slice(i, i + LOTE).forEach((c) => lote.set(refConvite(c.codigo), c));
      await lote.commit();
    }
    return novos.length;
  }, [convites]);

  /** "Não renovará" de quem ainda não tem convite: grava um já recusado. */
  const naoRenovaraSemConvite = useCallback(async ({ student, linha, campanha, motivo, observacao, por }) => {
    if (convitePorAluno(convites || []).has(student.id)) throw new Error('Este aluno já tem convite; use a ação do convite.');
    const { convite, nota } = conviteNaoRenovara({ codigo: gerarCodigo(), student, linha, campanha, por, agora: Date.now(), motivo, observacao });
    const lote = writeBatch(db);
    lote.set(refConvite(convite.codigo), convite);
    lote.set(refNota(convite.codigo), nota);
    await lote.commit();
  }, [convites]);

  /**
   * Aplica `montarPatch(conviteAtual)` lendo o documento na hora. O patch
   * traz `entradaHistorico` (vira arrayUnion) e, opcionalmente, `nota`
   * (objeto = grava a anotação interna; null = apaga).
   */
  const alterar = useCallback((codigo, montarPatch) => runTransaction(db, async (tx) => {
    const snap = await tx.get(refConvite(codigo));
    if (!snap.exists()) throw new Error('Convite não encontrado.');
    const { entradaHistorico, nota, ...campos } = montarPatch({ ...snap.data(), codigo });
    tx.update(snap.ref, { ...campos, historico: arrayUnion(entradaHistorico) });
    if (nota) tx.set(refNota(codigo), nota);
    else if (nota === null) tx.delete(refNota(codigo));
  }), []);

  /** Registra o envio de vários convites (WhatsApp ou "marcar como enviado"). */
  const registrarEnvio = useCallback(
    (codigos, { canal, por }) => Promise.all(codigos.map((c) => alterar(c, (atual) => patchEnvio(atual, { canal, por })))),
    [alterar]
  );

  const marcarNaoRenovara = useCallback(
    (codigo, { motivo, observacao, por }) => alterar(codigo, (atual) => patchNaoRenovara(atual, { motivo, observacao, por })),
    [alterar]
  );

  const desfazerNaoRenovara = useCallback(
    (codigo, por) => alterar(codigo, (atual) => patchDesfazerNaoRenovara(atual, { por })),
    [alterar]
  );

  const ajustarBase = useCallback(
    (codigo, valorReais, campanha, por) => alterar(codigo, (atual) => patchMensalidadeBase(atual, valorReais, campanha, { por })),
    [alterar]
  );

  const marcarIrmao = useCallback(
    (codigo, ligado, por) => alterar(codigo, (atual) => patchIrmao(atual, ligado, { por })),
    [alterar]
  );

  return {
    convites: convites || [],
    notas: notas || [],
    carregando: convites === undefined,
    erro,
    gerarConvites, registrarEnvio, naoRenovaraSemConvite, marcarNaoRenovara, desfazerNaoRenovara, ajustarBase, marcarIrmao,
  };
}
