// Aulas avulsas (reposição, aula extra) e o relatório mensal de aulas do
// professor. Avulsa fica na coleção `aulasAvulsas`, separada de `aulas`, de
// propósito: não conta no "x de 40 aulas" da turma, não entra na frequência
// nem vai para o "My progress" do LMS — só registra que a aula foi dada.
import { normalizeNome } from './normalizeNome';
import { horaEmMinutos } from './professorDashboard';
import { resolverNomeProfessor } from './professores';
import { DURACAO_PADRAO_MIN, faixaDaAula } from './agendaProfessor';

export const TIPOS_AVULSA = {
  reposicao: 'Reposição',
  extra: 'Aula extra',
};

/** Erro do formulário de aula avulsa, ou ''. */
export function validarAulaAvulsa({ tipo, turmaId, data, inicio, fim, alunosIds = [], conteudo } = {}) {
  if (!TIPOS_AVULSA[tipo]) return 'Escolha se é reposição ou aula extra.';
  if (!turmaId) return 'Escolha a turma.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return 'Escolha a data.';
  const ini = horaEmMinutos(inicio);
  const f = horaEmMinutos(fim);
  if (!Number.isFinite(ini) || !Number.isFinite(f)) return 'Informe o horário de início e de fim.';
  if (f <= ini) return 'O fim precisa ser depois do início.';
  if (alunosIds.length === 0) return 'Marque quem participou da aula.';
  if (!String(conteudo || '').trim()) return 'Descreva o conteúdo da aula.';
  return '';
}

/**
 * Documento a gravar. `professor` é o nome que as regras do Firestore
 * conferem com a conta de quem grava (como em `aulas`).
 */
export function montarAulaAvulsa(form, { turma, alunos, professorNome, professorId = null, professorSlug = null, origem, criadoPor = null }) {
  const escolhidos = new Set(form.alunosIds);
  return {
    tipo: form.tipo,
    data: form.data,
    inicio: form.inicio,
    fim: form.fim,
    turmaId: turma.id,
    turmaNome: turma.nome || '',
    alunos: alunos.filter((a) => escolhidos.has(a.id)).map((a) => ({ alunoId: a.id, nome: a.name || a.nome || '' })),
    conteudo: form.conteudo.trim(),
    observacoes: (form.observacoes || '').trim(),
    professor: professorNome,
    professorKey: normalizeNome(professorNome),
    professorId: professorId || turma.professorId || null,
    professorSlug,
    origem,
    criadoPor,
    createdAt: Date.now(),
  };
}

/** Avulsas do professor: pelo id, pelo nome ou pela turma dele. */
export function avulsasDoProfessor(avulsas = [], professor, turmasProf = []) {
  if (!professor) return [];
  const chave = normalizeNome(professor.nome);
  const turmaIds = new Set(turmasProf.map((t) => t.id));
  return avulsas.filter((a) =>
    (a.professorId && a.professorId === professor.id) ||
    (!!a.professorKey && a.professorKey === chave) ||
    turmaIds.has(a.turmaId)
  );
}

const faixaDaAvulsa = (a) => {
  const inicio = horaEmMinutos(a.inicio);
  const fimLido = horaEmMinutos(a.fim);
  const fim = Number.isFinite(fimLido) && fimLido > inicio ? fimLido : inicio + DURACAO_PADRAO_MIN;
  return { inicio, fim };
};

/** Avulsas como itens da grade semanal. */
export function itensDeAvulsas(avulsas = [], dias = []) {
  return avulsas
    .map((a) => {
      const diaIndice = dias.indexOf(a.data);
      const { inicio, fim } = faixaDaAvulsa(a);
      if (diaIndice < 0 || !Number.isFinite(inicio)) return null;
      return { id: `avulsa|${a.id}`, tipo: 'avulsa', avulsa: a, iso: a.data, diaIndice, inicio, fim };
    })
    .filter(Boolean);
}

// ── Relatório do mês ───────────────────────────────────────────────────────

const ROTULO_SEM_AULA = { cancelada: 'Cancelada', feriado: 'Feriado', recesso: 'Recesso' };

/**
 * Aulas que o professor deu em turmas que não existem mais (turma apagada no
 * fim do semestre, por exemplo). A grade atual não as alcança, então o
 * relatório de um mês passado perderia essas aulas. O dono vem do nome
 * gravado na aula, resolvido contra o diretório ("BÁRBARA" → "Bárbara Dias").
 */
