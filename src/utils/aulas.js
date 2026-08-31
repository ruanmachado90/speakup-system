// Helpers compartilhados de aulas — usados pelo painel do professor, relatórios
// e modais de frequência para que todas as telas cheguem no mesmo número.

/**
 * Data de hoje (ou de uma data qualquer) no formato YYYY-MM-DD **no fuso local**.
 * `toISOString()` devolve UTC: em Brasília (UTC-3), a partir das 21h ele já
 * retorna o dia seguinte — e as turmas são às 20h.
 */
export function dataLocalISO(date = new Date()) {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD no fuso local
}

/**
 * Uma aula conta como realizada quando não é feriado/cancelada/recesso.
 * Aulas gravadas antes do campo `status` existir não têm o campo — essas são
 * tratadas como realizadas (é o que elas eram).
 */
export function isAulaRealizada(aula) {
  return !aula?.status || aula.status === 'realizada';
}

/** Filtra só as aulas que entram em cálculo de frequência. */
export function aulasRealizadas(aulas) {
  return (aulas || []).filter(isAulaRealizada);
}

/**
 * Frequência média da turma (% de presença por aula, com média entre aulas).
 * Considera apenas aulas realizadas que tenham chamada registrada.
 * Retorna null quando não há base para calcular.
 */
export function frequenciaMediaTurma(aulasDaTurma) {
  const comChamada = aulasRealizadas(aulasDaTurma).filter(a => (a.chamadas || []).length > 0);
  if (comChamada.length === 0) return null;
  const soma = comChamada.reduce((acc, a) => {
    const chamadas = a.chamadas || [];
    const presentes = chamadas.filter(c => c.status === 'presente').length;
    return acc + presentes / chamadas.length;
  }, 0);
  return Math.round((soma / comChamada.length) * 100);
}

/**
 * Frequência de um aluno específico numa lista de aulas.
 * Conta apenas as aulas realizadas em que o aluno aparece na chamada — assim
 * alunos que entraram no meio do semestre não são penalizados.
 * Retorna null quando não há base para calcular.
 */
export function frequenciaAluno(aulasDaTurma, alunoId) {
  const registros = aulasRealizadas(aulasDaTurma)
    .map(a => (a.chamadas || []).find(c => c.alunoId === alunoId))
    .filter(Boolean);
  if (registros.length === 0) return null;
  const presencas = registros.filter(c => c.status === 'presente').length;
  return Math.round((presencas / registros.length) * 100);
}
