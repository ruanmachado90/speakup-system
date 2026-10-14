// Lógica pura da biblioteca Resources (busca, filtros, contagens, ordenação,
// estado no endereço). Porte do script do protótipo extra-resources/index.html,
// sem DOM, para dar para testar.

export const FILTER_KEYS = ['q', 'course', 'level', 'unit', 'kind'];
export const EMPTY_FILTERS = { q: '', course: '', level: '', unit: '', kind: '' };

// Minúsculas e sem acento: "Saúde" casa com "saude".
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');

export const mmss = (s) => {
  const total = Math.max(0, Math.round(s || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const audioMinutes = (r) =>
  Math.max(1, Math.round(r.exercises.reduce((acc, e) => acc + (e.seconds || 0), 0) / 60));

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Tipos de exercício sem repetir, na ordem em que aparecem.
export const exerciseTypes = (r) => {
  const vistos = new Set();
  return r.exercises.filter((e) => !vistos.has(e.typeKey) && vistos.add(e.typeKey)).map((e) => e.type);
};

export function createCatalog({ courses, types, books, resources }) {
  const courseOf = (key) => courses.find((c) => c.key === key) || { key, name: 'Course', books: [] };
  const typeOf = (key) => types.find((t) => t.key === key) || { key, name: 'Resource', short: 'Resource' };
  const bookOf = (level) => books.find((b) => b.level === level) || { level, series: 'General English', name: "Student's Book", cefr: '' };
  const bookLabel = (r) => {
    const doCurso = courseOf(r.course).books.find((b) => b.level === r.level);
    if (doCurso) return doCurso.label;
    const b = bookOf(r.level);
    return `${b.series} ${b.name}`;
  };

  // Texto de busca de cada material: título, curso, livro, assuntos, termos em
  // português e tudo dos exercícios (tema, tipo, palavras-chave, fonte).
  const items = resources.map((r) => {
    const b = bookOf(r.level);
    const partes = [
      r.title, r.skill, r.level, typeOf(r.kind).name, courseOf(r.course).name,
      b.series, b.name, b.cefr, r.tags.join(' '), r.search || '', r.unit ? `unit ${r.unit}` : '',
      ...r.exercises.flatMap((e) => [e.topic, e.type, e.keywords || '', e.source || '']),
    ];
    return { ...r, _h: norm(partes.join(' ')) };
  });

  const maxUnits = books.reduce((m, b) => Math.max(m, b.units || 0), 0) || 12;

  return { courses, types, items, maxUnits, courseOf, typeOf, bookOf, bookLabel };
}

// `skip` ignora um filtro — é o que permite contar as opções de um dropdown
// considerando todos os OUTROS filtros ativos.
export function matches(item, filters, skip) {
  const palavras = norm(filters.q).split(/\s+/).filter(Boolean);
  if (palavras.some((w) => !item._h.includes(w))) return false;
  if (skip !== 'course' && filters.course && item.course !== filters.course) return false;
  if (skip !== 'level' && filters.level && item.level !== filters.level) return false;
  if (skip !== 'unit' && filters.unit && String(item.unit) !== filters.unit) return false;
  if (skip !== 'kind' && filters.kind && item.kind !== filters.kind) return false;
  return true;
}

export const countFor = (items, filters, skip, test) =>
  items.filter((it) => matches(it, filters, skip) && test(it)).length;

export const activeFilterCount = (filters) => FILTER_KEYS.filter((k) => filters[k]).length;

export function sortItems(items, sort) {
  return items.slice().sort((a, b) => {
    if (sort === 'recent') return (b.created || '').localeCompare(a.created || '') || a.title.localeCompare(b.title);
    if (sort === 'title') return a.title.localeCompare(b.title, 'en', { numeric: true });
    return (
      (a.level || '').localeCompare(b.level || '') ||
      (a.unit || 99) - (b.unit || 99) ||
      a.title.localeCompare(b.title, 'en', { numeric: true })
    );
  });
}

// Estado no endereço: "#resources?q=travel&course=adults". O prefixo diz ao
// painel que a aba aberta é Resources (recarregar a página volta para ela).
export const HASH_PREFIX = '#resources';

export function filtersFromHash(hash) {
  if (!String(hash || '').startsWith(HASH_PREFIX)) return { ...EMPTY_FILTERS };
  const params = new URLSearchParams(String(hash).slice(HASH_PREFIX.length).replace(/^\?/, ''));
  const filters = { ...EMPTY_FILTERS };
  FILTER_KEYS.forEach((k) => { if (params.get(k)) filters[k] = params.get(k); });
  return filters;
}

export function hashFromFilters(filters) {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((k) => { if (filters[k]) params.set(k, filters[k]); });
  const qs = params.toString();
  return qs ? `${HASH_PREFIX}?${qs}` : HASH_PREFIX;
}
