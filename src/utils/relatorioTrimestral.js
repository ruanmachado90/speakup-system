// KPIs do relatório trimestral que o motor financeiro (reportKPIs) não tem:
// pedagógico (aulas, registro, frequência, notas, avulsas), equipe, turmas,
// alunos (motivos de cancelamento, contratos, safra 12 meses) e comercial
// (funil de leads, aulas experimentais). Tudo puro: recebe arrays, devolve
// números — a página (pages/RelatorioTrimestral) só desenha.
import {
  calcularMes, rotuloMes, noMes, alunosAtivosNoFim, custoHoraAula,
} from './reportKPIs';
import { PARAMETROS_PADRAO } from '../config/parametros';
import { MOTIVOS_CANCELAMENTO } from './matricula';
import { idsDosMembros } from './buscarAlunos';
import { ocorrenciasDoMes, turmasDoProfessor, resumoDoProfessor } from './agendaProfessor';
import { avulsasDoProfessor, linhasDoRelatorio } from './aulasAvulsas';
import { normalizeNome } from './normalizeNome';
import { CATEGORIAS, calcularConceito, calcularMediaCategoria } from '../hooks/useNotas';

const pad = (n) => String(n).padStart(2, '0');
const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const NOMES_TRIMESTRE = ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'];
export const FAIXAS_TRIMESTRE = ['Jan–Mar', 'Abr–Jun', 'Jul–Set', 'Out–Dez'];

/** Datas do trimestre (0-3), os 3 "AAAA-MM" e o semestre das notas ("AAAA-1"/"AAAA-2"). */
export function intervaloDoTrimestre(tri, ano) {
  const meses = [0, 1, 2].map((k) => `${ano}-${pad(tri * 3 + k + 1)}`);
  return {
    inicio: `${meses[0]}-01`,
    fim: isoDia(new Date(ano, tri * 3 + 3, 0)),
    meses,
    semestre: `${ano}-${tri < 2 ? 1 : 2}`,
    rotulo: `${NOMES_TRIMESTRE[tri]} de ${ano}`,
    faixa: FAIXAS_TRIMESTRE[tri],
  };
}

/** Trimestre de uma data ("AAAA-MM-DD"). */
export const trimestreDe = (iso) => ({ tri: Math.floor((Number(iso.slice(5, 7)) - 1) / 3), ano: Number(iso.slice(0, 4)) });

/**
 * Situação do período: fechado, em andamento (dados parciais até hoje) ou futuro.
 */
export function situacaoDoPeriodo(intervalo, hojeISO) {
  if (hojeISO > intervalo.fim) return { tipo: 'fechado' };
  if (hojeISO < intervalo.inicio) return { tipo: 'futuro' };
  return { tipo: 'parcial', ate: hojeISO };
}

// ── Série de 12 meses (tendência) ──────────────────────────────────────────

/** Últimos `n` meses terminando em (mesFim, anoFim): receita, despesa, base. */
export function serieMensal(dados, mesFim, anoFim, n = 12) {
  const lista = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(anoFim, mesFim - i, 1);
    const m = calcularMes(dados, d.getMonth(), d.getFullYear());
    lista.push({
      rotulo: rotuloMes(d.getMonth(), d.getFullYear()),
      curto: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      receita: m.receitaTotal,
      despesa: m.despesaTotal,
      resultado: m.receitaTotal - m.despesaTotal,
      ativos: m.alunosAtivos,
      mrr: m.mrr.disponivel ? m.mrr.valor : null,
      novas: m.novasMatriculas,
      cancelamentos: m.cancelamentos,
    });
  }
  return lista;
}

// ── Alunos ─────────────────────────────────────────────────────────────────

const noTrimestre = (raw, tri, ano) => [0, 1, 2].some((k) => noMes(raw, tri * 3 + k, ano));

/** Cancelamentos do trimestre agrupados pelo motivo registrado. */
export function motivosDeCancelamento(students = [], tri, ano) {
  const cont = new Map();
  students
    .filter((s) => s.status === 'cancelado' && noTrimestre(s.canceledAt, tri, ano))
    .forEach((s) => {
      const motivo = MOTIVOS_CANCELAMENTO.includes(s.cancelReason) ? s.cancelReason : s.cancelReason ? 'Outro' : 'Sem motivo registrado';
      cont.set(motivo, (cont.get(motivo) || 0) + 1);
    });
  return [...cont.entries()].map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd);
}

