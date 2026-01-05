import React from 'react';
import { Form } from '../ui';

export const ExpenseForm = ({ 
  modal, 
  expenseSaving, 
  expenseCategorySelect, 
  setExpenseCategorySelect,
  expenseCategoryOther,
  onSubmit, 
  onCancel 
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black">Nova Despesa</h3>

      <div className="grid grid-cols-2 gap-4">
        <Form label="Descrição" name="description" defaultValue={modal.data?.description} required />

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
          <select 
            name="category" 
            value={expenseCategorySelect} 
            onChange={e=>setExpenseCategorySelect(e.target.value)} 
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Selecione</option>
            <option value="Aluguel">Aluguel</option>
            <option value="Materiais">Materiais</option>
            <option value="Salários">Salários</option>
            <option value="Serviços">Serviços</option>
            <option value="Marketing">Marketing</option>
            <option value="Outro">Outro</option>
          </select>
          {expenseCategorySelect === 'Outro' && (
            <input 
              name="categoryOther" 
              defaultValue={expenseCategoryOther} 
              placeholder="Descreva a categoria" 
              className="w-full border rounded-xl px-4 py-3 mt-2" 
            />
          )}
        </div>

        <Form 
          label="Data" 
          name="date" 
          type="date" 
          defaultValue={modal.data?.date ? modal.data.date.split('T')[0] : new Date().toISOString().slice(0,10)} 
        />
        <Form label="Valor (R$)" name="value" type="number" step="0.01" defaultValue={modal.data?.value} required />
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
          disabled={expenseSaving} 
          className={`w-full py-3 rounded-xl font-bold ${expenseSaving?"bg-slate-300 text-slate-600":"bg-[#005DE4] text-white"}`}
        >
          {expenseSaving?"Salvando...":"Salvar"}
        </button>
      </div>
    </form>
  );
};
