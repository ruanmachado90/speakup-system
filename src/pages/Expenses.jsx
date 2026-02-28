import { useMemo, useState, useEffect } from 'react';
import { PlusCircle, AlertCircle, Trash2, TrendingDown, Edit2, Download, FileSpreadsheet, Printer, Filter } from 'lucide-react';
import { Card, Table, DonutChart, ExpenseEvolutionChart } from '../components';
import { ConfirmDialog, Toast } from '../components/ui/Toast';
import { formatCurrency, formatDate, exportToExcel, exportToCSV, printExpenses } from '../utils';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const EXPENSE_CATEGORIES = [
  'Todas',
  'Aluguel',
  'Materiais',
  'Salários',
  'Serviços',
  'Marketing',
  'Transporte',
  'Tecnologia',
  'Outro'
];

// Threshold for high expense alert (configurable)
const HIGH_EXPENSE_THRESHOLD = 1000;

const Expenses = ({ 
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
  const [confirmDialog, setConfirmDialog] = useState({ isVisible: false, expenseId: null, expenseName: '' });
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [highExpenseAlert, setHighExpenseAlert] = useState(null);

  // Filter by category
  const filteredByCategory = useMemo(() => {
    if (categoryFilter === 'Todas') return filteredExpensesData;
    return filteredExpensesData.filter(exp => exp.category === categoryFilter);
  }, [filteredExpensesData, categoryFilter]);

  // Memoize sorted data to avoid re-sorting on every render
  const sortedExpenses = useMemo(() => {
    if (!filteredByCategory) return [];
    return [...filteredByCategory].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [filteredByCategory]);

  // Calculate total with memoization
  const totalExpenses = useMemo(() => {
    return filteredByCategory.reduce((sum, x) => sum + Number(x.value || 0), 0);
  }, [filteredByCategory]);

  // Check for high expenses and show alert
  useEffect(() => {
    const highExpenses = filteredExpensesData.filter(exp => Number(exp.value) >= HIGH_EXPENSE_THRESHOLD);
    if (highExpenses.length > 0 && !sessionStorage.getItem('highExpenseAlertShown')) {
      setHighExpenseAlert({
        count: highExpenses.length,
        total: highExpenses.reduce((sum, exp) => sum + Number(exp.value || 0), 0)
      });
      sessionStorage.setItem('highExpenseAlertShown', 'true');
    }
  }, [filteredExpensesData]);

  // Handle delete with confirmation
  const handleDeleteClick = (expense) => {
    setConfirmDialog({
      isVisible: true,
      expenseId: expense.id,
      expenseName: expense.description
    });
  };

  const confirmDelete = () => {
    if (confirmDialog.expenseId) {
      handleDeleteExpense(confirmDialog.expenseId);
    }
    setConfirmDialog({ isVisible: false, expenseId: null, expenseName: '' });
  };

  // Handle edit
  const handleEditClick = (expense) => {
    setModal({ open: true, type: 'expense', data: expense });
  };

  // Export handlers
  const handleExportExcel = () => {
    const period = expenseView === 'month' 
      ? `${MONTHS[expenseMonth]}_${expenseYear}`
      : `${expenseYear}`;
    exportToExcel(sortedExpenses, `despesas_${period}`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    const period = expenseView === 'month' 
      ? `${MONTHS[expenseMonth]}_${expenseYear}`
      : `${expenseYear}`;
    exportToCSV(sortedExpenses, `despesas_${period}`);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    const period = expenseView === 'month' 
      ? `${MONTHS[expenseMonth]} de ${expenseYear}`
      : `Ano ${expenseYear}`;
    printExpenses(sortedExpenses, period);
    setShowExportMenu(false);
  };

  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-slate-100 rounded-full p-6 mb-4">
        <TrendingDown size={48} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        Nenhuma despesa registrada
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {expenseView === 'month' 
          ? `Não há despesas para ${MONTHS[expenseMonth]} de ${expenseYear}.`
          : `Não há despesas para o ano ${expenseYear}.`}
      </p>
      <button 
        onClick={() => setModal({open: true, type: 'expense'})} 
        className="bg-[#005DE4] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#004CC0] transition-colors active:scale-95"
        aria-label="Adicionar nova despesa"
      >
        <PlusCircle size={20}/> Adicionar Despesa
      </button>
    </div>
  );

  return (
    <>
      {/* High Expense Alert */}
      {highExpenseAlert && (
        <Toast
          message={`Atenção! ${highExpenseAlert.count} despesa(s) acima de ${formatCurrency(HIGH_EXPENSE_THRESHOLD)} totalizando ${formatCurrency(highExpenseAlert.total)}`}
          type="warning"
          isVisible={true}
          onClose={() => setHighExpenseAlert(null)}
          duration={8000}
        />
      )}

      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
        {/* View Toggle */}
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setExpenseView('year')} 
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              expenseView === 'year' 
                ? 'bg-[#005DE4] text-white shadow-md' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-pressed={expenseView === 'year'}
            aria-label="Visualização anual"
          >
            Anual
          </button>
          <button 
            onClick={() => setExpenseView('month')} 
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              expenseView === 'month' 
                ? 'bg-[#005DE4] text-white shadow-md' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-pressed={expenseView === 'month'}
            aria-label="Visualização mensal"
          >
            Mensal
          </button>
        </div>

        {/* Date Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {expenseView === 'month' && (
            <div className="flex items-center gap-2">
              <label htmlFor="expense-month" className="text-sm font-semibold text-slate-600">
                Mês
              </label>
              <select 
                id="expense-month"
                value={expenseMonth} 
                onChange={e => setExpenseMonth(Number(e.target.value))} 
                className="border px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all"
                aria-label="Selecionar mês"
              >
                {MONTHS.map((month, i) => (
                  <option key={i} value={i}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="expense-year" className="text-sm font-semibold text-slate-600">
              Ano
            </label>
            <input 
              id="expense-year"
              type="number" 
              value={expenseYear} 
              onChange={e => setExpenseYear(Number(e.target.value))} 
              className="border px-3 py-2 rounded-lg w-28 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all" 
              aria-label="Selecionar ano"
              min="2020"
              max="2100"
            />
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">Despesas por Categoria</h3>
            <p className="text-xs text-slate-400">
              {expenseView === 'month' 
                ? `${MONTHS[expenseMonth]} ${expenseYear}`
                : `Ano ${expenseYear}`}
            </p>
          </div>
        </div>
        {filteredExpensesData.length > 0 ? (
          <DonutChart data={filteredExpensesData} />
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
            Sem dados para exibir
          </div>
        )}
      </Card>

      {/* Expenses List Card */}
      <Card>
        <div className="flex flex-col gap-4 mb-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Lista de Despesas</h3>
              <p className="text-xs text-slate-400">
                {categoryFilter !== 'Todas' && `${categoryFilter} - `}
                Total: {formatCurrency(totalExpenses)}
                {categoryFilter !== 'Todas' && ` (${filteredByCategory.length} despesa${filteredByCategory.length !== 1 ? 's' : ''})`}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Export Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
                  aria-label="Exportar despesas"
                  disabled={sortedExpenses.length === 0}
                >
                  <Download size={18}/> 
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                {showExportMenu && sortedExpenses.length > 0 && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-10">
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 rounded-t-lg"
                    >
                      <FileSpreadsheet size={16} className="text-green-600" />
                      Exportar Excel
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <FileSpreadsheet size={16} className="text-blue-600" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 rounded-b-lg"
                    >
                      <Printer size={16} className="text-slate-600" />
                      Imprimir
                    </button>
                  </div>
                )}
              </div>

              {/* Add Button */}
              <button 
                onClick={() => setModal({open: true, type: 'expense'})} 
                className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-[#004CC0] transition-all active:scale-95 shadow-md"
                aria-label="Adicionar nova despesa"
              >
                <PlusCircle size={18}/> 
                <span className="hidden sm:inline">Nova Despesa</span>
                <span className="sm:hidden">Adicionar</span>
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-slate-600" />
            <span className="text-sm font-semibold text-slate-600">Categoria:</span>
            <div className="flex gap-2 flex-wrap">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                    categoryFilter === cat
                      ? 'bg-[#005DE4] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                  {cat !== 'Todas' && categoryFilter === cat && (
                    <span className="ml-1 text-xs">
                      ({filteredByCategory.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sortedExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <Table
              header={["Descrição", "Categoria", "Data", "Valor", "Pagamento", "Ações"]}
              data={sortedExpenses}
              render={x => (
                <>
                  <td className="px-6 py-3">
                    <span className="text-sm text-slate-800">{x.description}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {x.category || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{formatDate(x.date)}</td>
                  <td className="px-6 py-3">
                    <span className={`font-semibold ${Number(x.value) >= HIGH_EXPENSE_THRESHOLD ? 'text-yellow-600' : 'text-slate-800'}`}>
                      {formatCurrency(x.value)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {x.paymentMethod || 'Não especificado'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditClick(x)} 
                        className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-sm font-medium active:scale-95"
                        aria-label={`Editar despesa ${x.description}`}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(x)} 
                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 text-sm font-medium active:scale-95"
                        aria-label={`Remover despesa ${x.description}`}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            />
          </div>
        ) : (
          categoryFilter !== 'Todas' ? (
            <div className="py-12 text-center">
              <Filter size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 font-medium">Nenhuma despesa encontrada na categoria "{categoryFilter}"</p>
              <button
                onClick={() => setCategoryFilter('Todas')}
                className="mt-4 text-[#005DE4] hover:underline font-semibold"
              >
                Limpar filtro
              </button>
            </div>
          ) : (
            <EmptyState />
          )
        )}
      </Card>

      {/* Evolution Chart Card */}
      <Card>
        <h3 className="font-bold text-lg mb-4">Evolução das Despesas ({expenseYear})</h3>
        {expenseEvolutionData?.labels?.length > 0 ? (
          <ExpenseEvolutionChart 
            labels={expenseEvolutionData.labels} 
            values={expenseEvolutionData.values}
            year={expenseYear}
          />
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
            Sem dados de evolução para exibir
          </div>
        )}
      </Card>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isVisible={confirmDialog.isVisible}
        onClose={() => setConfirmDialog({ isVisible: false, expenseId: null, expenseName: '' })}
        onConfirm={confirmDelete}
        title="Remover Despesa"
        message={`Tem certeza que deseja remover a despesa "${confirmDialog.expenseName}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  );
};

export { Expenses };
export default Expenses;