export function aulasDeTurmasApagadas(aulas = [], todasTurmas = [], professor, professores = []) {
  if (!professor) return [];
  const existentes = new Set(todasTurmas.map((t) => t.id));
  return aulas.filter((a) =>
    !existentes.has(a.turmaId) && resolverNomeProfessor(a, professores, 'professor') === professor.nome
  );
}

/**
 * Linhas do relatório: aulas da grade que já passaram (dadas, sem aula ou
 * não registradas) + avulsas + aulas de turmas apagadas. Futuro fica de fora.
 */
export function linhasDoRelatorio(ocorrencias = [], avulsas = [], orfas = []) {
  const linhas = [];
  orfas.forEach((a) => {
    const gravado = faixaDaAula(a);
    const realizada = !a.status || a.status === 'realizada';
    const chamadas = a.chamadas || [];
    linhas.push({
      id: `orfa|${a.id}`,
      iso: a.data,
      inicio: gravado ? gravado.inicio : 8 * 60,
      fim: gravado ? gravado.fim : 8 * 60 + DURACAO_PADRAO_MIN,
      minutos: gravado ? gravado.fim - gravado.inicio : DURACAO_PADRAO_MIN,
      estimado: !gravado,
      foraDaGrade: false,
      turmaApagada: true,
      turmaNome: a.turmaNome || 'Turma apagada',
      tipo: 'regular',
      situacao: realizada ? 'dada' : 'sem-aula',
      detalhe: realizada ? '' : ROTULO_SEM_AULA[a.status] || a.status,
      presentes: chamadas.filter((c) => c.status === 'presente').length,
      total: chamadas.length,
      conteudo: a.conteudo || '',
    });
  });
  ocorrencias.forEach((o) => {
    if (o.status === 'prevista' || o.status === 'hoje' || o.status === 'carregando') return;
    const chamadas = o.aula?.chamadas || [];
    const situacao = o.status === 'registrada' ? 'dada' : o.status === 'pendente' ? 'nao-registrada' : 'sem-aula';
    linhas.push({
      id: o.id,
      iso: o.iso,
      inicio: o.inicio,
      fim: o.fim,
      minutos: o.fim - o.inicio,
      estimado: o.estimado,
      foraDaGrade: !!o.foraDaGrade,
      turmaNome: o.turma.nome || 'Turma sem nome',
      tipo: 'regular',
      situacao,
      detalhe: situacao === 'sem-aula' ? (o.aula ? ROTULO_SEM_AULA[o.aula.status] || o.aula.status : o.naoLetivo) : '',
      presentes: chamadas.filter((c) => c.status === 'presente').length,
      total: chamadas.length,
      conteudo: o.aula?.conteudo || '',
    });
  });
  avulsas.forEach((a) => {
    const { inicio, fim } = faixaDaAvulsa(a);
    const n = (a.alunos || []).length;
    linhas.push({
      id: `avulsa|${a.id}`,
      iso: a.data,
      inicio,
      fim,
      minutos: fim - inicio,
      estimado: false,
      foraDaGrade: false,
      turmaNome: a.turmaNome || 'Turma sem nome',
      tipo: a.tipo,
      situacao: 'dada',
      detalhe: (a.alunos || []).map((x) => x.nome).filter(Boolean).join(', '),
      presentes: n,
      total: n,
      conteudo: a.conteudo || '',
      avulsa: a,
    });
  });
  return linhas.sort((x, y) => x.iso.localeCompare(y.iso) || x.inicio - y.inicio);
}

export function totaisDoRelatorio(linhas = []) {
  const dadas = linhas.filter((l) => l.situacao === 'dada');
  return {
    aulasDadas: dadas.filter((l) => l.tipo === 'regular').length,
    avulsasDadas: dadas.filter((l) => l.tipo !== 'regular').length,
    minutosDados: dadas.reduce((s, l) => s + l.minutos, 0),
    semAula: linhas.filter((l) => l.situacao === 'sem-aula').length,
    naoRegistradas: linhas.filter((l) => l.situacao === 'nao-registrada').length,
    horarioEstimado: dadas.some((l) => l.estimado),
  };
}

/** "Novembro de 2026" */
export const rotuloMes = (anoMes) => {
  const texto = new Date(`${anoMes}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const ultimoDiaDoMes = (anoMes) => {
  const [a, m] = anoMes.split('-').map(Number);
  return `${anoMes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
};

export const somarMeses = (anoMes, n) => {
  const [a, m] = anoMes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