/** Alunos ativos no fim do período com contrato assinado (ids em `assinados`). */
export function coberturaDeContratos(ativos = [], assinados = new Set()) {
  const comContrato = ativos.filter((a) => assinados.has(a.id)).length;
  return { assinados: comContrato, total: ativos.length, pct: ativos.length ? (comContrato / ativos.length) * 100 : null };
}

/** Ativos sem turma e em mais de uma turma (fim do período). */
export function situacaoDeTurma(ativos = [], turmas = []) {
  const contagem = new Map();
  turmas.forEach((t) => idsDosMembros(t.alunosIds).forEach((id) => contagem.set(id, (contagem.get(id) || 0) + 1)));
  return {
    semTurma: ativos.filter((a) => !contagem.get(a.id)).length,
    emVarias: ativos.filter((a) => (contagem.get(a.id) || 0) > 1).length,
  };
}

/** Ativos por curso e book (fim do período). */
export function alunosPorCursoBook(ativos = []) {
  const mapa = new Map();
  ativos.forEach((a) => {
    const chave = `${(a.course || 'Sem curso').trim()}${a.book ? ` ${a.book}` : ''}`;
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  });
  return [...mapa.entries()].map(([grupo, qtd]) => ({ grupo, qtd })).sort((a, b) => b.qtd - a.qtd);
}

// ── Comercial ──────────────────────────────────────────────────────────────

const STATUS_LEAD = ['novo', 'contato', 'matriculado', 'perdido'];

/** Leads criados no trimestre por status (funil). */
export function funilDeLeads(leads = [], tri, ano) {
  const doTri = leads.filter((l) => noTrimestre(l.createdAt ?? l.date, tri, ano));
  const por = Object.fromEntries(STATUS_LEAD.map((s) => [s, 0]));
  let outros = 0;
  doTri.forEach((l) => {
    const s = String(l.status || 'novo').toLowerCase();
    if (s in por) por[s] += 1;
    else if (s === 'convertido') por.matriculado += 1;
    else outros += 1;
  });
  return { total: doTri.length, ...por, outros };
}

/** Compromissos da agenda do trimestre por tipo (experimental, reposição…). */
export function compromissosPorTipo(eventos = []) {
  const por = {};
  eventos.forEach((e) => { por[e.tipo || 'outro'] = (por[e.tipo || 'outro'] || 0) + 1; });
  return por;
}

// ── Pedagógico ─────────────────────────────────────────────────────────────

const realizada = (a) => !a.status || a.status === 'realizada';

/** Frequência (%) numa lista de aulas: presentes ÷ chamadas, só realizadas. */
export function frequenciaDasAulas(aulas = []) {
  let presentes = 0;
  let total = 0;
  aulas.filter(realizada).forEach((a) => (a.chamadas || []).forEach((c) => {
    total += 1;
    if (c.status === 'presente') presentes += 1;
  }));
  return total ? { pct: (presentes / total) * 100, presentes, total } : { pct: null, presentes: 0, total: 0 };
}

/**
 * Alunos com frequência abaixo de `limite`% no período (mínimo de
 * `minAulas` aulas com chamada, senão uma falta vira 0%).
 */
export function alunosEmRisco(aulas = [], { limite = 75, minAulas = 3, students = [] } = {}) {
  const porAluno = new Map();
  aulas.filter(realizada).forEach((a) => (a.chamadas || []).forEach((c) => {
    const atual = porAluno.get(c.alunoId) || { alunoId: c.alunoId, nome: c.alunoNome || '', turma: a.turmaNome || '', presentes: 0, total: 0 };
    atual.total += 1;
    if (c.status === 'presente') atual.presentes += 1;
    if (a.turmaNome) atual.turma = a.turmaNome;
    porAluno.set(c.alunoId, atual);
  }));
  const ativos = new Map(students.map((s) => [s.id, s]));
  return [...porAluno.values()]
    .filter((x) => x.total >= minAulas && (x.presentes / x.total) * 100 < limite)
    .filter((x) => !ativos.size || ativos.get(x.alunoId)?.status !== 'cancelado')
    .map((x) => ({ ...x, nome: ativos.get(x.alunoId)?.name || x.nome || 'Aluno', pct: (x.presentes / x.total) * 100 }))
    .sort((a, b) => a.pct - b.pct);
}

