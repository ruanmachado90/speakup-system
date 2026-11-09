// Agenda semanal do professor (página /agenda/:professorId): cruza os horários
// das turmas com as aulas registradas (gestão ou LMS, que grava na mesma
// coleção `aulas`) e com os compromissos avulsos de `agendaEventos`.
// Tudo aqui é puro — a página só busca os dados e desenha.
import { normalizeNome } from './normalizeNome';
import { idsDosMembros } from './buscarAlunos';
import { gerarFeriadosNacionais, dataNoIntervalo } from './calendarioLetivo';
import { horaEmMinutos } from './professorDashboard';

// Turma sem horário de término (cadastro antigo) aparece com 1h na agenda.
export const DURACAO_PADRAO_MIN = 60;

export const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const NOMES_DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Posição na semana (0 = segunda … 6 = domingo) do nome gravado na turma.
const INDICE_DIA = {
  segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6,
  seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, dom: 6,
};
export function indiceDoDia(nome = '') {
  const chave = normalizeNome(nome).replace(/-feira$/, '');
  return INDICE_DIA[chave] ?? -1;
}

// ── Datas (sempre "AAAA-MM-DD" no fuso local) ──────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateDe = (iso) => new Date(`${iso}T00:00:00`);

export function somarDiasISO(iso, dias) {
  const d = dateDe(iso);
  d.setDate(d.getDate() + dias);
  return isoDe(d);
}

/** Segunda-feira da semana de `iso`. */
export function inicioDaSemana(iso) {
  const d = dateDe(iso);
  const desdeSegunda = (d.getDay() + 6) % 7;
  return somarDiasISO(iso, -desdeSegunda);
}

/** Os 7 dias (segunda → domingo) a partir da segunda `segundaISO`. */
export const diasDaSemana = (segundaISO) =>
  Array.from({ length: 7 }, (_, i) => somarDiasISO(segundaISO, i));

