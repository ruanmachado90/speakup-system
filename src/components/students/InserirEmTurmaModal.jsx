import { Users, X } from 'lucide-react';

export default function InserirEmTurmaModal({
  aluno,
  onClose,
  turmas,
  filtroProf,
  setFiltroProf,
  filtroDia,
  setFiltroDia,
  turmaSelecionada,
  setTurmaSelecionada,
  onConfirm,
  inserindo,
}) {
  const turmasFiltradas = turmas
    .filter(t => !(t.alunosIds || []).includes(aluno.id))
    .filter(t => !filtroProf || t.professor === filtroProf)
    .filter(t => !filtroDia || (t.dias || '').includes(filtroDia));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={18} className="text-[#005DE4]" />
            Inserir em turma
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Aluno: <strong>{aluno.name}</strong>
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Professor</label>
            <select
              value={filtroProf}
              onChange={e => { setFiltroProf(e.target.value); setTurmaSelecionada(''); }}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            >
              <option value="">Todos</option>
              {[...new Set(turmas.map(t => t.professor).filter(Boolean))].sort().map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Dia da semana</label>
            <select
              value={filtroDia}
              onChange={e => { setFiltroDia(e.target.value); setTurmaSelecionada(''); }}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            >
              <option value="">Todos</option>
              {['Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {turmas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma turma cadastrada</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {turmasFiltradas.map(t => {
                const vagas = (t.maxAlunos || 15) - (t.alunosIds || []).length;
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      turmaSelecionada === t.id
                        ? 'border-[#005DE4] bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="turma"
                      value={t.id}
                      checked={turmaSelecionada === t.id}
                      onChange={() => setTurmaSelecionada(t.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800">{t.nome}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.professor} · {t.nivel} · {t.horario}</div>
                      <div className="text-xs text-slate-400">{t.dias}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      vagas > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {vagas > 0 ? `${vagas} vaga${vagas !== 1 ? 's' : ''}` : 'Lotada'}
                    </span>
                  </label>
                );
              })}
              {turmasFiltradas.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
                  Nenhuma turma encontrada com esses filtros
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={inserindo || !turmaSelecionada}
            className="px-5 py-2 bg-[#005DE4] text-white text-sm font-medium rounded-lg hover:bg-[#0041a8] disabled:opacity-50 transition-colors"
          >
            {inserindo ? 'Inserindo...' : 'Inserir'}
          </button>
        </div>
      </div>
    </div>
  );
}