/** Linhas do relatório de aulas (grade + avulsas) de um conjunto de turmas no trimestre. */
function linhasDoTrimestre(turmas, intervalo, aulas, avulsas, opcoes) {
  const ocorrencias = intervalo.meses.flatMap((m) => ocorrenciasDoMes(turmas, m, aulas, opcoes));
  return linhasDoRelatorio(ocorrencias, avulsas);
}

const resumirLinhas = (linhas) => {
  const dadas = linhas.filter((l) => l.situacao === 'dada');
  const regulares = dadas.filter((l) => l.tipo === 'regular').length;
  const naoRegistradas = linhas.filter((l) => l.situacao === 'nao-registrada').length;
  return {
    previstas: regulares + naoRegistradas,
    dadas: regulares,
    naoRegistradas,
    semAula: linhas.filter((l) => l.situacao === 'sem-aula').length,
    reposicoes: dadas.filter((l) => l.tipo === 'reposicao').length,
    extras: dadas.filter((l) => l.tipo === 'extra').length,
    minutosDados: dadas.reduce((s, l) => s + l.minutos, 0),
    registroPct: regulares + naoRegistradas ? (regulares / (regulares + naoRegistradas)) * 100 : null,
  };
};

/**
 * Pedagógico do trimestre: geral, por turma e por professor.
 * `aulas` / `avulsas` / `eventos` = só as do trimestre (já filtradas por data).
 */
export function pedagogicoDoTrimestre({
  turmas = [], aulas = [], avulsas = [], eventos = [], students = [], professores = [],
  intervalo, diaNaoLetivo, hojeISO, agoraMin = 0, params = PARAMETROS_PADRAO,
}) {
  const opcoes = { diaNaoLetivo, hojeISO, agoraMin };
  const geral = resumirLinhas(linhasDoTrimestre(turmas, intervalo, aulas, avulsas, opcoes));
  const realizadas = aulas.filter(realizada);
  const freq = frequenciaDasAulas(aulas);

  const porTurma = turmas.map((t) => {
    const aulasT = aulas.filter((a) => a.turmaId === t.id);
    const r = resumirLinhas(linhasDoTrimestre([t], intervalo, aulas, avulsas.filter((v) => v.turmaId === t.id), opcoes));
    return { id: t.id, nome: t.nome || 'Turma sem nome', professor: t.professor || '—', ...r, frequencia: frequenciaDasAulas(aulasT).pct };
  }).sort((a, b) => (a.professor || '').localeCompare(b.professor || '') || a.nome.localeCompare(b.nome));

  const custoHora = custoHoraAula(params);
  const porProfessor = professores.filter((p) => p.status !== 'inativo').map((p) => {
    const turmasP = turmasDoProfessor(turmas, p);
    const idsT = new Set(turmasP.map((t) => t.id));
    const avulsasP = avulsasDoProfessor(avulsas, p, turmasP);
    const r = resumirLinhas(linhasDoTrimestre(turmasP, intervalo, aulas, avulsasP, opcoes));
    const resumo = resumoDoProfessor(turmasP, students);
    return {
      id: p.id,
      nome: p.nome,
      turmas: resumo.turmas,
      alunos: resumo.alunos,
      horasSemana: resumo.horasSemana,
      ...r,
      frequencia: frequenciaDasAulas(aulas.filter((a) => idsT.has(a.turmaId))).pct,
      custoEstimado: (r.minutosDados / 60) * custoHora,
    };
  }).filter((p) => p.turmas > 0 || p.previstas > 0 || p.reposicoes + p.extras > 0)
    .sort((a, b) => b.minutosDados - a.minutosDados);

  return {
    geral: {
      ...geral,
      frequencia: freq.pct,
      chamadas: freq.total,
      semConteudo: realizadas.filter((a) => !String(a.conteudo || '').trim()).length,
      semChamada: realizadas.filter((a) => !(a.chamadas || []).length).length,
      compromissos: compromissosPorTipo(eventos),
      custoEstimado: (geral.minutosDados / 60) * custoHora,
    },
    porTurma,
    porProfessor,
    emRisco: alunosEmRisco(aulas, { students }),
  };
}

