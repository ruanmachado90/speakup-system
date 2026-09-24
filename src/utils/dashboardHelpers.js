/**
 * Corte da migração pro sistema (jan/2026): os alunos que já estavam
 * matriculados na escola entraram todos de uma vez no cadastro, então
 * `student.createdAt` deles é data de IMPORTAÇÃO, não de matrícula real —
 * conta como 140 "novas matrículas" em janeiro sem ter sido. Ajuste aqui se
 * a migração foi em outro mês.
 */
export const DATA_INICIO_SISTEMA = new Date(2026, 0, 31, 23, 59, 59, 999).getTime(); // fim de janeiro/2026

/** Só é "matrícula nova" de verdade se o cadastro é depois da migração. */
export const ehMatriculaReal = (student) => {
  const criado = Number(student?.createdAt);
  return Number.isFinite(criado) && criado > DATA_INICIO_SISTEMA;
};

/**
 * Só existe base de comparação pros valores financeiros, e só na visão
 * mensal — não há série histórica de alunos em lugar nenhum do sistema.
 * Compartilhado entre DashboardGestao e DashboardSecretaria.
 */
export const buildDelta = (serie, dashboardRange) => {
  if (dashboardRange !== 'month' || !serie) return null;
  const mesAtual = new Date().getMonth();
  if (mesAtual === 0) return null;
  const anterior = Number(serie[mesAtual - 1] || 0);
  const atual = Number(serie[mesAtual] || 0);
  if (!anterior) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return { direction: 'flat', text: 'igual ao mês anterior' };
  return {
    direction: pct > 0 ? 'up' : 'down',
    text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% vs. mês anterior`,
  };
};
