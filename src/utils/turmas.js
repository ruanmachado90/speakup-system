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

export const buildProfessorSlug = (nome = '') => {
  return normalizarString(nome).replace(/\s+/g, '-');
};

export const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
