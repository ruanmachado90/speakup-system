import { useState, useMemo } from 'react';
import { Search, Edit, X, Printer, Trash2 } from 'lucide-react';
import { Card, Table, KPI } from '../components';
import { printReceipt } from '../utils/print';

import { usePaymentActions } from '../hooks/useActions';

const Finance = ({ 
  students, 
  filterMonth, 
  setFilterMonth, 
  filterYear, 
  setFilterYear, 
  filterStatus, 
  setFilterStatus, 
  financeStats, 
  filteredPayments, 
  setModal,
  handleUndoPayment 
}) => {
  // Adiciona hook para deletar cobrança
  const { handleDeletePayment } = usePaymentActions({}, (msg) => window.toastMsg && window.toastMsg(msg));
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar pagamentos por busca de nome
  const searchedPayments = useMemo(() => {
    if (!searchTerm) return filteredPayments;
    
    const searchLower = searchTerm.toLowerCase();
    return filteredPayments.filter(p => {
      const student = students.find(s => s.id === p.studentId);
      const studentName = (p.studentName || student?.name || '').toLowerCase();
      const responsibleName = (student?.responsibleName || '').toLowerCase();
      return studentName.includes(searchLower) || responsibleName.includes(searchLower);
    });
  }, [filteredPayments, searchTerm, students]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold">Financeiro</h3>
          <p className="text-xs text-slate-400">Lista de parcelas (filtrada por mês/ano)</p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Mês</label>
            <select 
              value={filterMonth} 
              onChange={e => setFilterMonth(Number(e.target.value))} 
              className="border px-2 py-1 rounded"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Ano</label>
            <input 
              type="number" 
              value={filterYear} 
              onChange={e => setFilterYear(Number(e.target.value))} 
              className="border px-2 py-1 rounded w-24" 
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Status</label>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)} 
              className="border px-2 py-1 rounded"
            >
              <option value="all">Todos</option>
              <option value="pagos">Pagos</option>
              <option value="pendentes">Pendentes</option>
              <option value="atrasados">Atrasados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por aluno ou responsável..."
          className="w-full pl-10 pr-4 py-2 border rounded-xl"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPI label="Total Previsto" value={financeStats.planned} />
        <KPI label="Total Realizado" value={financeStats.paid} positive />
        <KPI label="Pendente" value={financeStats.pending} warn />
        <KPI label="Atrasado" value={financeStats.overdue} />
      </div>

      <Table
        header={["Nome / Responsável", "Vencimento", "Mensalidade", "Valor Recebido", "Status", "Ações"]}
        data={searchedPayments}
        render={p => {
          const student = students.find(s => s.id === p.studentId);
          const name = p.studentName || student?.name || '-';
          const responsible = student?.responsibleName || '-';
          return (
            <>
              <td className="px-6 py-3 text-xs font-bold">
                {name}
                <div className="text-[10px] text-slate-400">{responsible}</div>
              </td>
              <td className="px-6 py-3 text-xs">
                {p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}
              </td>
              <td className="px-6 py-3 text-xs">
                R$ {Number(p.valuePlanned || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </td>
              <td className="px-6 py-3 text-xs">
                {p.status === 'Pago' ? (
                  <span className="font-semibold text-emerald-700">
                    R$ {Number(p.valuePaid || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-6 py-3">
                <span 
                  className={`px-2 py-1 rounded-full text-[10px] ${
                    p.status === 'Pago' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : (p.dueDate && new Date(p.dueDate) < new Date() 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-amber-100 text-amber-700')
                  }`}
                >
                  {p.status === 'Pago' 
                    ? 'Pago' 
                    : (p.dueDate && new Date(p.dueDate) < new Date() 
                        ? 'VENCIDO' 
                        : p.status)
                  }
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  {p.status === 'Pago' && (
                    <button
                      onClick={() => printReceipt(p, student || {id: p.studentId, name: p.studentName})}
                      className="text-emerald-600 hover:text-emerald-800 transition-colors"
                      title="Imprimir Recibo"
                      aria-label="Imprimir recibo"
                    >
                      <Printer size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setModal({open: true, type: 'view', data: student || {id: p.studentId, name: p.studentName}})}
                    aria-label="Visualizar aluno"
                  >
                    <Search size={16}/>
                  </button>
                  <button 
                    onClick={() => setModal({open: true, type: p.status === 'Pago' ? 'edit-payment' : 'payment', data: p})} 
                    aria-label={p.status === 'Pago' ? 'Editar pagamento' : 'Dar baixa no pagamento'}
                    className={p.status === 'Pago' ? 'text-blue-500 hover:text-blue-700' : 'text-emerald-500 hover:text-emerald-700'}
                  >
                    <Edit size={16}/>
                  </button>
                  {p.status === 'Pago' && (
                    <button 
                      onClick={() => {
                        if (confirm('Desfazer este pagamento?')) {
                          handleUndoPayment(p.id);
                        }
                      }} 
                      aria-label="Desfazer pagamento"
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    aria-label="Excluir cobrança"
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </>
          );
        }}
      />
    </Card>
  );
};

export { Finance };
export default Finance;
