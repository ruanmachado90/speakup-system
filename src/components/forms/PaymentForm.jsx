import React from 'react';

export const PaymentForm = ({ modal, paymentSaving, onSubmit, onCancel, isEdit = false }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-xl font-bold">{isEdit ? 'Editar Pagamento' : 'Registrar Pagamento'}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Aluno</p>
          <div className="border rounded-lg p-3 font-semibold">{modal.data?.studentName}</div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Vencimento</p>
          <div className="border rounded-lg p-3">{modal.data?.dueDate ? new Date(modal.data.dueDate).toLocaleDateString('pt-BR') : '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Valor Previsto</label>
          <div className="border rounded-lg p-3 bg-slate-50 font-semibold">R$ {Number(modal.data?.valuePlanned || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Valor Pago *</label>
          <input 
            type="number" 
            name="valuePaid" 
            step="0.01" 
            required 
            defaultValue={isEdit ? modal.data?.valuePaid : (modal.data?.valuePlanned || 0)}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]" 
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Data do Pagamento</label>
        <input 
          type="date" 
          name="paymentDate" 
          defaultValue={isEdit ? modal.data?.paymentDate : new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#005DE4]" 
        />
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
          disabled={paymentSaving} 
          className={`w-full py-3 rounded-xl font-bold ${paymentSaving?"bg-slate-300 text-slate-600":"bg-emerald-500 text-white"}`}
        >
          {paymentSaving ? "Salvando..." : (isEdit ? "Salvar Alterações" : "Confirmar Pagamento")}
        </button>
      </div>
    </form>
  );
};
