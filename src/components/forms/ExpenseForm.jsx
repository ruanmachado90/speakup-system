import React, { useEffect } from 'react';
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
  // Set initial category when editing
  useEffect(() => {
    if (modal.data?.category) {
      const knownCategories = ['Aluguel', 'Materiais', 'Salários', 'Serviços', 'Marketing', 'Transporte', 'Tecnologia'];
      if (knownCategories.includes(modal.data.category)) {
        setExpenseCategorySelect(modal.data.category);
      } else {
        setExpenseCategorySelect('Outro');
      }
    }
  }, [modal.data, setExpenseCategorySelect]);

  const isEditing = !!modal.data?.id;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black">
        {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Form 
          label="Descrição" 
          name="description" 
          defaultValue={modal.data?.description} 
          required 
          placeholder="Ex: Material de escritório"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select 
            name="category" 
            value={expenseCategorySelect} 
            onChange={e=>setExpenseCategorySelect(e.target.value)} 
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] transition-all"
            required
          >
            <option value="">Selecione uma categoria</option>
            <option value="Aluguel">Aluguel</option>
            <option value="Materiais">Materiais</option>
            <option value="Salários">Salários</option>
            <option value="Serviços">Serviços</option>
            <option value="Marketing">Marketing</option>
            <option value="Transporte">Transporte</option>
            <option value="Tecnologia">Tecnologia</option>
            <option value="Outro">Outro</option>
          </select>
          {expenseCategorySelect === 'Outro' && (
            <input 
              name="categoryOther" 
              defaultValue={modal.data?.category && !['Aluguel', 'Materiais', 'Salários', 'Serviços', 'Marketing', 'Transporte', 'Tecnologia'].includes(modal.data.category) ? modal.data.category : expenseCategoryOther} 
              placeholder="Descreva a categoria" 
              className="w-full border rounded-xl px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] transition-all" 
              required
            />
          )}
        </div>

        <Form 
          label="Data" 
          name="date" 
          type="date" 
          defaultValue={modal.data?.date ? modal.data.date.split('T')[0] : new Date().toISOString().slice(0,10)} 
          required
        />

        <Form 
          label="Valor (R$)" 
          name="value" 
          type="number" 
          step="0.01" 
          min="0.01"
          defaultValue={modal.data?.value} 
          required 
          placeholder="0,00"
        />

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Forma de Pagamento <span className="text-red-500">*</span>
          </label>
          <select
            name="paymentMethod"
            defaultValue={modal.data?.paymentMethod || ''}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] transition-all"
            required
          >
            <option value="">Selecione a forma de pagamento</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="Boleto">Boleto</option>
            <option value="Transferência Bancária">Transferência Bancária</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Tipo de saída <span className="text-red-500">*</span>
          </label>
          <select
            name="tipoSaida"
            defaultValue={modal.data?.tipoSaida || 'operacional'}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] transition-all"
            required
          >
            <option value="operacional">Operacional (custo do negócio)</option>
            <option value="retiradaSocio">Retirada de sócio (pró-labore)</option>
            <option value="investimento">Investimento</option>
            <option value="imposto">Imposto</option>
          </select>
          <span className="block text-xs text-slate-400 mt-1">
            Só "Operacional" e "Imposto" entram no lucro operacional. Retirada de sócio e investimento são mostrados à parte — não são custo do negócio.
          </span>
        </div>

        <label className="col-span-2 flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            name="recorrente"
            defaultChecked={!!modal.data?.recorrente}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0e48fe] focus:ring-[#0e48fe]"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-700">Despesa recorrente (custo fixo)</span>
            <span className="block text-xs text-slate-400">
              Marque para aluguel, salários, assinaturas — o que se repete todo mês. Usado no ponto de equilíbrio do relatório.
            </span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <button 
          type="button" 
          onClick={onCancel} 
          className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          disabled={expenseSaving}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={expenseSaving} 
          className={`w-full py-3 rounded-xl font-bold transition-all ${
            expenseSaving
              ? "bg-slate-300 text-slate-600 cursor-not-allowed" 
              : "bg-[#0e48fe] text-white hover:bg-[#0b3ad4] active:scale-95"
          }`}
        >
          {expenseSaving ? "Salvando..." : isEditing ? "Atualizar Despesa" : "Salvar Despesa"}
        </button>
      </div>
    </form>
  );
};
