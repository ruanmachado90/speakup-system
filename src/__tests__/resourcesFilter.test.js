import {
  norm, mmss, audioMinutes, exerciseTypes, createCatalog, matches, countFor,
  activeFilterCount, sortItems, filtersFromHash, hashFromFilters, EMPTY_FILTERS,
} from '../utils/resourcesFilter';
import { RESOURCE_COURSES, RESOURCE_TYPES, RESOURCE_BOOKS, RESOURCES } from '../data/resourcesCatalog';

const catalog = createCatalog({ courses: RESOURCE_COURSES, types: RESOURCE_TYPES, books: RESOURCE_BOOKS, resources: RESOURCES });
const [teste] = catalog.items;
const f = (over) => ({ ...EMPTY_FILTERS, ...over });

describe('busca', () => {
  it('ignora acento e caixa', () => {
    expect(norm('Saúde FÉRIAS')).toBe('saude ferias');
    expect(matches(teste, f({ q: 'SAÚDE' }))).toBe(true);
  });

  it('encontra termos em português guardados nas palavras-chave', () => {
    expect(matches(teste, f({ q: 'viagens clima' }))).toBe(true);
  });

  it('encontra pelo conteúdo dos exercícios', () => {
    expect(matches(teste, f({ q: 'lake victoria' }))).toBe(true);
    expect(matches(teste, f({ q: 'windsurfing' }))).toBe(true);
  });

  it('exige todas as palavras', () => {
    expect(matches(teste, f({ q: 'bears dinossauro' }))).toBe(false);
  });

  it('funciona sem escolher curso', () => {
    expect(matches(teste, f({ q: 'picnic' }))).toBe(true);
  });
});

describe('filtros e contagens', () => {
  it('filtra por curso, livro e tipo', () => {
    expect(matches(teste, f({ course: 'adults', level: 'A2', kind: 'listening' }))).toBe(true);
    expect(matches(teste, f({ course: 'cambridge' }))).toBe(false);
    expect(matches(teste, f({ kind: 'worksheet' }))).toBe(false);
  });

  it('a contagem de uma opção ignora o próprio filtro, mas respeita os outros', () => {
    const filtros = f({ course: 'adults', kind: 'worksheet' });
    // Aba "Listening" com a aba Worksheet marcada: conta ignorando o tipo → 1
    expect(countFor(catalog.items, filtros, 'kind', (it) => it.kind === 'listening')).toBe(1);
    // Livro A2 com tipo Worksheet ativo → 0 (opção fica desativada)
    expect(countFor(catalog.items, filtros, 'level', (it) => it.level === 'A2')).toBe(0);
  });

  it('conta filtros ativos para o botão Reset', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount(f({ q: 'x', kind: 'listening' }))).toBe(2);
  });
});

describe('cartão', () => {
  it('rótulo do livro vem do curso', () => {
    expect(catalog.bookLabel(teste)).toBe('A2 · Elementary');
    expect(catalog.bookLabel({ ...teste, course: 'cambridge' })).toBe('A2 Key');
  });

  it('minutos de áudio, tempo e tipos de exercício', () => {
    expect(audioMinutes(teste)).toBe(11); // 668 s
    expect(mmss(102)).toBe('1:42');
    expect(mmss(0)).toBe('0:00');
    expect(exerciseTypes(teste)).toEqual(['Multiple choice (A/B/C)', 'Gap fill', 'Matching']);
  });
});

describe('ordenação', () => {
  const a = { title: 'Test 10', level: 'B1', unit: 2, created: '2026-01-01' };
  const b = { title: 'Test 2', level: 'A2', unit: null, created: '2026-05-01' };
  it('newest, title (numérico) e book', () => {
    expect(sortItems([a, b], 'recent')[0]).toBe(b);
    expect(sortItems([a, b], 'title')[0]).toBe(b);
    expect(sortItems([a, b], 'level')[0]).toBe(b);
  });
});

describe('estado no endereço', () => {
  it('ida e volta', () => {
    const filtros = f({ q: 'café com leite', course: 'adults', unit: '3' });
    expect(filtersFromHash(hashFromFilters(filtros))).toEqual(filtros);
  });
  it('sem filtros vira só #resources; hash de outra coisa é ignorado', () => {
    expect(hashFromFilters(EMPTY_FILTERS)).toBe('#resources');
    expect(filtersFromHash('#outra')).toEqual(EMPTY_FILTERS);
  });
});
