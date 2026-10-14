// Auxiliares puros do painel do professor (saíram de ProfessorDashboard.jsx,
// que passou do limite de tamanho da catraca de qualidade).
import { dataLocalISO } from './aulas';
import { idsDosMembros } from './buscarAlunos';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Nome do dia como as turmas gravam em `dias` ("Segunda", "Terça"...).
// Por getDay(), não por toLocaleDateString: o texto do navegador muda com ICU/idioma.
export const nomeDiaSemana = (date) => DIAS_SEMANA[date.getDay()];

// "AAAA-MM-DD" → Date à meia-noite LOCAL (sem o "T00:00:00" o JS lê como UTC).
export const dataDeISO = (iso) => new Date(`${iso}T00:00:00`);

export const diasDaTurma = (turma) => (turma.dias || '').split(',').map(d => d.trim()).filter(Boolean);

// Minutos desde 0h do primeiro "H:MM" do texto; sem horário vai para o fim.
// Comparar como texto punha "7:30" depois de "19:00".
export function horaEmMinutos(texto) {
  const m = String(texto || '').match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity;
}

export function compararHorario(a, b) {
  const diff = horaEmMinutos(a) - horaEmMinutos(b);
  return Number.isNaN(diff) ? 0 : diff; // os dois sem horário
}

// Posição na semana começando na segunda, como a agenda. Antes "Ordenar: Dia"
// e o filtro de dias iam em ordem alfabética (Quarta, Quinta, Sábado, Segunda...).
const ORDEM_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const ordemDia = (nome) => {
  const i = ORDEM_SEMANA.indexOf(nome);
  return i === -1 ? 99 : i;
};

// Turma pelo primeiro dia de aula na semana; empate, pelo horário.
export const compararDiasTurma = (a, b) =>
  Math.min(99, ...diasDaTurma(a).map(ordemDia)) - Math.min(99, ...diasDaTurma(b).map(ordemDia)) ||
  compararHorario(a.horario, b.horario);

// Dias dos últimos `janela` dias em que a turma tinha aula e nada foi
// registrado (no máximo `limite`, mais recente primeiro). Hoje não entra:
// a aula do dia ainda pode ser lançada. Mesma regra no alerta e na tabela.
export function datasPendentes(turma, aulasDaTurma, hojeISO, { janela = 14, limite = 2 } = {}) {
  const registradas = new Set(aulasDaTurma.map(a => a.data));
  const dias = diasDaTurma(turma);
  const hoje = dataDeISO(hojeISO);
  const pendentes = [];
  for (let i = 1; i <= janela && pendentes.length < limite; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    if (!dias.includes(nomeDiaSemana(d))) continue;
    const iso = dataLocalISO(d);
    if (!registradas.has(iso)) pendentes.push(iso);
  }
  return pendentes;
}

// Quantos alunos a turma tem — o mesmo número da lista exibida (alunos
// encontrados no cadastro). Antes usava alunosIds.length, que conta id de
// aluno apagado e não desduplica turma antiga com { id, nome }.
// Turma antiga sem alunosIds: usa o alunosCount gravado.
export function contarAlunos(turma, alunosPorTurma) {
  if (idsDosMembros(turma.alunosIds).length === 0) return turma.alunosCount || 0;
  return (alunosPorTurma[turma.id] || []).length;
}

// Total do professor sem contar duas vezes o aluno que está em duas turmas.
export function totalAlunosUnicos(turmas, alunosPorTurma) {
  const ids = new Set();
  let semIds = 0;
  turmas.forEach(t => {
    if (idsDosMembros(t.alunosIds).length === 0) semIds += t.alunosCount || 0;
    else (alunosPorTurma[t.id] || []).forEach(a => ids.add(a.id));
  });
  return ids.size + semIds;
}

// Avisos dispensados expiram: sem isso, dispensar uma pendência silenciava
// aquele tipo de alerta para a turma para sempre (o id fica no localStorage).
export const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Formato legado: array de ids. Formato atual: { id: timestamp }, para poder expirar.
export function carregarDismissed(slug) {
  try {
    const raw = JSON.parse(localStorage.getItem(`dismissed-avisos-${slug}`) || '{}');
    const agora = Date.now();
    const entries = Array.isArray(raw)
      ? raw.map(id => [id, agora])
      : Object.entries(raw).filter(([, ts]) => agora - ts < DISMISS_TTL_MS);
    return new Map(entries);
  } catch { return new Map(); }
}

export function carregarLembretes(slug) {
  try {
    const raw = JSON.parse(localStorage.getItem(`lembretes-${slug}`) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

// "MM-DD" da data de nascimento, ou null. Aceita "AAAA-MM-DD", "DD/MM/AAAA",
// Timestamp do Firestore e Date — antes um formato fora de "AAAA-MM-DD"
// lançava erro dentro do useMemo e derrubava o painel inteiro.
export function mesDiaNascimento(dn) {
  if (!dn) return null;
  const pad = n => String(n).padStart(2, '0');
  const data = typeof dn.toDate === 'function' ? dn.toDate() : dn instanceof Date ? dn : null;
  if (data) return isNaN(data) ? null : `${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
  if (typeof dn !== 'string') return null;
  let m = dn.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${pad(m[2])}-${pad(m[3])}`;
  m = dn.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return `${pad(m[2])}-${pad(m[1])}`;
  return null;
}

// Retorna o horário específico de um dia para uma turma (suporta horarios[] e campo legado)
export function getHorarioDia(turma, dia) {
  if (turma.horarios?.length) {
    const entry = turma.horarios.find(h => h.dia === dia);
    if (entry?.horario) return entry.horario;
  }
  // Legado: turma.horario pode ser "20:00" ou "Seg 20:00 · Sex 07:00"
  // Extrai só o HH:MM do primeiro token que parece hh:mm
  const match = (turma.horario || '').match(/\b(\d{1,2}:\d{2})\b/);
  return match ? match[1] : (turma.horario || '');
}
