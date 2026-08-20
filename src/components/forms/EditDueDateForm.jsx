import React, { useState } from 'react';

// Edita só a data de vencimento de uma parcela — pendente ou já paga —
// sem mexer em status/valor pago. Existe separado do PaymentForm porque
// "dar baixa" só fazia sentido pra parcelas pendentes; ajustar a data
// (ex: 2ª parcela da semestralidade vencendo em julho) precisa funcionar
// pra qualquer parcela, a qualquer momento.
export const EditDueDateForm = ({ modal, saving, onSubmit, onCancel }) => {
  const payment = modal.data;
  const [dueDate, setDueDate] = useState(payment?.dueDate ? payment.dueDate.slice(0, 10) : '');
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dueDate) { setErro('Informe uma data de vencimento.'); return; }
    setErro('');
    onSubmit(payment.id, dueDate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold">Editar Vencimento</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Aluno</p>
          <div className="border rounded-lg p-3 font-semibold">{payment?.studentName}</div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Parcela</p>
          <div className="border rounded-lg p-3">{payment?.installmentNum ? `${payment.installmentNum}ª` : '-'}</div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Nova data de vencimento *</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        />
        {erro && <p className="text-red-500 text-xs mt-1">{erro}</p>}
      </div>

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
          {saving ? 'Salvando...' : 'Salvar vencimento'}
        </button>
      </div>
    </form>
  );
};
