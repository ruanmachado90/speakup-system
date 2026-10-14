import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';

const OPCOES = [
  { tipo: 'excel', rotulo: 'Excel', Icone: FileSpreadsheet },
  { tipo: 'csv', rotulo: 'CSV', Icone: FileSpreadsheet },
  { tipo: 'print', rotulo: 'Imprimir', Icone: Printer },
];

/** Botão "Exportar" com menu (Excel, CSV, imprimir). Fecha ao clicar fora ou com Esc. */
export default function MenuExportar({ quantidade, onExportar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const onDown = (ev) => {
      if (ref.current && !ref.current.contains(ev.target)) setAberto(false);
    };
    const onKey = (ev) => { if (ev.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={quantidade === 0}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body flex gap-2 items-center hover:bg-gr-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:shadow-ring-accent"
      >
        <Download size={16} /> Exportar
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 mt-2 w-48 bg-surface-card rounded-su-sm shadow-pop border border-subtle z-10 py-1">
          {OPCOES.map((o) => (
            <button
              key={o.tipo}
              role="menuitem"
              type="button"
              onClick={() => { onExportar(o.tipo); setAberto(false); }}
              className="w-full px-4 py-2.5 text-left hover:bg-surface-sunken flex items-center gap-2 text-su-sm font-medium text-content-body"
            >
              <o.Icone size={16} className="text-content-muted" /> {o.rotulo}
            </button>
          ))}
          <p className="px-4 pt-1.5 pb-1 text-su-xs text-content-muted border-t border-subtle mt-1">
            Exporta os {quantidade} lançamentos filtrados
          </p>
        </div>
      )}
    </div>
  );
}
