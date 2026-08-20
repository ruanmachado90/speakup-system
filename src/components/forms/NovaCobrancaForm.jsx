import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

// Cria UMA cobrança avulsa pra um aluno já ativo — por exemplo, uma 2ª
// parcela de uma semestralidade vencendo em julho, separada da matrícula
// original. A matrícula/reativação só geram parcelas em lote; isso aqui
// cobre o caso de precisar adicionar só mais uma depois.
export const NovaCobrancaForm = ({ students = [], saving, onSubmit, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [valuePlanned, setValuePlanned] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [erro, setErro] = useState('');

  const alunosAtivos = useMemo(
    () => students.filter(s => s.status !== 'cancelado'),
    [students]
  );

  const sugestoes = useMemo(() => {
    if (!searchTerm.trim() || selectedStudent) return [];
    const termo = searchTerm.toLowerCase();
    return alunosAtivos.filter(s => s.name?.toLowerCase().includes(termo)).slice(0, 6);
  }, [searchTerm, selectedStudent, alunosAtivos]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudent) return setErro('Selecione o aluno.');
    if (!valuePlanned || Number(valuePlanned) <= 0) return setErro('Informe um valor válido.');
    if (!dueDate) return setErro('Informe a data de vencimento.');
    setErro('');
    onSubmit({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      valuePlanned: Number(valuePlanned),
      dueDate,
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-xl font-bold">Nova Cobrança</h3>
      <p className="text-sm text-slate-500 -mt-3">
        Cria uma cobrança avulsa pra um aluno que já está ativo — sem mexer no plano de parcelas original.
      </p>

      <div>
        <label className="block text-sm font-semibold mb-2">Aluno *</label>
        {selectedStudent ? (
          <div className="flex items-center justify-between border rounded-xl px-4 py-3 bg-blue-50 border-blue-200">
            <span className="font-semibold text-slate-800">{selectedStudent.name}</span>
            <button
              type="button"
              onClick={() => { setSelectedStudent(null); setSearchTerm(''); }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno pelo nome..."
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
            {sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl max-h-48 overflow-y-auto z-10 shadow-lg">
                {sugestoes.map((aluno) => (
                  <button
                    key={aluno.id}
                    type="button"
                    onClick={() => { setSelectedStudent(aluno); setSearchTerm(''); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-100 flex justify-between items-center"
                  >
                    <span className="font-medium">{aluno.name}</span>
                    <span className="text-xs text-gray-500">{aluno.course || 'Sem curso'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Valor (R$) *</label>
          <input
            type="number" min="0" step="0.01" value={valuePlanned}
            onChange={(e) => setValuePlanned(e.target.value)}
            placeholder="Ex: 350.00"
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Vencimento *</label>
          <input
            type="date" value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Descrição (opcional)</label>
        <input
          type="text" value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: 2ª parcela semestralidade"
          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        />
      </div>

      {erro && <p className="text-red-500 text-sm">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 rounded-xl font-bold ${saving ? 'bg-slate-300 text-slate-600' : 'bg-[#005DE4] text-white'}`}
        >
          {saving ? 'Salvando...' : 'Criar cobrança'}
        </button>
      </div>
    </form>
  );
};
