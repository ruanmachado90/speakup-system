/**
 * Parâmetros de negócio da SpeakUp usados pelos relatórios.
 *
 * Estes são os PADRÕES. Em produção eles são sobrescritos pelo documento
 * `artifacts/<APP_ID>/public/data/config/parametros` no Firestore (editável
 * pela tela de Configurações). Nunca hardcodar estes valores fora daqui.
 *
 * Custo do professor (regime CLT):
 *   custo da turma no mês = horas/mês da turma × valorHoraAula × (1 + encargos%)
 *   Ex.: 4h × R$ 23 × 1,70 = R$ 156,40 ;  8h × R$ 23 × 1,70 = R$ 312,80
 *
 * A mensalidade é individual por aluno (`student.fee`) — não há "mensalidade
 * padrão" na config; o que varia entre cursos já entra pelo cadastro do aluno.
 */

export const PARAMETROS_PADRAO = {
  // Custo do professor
  valorHoraAula: 23,        // R$ pagos ao professor por hora-aula
  encargosProfessorPct: 70, // % de encargos sobre a hora-aula (fator CLT ≈ 70%)
  horasMensaisPadraoTurma: 4, // usado quando a turma não tem "horas/mês" cadastrado

  // Metas para os alertas automáticos do relatório
  metaChurnPct: 5,
  metaInadimplenciaPct: 5,
  metaOcupacaoPct: 60,
};

/** Mescla os parâmetros salvos com os padrões, ignorando campos inválidos. */
export function resolverParametros(salvos) {
  const out = { ...PARAMETROS_PADRAO };
  if (salvos && typeof salvos === 'object') {
    for (const chave of Object.keys(PARAMETROS_PADRAO)) {
      const v = Number(salvos[chave]);
      if (Number.isFinite(v) && v >= 0) out[chave] = v;
    }
  }
  return out;
}

/** Custo efetivo de uma hora-aula, já com encargos. */
export function custoHoraAula(params = PARAMETROS_PADRAO) {
  return Number(params.valorHoraAula || 0) * (1 + Number(params.encargosProfessorPct || 0) / 100);
}
