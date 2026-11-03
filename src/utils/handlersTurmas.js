// Gravação das regras de utils/movimentacaoTurma: a turma nova, a saída das
// turmas antigas e o histórico do aluno vão no MESMO lote (writeBatch) —
// ou grava tudo, ou nada. Antes eram gravações soltas e o aluno ficava nas
// duas turmas quando a segunda falhava ou nem era feita.
import { collection, doc, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from './constants';
import { alunosIdsSem, alunosIdsCom } from './matricula';
import { buscarAlunosPorIds } from './buscarAlunos';
import { planejarAlunosDaTurma, registroDeTurma } from './movimentacaoTurma';

const refAluno = (id) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'students', id);

const lerTurmas = async () =>
  (await getDocs(collection(db, 'turmas'))).docs.map((d) => ({ id: d.id, ...d.data() }));

/**
 * Acrescenta ao lote o que acompanha uma mudança na lista de alunos da turma
 * `turmaId` (que quem chama já grava): tira quem entrou das outras turmas e
 * registra entrada/saída em `historicoTurmas`. Lê as turmas na hora — nunca
 * confia na lista da tela, que pode estar velha.
 */
export async function juntarMovimentacao(batch, { turmaId, turma, antes = [], depois = [], manterNasDuas = [], turmas = null }) {
  const todas = turmas || await lerTurmas();
  const plano = planejarAlunosDaTurma({ turmaId, antes, depois, turmas: todas, manterNasDuas });
  const agora = new Date();
  const destino = { id: turmaId, ...turma };

  const turmasAlteradas = new Map();
  const historico = new Map(); // alunoId -> registros
  const anotar = (alunoId, registro) => historico.set(alunoId, [...(historico.get(alunoId) || []), registro]);

  plano.removerDe.forEach(({ turma: antiga, alunoId }) => {
    const atual = turmasAlteradas.get(antiga.id) || antiga;
    turmasAlteradas.set(antiga.id, { ...atual, alunosIds: alunosIdsSem(atual, alunoId) });
    anotar(alunoId, registroDeTurma(antiga, 'saida', 'troca', agora));
  });
  turmasAlteradas.forEach((t) => {
    batch.update(doc(db, 'turmas', t.id), { alunosIds: t.alunosIds, alunosCount: t.alunosIds.length, updatedAt: agora.toISOString() });
  });

  const trocaram = new Set(plano.removerDe.map((r) => r.alunoId));
  plano.entraram.forEach((id) => anotar(id, registroDeTurma(destino, 'entrada', trocaram.has(id) ? 'troca' : 'turma', agora)));
  plano.sairam.forEach((id) => anotar(id, registroDeTurma(destino, 'saida', 'removido', agora)));

  // Só escreve histórico em aluno que existe: turma antiga pode guardar id de
  // aluno apagado, e um update num documento inexistente derruba o lote todo.
  const existentes = new Set((await buscarAlunosPorIds([...historico.keys()])).map((a) => a.id));
  historico.forEach((registros, alunoId) => {
    if (existentes.has(alunoId)) batch.update(refAluno(alunoId), { historicoTurmas: arrayUnion(...registros) });
  });
  return plano;
}

/**
 * Limpeza única: alunos já cancelados que ficaram em turmas (antes o
 * cancelamento não tirava). `turmas`/`students` vêm do estado da tela; devolve
 * quantos saíram. Registra `turmasNoCancelamento` no aluno se ainda não tiver.
 */
export const removerCanceladosDasTurmas = async (turmas, students) => {
  const cancelados = new Map(students.filter((s) => s.status === 'cancelado').map((s) => [s.id, s]));
  const batch = writeBatch(db);
  const saidasPorAluno = new Map();
  let removidos = 0;

  for (const t of turmas) {
    let ids = t.alunosIds || [];
    for (const alunoId of ids.map((m) => (m && typeof m === 'object' ? m.id : m))) {
      if (!cancelados.has(alunoId)) continue;
      ids = alunosIdsSem({ alunosIds: ids }, alunoId);
      removidos += 1;
      if (!saidasPorAluno.has(alunoId)) saidasPorAluno.set(alunoId, []);
      saidasPorAluno.get(alunoId).push({ id: t.id, nome: t.nome || '', professor: t.professor || '' });
    }
    if (ids.length !== (t.alunosIds || []).length) {
      batch.update(doc(db, 'turmas', t.id), { alunosIds: ids, alunosCount: ids.length, updatedAt: new Date().toISOString() });
    }
  }
  saidasPorAluno.forEach((saidas, alunoId) => {
    const update = { historicoTurmas: arrayUnion(...saidas.map((t) => registroDeTurma(t, 'saida', 'cancelamento'))) };
    if (!cancelados.get(alunoId).turmasNoCancelamento) update.turmasNoCancelamento = saidas.map(({ id, nome }) => ({ id, nome }));
    batch.update(refAluno(alunoId), update);
  });

  if (removidos > 0) await batch.commit();
  return removidos;
};

/**
 * "Inserir em turma" da tela de Alunos: coloca o aluno na turma e, por
 * padrão, tira das outras (troca). `manterNasOutras` = ficar nas duas.
 * Devolve as turmas de onde saiu.
 */
export async function colocarAlunoNaTurma(alunoId, turmaDestinoId, { manterNasOutras = false } = {}) {
  const turmas = await lerTurmas();
  const destino = turmas.find((t) => t.id === turmaDestinoId);
  if (!destino) throw new Error('Turma não encontrada.');
  const depois = alunosIdsCom(destino, alunoId);
  const batch = writeBatch(db);
  batch.update(doc(db, 'turmas', destino.id), { alunosIds: depois, alunosCount: depois.length, updatedAt: new Date().toISOString() });
  const plano = await juntarMovimentacao(batch, {
    turmaId: destino.id, turma: destino, antes: destino.alunosIds || [], depois,
    manterNasDuas: manterNasOutras ? [alunoId] : [], turmas,
  });
  await batch.commit();
  return plano.removerDe.map((r) => r.turma);
}
