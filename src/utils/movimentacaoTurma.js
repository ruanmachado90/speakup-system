// Regras de entrada e saída de aluno em turma.
//
//  - Colocar o aluno numa turma TIRA ele das outras (troca de turma), a não
//    ser que a secretaria marque "manter nas duas" (reforço, VIP + grupo…).
//    Antes, "Inserir em turma" e o formulário de Turmas só adicionavam: o
//    aluno continuava na turma antiga, na chamada e na contagem.
//  - Cancelamento tira de todas (handleCancelEnrollment).
//  - Toda entrada/saída vira um registro em `historicoTurmas` do aluno.
//  - Nada de histórico é apagado: chamadas guardam alunoId + alunoNome e as
//    notas ficam em `grades` por aluno — as telas é que passam a achá-las
//    pelas aulas (turmasDoHistorico) em vez de só pela turma atual.
import { turmasDoAluno } from './matricula';
import { idsDosMembros } from './buscarAlunos';
import { dataLocalISO } from './aulas';

export const MOTIVOS_TURMA = {
  turma: 'Colocado na turma',
  troca: 'Troca de turma',
  removido: 'Retirado da turma',
  cancelamento: 'Matrícula cancelada',
  reativacao: 'Matrícula reativada',
};

/** Linha de `historicoTurmas` do aluno. */
export const registroDeTurma = (turma, evento, motivo, agora = new Date()) => ({
  turmaId: turma.id,
  turmaNome: turma.nome || '',
  professor: turma.professor || '',
  evento, // 'entrada' | 'saida'
  motivo,
  data: dataLocalISO(agora),
  registradoEm: agora.getTime(),
});

/**
 * O que muda ao salvar a lista de alunos de uma turma.
 *  - entraram / sairam: comparando a lista de antes com a de depois;
 *  - removerDe: [{ turma, alunoId }] — turmas antigas de quem entrou, exceto
 *    quem está em `manterNasDuas`.
 */
export function planejarAlunosDaTurma({ turmaId, antes = [], depois = [], turmas = [], manterNasDuas = [] }) {
  const idsAntes = new Set(idsDosMembros(antes));
  const idsDepois = idsDosMembros(depois);
  const entraram = idsDepois.filter((id) => !idsAntes.has(id));
  const sairam = [...idsAntes].filter((id) => !idsDepois.includes(id));
  const manter = new Set(manterNasDuas);
  const outras = turmas.filter((t) => t.id !== turmaId);
  const removerDe = [];
  entraram.forEach((alunoId) => {
    if (manter.has(alunoId)) return;
    turmasDoAluno(outras, alunoId).forEach((turma) => removerDe.push({ turma, alunoId }));
  });
  return { entraram, sairam, removerDe };
}

/** Outras turmas em que o aluno está (para avisar "sai de …" no formulário). */
export const outrasTurmasDoAluno = (turmas = [], alunoId, turmaId) =>
  turmasDoAluno(turmas.filter((t) => t.id !== turmaId), alunoId);

/**
 * Turmas por onde o aluno passou, tiradas das próprias aulas (chamadas com o
 * id dele) — funciona mesmo depois que ele saiu da turma ou cancelou.
 * [{ id, nome, professor, primeira, ultima, aulas }], mais recente primeiro.
 */
export function turmasDoHistorico(aulas = [], alunoId) {
  const porTurma = new Map();
  aulas.forEach((a) => {
    if (!a.turmaId || !(a.chamadas || []).some((c) => c.alunoId === alunoId)) return;
    const atual = porTurma.get(a.turmaId) || {
      id: a.turmaId, nome: a.turmaNome || '', professor: a.professor || '', primeira: a.data, ultima: a.data, aulas: 0,
    };
    atual.aulas += 1;
    if (a.data < atual.primeira) atual.primeira = a.data;
    if (a.data > atual.ultima) { atual.ultima = a.data; atual.nome = a.turmaNome || atual.nome; }
    porTurma.set(a.turmaId, atual);
  });
  return [...porTurma.values()].sort((x, y) => (y.ultima || '').localeCompare(x.ultima || ''));
}
