import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORIAS } from '../../hooks/useNotas';

// ── Modal: adicionar avaliacao ────────────────────────────────────────────────
export default function ModalAddAvaliacao({ tipo, onSave, onClose }) {
  const cat = CATEGORIAS.find(c => c.tipo === tipo) || CATEGORIAS[0];
  const [pontos, setPontos] = useState(String(cat.max));
  const [err, setErr] = useState('');

  const handleSave = () => {
    const p = parseFloat(pontos);
    if (isNaN(p) || p <= 0) { setErr('Informe uma pontuacao valida.'); return; }
    onSave({ tipo, pontos: p });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(135deg, ${cat.bg}, ${cat.bgMedia})` }}>
          <span className="text-white font-bold text-sm">
            Nova Prova — {cat.label} ({cat.labelPt})
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            Categoria <strong>{cat.label}</strong> vale até <strong>{cat.max} pontos</strong> na nota final.
            A média das provas desta categoria será usada como resultado.
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Pontuação desta prova</label>
            <input
              type="number" min="0.5" step="0.5" autoFocus
              value={pontos}
              onChange={e => setPontos(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-all flex items-center gap-1.5"><Plus size={13} /> Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
