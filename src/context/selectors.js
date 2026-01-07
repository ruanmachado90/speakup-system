/**
 * Hooks Otimizados de Seleção
 * Permitem consumir apenas os dados necessários do context
 * Reduzindo re-renders desnecessários
 */

import { useUI } from './UIContext';
import { useFilters } from './FilterContext';
import { useData } from './DataContext';
import { useLoading } from './LoadingContext';

// ===== UI Hooks =====
export const usePage = () => {
  const { page, setPage } = useUI();
  return [page, setPage];
};

export const useModal = () => {
  const { modal, setModal, openModal, closeModal } = useUI();
  return { modal, setModal, openModal, closeModal };
};

export const useToast = () => {
  const { toast, toastMsg } = useUI();
  return { toast, toastMsg };
};

export const useSearch = () => {
  const { searchTerm, setSearchTerm } = useUI();
  return [searchTerm, setSearchTerm];
};

// ===== Filter Hooks =====
export const useDashboardRange = () => {
  const { dashboardRange, setDashboardRange } = useFilters();
  return [dashboardRange, setDashboardRange];
};

export const useMonthYearFilter = () => {
  const { filterMonth, setFilterMonth, filterYear, setFilterYear } = useFilters();
  return { filterMonth, setFilterMonth, filterYear, setFilterYear };
};

export const useExpenseFilters = () => {
  const { 
    expenseMonth, 
    setExpenseMonth, 
    expenseYear, 
    setExpenseYear, 
    expenseView, 
    setExpenseView,
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther,
    setExpenseCategoryOther
  } = useFilters();
  return { 
    expenseMonth, 
    setExpenseMonth, 
    expenseYear, 
    setExpenseYear, 
    expenseView, 
    setExpenseView,
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther,
    setExpenseCategoryOther
  };
};

// ===== Data Hooks =====
export const useUser = () => {
  const { user } = useData();
  return user;
};

export const useStudents = () => {
  const { students } = useData();
  return students;
};

export const usePayments = () => {
  const { payments } = useData();
  return payments;
};

export const useExpenses = () => {
  const { expenses } = useData();
  return expenses;
};

export const useDashboardStats = () => {
  const { stats } = useData();
  return stats;
};

export const useTeacherData = () => {
  const { teacherStats } = useData();
  return teacherStats;
};

export const useFinancialData = () => {
  const { financeStats, filteredPayments } = useData();
  return { financeStats, filteredPayments };
};

export const useExpenseData = () => {
  const { filteredExpensesData, expenseEvolutionData } = useData();
  return { filteredExpensesData, expenseEvolutionData };
};

// ===== Loading Hooks =====
export const useGeneralLoading = () => {
  const { saving, setSaving } = useLoading();
  return [saving, setSaving];
};

export const usePaymentLoading = () => {
  const { paymentSaving, setPaymentSaving } = useLoading();
  return [paymentSaving, setPaymentSaving];
};

export const useExpenseLoading = () => {
  const { expenseSaving, setExpenseSaving } = useLoading();
  return [expenseSaving, setExpenseSaving];
};

// ===== Combined Hooks (quando precisa de múltiplos contexts) =====
export const useStudentManagement = () => {
  const { students } = useData();
  const { openModal, closeModal } = useUI();
  const { saving, setSaving } = useLoading();
  const { toastMsg } = useToast();
  
  return {
    students,
    openModal,
    closeModal,
    saving,
    setSaving,
    toastMsg
  };
};

export const usePaymentManagement = () => {
  const { payments, filteredPayments } = useData();
  const { openModal, closeModal } = useUI();
  const { paymentSaving, setPaymentSaving } = useLoading();
  const { toastMsg } = useToast();
  const { filterMonth, filterYear, filterStatus } = useFilters();
  
  return {
    payments,
    filteredPayments,
    openModal,
    closeModal,
    paymentSaving,
    setPaymentSaving,
    toastMsg,
    filterMonth,
    filterYear,
    filterStatus
  };
};

export const useExpenseManagement = () => {
  const { expenses, filteredExpensesData } = useData();
  const { openModal, closeModal } = useUI();
  const { expenseSaving, setExpenseSaving } = useLoading();
  const { toastMsg } = useToast();
  const expenseFilters = useExpenseFilters();
  
  return {
    expenses,
    filteredExpensesData,
    openModal,
    closeModal,
    expenseSaving,
    setExpenseSaving,
    toastMsg,
    ...expenseFilters
  };
};
