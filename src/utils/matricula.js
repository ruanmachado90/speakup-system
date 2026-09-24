import { addMonthsClamped } from './dateMath';

// Motivos fixos (lista fechada) — texto livre não dá pra comparar mês a mês.
export const MOTIVOS_CANCELAMENTO = [
  'Financeiro',
  'Horário / agenda',
  'Mudança de cidade',
  'Desempenho / dificuldade',
  'Insatisfação com o curso',
  'Concluiu o curso',
  'Outro',
];

export const MAX_PARCELAS = 24;

const pad = (n) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" em horário local. */
export const paraISODia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Só os dígitos do CPF ("123.456.789-00" → "12345678900"). */
export const soDigitos = (v) => String(v || '').replace(/\D/g, '');

/**
 * Próxima data (a partir de `hoje`, inclusive) com o dia do mês escolhido no
 * pré-cadastro. Dia que não existe no mês trava no último dia (ver dateMath).
 */
export function proximaDataParaDia(dia, hoje = new Date()) {
  const n = Number(dia);
  if (!Number.isInteger(n) || n < 1 || n > 31) return paraISODia(hoje);
  const noMes = (ano, mes) => new Date(ano, mes, Math.min(n, new Date(ano, mes + 1, 0).getDate()));
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const esteMes = noMes(hoje.getFullYear(), hoje.getMonth());
  return paraISODia(esteMes >= hojeZero ? esteMes : noMes(hoje.getFullYear(), hoje.getMonth() + 1));
}

/** Data padrão da parcela `indice` (0 = 1ª): mesmo dia, +1 mês por parcela. */
export function dataParcelaPadrao(primeiraData, indice) {
  return paraISODia(addMonthsClamped(new Date(primeiraData + 'T00:00:00'), indice));
}

/**
 * Datas finais de cada parcela: a padrão, salvo onde a secretaria ajustou à mão.
 * `overrides` = { [indice]: "YYYY-MM-DD" }.
 */
export function datasDasParcelas(primeiraData, installments, overrides = {}) {
  return Array.from({ length: Number(installments) || 0 }, (_, i) => overrides[i] || dataParcelaPadrao(primeiraData, i));
}

/**
 * Valida o contrato financeiro. Devolve a mensagem de erro ou null.
 */
export function validarContrato({ fee, dueDate, installments }) {
  if (!dueDate) return 'Informe o vencimento da 1ª parcela.';
  if (!(Number(fee) > 0)) return 'Informe um valor de mensalidade válido.';
  const n = Number(installments);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARCELAS) return `Número de parcelas deve ser de 1 a ${MAX_PARCELAS}.`;
  return null;
}

/**
 * Documentos de parcela prontos pra gravar — um formato só pra matrícula,
 * confirmação de pré-cadastro e reativação. Curso/professor ficam gravados na
 * parcela (snapshot) pra receita por curso/professor de meses passados não
 * mudar quando o aluno troca de turma.
 */
export function montarParcelas({ studentId, studentName, fee, installmentDates, course, professorId }) {
  return installmentDates.map((dataStr, i) => {
    const d = new Date(dataStr + 'T00:00:00');
    return {
      studentId,
      studentName,
      installmentNum: i + 1,
      valuePlanned: Number(fee),
      valuePaid: 0,
      status: 'Pendente',
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dueDate: `${dataStr}T00:00:00`,
      course: course || null,
      professorId: professorId || null,
    };
  });
}

/**
 * Lê os campos de MatriculaFields de um FormData já com os tipos certos
 * (número é número, vazio é null) — antes a edição gravava fee "350" como texto.
 */
export function lerCamposMatricula(formData) {
  const txt = (k) => {
    const v = formData.get(k);
    return v == null ? null : String(v).trim() || null;
  };
  let installmentDates = [];
  try {
    installmentDates = JSON.parse(formData.get('installmentDates') || '[]');
  } catch {
    installmentDates = [];
  }
  const book = txt('book');
  return {
    course: txt('course'),
    book: book == null ? null : Number(book),
    teacher: txt('teacher'),
    professorId: txt('professorId'),
    fee: formData.has('fee') ? Number(formData.get('fee')) : undefined,
    dueDate: txt('dueDate'),
    installments: formData.has('installments') ? Number(formData.get('installments')) : undefined,
    installmentDates,
  };
}

// ───────────────────────── cancelamento ─────────────────────────

// Turmas antigas guardam alunosIds como objetos ({ id, nome }); as novas, como
// strings. Tudo que mexe na lista de alunos da turma passa por aqui.
const idDoMembro = (m) => (m && typeof m === 'object' ? m.id : m);

/** Turmas em que o aluno está hoje. */
export function turmasDoAluno(turmas = [], alunoId) {
  return turmas.filter((t) => (t.alunosIds || []).some((m) => idDoMembro(m) === alunoId));
}

/** alunosIds da turma sem o aluno (preserva o formato dos demais). */
export function alunosIdsSem(turma, alunoId) {
  return (turma.alunosIds || []).filter((m) => idDoMembro(m) !== alunoId);
}

/** alunosIds da turma com o aluno (sem duplicar). */
export function alunosIdsCom(turma, alunoId) {
  const atuais = turma.alunosIds || [];
  return atuais.some((m) => idDoMembro(m) === alunoId) ? atuais : [...atuais, alunoId];
}

/**
 * Quais parcelas pendentes o cancelamento derruba. Vencidas e não pagas são
 * dívida do aluno: por padrão continuam em aberto (senão a inadimplência some
 * no dia do cancelamento). Só as que vencem de hoje em diante são canceladas.
 */
export function separarParcelasNoCancelamento(parcelas = [], hoje = new Date(), manterVencidas = true) {
  const hojeISO = paraISODia(hoje);
  const cancelar = [];
  const manter = [];
  for (const p of parcelas) {
    const vencida = String(p.dueDate || '').slice(0, 10) < hojeISO;
    (manterVencidas && vencida ? manter : cancelar).push(p);
  }
  return { cancelar, manter };
}

/**
 * Alunos com o mesmo CPF (ignora pontuação). CPF vazio/curto nunca "bate".
 */
export function alunosComMesmoCpf(students = [], cpf, excluirId = null) {
  const alvo = soDigitos(cpf);
  if (alvo.length !== 11) return [];
  return students.filter((s) => s.id !== excluirId && soDigitos(s.cpf) === alvo);
}