export const minutosParaHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** "quarta-feira, 04 de novembro" */
export const dataPorExtenso = (iso) =>
  dateDe(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

/** 3.5 → "3,5h" */
export const formatarHoras = (h) => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;

/** 150 → "2h30" */
export function formatarDuracao(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

// "03 – 09 nov 2026" / "29 out – 04 nov 2026"
export function rotuloSemana(segundaISO) {
  const ini = dateDe(segundaISO);
  const fim = dateDe(somarDiasISO(segundaISO, 6));
  const mes = (d) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const esquerda = ini.getMonth() === fim.getMonth() ? pad(ini.getDate()) : `${pad(ini.getDate())} ${mes(ini)}`;
  return `${esquerda} – ${pad(fim.getDate())} ${mes(fim)} ${fim.getFullYear()}`;
}

// ── Foto ───────────────────────────────────────────────────────────────────

// Fotos da equipe do site (speakup-site/site/img/equipe-*.webp), recortadas
// no rosto em public/professores/. Pelo primeiro nome: o site diz "Bárbara
// Santos" e o gestão "Bárbara Dias".
const FOTOS = new Set(['barbara', 'bruna', 'fernando', 'ruan', 'sofia', 'vera', 'yure']);

export function fotoDoProfessor(nome) {
  const primeiro = normalizeNome(nome).split(' ')[0];
  return FOTOS.has(primeiro) ? `/professores/${primeiro}.webp` : null;
}

export const iniciaisDoNome = (nome = '') =>
  nome.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

// ── Professor ↔ turmas ─────────────────────────────────────────────────────

/**
 * Turmas do professor do diretório (`professores`). `turma.professor` já vem
 * canônico de useTurmas (normalizarProfessoresDasTurmas), então basta o id
 * ou o nome sem acento/caixa.
 */
export function turmasDoProfessor(turmas = [], professor) {
  if (!professor) return [];
  const chave = normalizeNome(professor.nome);
  return turmas.filter((t) =>
    (t.professorId && t.professorId === professor.id) ||
    (!!chave && normalizeNome(t.professor) === chave)
  );
}

/**
 * Horários semanais da turma: [{ dia (0-6), inicio, fim (minutos), estimado }].
 * Usa turma.horarios; turma antiga só com `dias` + `horario` cai no legado.
 * `estimado` = sem horário de término, assumiu DURACAO_PADRAO_MIN.
 */
export function blocosDaTurma(turma = {}) {
  const montar = (diaNome, inicioTxt, fimTxt) => {
    const dia = indiceDoDia(diaNome);
    const inicio = horaEmMinutos(inicioTxt);
    if (dia < 0 || !Number.isFinite(inicio)) return null;
    const fimLido = horaEmMinutos(fimTxt);
    const temFim = Number.isFinite(fimLido) && fimLido > inicio;
    return { dia, inicio, fim: temFim ? fimLido : inicio + DURACAO_PADRAO_MIN, estimado: !temFim };
  };

  if (Array.isArray(turma.horarios) && turma.horarios.length) {
    return turma.horarios.map((h) => montar(h?.dia, h?.horario, h?.horarioFim)).filter(Boolean);
  }
  // Legado: "18:00-19:00" ou "18:00" para todos os dias de `dias`.
  const [ini, fim] = String(turma.horario || '').split(/\s*[-–]\s*/);
  return String(turma.dias || '')
    .split(',')
    .map((d) => montar(d.trim(), ini, fim))
    .filter(Boolean);
}

/** "Ter, Qui · 18:00–19:30", ou dia a dia quando os horários diferem. */
export function resumoHorario(turma) {
  const blocos = [...blocosDaTurma(turma)].sort((a, b) => a.dia - b.dia || a.inicio - b.inicio);
  if (!blocos.length) return 'Sem horário cadastrado';
  const faixa = (b) => `${minutosParaHora(b.inicio)}${b.estimado ? '' : `–${minutosParaHora(b.fim)}`}`;
  const mesmaFaixa = blocos.every((b) => faixa(b) === faixa(blocos[0]));
  if (mesmaFaixa) return `${blocos.map((b) => NOMES_DIAS_CURTOS[b.dia]).join(', ')} · ${faixa(blocos[0])}`;
  return blocos.map((b) => `${NOMES_DIAS_CURTOS[b.dia]} ${faixa(b)}`).join(' · ');
}

export const horasSemanaisDaTurma = (turma) =>
  blocosDaTurma(turma).reduce((soma, b) => soma + (b.fim - b.inicio), 0) / 60;

/**
 * Números do topo da página. Alunos contam uma vez só (aluno em duas turmas
 * do mesmo professor) e cancelados ficam de fora; turma antiga sem
 * alunosIds usa o alunosCount gravado.
 */
export function resumoDoProfessor(turmasProf = [], students = []) {
  const ativos = new Set(students.filter((s) => s.status !== 'cancelado').map((s) => s.id));
  const ids = new Set();
  let semIds = 0;
  turmasProf.forEach((t) => {
    const membros = idsDosMembros(t.alunosIds);
    if (membros.length === 0) semIds += t.alunosCount || 0;
    else membros.forEach((id) => { if (ativos.has(id)) ids.add(id); });
  });
  const horas = turmasProf.reduce((soma, t) => soma + horasSemanaisDaTurma(t), 0);
  return {
    turmas: turmasProf.length,
    alunos: ids.size + semIds,
    horasSemana: Math.round(horas * 10) / 10,
    horarioEstimado: turmasProf.some((t) => blocosDaTurma(t).some((b) => b.estimado)),
  };
}

export const alunosAtivosDaTurma = (turma, students = []) => {
  const porId = new Map(students.map((s) => [s.id, s]));
  return idsDosMembros(turma.alunosIds)
    .map((id) => porId.get(id))
    .filter((s) => s && s.status !== 'cancelado');
};

// ── Dias sem aula ──────────────────────────────────────────────────────────

/**
 * Função (iso → nome | null) dos dias sem aula: feriados nacionais e as
 * faixas de recesso do calendário letivo (calendarioLetivo/{ano}).
 */
export function criarDiaNaoLetivo(calendarioAno, anos = []) {
  const feriados = new Map();
  anos.forEach((ano) => gerarFeriadosNacionais(ano).forEach((f) => feriados.set(f.data, f.nome)));
  const recessos = calendarioAno?.recesso || [];
  return (iso) => {
    if (feriados.has(iso)) return feriados.get(iso);
    const r = recessos.find((x) => dataNoIntervalo(iso, x.inicio, x.fim));
    return r ? r.nome || 'Recesso' : null;
  };
}

// ── Ocorrências da semana ──────────────────────────────────────────────────

/**
 * Rótulo de aula registrada sem aula, com quem cancelou (canceladaPor,
 * 06/11/2026): "Cancelada pelo professor" | "Cancelada pelo aluno" |
 * "Cancelada" (registro antigo) | "Feriado" | "Recesso".
 */
export function rotuloSemAula(aula) {
  if (!aula) return 'Sem aula';
  if (aula.status === 'cancelada') {
    if (aula.canceladaPor === 'professor') return 'Cancelada pelo professor';
    if (aula.canceladaPor === 'aluno') return 'Cancelada pelo aluno';
    return 'Cancelada';
  }
  return { feriado: 'Feriado', recesso: 'Recesso' }[aula.status] || aula.status || 'Sem aula';
}

/** Canceladas de um conjunto de aulas, separadas por quem cancelou (as antigas, sem canceladaPor, só no total). */
export function contarCanceladas(aulas = []) {
  const canc = aulas.filter((a) => a.status === 'cancelada');
  return {
    canceladas: canc.length,
    canceladasProf: canc.filter((a) => a.canceladaPor === 'professor').length,
    canceladasAluno: canc.filter((a) => a.canceladaPor === 'aluno').length,
  };
}

/** "2 prof. · 1 aluno" (+ "· 1 sem registro" quando há canceladas antigas sem quem cancelou). */
export function rotuloQuemCancelou({ canceladas = 0, canceladasProf = 0, canceladasAluno = 0 } = {}) {
  const semInfo = canceladas - canceladasProf - canceladasAluno;
  return [`${canceladasProf} prof.`, `${canceladasAluno} aluno`, ...(semInfo > 0 ? [`${semInfo} sem registro`] : [])].join(' · ');
}

export const STATUS_OCORRENCIA = {
  registrada: 'Registrada',
  cancelada: 'Sem aula',
  'nao-letivo': 'Sem aula',
  pendente: 'Não registrada',
  carregando: 'Conferindo registro…',
  hoje: 'Hoje',
  prevista: 'Prevista',
};

/**
 * Horário gravado na própria aula (início/fim daquele dia), em minutos.
 * Aulas novas guardam isso no registro: assim o relatório de meses passados
 * não muda quando o horário da turma muda ou a turma é apagada.
 */
export function faixaDaAula(aula) {
  const inicio = horaEmMinutos(aula?.inicio);
  const fim = horaEmMinutos(aula?.fim);
  return Number.isFinite(inicio) && Number.isFinite(fim) && fim > inicio ? { inicio, fim } : null;
}

/** { inicio, fim } ("HH:MM") da turma no dia da semana de `iso`, ou null. */
export function horarioDaTurmaNoDia(turma, iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  const dia = (dateDe(iso).getDay() + 6) % 7;
  const bloco = blocosDaTurma(turma).find((b) => b.dia === dia && !b.estimado);
  return bloco ? { inicio: minutosParaHora(bloco.inicio), fim: minutosParaHora(bloco.fim) } : null;
}

/**
 * Situação de uma aula da grade num dia:
 *  - registrada: tem aula gravada com status realizada (ou sem status, legado)
 *  - cancelada: gravada como cancelada/feriado/recesso
 *  - nao-letivo: feriado/recesso pelo calendário e nada gravado
 *  - pendente: já terminou e ninguém registrou
 *  - carregando: seria pendente, mas as aulas ainda não chegaram do banco
 *    (sem isso a semana inteira pisca em âmbar ao abrir ou trocar de semana)
 *  - hoje: é hoje e ainda não terminou
 *  - prevista: futuro
 */
export function statusDaOcorrencia({ aula, naoLetivo, iso, fim, hojeISO, agoraMin, carregando = false }) {
  if (aula) return !aula.status || aula.status === 'realizada' ? 'registrada' : 'cancelada';
  if (naoLetivo) return 'nao-letivo';
  if (iso < hojeISO || (iso === hojeISO && fim <= agoraMin)) return carregando ? 'carregando' : 'pendente';
  if (iso === hojeISO) return 'hoje';
  return 'prevista';
}

/**
 * Aulas da grade nos dias pedidos, já com status. `aulas` pode trazer aulas
 * de outras turmas/datas: o casamento é por turmaId + data.
 * Aula registrada num dia que não é da grade (aula trocada de dia) entra
 * também, no horário de costume da turma, com `foraDaGrade`.
 */
export function ocorrenciasDaSemana(turmasProf, dias, aulas = [], { diaNaoLetivo = () => null, hojeISO, agoraMin = 0, carregando = false } = {}) {
  const aulaPorChave = new Map();
  aulas.forEach((a) => {
    const chave = `${a.turmaId}|${a.data}`;
    // Duas aulas no mesmo dia (raro): a realizada prevalece.
    if (!aulaPorChave.has(chave) || !a.status || a.status === 'realizada') aulaPorChave.set(chave, a);
  });

  const lista = [];
  const usadas = new Set();
  turmasProf.forEach((turma) => {
    blocosDaTurma(turma).forEach((bloco, idx) => {
      const iso = dias[bloco.dia];
      if (!iso) return;
      const aula = aulaPorChave.get(`${turma.id}|${iso}`) || null;
      if (aula) usadas.add(`${turma.id}|${iso}`);
      const naoLetivo = diaNaoLetivo(iso);
      // Aula registrada com horário gravado vale mais que a grade de hoje.
      const gravado = faixaDaAula(aula);
      lista.push({
        id: `${turma.id}|${iso}|${idx}`,
        tipo: 'turma',
        turma,
        aula,
        iso,
        diaIndice: bloco.dia,
        inicio: gravado ? gravado.inicio : bloco.inicio,
        fim: gravado ? gravado.fim : bloco.fim,
        estimado: gravado ? false : bloco.estimado,
        naoLetivo,
        status: statusDaOcorrencia({ aula, naoLetivo, iso, fim: bloco.fim, hojeISO, agoraMin, carregando }),
      });
    });
  });

  const turmaPorId = new Map(turmasProf.map((t) => [t.id, t]));
  aulaPorChave.forEach((aula, chave) => {
    const turma = turmaPorId.get(aula.turmaId);
    const diaIndice = dias.indexOf(aula.data);
    if (!turma || diaIndice < 0 || usadas.has(chave)) return;
    const [bloco] = blocosDaTurma(turma);
    const gravado = faixaDaAula(aula);
    const inicio = gravado ? gravado.inicio : bloco ? bloco.inicio : 8 * 60;
    const fim = gravado ? gravado.fim : bloco ? bloco.fim : inicio + DURACAO_PADRAO_MIN;
    lista.push({
      id: `${chave}|fora`,
      tipo: 'turma',
      turma,
      aula,
      iso: aula.data,
      diaIndice,
      inicio,
      fim,
      estimado: !gravado && (!bloco || bloco.estimado),
      foraDaGrade: true,
      naoLetivo: null,
      status: statusDaOcorrencia({ aula }),
    });
  });
  return lista.sort((a, b) => a.iso.localeCompare(b.iso) || a.inicio - b.inicio);
}

/**
 * As mesmas ocorrências para um mês inteiro ("AAAA-MM"): junta as semanas
 * que tocam o mês e fica só com os dias dele.
 */
export function ocorrenciasDoMes(turmasProf, anoMes, aulas = [], opcoes = {}) {
  const primeiro = `${anoMes}-01`;
  const lista = [];
  for (let seg = inicioDaSemana(primeiro); seg.slice(0, 7) <= anoMes; seg = somarDiasISO(seg, 7)) {
    ocorrenciasDaSemana(turmasProf, diasDaSemana(seg), aulas, opcoes)
      .filter((o) => o.iso.startsWith(anoMes))
      .forEach((o) => lista.push(o));
  }
  return lista;
}

/** Contagem para o "x de y registradas" (só aulas que já deviam ter acontecido). */
export function placarDeRegistro(ocorrencias = []) {
  const registradas = ocorrencias.filter((o) => o.status === 'registrada').length;
  const pendentes = ocorrencias.filter((o) => o.status === 'pendente').length;
  return { registradas, pendentes, devidas: registradas + pendentes };
}

// ── Compromissos avulsos (agendaEventos) ───────────────────────────────────

export const TIPOS_EVENTO = {
  experimental: 'Aula experimental',
  reposicao: 'Reposição',
  reuniao: 'Reunião',
  nivelamento: 'Teste de nível',
  outro: 'Outro',
};

export const eventosDoProfessor = (eventos = [], professor) =>
  professor ? eventos.filter((e) => e.professorId === professor.id) : [];

/** Eventos como itens da grade (mesmo formato de posição das ocorrências). */
export function itensDeEventos(eventos = [], dias = []) {
  return eventos
    .map((e) => {
      const diaIndice = dias.indexOf(e.data);
      const inicio = horaEmMinutos(e.inicio);
      if (diaIndice < 0 || !Number.isFinite(inicio)) return null;
      const fimLido = horaEmMinutos(e.fim);
      const fim = Number.isFinite(fimLido) && fimLido > inicio ? fimLido : inicio + DURACAO_PADRAO_MIN;
      return { id: `evento|${e.id}`, tipo: 'evento', evento: e, iso: e.data, diaIndice, inicio, fim };
    })
    .filter(Boolean);
}

/** Validação do formulário de compromisso; devolve a mensagem de erro ou ''. */
export function validarEvento({ titulo, data, inicio, fim, link } = {}) {
  if (!String(titulo || '').trim()) return 'Dê um título ao compromisso.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return 'Escolha a data.';
  const ini = horaEmMinutos(inicio);
  const f = horaEmMinutos(fim);
  if (!Number.isFinite(ini) || !Number.isFinite(f)) return 'Informe o horário de início e de fim.';
  if (f <= ini) return 'O fim precisa ser depois do início.';
  if (link && !/^https?:\/\//i.test(String(link).trim())) return 'O link precisa começar com http:// ou https://';
  return '';
}

/** Texto do recado que avisa o professor (aparece em Avisos no painel dele). */
export function textoRecadoEvento(evento, acao = 'criado') {
  const quando = dateDe(evento.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const titulo = evento.titulo || TIPOS_EVENTO[evento.tipo] || 'Compromisso';
  const partes = [
    acao === 'cancelado'
      ? `Cancelado: ${titulo}, ${quando}, ${evento.inicio}–${evento.fim}.`
      : `${acao === 'alterado' ? 'Alterado na sua agenda' : 'Novo na sua agenda'}: ${titulo}, ${quando}, ${evento.inicio}–${evento.fim}.`,
  ];
  if (acao !== 'cancelado') {
    if (evento.aluno) partes.push(`Aluno: ${evento.aluno}.`);
    if (evento.link) partes.push(`Link: ${evento.link}`);
    if (evento.observacoes) partes.push(evento.observacoes);
  }
  return partes.join(' ');
}

// ── Layout da grade ────────────────────────────────────────────────────────

/**
 * Lado a lado quando dois itens se sobrepõem no mesmo dia, como no Google
 * Agenda: cada item ganha `coluna` e `colunas` (quantas dividem a faixa).
 */
export function posicionarNoDia(itens = []) {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
  const saida = [];
  let grupo = [];
  let fimDoGrupo = -1;
  const fecharGrupo = () => {
    const colunasFim = [];
    const comColuna = grupo.map((item) => {
      let col = colunasFim.findIndex((f) => f <= item.inicio);
      if (col === -1) { col = colunasFim.length; colunasFim.push(item.fim); } else colunasFim[col] = item.fim;
      return { ...item, coluna: col };
    });
    comColuna.forEach((item) => saida.push({ ...item, colunas: colunasFim.length }));
    grupo = [];
  };
  ordenados.forEach((item) => {
    if (grupo.length && item.inicio >= fimDoGrupo) fecharGrupo();
    fimDoGrupo = grupo.length ? Math.max(fimDoGrupo, item.fim) : item.fim;
    grupo.push(item);
  });
  if (grupo.length) fecharGrupo();
  return saida;
}

/** Faixa de horas da grade: cobre todos os itens, nunca menos que 8h–20h. */
export function faixaDeHoras(itens = [], { minimo = 8 * 60, maximo = 20 * 60 } = {}) {
  let ini = minimo;
  let fim = maximo;
  itens.forEach((i) => { ini = Math.min(ini, i.inicio); fim = Math.max(fim, i.fim); });
  return { inicio: Math.floor(ini / 60) * 60, fim: Math.ceil(fim / 60) * 60 };
}
