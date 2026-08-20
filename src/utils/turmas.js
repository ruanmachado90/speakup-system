import { BOOKS_POR_CURSO } from '../constants/turmasConfig';

export const normalizarString = (str = '') => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const normalizarDias = (diasStr = '') => {
  if (!diasStr) return '';

  const mapa = {
    'segunda-feira': 'Segunda',
    'segunda': 'Segunda',
    'seg': 'Segunda',
    'terca-feira': 'Terça',
    'terca': 'Terça',
    'ter': 'Terça',
    'quarta-feira': 'Quarta',
    'quarta': 'Quarta',
    'qua': 'Quarta',
    'quinta-feira': 'Quinta',
    'quinta': 'Quinta',
    'qui': 'Quinta',
    'sexta-feira': 'Sexta',
    'sexta': 'Sexta',
    'sex': 'Sexta',
    'sabado': 'Sábado',
    'sabado-feira': 'Sábado',
    'sab': 'Sábado'
  };

  return diasStr
    .split(',')
    .map((d) => {
      const norm = normalizarString(d);
      return mapa[norm] || d.trim();
    })
    .filter(Boolean)
    .join(', ');
};

export const contarDiasAula = (dias = '') => {
  if (!dias) return 0;
  return dias
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean).length;
};

export const calcularHorasAula = (horario = '') => {
  try {
    const [inicio, fim] = horario.split('-').map((h) => h.trim());
    const [horaInicio, minInicio] = inicio.split(':').map(Number);
    const [horaFim, minFim] = fim.split(':').map(Number);

    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFim = horaFim * 60 + minFim;

    return Math.max(0, (minutosFim - minutosInicio) / 60);
  } catch {
    return 0;
  }
};

// Calcula horas semanais somando a duração de cada dia em turma.horarios
// (dia + horário início + horário fim). Faz fallback pro formato legado
// (horario único x contagem de dias) quando a turma não tem horarios[].
// Evita depender do texto formatado "Seg 09:00 – 10:00 · Qua ..." (usa
// travessão e nome do dia), que calcularHorasAula() não consegue parsear.
export const calcularHorasSemanaisTurma = (turma = {}) => {
  if (Array.isArray(turma.horarios) && turma.horarios.length) {
    return turma.horarios.reduce((total, h) => {
      if (!h?.horario || !h?.horarioFim) return total;
      return total + calcularHorasAula(`${h.horario}-${h.horarioFim}`);
    }, 0);
  }
  return calcularHorasAula(turma.horario) * contarDiasAula(turma.dias);
};

export const buildProfessorSlug = (nome = '') => {
  return normalizarString(nome).replace(/\s+/g, '-');
};

// Gera o nome padronizado da turma: "{CURSO} {BOOK} - {DIA(S)} {HORÁRIO} - {PROFESSOR}".
// Sempre inclui horário de início e o primeiro nome do professor, pra não
// colidir quando dois professores diferentes dão o mesmo book no mesmo dia
// (ex: Bruna e outro professor, os dois com "TEENS 1" na Segunda).
export const gerarNomeTurma = ({ curso, book, horarios, professor }) => {
  if (!curso || !book || !horarios?.length) return '';
  const dias = horarios.map((h) => h.dia).join('/');
  const horaInicio = horarios[0]?.horario || '';
  const primeiroNomeProf = (professor || '').trim().split(' ')[0];
  // Cursos sem progressão de book (ex: VIP 1, VIP 2, REFORÇO ESCOLAR — só uma
  // opção fixa) não repetem o número no nome, pra não gerar algo tipo "VIP 1 1".
  const temVariosBooks = (BOOKS_POR_CURSO[curso] || []).length > 1;
  let nome = temVariosBooks ? `${curso} ${book} - ${dias}` : `${curso} - ${dias}`;
  if (horaInicio) nome += ` ${horaInicio}`;
  if (primeiroNomeProf) nome += ` - ${primeiroNomeProf}`;
  return nome;
};

export const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