// ── Notas ──────────────────────────────────────────────────────────────────

const ORDEM_CONCEITOS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'C-', 'D', 'F'];

/**
 * Notas do semestre: total 0-100 por aluno (só com as 3 partes lançadas,
 * igual à tela de Notas), média por turma e distribuição de conceitos.
 */
export function notasDoSemestre({ avaliacoes = [], grades = [], turmas = [] }) {
  const avsPorTurma = new Map();
  avaliacoes.forEach((av) => avsPorTurma.set(av.turmaId, [...(avsPorTurma.get(av.turmaId) || []), av]));
  const nomeTurma = new Map(turmas.map((t) => [t.id, t]));
  const totais = [];
  const parciais = { lancados: 0 };
  grades.forEach((g) => {
    const avs = avsPorTurma.get(g.turmaId) || [];
    const medias = CATEGORIAS.map((c) => calcularMediaCategoria(avs.filter((a) => a.tipo === c.tipo), g.scores || {}, c.max));
    if (medias.some((m) => m != null)) parciais.lancados += 1;
    if (medias.every((m) => m != null)) totais.push({ turmaId: g.turmaId, studentId: g.studentId, total: medias.reduce((s, m) => s + m, 0) });
  });
  const conceitos = Object.fromEntries(ORDEM_CONCEITOS.map((c) => [c, 0]));
  totais.forEach((t) => { conceitos[calcularConceito(t.total)] += 1; });
  const porTurmaMap = new Map();
  totais.forEach((t) => {
    const atual = porTurmaMap.get(t.turmaId) || { soma: 0, n: 0 };
    porTurmaMap.set(t.turmaId, { soma: atual.soma + t.total, n: atual.n + 1 });
  });
  const porTurma = [...porTurmaMap.entries()].map(([id, { soma, n }]) => ({
    id, nome: nomeTurma.get(id)?.nome || 'Turma apagada', professor: nomeTurma.get(id)?.professor || '—', media: soma / n, alunos: n,
  })).sort((a, b) => b.media - a.media);
  return {
    alunosComNota: parciais.lancados,
    alunosComTotal: totais.length,
    media: totais.length ? totais.reduce((s, t) => s + t.total, 0) / totais.length : null,
    abaixoDe60: totais.filter((t) => t.total < 60).length,
    conceitos,
    porTurma,
    turmasComProva: avsPorTurma.size,
  };
}

// ── Montagem completa ──────────────────────────────────────────────────────

/**
 * Alertas pedagógicos e de cadastro, no mesmo formato de gerarAlertas
 * ({ nivel, titulo, detalhe }), para entrar no sumário executivo.
 */
export function alertasOperacionais({ ped, notas, contratos, turmaSit }) {
  const a = [];
  if (ped.geral.registroPct != null && ped.geral.registroPct < 90) {
    a.push({ nivel: ped.geral.registroPct < 75 ? 'critico' : 'atencao', titulo: 'Aulas sem registro', detalhe: `${ped.geral.naoRegistradas} aula(s) que já passaram não foram registradas (${pct(ped.geral.registroPct)} de registro). Sem registro não há chamada nem conteúdo.` });
  }
  if (ped.emRisco.length) {
    a.push({ nivel: 'atencao', titulo: `${ped.emRisco.length} aluno(s) com frequência abaixo de 75%`, detalhe: `Risco de reprovação por falta e de cancelamento. Pior caso: ${ped.emRisco[0].nome} (${pct(ped.emRisco[0].pct, 0)}).` });
  }
  if (notas.abaixoDe60 > 0) {
    a.push({ nivel: 'atencao', titulo: `${notas.abaixoDe60} aluno(s) com nota abaixo de 60`, detalhe: 'Conceito D ou F no semestre: plano de recuperação com o professor.' });
  }
  if (contratos.pct != null && contratos.pct < 100) {
    a.push({ nivel: contratos.pct < 80 ? 'atencao' : 'info', titulo: `${contratos.total - contratos.assinados} aluno(s) ativo(s) sem contrato assinado`, detalhe: `Cobertura de ${pct(contratos.pct, 0)} da base ativa.` });
  }
  if (turmaSit.semTurma > 0) a.push({ nivel: 'info', titulo: `${turmaSit.semTurma} aluno(s) ativo(s) sem turma`, detalhe: 'Pagando mensalidade sem estar em turma — conferir em Alunos → Sem turma.' });
  if (turmaSit.emVarias > 0) a.push({ nivel: 'info', titulo: `${turmaSit.emVarias} aluno(s) em mais de uma turma`, detalhe: 'Conferir se é de propósito ou troca que não tirou da turma antiga (Alunos → Em 2+ turmas).' });
  return a;
}

