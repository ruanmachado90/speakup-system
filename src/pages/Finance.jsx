import { useState, useMemo } from 'react';
import { Search, Edit, X, Printer, Trash2, ChevronUp, ChevronDown, Link, Check, Settings, CheckCircle } from 'lucide-react';
import { Card, KPI } from '../components';
import { printReceipt } from '../utils/print';
import PixInfoForm from '../components/forms/PixInfoForm';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [savingPix, setSavingPix] = useState(false);

  // Função para salvar informações PIX
  const handleSavePixInfo = async (pixData) => {
    if (!selectedPayment) {
      alert('Erro: Nenhum pagamento selecionado.');
      return;
    }
    
    try {
      // Buscar dados do aluno
      const student = students.find(s => s.id === selectedPayment.studentId);
      const studentName = selectedPayment.studentName || student?.name || '';
      const responsibleName = student?.responsibleName || '';
      
      await setDoc(doc(db, 'payments', selectedPayment.id), {
        pixQRCode: pixData.pixQRCode,
        pixCode: pixData.pixCode,
        studentName: studentName,
        responsibleName: responsibleName,
        valuePlanned: selectedPayment.valuePlanned,
        dueDate: selectedPayment.dueDate,
        description: selectedPayment.description || ''
      }, { merge: true });
      
      // Fechar modal e limpar sele\u00e7\u00e3o
      setPixModalOpen(false);
      setSelectedPayment(null);
      
      // Copiar link automaticamente após salvar
      const paymentLink = `${window.location.origin}/pagamento/${selectedPayment.id}`;
      await navigator.clipboard.writeText(paymentLink);
      setCopiedLinkId(selectedPayment.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      
      if (window.toastMsg) {
        window.toastMsg('Link de pagamento salvo e copiado!');
      } else {
        alert('Link de pagamento salvo e copiado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar PIX:', error);
      const msg = 'Erro ao salvar informações PIX: ' + (error.message || 'Erro desconhecido');
      window.toastMsg ? window.toastMsg(msg) : alert(msg);
    } finally {
      setSavingPix(false);
    }
  };

  // Função para copiar link de pagamento
  const handleCopyPaymentLink = async (payment) => {
    const paymentLink = `${window.location.origin}/pagamento/${payment.id}`;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopiedLinkId(payment.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      
      if (window.toastMsg) {
        window.toastMsg('Link de pagamento copiado!');
      }
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      const msg = 'Erro ao copiar link. Tente novamente.';
      window.toastMsg ? window.toastMsg(msg) : alert(msg);
    }
  };

  // Filtrar e ordenar pagamentos
  const processedPayments = useMemo(() => {
    let payments = filteredPayments;
    
    // Filtrar por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      payments = payments.filter(p => {
        const student = students.find(s => s.id === p.studentId);
        const studentName = (p.studentName || student?.name || '').toLowerCase();
        const responsibleName = (student?.responsibleName || '').toLowerCase();
        return studentName.includes(searchLower) || responsibleName.includes(searchLower);
      });
    }
    
    // Ordenar
    if (sortField) {
      payments = [...payments].sort((a, b) => {
        let valueA, valueB;
        
        switch (sortField) {
          case 'name':
            const studentA = students.find(s => s.id === a.studentId);
            const studentB = students.find(s => s.id === b.studentId);
            valueA = (a.studentName || studentA?.name || '').toLowerCase();
            valueB = (b.studentName || studentB?.name || '').toLowerCase();
            break;
          case 'dueDate':
            valueA = a.dueDate ? new Date(a.dueDate) : new Date(0);
            valueB = b.dueDate ? new Date(b.dueDate) : new Date(0);
            break;
          case 'value':
            valueA = Number(a.valuePlanned || 0);
            valueB = Number(b.valuePlanned || 0);
            break;
          default:
            return 0;
        }
        
        if (sortField === 'dueDate' || sortField === 'value') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
          const comparison = valueA.localeCompare(valueB);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
    }
    
    return payments;
  }, [filteredPayments, searchTerm, students, sortField, sortDirection]);
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex justify-center">
          <KPI label="Total Previsto" value={financeStats.planned} />
        </div>
        <div className="flex justify-center">
          <KPI label="Total Realizado" value={financeStats.paid} positive />
        </div>
        <div className="flex justify-center">
          <KPI label="Pendente" value={financeStats.pending} warn />
        </div>
        <div className="flex justify-center">
          <KPI label="Atrasado" value={financeStats.overdue} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('name')} 
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Nome / Responsável</span>
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('dueDate')} 
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Vencimento</span>
                  {sortField === 'dueDate' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('value')} 
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Mensalidade</span>
                  {sortField === 'value' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor Recebido
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedPayments.map(p => {
              const student = students.find(s => s.id === p.studentId);
              const name = p.studentName || student?.name || '-';
              const responsible = student?.responsibleName || '-';
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>{name}</div>
                    <div className="text-xs text-gray-500">{responsible}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(p.valuePlanned || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.status === 'Pago' ? (
                      <div>
                        <span className="font-semibold text-emerald-700">
                          R$ {Number(p.valuePaid || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                        {p.paymentMethod && (
                          <div className="text-xs text-gray-500 mt-1">{p.paymentMethod}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'Pago' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (p.dueDate && new Date(p.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800')
                      }`}
                    >
                      {p.status === 'Pago' 
                        ? 'Pago' 
                        : (p.dueDate && new Date(p.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                            ? 'VENCIDO' 
                            : p.status)
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {p.status === 'Pago' && (
                        <button
                          onClick={() => printReceipt(p, student || {id: p.studentId, name: p.studentName})}
                          className="text-emerald-600 hover:text-emerald-900 transition-colors"
                          title="Imprimir Recibo"
                          aria-label="Imprimir recibo"
                        >
                          <Printer size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!student && !p.studentName) {
                            const msg = 'Aluno não encontrado no sistema';
                            window.toastMsg ? window.toastMsg(msg) : alert(msg);
                            return;
                          }
                          setModal({open: true, type: 'view', data: student || {id: p.studentId, name: p.studentName}});
                        }}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Visualizar aluno"
                        title="Visualizar informações do aluno"
                      >
                        <Search size={16}/>
                      </button>
                      <button 
                        onClick={() => setModal({open: true, type: p.status === 'Pago' ? 'edit-payment' : 'payment', data: p})} 
                        aria-label={p.status === 'Pago' ? 'Editar pagamento' : 'Dar baixa no pagamento'}
                        className={`transition-colors ${p.status === 'Pago' ? 'text-blue-600 hover:text-blue-900' : 'text-emerald-600 hover:text-emerald-900'}`}
                        title={p.status === 'Pago' ? 'Editar pagamento' : 'Dar baixa no pagamento'}
                      >
                        {p.status === 'Pago' ? <Edit size={16}/> : <CheckCircle size={16}/>}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setPixModalOpen(true);
                        }}
                        aria-label="Configurar link de pagamento"
                        className="text-purple-600 hover:text-purple-900 transition-colors"
                        title="Configurar informações PIX"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleCopyPaymentLink(p)}
                        aria-label="Copiar link de pagamento"
                        className={`transition-colors ${copiedLinkId === p.id ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-900'}`}
                        title={p.pixCode && p.pixQRCode ? 'Copiar link de pagamento' : 'Link não configurado'}
                      >
                        {copiedLinkId === p.id ? <Check size={16} /> : <Link size={16} />}
                      </button>
                      {p.status === 'Pago' && (
                        <button 
                          onClick={() => {
                            if (confirm('Desfazer este pagamento?')) {
                              handleUndoPayment(p.id);
                            }
                          }} 
                          aria-label="Desfazer pagamento"
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir esta cobrança?\n\nAluno: ${name}\nValor: R$ ${Number(p.valuePlanned || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`)) {
                            handleDeletePayment(p.id);
                          }
                        }}
                        aria-label="Excluir cobrança"
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Excluir cobrança"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Modal para configurar PIX */}
      <PixInfoForm
        isOpen={pixModalOpen}
        onClose={() => {
          setPixModalOpen(false);
          setSelectedPayment(null);
        }}
        onSave={handleSavePixInfo}
        payment={selectedPayment}
      />
    </Card>
  );
};

export { Finance };
export default Finance;
