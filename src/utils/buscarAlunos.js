import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from './constants';

const colStudents = () => collection(db, 'artifacts', APP_ID, 'public', 'data', 'students');

// Turmas antigas guardam alunosIds como objetos ({ id, nome }).
export const idsDosMembros = (alunosIds = []) =>
  [...new Set(alunosIds.map((m) => (m && typeof m === 'object' ? m.id : m)).filter(Boolean))];

/**
 * Busca só os alunos pedidos, por id — em vez de baixar a coleção inteira de
 * alunos (com CPF, endereço etc. de todo mundo) pra montar a lista de uma
 * turma. O Firestore aceita até 30 valores num `in`, então vai em lotes.
 * Custo: 1 leitura por aluno da turma, não 1 por aluno da escola.
 */
export async function buscarAlunosPorIds(ids = []) {
  const unicos = idsDosMembros(ids);
  if (unicos.length === 0) return [];
  const lotes = [];
  for (let i = 0; i < unicos.length; i += 30) lotes.push(unicos.slice(i, i + 30));
  const snaps = await Promise.all(
    lotes.map((lote) => getDocs(query(colStudents(), where(documentId(), 'in', lote))))
  );
  return snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
}

/**
 * Alunos de várias turmas com uma busca só (ids somados, sem repetir aluno
 * que está em duas turmas). Devolve { [turmaId]: aluno[] }.
 */
export async function buscarAlunosDasTurmas(turmas = []) {
  const todos = await buscarAlunosPorIds(turmas.flatMap((t) => t.alunosIds || []));
  const porId = new Map(todos.map((a) => [a.id, a]));
  return Object.fromEntries(
    turmas.map((t) => [t.id, idsDosMembros(t.alunosIds).map((id) => porId.get(id)).filter(Boolean)])
  );
}
