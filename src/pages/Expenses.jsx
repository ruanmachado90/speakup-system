import { PlusCircle } from 'lucide-react';
import { Card, Table, DonutChart, ExpenseEvolutionChart } from '../components';

export const Expenses = ({ 
  expenseView, 
  setExpenseView, 
  expenseMonth, 
  setExpenseMonth, 
  expenseYear, 
  setExpenseYear, 
  filteredExpensesData, 
  expenseEvolutionData, 
  setModal, 
  handleDeleteExpense 
}) => {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setExpenseView('year')} 
            className={`px-4 py-2 rounded-lg font-semibold ${expenseView === 'year' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Anual
          </button>
          <button 
            onClick={() => setExpenseView('month')} 
            className={`px-4 py-2 rounded-lg font-semibold ${expenseView === 'month' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Mensal
          </button>
        </div>

        <div className="flex items-center gap-4">
          {expenseView === 'month' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-600">Mês</label>
              <select 
                value={expenseMonth} 
                onChange={e => setExpenseMonth(Number(e.target.value))} 
                className="border px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600">Ano</label>
            <input 
              type="number" 
              value={expenseYear} 
              onChange={e => setExpenseYear(Number(e.target.value))} 
              className="border px-3 py-2 rounded-lg w-28 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4]" 
            />
          </div>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold">Despesas por Categoria</h3>
            <p className="text-xs text-slate-400">
              {expenseView === 'month' 
                ? `${new Date(0, expenseMonth).toLocaleString('pt-BR', {month: 'long'})} ${expenseYear}`
                : `Ano ${expenseYear}`}
            </p>
          </div>
        </div>
        <DonutChart data={filteredExpensesData} />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold">Lista de Despesas</h3>
            <p className="text-xs text-slate-400">
              Total: R$ {filteredExpensesData.reduce((sum, x) => sum + Number(x.value || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
          </div>
          <div>
            <button 
              onClick={() => setModal({open: true, type: 'expense'})} 
              className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2"
            >
              <PlusCircle size={16}/> Nova Despesa
            </button>
          </div>
        </div>

        <Table
          header={["Descrição", "Categoria", "Data", "Valor", "Ações"]}
          data={filteredExpensesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))}
          render={x => (
            <>
              <td className="px-6 py-3 font-bold">{x.description}</td>
              <td className="px-6 py-3">{x.category || '-'}</td>
              <td className="px-6 py-3">{x.date ? new Date(x.date).toLocaleDateString('pt-BR') : '-'}</td>
              <td className="px-6 py-3">R$ {Number(x.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
              <td className="px-6 py-3">
                <button 
                  onClick={() => handleDeleteExpense(x.id)} 
                  className="px-3 py-1 rounded bg-rose-500 text-white"
                >
                  Remover
                </button>
              </td>
            </>
          )}
        />
      </Card>

      <Card>
        <h3 className="font-bold mb-4">Evolução das Despesas ({expenseYear})</h3>
        <ExpenseEvolutionChart 
          labels={expenseEvolutionData.labels} 
          values={expenseEvolutionData.values}
          year={expenseYear}
        />
      </Card>
    </>
  );
};
