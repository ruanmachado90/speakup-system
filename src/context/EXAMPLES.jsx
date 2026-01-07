/**
 * Exemplos de Uso - Contexts Refatorados
 * 
 * Este arquivo mostra exemplos práticos de como usar
 * os novos contexts e hooks otimizados
 */

import React, { memo } from 'react';
import {
  useModal,
  useToast,
  useStudents,
  useDashboardStats,
  useStudentManagement,
  usePaymentManagement,
  useExpenseManagement,
} from '../context';

// ============================================
// EXEMPLO 1: Dashboard Simples
// ============================================
export const DashboardSimple = memo(() => {
  const stats = useDashboardStats();
  
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Receita Planejada: R$ {stats.planned}</p>
      <p>Receita Paga: R$ {stats.paid}</p>
      <p>Lucro: R$ {stats.profit}</p>
      <p>Alunos Ativos: {stats.students}</p>
    </div>
  );
});

// ============================================
// EXEMPLO 2: Lista de Estudantes Otimizada
// ============================================
export const StudentList = memo(() => {
  const students = useStudents();
  const { openModal } = useModal();
  
  return (
    <div>
      <button onClick={() => openModal('student')}>
        Adicionar Estudante
      </button>
      {students.map(student => (
        <div key={student.id}>
          <span>{student.name}</span>
          <button onClick={() => openModal('student', student)}>
            Editar
          </button>
        </div>
      ))}
    </div>
  );
});

// ============================================
// EXEMPLO 3: Gerenciamento Completo de Estudantes
// ============================================
export const StudentManagement = () => {
  const {
    students,
    openModal,
    closeModal,
    saving,
    setSaving,
    toastMsg
  } = useStudentManagement();
  
  const handleAddStudent = () => {
    openModal('student');
  };
  
  const handleEditStudent = (student) => {
    openModal('student', student);
  };
  
  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    
    setSaving(true);
    try {
      // lógica de deleção aqui
      toastMsg('Estudante excluído com sucesso!');
    } catch (error) {
      toastMsg('Erro ao excluir estudante');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div>
      <button onClick={handleAddStudent} disabled={saving}>
        {saving ? 'Salvando...' : 'Novo Estudante'}
      </button>
      
      {students.map(student => (
        <div key={student.id}>
          <span>{student.name}</span>
          <button onClick={() => handleEditStudent(student)}>
            Editar
          </button>
          <button onClick={() => handleDeleteStudent(student.id)}>
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
};

// ============================================
// EXEMPLO 4: Gerenciamento de Pagamentos
// ============================================
export const PaymentManagement = () => {
  const {
    filteredPayments,
    openModal,
    paymentSaving,
    setPaymentSaving,
    toastMsg,
    filterMonth,
    filterYear,
    filterStatus
  } = usePaymentManagement();
  
  const handleMarkAsPaid = async (paymentId) => {
    setPaymentSaving(true);
    try {
      // lógica de pagamento aqui
      toastMsg('Pagamento marcado como pago!');
    } catch (error) {
      toastMsg('Erro ao processar pagamento');
    } finally {
      setPaymentSaving(false);
    }
  };
  
  return (
    <div>
      <h2>Pagamentos - {filterMonth + 1}/{filterYear}</h2>
      <p>Filtro: {filterStatus}</p>
      
      {filteredPayments.map(payment => (
        <div key={payment.id}>
          <span>{payment.studentName}</span>
          <span>R$ {payment.valuePlanned}</span>
          <button 
            onClick={() => handleMarkAsPaid(payment.id)}
            disabled={paymentSaving}
          >
            Marcar como Pago
          </button>
        </div>
      ))}
    </div>
  );
};

// ============================================
// EXEMPLO 5: Gerenciamento de Despesas
// ============================================
export const ExpenseManagement = () => {
  const {
    filteredExpensesData,
    openModal,
    expenseSaving,
    setExpenseSaving,
    toastMsg,
    expenseMonth,
    expenseYear,
    expenseView,
    setExpenseView
  } = useExpenseManagement();
  
  const handleAddExpense = () => {
    openModal('expense');
  };
  
  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Tem certeza?')) return;
    
    setExpenseSaving(true);
    try {
      // lógica de deleção aqui
      toastMsg('Despesa excluída!');
    } catch (error) {
      toastMsg('Erro ao excluir despesa');
    } finally {
      setExpenseSaving(false);
    }
  };
  
  return (
    <div>
      <h2>Despesas - {expenseView}</h2>
      
      <select value={expenseView} onChange={(e) => setExpenseView(e.target.value)}>
        <option value="month">Mês</option>
        <option value="year">Ano</option>
      </select>
      
      <button onClick={handleAddExpense} disabled={expenseSaving}>
        Nova Despesa
      </button>
      
      {filteredExpensesData.map(expense => (
        <div key={expense.id}>
          <span>{expense.description}</span>
          <span>R$ {expense.value}</span>
          <span>{expense.category}</span>
          <button onClick={() => handleDeleteExpense(expense.id)}>
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
};

// ============================================
// EXEMPLO 6: Componente com Toast
// ============================================
export const ComponentWithToast = () => {
  const { toastMsg } = useToast();
  
  const handleAction = async () => {
    try {
      // alguma ação
      toastMsg('Ação realizada com sucesso!', 3000);
    } catch (error) {
      toastMsg('Erro ao realizar ação', 5000);
    }
  };
  
  return (
    <button onClick={handleAction}>
      Executar Ação
    </button>
  );
};

// ============================================
// EXEMPLO 7: Uso Múltiplo de Hooks
// ============================================
export const ComplexComponent = memo(() => {
  // Consumir apenas o necessário
  const { openModal, closeModal } = useModal();
  const { toastMsg } = useToast();
  const students = useStudents();
  const stats = useDashboardStats();
  
  // Este componente só re-renderiza quando:
  // - students mudar
  // - stats mudar
  // modal e toast NÃO causam re-render porque usamos callbacks memoizados
  
  return (
    <div>
      <h2>Visão Geral</h2>
      <p>{students.length} estudantes</p>
      <p>R$ {stats.paid} recebido</p>
      <button onClick={() => {
        openModal('student');
        toastMsg('Modal aberto!');
      }}>
        Adicionar Estudante
      </button>
    </div>
  );
});
