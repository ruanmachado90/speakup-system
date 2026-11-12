import { FileCheck } from 'lucide-react';
import { CAMPANHA_PADRAO_2027 } from '../../config/renovacao';

const ANO = CAMPANHA_PADRAO_2027.anoLetivo;

/**
 * Contrato da renovação assinado (`contratos/{id}_{ano}`), abaixo do status
 * do contrato atual na lista de alunos. Nada aparece enquanto não houver.
 */
export default function ContratoDoAno({ studentId, cancelado, contratos }) {
  const c = contratos[`${studentId}_${ANO}`];
  if (cancelado || !c) return null;
  return (
    <span className="mt-1 flex items-center gap-1 text-emerald-600 text-[10px] font-semibold" title={`Contrato de ${ANO} assinado por ${c.nome} em ${c.timestamp}`}>
      <FileCheck size={13} aria-hidden="true" /> {ANO} assinado
    </span>
  );
}
