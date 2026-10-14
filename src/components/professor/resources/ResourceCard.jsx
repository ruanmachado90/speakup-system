import React, { useState } from 'react';
import { List, HelpCircle, Clock, ExternalLink, KeyRound, ChevronRight, Play, Pause } from 'lucide-react';
import { RESOURCES_BASE_URL } from '../../../data/resourcesCatalog';
import { audioMinutes, exerciseTypes, mmss } from '../../../utils/resourcesFilter';

const fileUrl = (item, file) => encodeURI(`${RESOURCES_BASE_URL}${item.folder}/${file}`);

// Um material da biblioteca: lateral colorida pelo nível, dados, ações e a
// lista de exercícios com player. O áudio em si é controlado pela página
// (um só toca por vez) — aqui chegam só o estado e os callbacks.
export function ResourceCard({ item, catalog, audio, onToggleAudio, onSeek, onCollapse }) {
  const [open, setOpen] = useState(false);
  const tipo = catalog.typeOf(item.kind);
  const nivel = item.level.toLowerCase();
  const testUrl = fileUrl(item, item.file);
  const keyUrl = item.keyFile ? fileUrl(item, item.keyFile) : `${testUrl}#key`;
  const sub = [catalog.courseOf(item.course).name, catalog.bookLabel(item), ...(item.unit ? [`Unit ${item.unit}`] : [])];
  const tagsVisiveis = item.tags.slice(0, 5);
  const tagsExtras = item.tags.slice(5);

  const alternar = () => {
    if (open) onCollapse(item.id);
    setOpen(v => !v);
  };

  return (
    <article className={`res-card res-lv-${nivel}`}>
      <div className="res-spine">
        <span className="res-spine-code">{item.level}</span>
        <span className="res-spine-kind">{tipo.short}</span>
      </div>

      <div className="res-main">
        <span className={`res-mat res-mat-${item.kind}`}><i aria-hidden="true" />{tipo.name}</span>
        <h3 className="res-title">{item.title}</h3>
        <p className="res-sub">
          {sub.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && ' · '}
              <span className="res-nw">{s}</span>
            </React.Fragment>
          ))}
        </p>
        <ul className="res-facts">
          <li><List size={16} aria-hidden="true" /><span><b>{item.exercises.length}</b> {item.exercises.length === 1 ? 'exercise' : 'exercises'}</span></li>
          <li><HelpCircle size={16} aria-hidden="true" /><span><b>{item.questions}</b> questions</span></li>
          <li><Clock size={16} aria-hidden="true" /><span><b>{audioMinutes(item)}</b> min audio</span></li>
        </ul>
        <div className="res-tags">
          {tagsVisiveis.map(t => <span key={t} className="res-tag">{t}</span>)}
          {tagsExtras.length > 0 && (
            <span className="res-tag res-tag-more" title={tagsExtras.join(', ')}>+{tagsExtras.length} more</span>
          )}
        </div>
        <p className="res-types">{exerciseTypes(item).join(' · ')}</p>
      </div>

      <div className="res-side">
        <a className="res-btn res-btn-primary" href={testUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" />Open test
        </a>
        <a className="res-btn" href={keyUrl} target="_blank" rel="noopener noreferrer">
          <KeyRound size={16} aria-hidden="true" />Answer key
        </a>
      </div>

      <div className="res-more">
        <button className="res-toggle" type="button" aria-expanded={open} onClick={alternar}>
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />Exercises &amp; audio
        </button>
        {open && (
          <ol className="res-ex">
            {item.exercises.map(ex => {
              const key = `${item.id}#${ex.n}`;
              const atual = audio.key === key;
              const tocando = atual && audio.playing;
              const pct = atual && audio.duration ? (audio.current / audio.duration) * 100 : 0;
              const tempo = atual && audio.error
                ? 'Audio missing'
                : atual && audio.duration
                  ? `${mmss(audio.current)} / ${mmss(audio.duration)}`
                  : mmss(ex.seconds);
              return (
                <li key={ex.n}>
                  <span className="res-ex-no">{ex.n}</span>
                  <div>
                    <p className="res-ex-t">{ex.topic}</p>
                    <p className="res-ex-s">{ex.type}{ex.source ? ` · ${ex.source}` : ''}</p>
                  </div>
                  <div className="res-player">
                    <button
                      className="res-play"
                      type="button"
                      aria-pressed={tocando}
                      aria-label={`${tocando ? 'Pause' : 'Play'} audio, exercise ${ex.n}`}
                      onClick={() => onToggleAudio(key, fileUrl(item, ex.audio))}
                    >
                      {tocando ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <div
                      className="res-track"
                      onClick={e => {
                        if (!atual) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        onSeek((e.clientX - r.left) / r.width);
                      }}
                    >
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <span className="res-time">{tempo}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </article>
  );
}
