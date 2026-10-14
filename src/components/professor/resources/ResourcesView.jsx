import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { RESOURCE_COURSES, RESOURCE_TYPES, RESOURCE_BOOKS, RESOURCES } from '../../../data/resourcesCatalog';
import {
  createCatalog, matches, countFor, sortItems, activeFilterCount, plural,
  filtersFromHash, hashFromFilters, EMPTY_FILTERS,
} from '../../../utils/resourcesFilter';
import { ResourceCard } from './ResourceCard';
import './resources.css';

const catalog = createCatalog({ courses: RESOURCE_COURSES, types: RESOURCE_TYPES, books: RESOURCE_BOOKS, resources: RESOURCES });
const AUDIO_PARADO = { key: null, playing: false, current: 0, duration: 0, error: false };

// Biblioteca Resources (provas, worksheets, práticas) — porte do protótipo
// extra-resources/index.html no modo embed. Comportamentos mantidos: a busca
// funciona sem curso; Book só habilita depois do curso; opção sem material
// fica desativada; filtros ficam no endereço; um áudio toca por vez;
// "/" foca a busca e Esc limpa.
export default function ResourcesView() {
  const [filters, setFilters] = useState(() => filtersFromHash(window.location.hash));
  const [sort, setSort] = useState('recent');
  const [audio, setAudio] = useState(AUDIO_PARADO);
  const audioRef = useRef(null);
  const buscaRef = useRef(null);
  const { items } = catalog;

  // Um elemento <audio> só para a página inteira
  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audioRef.current = a;
    const tempo = () => setAudio(s => ({ ...s, current: a.currentTime, duration: a.duration || 0 }));
    const fim = () => setAudio(AUDIO_PARADO);
    const erro = () => setAudio(s => ({ ...s, playing: false, error: true }));
    a.addEventListener('timeupdate', tempo);
    a.addEventListener('loadedmetadata', tempo);
    a.addEventListener('ended', fim);
    a.addEventListener('error', erro);
    return () => {
      a.pause();
      a.removeAttribute('src');
      a.removeEventListener('timeupdate', tempo);
      a.removeEventListener('loadedmetadata', tempo);
      a.removeEventListener('ended', fim);
      a.removeEventListener('error', erro);
    };
  }, []);

  const pararAudio = () => {
    audioRef.current?.pause();
    setAudio(AUDIO_PARADO);
  };

  const alternarAudio = (key, src) => {
    const a = audioRef.current;
    if (!a) return;
    if (audio.key === key && !audio.error) {
      if (a.paused) { a.play().catch(() => {}); setAudio(s => ({ ...s, playing: true })); }
      else { a.pause(); setAudio(s => ({ ...s, playing: false })); }
      return;
    }
    a.pause();
    a.src = src;
    setAudio({ ...AUDIO_PARADO, key, playing: true });
    a.play().catch(() => {});
  };

  const avancar = (fracao) => {
    const a = audioRef.current;
    if (a?.duration) a.currentTime = Math.max(0, Math.min(1, fracao)) * a.duration;
  };

  // Filtros no endereço (#resources?q=...) — recarregar a página mantém tudo.
  useEffect(() => {
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashFromFilters(filters)}`); } catch { /* ignora */ }
  }, [filters]);

  // Trocar filtro para o áudio, como no protótipo (a lista é refeita)
  const mudarFiltros = (fn) => { pararAudio(); setFilters(fn); };

  // Ao sair da aba, o endereço volta a ser o do painel
  useEffect(() => () => {
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`); } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName || '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        buscaRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === buscaRef.current) {
        audioRef.current?.pause();
        setAudio(AUDIO_PARADO);
        setFilters(f => ({ ...f, q: '' }));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const set = (k, v) => mudarFiltros(f => ({ ...f, [k]: v }));
  const escolherCurso = (curso) => mudarFiltros(f => ({ ...EMPTY_FILTERS, q: f.q, course: curso }));
  const limparTudo = () => mudarFiltros(() => ({ ...EMPTY_FILTERS }));

  const resultados = useMemo(
    () => sortItems(items.filter(it => matches(it, filters)), sort),
    [items, filters, sort]
  );
  const nAtivos = activeFilterCount(filters);
  const livrosDoCurso = filters.course ? catalog.courseOf(filters.course).books : [];
  const conta = (skip, test) => countFor(items, filters, skip, test);

  return (
    <div className="res">
      <form className="res-form" role="search" autoComplete="off" onSubmit={e => e.preventDefault()}>
        <div className="res-field res-kw">
          <label htmlFor="res-q">Search</label>
          <div className="res-search">
            <Search size={20} className="res-search-ico" aria-hidden="true" />
            <input
              id="res-q"
              ref={buscaRef}
              type="search"
              spellCheck={false}
              placeholder="Type a topic, title or word, e.g. travel"
              value={filters.q}
              onChange={e => set('q', e.target.value)}
            />
            {filters.q ? (
              <button className="res-clear" type="button" aria-label="Clear search"
                onClick={() => { set('q', ''); buscaRef.current?.focus(); }}>
                <X size={14} strokeWidth={2.4} />
              </button>
            ) : (
              <span className="res-kbd" aria-hidden="true">/</span>
            )}
          </div>
        </div>

        <div className="res-selects">
          <div className="res-field res-field-first">
            <label htmlFor="res-course">Course</label>
            <select id="res-course" className="res-select" value={filters.course} onChange={e => escolherCurso(e.target.value)}>
              <option value="">All courses</option>
              {catalog.courses.map(c => {
                const n = items.filter(it => it.course === c.key).length;
                return (
                  <option key={c.key} value={c.key} disabled={n === 0 && filters.course !== c.key}>
                    {c.name}{n === 0 ? ' (coming soon)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="res-field">
            <label htmlFor="res-book">Book</label>
            <select id="res-book" className="res-select" value={filters.level} disabled={!livrosDoCurso.length}
              onChange={e => set('level', e.target.value)}>
              <option value="">{filters.course ? 'All books' : 'Select a course first'}</option>
              {livrosDoCurso.map(b => {
                const n = conta('level', it => it.level === b.level);
                return <option key={b.level} value={b.level} disabled={n === 0 && filters.level !== b.level}>{b.label}</option>;
              })}
            </select>
          </div>

          <div className="res-field">
            <label htmlFor="res-unit">Unit</label>
            <select id="res-unit" className="res-select" value={filters.unit} onChange={e => set('unit', e.target.value)}>
              <option value="">All units</option>
              {Array.from({ length: catalog.maxUnits }, (_, i) => String(i + 1)).map(u => {
                const n = conta('unit', it => String(it.unit) === u);
                return <option key={u} value={u} disabled={n === 0 && filters.unit !== u}>Unit {u}</option>;
              })}
            </select>
          </div>

          <button className="res-btn" type="button" disabled={!nAtivos} onClick={limparTudo}>Reset</button>
        </div>
      </form>

      <div className="res-tabs" role="group" aria-label="Material type">
        <button type="button" className="res-tab" aria-pressed={filters.kind === ''} onClick={() => set('kind', '')}>
          All <span className="res-n">{conta('kind', () => true)}</span>
        </button>
        {catalog.types.map(t => {
          const n = conta('kind', it => it.kind === t.key);
          const marcada = filters.kind === t.key;
          return (
            <button key={t.key} type="button" className={`res-tab${n === 0 ? ' res-tab-zero' : ''}`}
              aria-pressed={marcada} disabled={n === 0 && !marcada} onClick={() => set('kind', t.key)}>
              {t.name} <span className="res-n">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="res-head">
        <p className="res-count" aria-live="polite">
          {nAtivos ? `${resultados.length} of ${plural(items.length, 'resource')}` : plural(items.length, 'resource')}
        </p>
        <label className="res-sort">
          Sort by
          <select className="res-select" value={sort} onChange={e => { pararAudio(); setSort(e.target.value); }}>
            <option value="recent">Newest</option>
            <option value="level">Book</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>

      <div className="res-list">
        {resultados.length ? resultados.map(item => (
          <ResourceCard
            key={item.id}
            item={item}
            catalog={catalog}
            audio={audio}
            onToggleAudio={alternarAudio}
            onSeek={avancar}
            onCollapse={pararAudio}
          />
        )) : (
          <div className="res-empty">
            <h3>No resources match</h3>
            <p>Try another keyword, or reset the filters to see everything.</p>
            <button className="res-btn" type="button" onClick={limparTudo}>Reset filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
