import { useState, useMemo, useCallback } from 'react';
import { Search, Edit, X, Printer, Trash2, ChevronUp, ChevronDown, Link, Check, Settings, CheckCircle, DollarSign, AlertCircle, User, Clock, XCircle, Mail, FileText, Info } from 'lucide-react';
import { Card, KPI, PaymentMethodChart } from '../components';
import { printReceipt } from '../utils/print';
import { formatCurrency, formatDate } from '../utils';
import { ConfirmDialog } from '../components/ui/Toast';
import PixInfoForm from '../components/forms/PixInfoForm';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { usePaymentActions } from '../hooks/useActions';

// Constants
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' })
}));

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'atrasados', label: 'Atrasados' }
];

// Helper functions
const isPaymentOverdue = (payment, today) => {
  return payment.status !== 'Pago' && payment.dueDate && 
    new Date(payment.dueDate).setHours(0,0,0,0) < today;
};

const getPaymentStatus = (payment) => {
  if (payment.status === 'Pago') {
    return { text: 'Pago', classes: 'bg-emerald-100 text-emerald-800' };
  }
  
  const isOverdue = payment.dueDate && 
    new Date(payment.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  
  return isOverdue 
    ? { text: 'VENCIDO', classes: 'bg-red-100 text-red-800' }
    : { text: payment.status, classes: 'bg-yellow-100 text-yellow-800' };
};

const getStudentInfo = (payment, students) => {
  const student = students.find(s => s.id === payment.studentId);
  return {
    name: payment.studentName || student?.name || '-',
    responsible: student?.responsibleName || '-',
    student
  };
};

const showToast = (message) => {
  window.toastMsg ? window.toastMsg(message) : alert(message);
};

// Color classes for KPI cards (memoized outside component)
const KPI_COLOR_CLASSES = {
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    value: 'text-emerald-600',
    bar: 'bg-emerald-500',
    icon: 'text-emerald-600'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    value: 'text-blue-600',
    bar: 'bg-blue-500',
    icon: 'text-blue-600'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    value: 'text-orange-600',
    bar: 'bg-orange-500',
    icon: 'text-orange-600'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    value: 'text-red-600',
    bar: 'bg-red-500',
    icon: 'text-red-600'
  }
};

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
  const { handleDeletePayment } = usePaymentActions({}, showToast);
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [savingPix, setSavingPix] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ 
    isVisible: false, 
    paymentId: null, 
    paymentInfo: '' 
  });

  // Event handlers with useCallback for performance optimization
  const handleSavePixInfo = useCallback(async (pixData) => {
    if (!selectedPayment) {
      showToast('Erro: Nenhum pagamento selecionado.');
      return;
    }
    
    if (savingPix) return; // Prevent double submission
    
    try {
      setSavingPix(true);
      
      const { name: studentName, responsible: responsibleName } = getStudentInfo(selectedPayment, students);
      
      await setDoc(doc(db, 'payments', selectedPayment.id), {
        pixQRCode: pixData.pixQRCode,
        pixCode: pixData.pixCode,
        studentName,
        responsibleName,
        valuePlanned: selectedPayment.valuePlanned,
        dueDate: selectedPayment.dueDate,
        description: selectedPayment.description || '',
        status: selectedPayment.status || 'Pendente'
      }, { merge: true });
      
      // Auto-copy payment link after saving
      const paymentLink = `${window.location.origin}/pagamento/${selectedPayment.id}`;
      await navigator.clipboard.writeText(paymentLink);
      setCopiedLinkId(selectedPayment.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      
      setPixModalOpen(false);
      setSelectedPayment(null);
      showToast('Link de pagamento salvo e copiado!');
    } catch (error) {
      console.error('Erro ao salvar PIX:', error);
      showToast('Erro ao salvar informações PIX: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingPix(false);
    }
  }, [selectedPayment, students, savingPix]);

  const handleCopyPaymentLink = useCallback(async (payment) => {
    const paymentLink = `${window.location.origin}/pagamento/${payment.id}`;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopiedLinkId(payment.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast('Link de pagamento copiado!');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      showToast('Erro ao copiar link. Tente novamente.');
    }
  }, []);

  const handleSort = useCallback((field) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  // Memoized payment processing for optimal performance
  const processedPayments = useMemo(() => {
    let payments = filteredPayments;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      payments = payments.filter(payment => {
        const { name, responsible } = getStudentInfo(payment, students);
        return name.toLowerCase().includes(searchLower) || 
               responsible.toLowerCase().includes(searchLower);
      });
    }
    
    // Apply sorting
    if (sortField) {
      payments = [...payments].sort((a, b) => {
        let valueA, valueB;
        
        switch (sortField) {
          case 'name': {
            const { name: nameA } = getStudentInfo(a, students);
            const { name: nameB } = getStudentInfo(b, students);
            valueA = nameA.toLowerCase();
            valueB = nameB.toLowerCase();
            const comparison = valueA.localeCompare(valueB);
            return sortDirection === 'asc' ? comparison : -comparison;
          }
          case 'dueDate': {
            valueA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            valueB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
          }
          case 'value': {
            valueA = Number(a.valuePlanned || 0);
            valueB = Number(b.valuePlanned || 0);
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
          }
          default:
            return 0;
        }
      });
    }
    
    return payments;
  }, [filteredPayments, searchTerm, students, sortField, sortDirection]);
  
  // Calculate detailed stats for cards (optimized with single pass)
  const detailedStats = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    
    const paidPayments = [];
    const pendingPayments = [];
    const overduePayments = [];
    
    let totalPlanned = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    
    // Single pass through payments for better performance
    filteredPayments.forEach(p => {
      const value = Number(p.valuePlanned || 0);
      totalPlanned += value;
      
      if (p.status === 'Pago') {
        paidPayments.push(p);
        totalPaid += Number(p.valuePaid || p.valuePlanned || 0);
      } else if (isPaymentOverdue(p, today)) {
        overduePayments.push(p);
        totalOverdue += value;
      } else {
        pendingPayments.push(p);
        totalPending += value;
      }
    });

    return {
      paid: {
        total: totalPaid,
        liquid: totalPaid * 0.95,
        invoices: paidPayments.length,
        percentage: totalPlanned > 0 ? (totalPaid / totalPlanned) * 100 : 0
      },
      confirmed: {
        total: totalPlanned,
        liquid: totalPlanned * 0.95,
        invoices: filteredPayments.length,
        percentage: 100
      },
      pending: {
        total: totalPending,
        liquid: totalPending * 0.95,
        invoices: pendingPayments.length,
        percentage: totalPlanned > 0 ? (totalPending / totalPlanned) * 100 : 0
      },
      overdue: {
        total: totalOverdue,
        liquid: totalOverdue * 0.95,
        invoices: overduePayments.length,
        percentage: totalPlanned > 0 ? (totalOverdue / totalPlanned) * 100 : 0
      }
    };
  }, [filteredPayments]);
  
  // Inline components for better organization
  
  // Enhanced KPI Card Component
  const EnhancedKPICard = ({ title, total, liquid, invoices, percentage, color }) => {
    const colors = KPI_COLOR_CLASSES[color];

    return (
      <div className={`${colors.bg} border ${colors.border} rounded-xl p-5 transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${colors.text}`}>{title}</h3>
          <Info size={16} className={`${colors.icon} opacity-50`} />
        </div>
        
        <div className="mb-2">
          <div className={`text-2xl font-bold ${colors.value}`}>
            {formatCurrency(total)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatCurrency(liquid)} líquido
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`${colors.bar} h-2 rounded-full transition-all`} 
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        {/* Invoice Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <FileText size={14} />
            <span>{invoices} cobrança{invoices !== 1 ? 's' : ''}</span>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    );
  };
  
  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-slate-100 rounded-full p-6 mb-4">
        <DollarSign size={48} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        Nenhuma cobrança encontrada
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {searchTerm 
          ? `Nenhum resultado para "${searchTerm}"`
          : 'Não há cobranças para o período selecionado.'}
      </p>
    </div>
  );

  // Sortable table header component
  const SortableHeader = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
      <button 
        onClick={() => handleSort(field)} 
        className="flex items-center space-x-1 hover:text-gray-800 transition-colors"
      >
        <span>{label}</span>
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        )}
      </button>
    </th>
  );

  // Payment table row component
  const PaymentRow = ({ payment }) => {
    const { name, responsible, student } = getStudentInfo(payment, students);
    const today = new Date().setHours(0,0,0,0);
    const isOverdue = isPaymentOverdue(payment, today);
    const isPaid = payment.status === 'Pago';
    
    // Determine user icon color based on payment status
    const userIconColor = isPaid 
      ? 'text-emerald-600 bg-emerald-50'
      : isOverdue 
        ? 'text-red-600 bg-red-50'
        : 'text-amber-600 bg-amber-50';
    
    // Determine status icon
    const getStatusIcon = () => {
      if (isPaid) {
        return (
          <span title="Pagamento Confirmado">
            <CheckCircle size={18} className="text-emerald-600" />
          </span>
        );
      }
      
      if (isOverdue) {
        return (
          <span title="Pagamento Vencido">
            <XCircle size={18} className="text-red-600" />
          </span>
        );
      }
      
      return (
        <span title="Aguardando Pagamento">
          <Clock size={18} className="text-amber-600" />
        </span>
      );
    };
    
    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* Student Info with Icon */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${userIconColor}`}>
              <User size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{name}</div>
              <div className="text-xs text-gray-500">{responsible}</div>
            </div>
          </div>
        </td>
        
        {/* Planned Value */}
        <td className="px-4 py-4">
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency(Number(payment.valuePlanned || 0))}
          </div>
        </td>
        
        {/* Payment Method */}
        <td className="px-4 py-4">
          {payment.status === 'Pago' && payment.paymentMethod ? (
            <div className="text-sm text-gray-900">{payment.paymentMethod}</div>
          ) : (
            <div className="text-sm text-gray-400">-</div>
          )}
        </td>
        
        {/* Due Date */}
        <td className="px-4 py-4">
          <div className="text-sm text-gray-900">
            {formatDate(payment.dueDate)}
          </div>
        </td>
        
        {/* Status with Icon */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
          </div>
        </td>
        
        {/* Actions */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            {/* Settings/Payment Link Config */}
            <button
              onClick={() => {
                setSelectedPayment(payment);
                setPixModalOpen(true);
              }}
              aria-label="Configurar link de pagamento"
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Configurar informações PIX"
            >
              <Settings size={18} />
            </button>
            
            {/* Copy Payment Link */}
            <button
              onClick={() => handleCopyPaymentLink(payment)}
              aria-label="Copiar link de pagamento"
              className={`p-2 rounded-lg transition-all ${
                copiedLinkId === payment.id 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={payment.pixCode && payment.pixQRCode ? 'Copiar link de pagamento' : 'Link não configurado'}
            >
              {copiedLinkId === payment.id ? <Check size={18} /> : <Link size={18} />}
            </button>
            
            {/* Edit/Update Payment */}
            <button 
              onClick={() => setModal({ 
                open: true, 
                type: payment.status === 'Pago' ? 'edit-payment' : 'payment', 
                data: payment 
              })} 
              aria-label={payment.status === 'Pago' ? 'Editar pagamento' : 'Dar baixa no pagamento'}
              className={`p-2 rounded-lg transition-all ${
                payment.status === 'Pago' 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={payment.status === 'Pago' ? 'Editar pagamento' : 'Dar baixa no pagamento'}
            >
              {payment.status === 'Pago' ? <Edit size={18} /> : <CheckCircle size={18} />}
            </button>
            
            {/* Print Receipt (only if paid) */}
            {payment.status === 'Pago' && (
              <button
                onClick={() => printReceipt(payment, student || { id: payment.studentId, name: payment.studentName })}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                title="Imprimir Recibo"
                aria-label="Imprimir recibo"
              >
                <Printer size={18} />
              </button>
            )}
            
            {/* Send Email (placeholder for future feature) */}
            <button
              onClick={() => showToast('Funcionalidade em desenvolvimento')}
              aria-label="Enviar e-mail"
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Enviar e-mail"
            >
              <Mail size={18} />
            </button>
            
            {/* Delete */}
            <button
              onClick={() => {
                setConfirmDialog({
                  isVisible: true,
                  paymentId: payment.id,
                  paymentInfo: `${name} - ${formatCurrency(Number(payment.valuePlanned || 0))}`
                });
              }}
              aria-label="Excluir cobrança"
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Excluir cobrança"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Main render
  return (
    <>
      <Card>
        {/* Header with filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
          <div>
            <h3 className="font-bold text-lg">Financeiro</h3>
            <p className="text-xs text-slate-400">Lista de parcelas (filtrada por mês/ano)</p>
          </div>

          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="filter-month" className="text-xs text-slate-600 font-semibold min-w-fit">
                Mês
              </label>
              <select 
                id="filter-month"
                value={filterMonth} 
                onChange={e => setFilterMonth(Number(e.target.value))} 
                className="border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all w-full sm:w-auto"
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="filter-year" className="text-xs text-slate-600 font-semibold min-w-fit">
                Ano
              </label>
              <input 
                id="filter-year"
                type="number" 
                value={filterYear} 
                onChange={e => setFilterYear(Number(e.target.value))} 
                className="border px-3 py-2 rounded-lg w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all" 
                min="2020"
                max="2100"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="filter-status" className="text-xs text-slate-600 font-semibold min-w-fit">
                Status
              </label>
              <select 
                id="filter-status"
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all w-full sm:w-auto"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Situação das cobranças</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EnhancedKPICard 
              title="Recebidas"
              total={detailedStats.paid.total}
              liquid={detailedStats.paid.liquid}
              invoices={detailedStats.paid.invoices}
              percentage={detailedStats.paid.percentage}
              color="green"
            />
            <EnhancedKPICard 
              title="Previsto"
              total={detailedStats.confirmed.total}
              liquid={detailedStats.confirmed.liquid}
              invoices={detailedStats.confirmed.invoices}
              percentage={detailedStats.confirmed.percentage}
              color="blue"
            />
            <EnhancedKPICard 
              title="Aguardando pagamento"
              total={detailedStats.pending.total}
              liquid={detailedStats.pending.liquid}
              invoices={detailedStats.pending.invoices}
              percentage={detailedStats.pending.percentage}
              color="orange"
            />
            <EnhancedKPICard 
              title="Vencidas"
              total={detailedStats.overdue.total}
              liquid={detailedStats.overdue.liquid}
              invoices={detailedStats.overdue.invoices}
              percentage={detailedStats.overdue.percentage}
              color="red"
            />
          </div>
        </div>

        {/* Payment Methods Chart */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Pagamentos por Método</h3>
              <p className="text-xs text-slate-400">
                {MONTHS[filterMonth].label} {filterYear}
              </p>
            </div>
          </div>
          {(() => {
            const paidPayments = filteredPayments.filter(p => p.status === 'Pago');
            return paidPayments.length > 0 ? (
              <PaymentMethodChart data={paidPayments} type="payment" />
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                Nenhum pagamento realizado neste período
              </div>
            );
          })()}
        </Card>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por aluno ou responsável..."
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005DE4] transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Limpar busca"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Payment Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <SortableHeader field="name" label="Nome" />
                <SortableHeader field="value" label="Valor" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Forma de Pagamento
                </th>
                <SortableHeader field="dueDate" label="Data" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {processedPayments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {processedPayments.length === 0 && <EmptyState />}
      </Card>

      {/* Modals */}
      <PixInfoForm 
        isOpen={pixModalOpen}
        onClose={() => {
          setPixModalOpen(false);
          setSelectedPayment(null);
        }}
        onSave={handleSavePixInfo}
        payment={selectedPayment}
        isSaving={savingPix}
      />

      <ConfirmDialog
        isVisible={confirmDialog.isVisible}
        title="Excluir Cobrança"
        message={`Tem certeza que deseja excluir a cobrança de ${confirmDialog.paymentInfo}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          handleDeletePayment(confirmDialog.paymentId);
          setConfirmDialog({ isVisible: false, paymentId: null, paymentInfo: '' });
        }}
        onCancel={() => setConfirmDialog({ isVisible: false, paymentId: null, paymentInfo: '' })}
      />
    </>
  );
};

export { Finance };
export default Finance;
