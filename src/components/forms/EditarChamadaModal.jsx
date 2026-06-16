import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Save, Loader, BookOpen, Calendar } from 'lucide-react';

const STATUS_OPTIONS = [
  { key: 'presente',    label: 'Presente',    Icon: CheckCircle,  active: 'bg-emerald-500 text-white border-emerald-500', row: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'falta',       label: 'Falta',       Icon: XCircle,      active: 'bg-red-500 text-white border-red-500',         row: 'border-red-200 bg-red-50 text-red-700' },
  { key: 'justificada', label: 'Justificada', Icon: AlertCircle,  active: 'bg-amber-500 text-white border-amber-500',     row: 'border-amber-200 bg-amber-50 text-amber-700' },
];

export default function EditarChamadaModal({ aula, onSave, onClose, saving }) {
  const [chamadas, setChamadas] = useState(() => {
    const map = {};
    (aula.chamadas || []).forEach(c => { map[c.alunoId] = c.status; });
    return map;
  });
  const [conteudo, setConteudo] = useState(aula.conteudo || '');
  const [homework, setHomework] = useState(aula.homework || '');
  const [observacoes, setObservacoes] = useState(aula.observacoes || '');

  const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';

  const handleSave = () => {
    const updatedChamadas = (aula.chamadas || []).map(c => ({
      ...c,
      status: chamadas[c.alunoId] ?? c.status,
    }));
    onSave({ chamadas: updatedChamadas, conteudo, homework, observacoes });
  };

  const presentes     = Object.values(chamadas).filter(v => v === 'presente').length;
  const faltas        = Object.values(chamadas).filter(v => v === 'falta').length;
  const justificadas  = Object.values(chamadas).filter(v => v === 'justificada').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#005DE4] text-white p-2 rounded-lg">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Editar Chamada</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Calendar size={12} /> {aula.turmaNome} — {dataFmt}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">

          {/* Conteúdo / Homework / Obs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Conteúdo da Aula</label>
              <input
                type="text"
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Homework / Tarefa de Casa</label>
              <input
                type="text"
                value={homework}
                onChange={e => setHomework(e.target.value)}
                className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Observações</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] resize-none"
              />
            </div>
          </div>

          {/* Chamada */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <CheckCircle size={15} className="text-[#005DE4]" /> Chamada
              </h3>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="text-emerald-600">✓ {presentes} presente{presentes !== 1 ? 's' : ''}</span>
                <span className="text-red-500">✗ {faltas} falta{faltas !== 1 ? 's' : ''}</span>
                {justificadas > 0 && <span className="text-amber-600">! {justificadas} justif.</span>}
              </div>
            </div>

            {(aula.chamadas || []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhum aluno registrado nesta chamada.</p>
            ) : (
              <div className="space-y-2">
                {(aula.chamadas || []).map(c => {
                  const statusAtual = chamadas[c.alunoId] ?? c.status;
                  const rowCfg = STATUS_OPTIONS.find(s => s.key === statusAtual);
                  return (
                    <div key={c.alunoId} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${rowCfg?.row || 'border-slate-200 bg-slate-50'}`}>
                      <span className="font-medium text-sm">{c.alunoNome || c.alunoId}</span>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map(s => {
                          const Icon = s.Icon;
                          const isActive = statusAtual === s.key;
                          return (
                            <button
                              key={s.key}
                              onClick={() => setChamadas(prev => ({ ...prev, [c.alunoId]: s.key }))}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                isActive ? s.active : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <Icon size={12} />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving
              ? <><Loader size={16} className="animate-spin" /> Salvando...</>
              : <><Save size={16} /> Salvar alterações</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
