import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from './constants';
import { montarCertificado, normalizarCodigo } from './certificado';

const col = () => collection(db, 'artifacts', APP_ID, 'public', 'data', 'certificados');

/**
 * Emite (grava) um certificado. O código é o id do documento, então a regra
 * `create` do Firestore garante que ele nunca sobrescreve outro; na
 * improvável colisão de código, tenta de novo com outro.
 */
export async function emitirCertificado({ aluno, titulo, nivel, dataEmissao, emitidoPor }) {
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const { erro, dados, codigo } = montarCertificado({ aluno, titulo, nivel, dataEmissao, emitidoPor });
    if (erro) throw new Error(erro);
    const ref = doc(col(), codigo);
    if ((await getDoc(ref)).exists()) continue; // colisão: gera outro código
    await setDoc(ref, dados);
    return dados;
  }
  throw new Error('Não foi possível gerar um código único. Tente novamente.');
}

/** Certificados já emitidos para o aluno (mais recentes primeiro). */
export async function certificadosDoAluno(studentId) {
  const snap = await getDocs(query(col(), where('studentId', '==', studentId)));
  return snap.docs.map((d) => d.data()).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
}

/** Revoga (não apaga): a página de verificação passa a mostrar "revogado". */
export async function revogarCertificado(codigo, motivo = '') {
  await updateDoc(doc(col(), codigo), {
    status: 'revogado',
    revogadoEm: Date.now(),
    revogadoMotivo: String(motivo).trim().slice(0, 200),
  });
}

/** Consulta pública pelo código. null = não existe (ou código mal formado). */
export async function buscarCertificado(texto) {
  const codigo = normalizarCodigo(texto);
  if (!codigo) return null;
  const snap = await getDoc(doc(col(), codigo));
  return snap.exists() ? snap.data() : null;
}