/**
 * Ações pedagógicas e de cadastro para o plano de ação (mesmo formato de
 * planoDeAcao: { prioridade, area, acao, porque }). O plano do motor
 * financeiro não olha aulas, frequência, notas nem contratos.
 */
export function planoOperacional({ ped, notas, contratos, turmaSit }) {
  const acoes = [];
  const pendentes = ped.porProfessor.filter((p) => p.naoRegistradas > 0).sort((a, b) => b.naoRegistradas - a.naoRegistradas);
  if (ped.geral.registroPct != null && ped.geral.registroPct < 90) {
    acoes.push({
      prioridade: ped.geral.registroPct < 75 ? 1 : 2, area: 'Registro de aulas',
      acao: `Cobrar o lançamento das aulas pendentes${pendentes.length ? `, começando por ${pendentes.slice(0, 2).map((p) => `${p.nome.split(' ')[0]} (${p.naoRegistradas})`).join(' e ')}` : ''}. A agenda de cada professor (Agenda) mostra em âmbar o que falta.`,
      porque: `${pct(ped.geral.registroPct, 0)} das aulas registradas; sem registro não há chamada, conteúdo nem frequência confiável.`,
    });
  }
  if (ped.emRisco.length) {
    acoes.push({
      prioridade: 2, area: 'Frequência',
      acao: `Contatar as famílias dos ${ped.emRisco.length} aluno(s) abaixo de 75% e combinar reposição com o professor.`,
      porque: 'Falta recorrente antecede cancelamento e reprova por frequência.',
    });
  }
  if (notas.abaixoDe60 > 0) {
    acoes.push({
      prioridade: 2, area: 'Desempenho',
      acao: `Plano de recuperação para os ${notas.abaixoDe60} aluno(s) com nota abaixo de 60 (aula de reforço ou reposição).`,
      porque: `Média geral do semestre ${notas.media == null ? '—' : notas.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}.`,
    });
  }
  if (contratos.pct != null && contratos.pct < 100) {
    acoes.push({
      prioridade: 3, area: 'Contratos',
      acao: `Enviar o contrato para assinatura aos ${contratos.total - contratos.assinados} aluno(s) ativo(s) sem contrato.`,
      porque: `Cobertura de ${pct(contratos.pct, 0)}; sem contrato a cobrança fica frágil.`,
    });
  }
  if (turmaSit.semTurma > 0) {
    acoes.push({ prioridade: 2, area: 'Cadastro', acao: `Colocar em turma os ${turmaSit.semTurma} aluno(s) ativo(s) sem turma (Alunos → Sem turma).`, porque: 'Aluno pagando sem turma não aparece em chamada nem em nota.' });
  }
  return acoes;
}

const pct = (v, casas = 1) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`);

// ── Equipe × financeiro ────────────────────────────────────────────────────

/** Receita (mensalidades ativas) atribuída a cada professor pelo nome do aluno. */
export function receitaDoProfessor(students = [], professor, mesFim, anoFim) {
  const chave = normalizeNome(professor?.nome);
  const ativos = alunosAtivosNoFim(students, mesFim, anoFim);
  const doProf = ativos.filter((a) => (a.professorId && a.professorId === professor?.id) || normalizeNome(a.teacher) === chave);
  return { alunos: doProf.length, receitaMensal: doProf.reduce((s, a) => s + (Number(a.fee) || 0), 0) };
}
