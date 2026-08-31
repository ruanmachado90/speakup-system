/**
 * Hooks seletores para Context API
 * Evitam re-renders desnecessários ao selecionar apenas dados necessários
 * 
 * ⚡ Performance: Componentes só re-renderizam quando os dados que usam mudam
 */

import { useContext, useMemo } from 'react';
import { useUI } from '../context/UIContext';
import { useFilters } from '../context/FilterContext';
import { useData } from '../context/DataContext';
import { useLoading } from '../context/LoadingContext';

// ============================================
// UI SELECTORS
// ============================================

/**
 * Selector para página atual
 * Componente só re-renderiza quando page muda
 */
export const usePage = () => {
  const { page, setPage } = useUI();
  return useMemo(() => ({ page, setPage }), [page, setPage]);
};

/**
 * Selector para modal
 */
export const useModal = () => {
  const { modal, setModal } = useUI();
  return useMemo(() => ({ modal, setModal }), [modal, setModal]);
};

/**
 * Selector para toast
 */
export const useToast = () => {
  const { toast, setToast, toastMsg } = useUI();
  return useMemo(() => ({ toast, setToast, toastMsg }), [toast, setToast, toastMsg]);
};

/**
 * Selector para searchTerm
 */
export const useSearch = () => {
  const { searchTerm, setSearchTerm } = useUI();
  return useMemo(() => ({ searchTerm, setSearchTerm }), [searchTerm, setSearchTerm]);
};

// ============================================
// FILTER SELECTORS
// ============================================

/**
 * Selector para filtros de Finance
 */
export const useFinanceFilters = () => {
  const { filterMonth, setFilterMonth, filterYear, setFilterYear, filterStatus, setFilterStatus } = useFilters();
  return useMemo(() => ({
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    filterStatus,
    setFilterStatus
  }), [filterMonth, setFilterMonth, filterYear, setFilterYear, filterStatus, setFilterStatus]);
};

/**
 * Selector para filtros de Expenses
 */
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
  
  return useMemo(() => ({
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
  }), [
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
  ]);
};

/**
 * Selector para dashboard range
 */
export const useDashboardRange = () => {
  const { dashboardRange, setDashboardRange } = useFilters();
  return useMemo(() => ({ dashboardRange, setDashboardRange }), [dashboardRange, setDashboardRange]);
};

// ============================================
// DATA SELECTORS
// ============================================

/**
 * Selector para students (apenas array)
 */
export const useStudents = () => {
  const { students } = useData();
  return students;
};

/**
 * Selector para payments (apenas array)
 */
export const usePayments = () => {
  const { payments } = useData();
  return payments;
};

/**
 * Selector para expenses (apenas array)
 */
export const useExpenses = () => {
  const { expenses } = useData();
  return expenses;
};

/**
 * Selector para leads (apenas array)
 */
export const useLeads = () => {
  const { leads } = useData();
  return leads;
};

/**
 * Selector para professores (apenas array)
 */
export const useProfessoresData = () => {
  const { professores } = useData();
  return professores;
};

/**
 * Selector para stats do Dashboard
 */
export const useDashboardStats = () => {
  const { stats, teacherStats, filteredExpenses, monthlyData, dataLoading } = useData();
  return useMemo(() => ({
    stats,
    teacherStats,
    filteredExpenses,
    monthlyData,
    dataLoading
  }), [stats, teacherStats, filteredExpenses, monthlyData, dataLoading]);
};

/**
 * Selector para dados do Finance
 */
export const useFinanceData = () => {
  const { financeStats, filteredPayments } = useData();
  return useMemo(() => ({
    financeStats,
    filteredPayments
  }), [financeStats, filteredPayments]);
};

/**
 * Selector para dados de Expenses
 */
export const useExpenseData = () => {
  const { filteredExpensesData, expenseEvolutionData } = useData();
  return useMemo(() => ({
    filteredExpensesData,
    expenseEvolutionData
  }), [filteredExpensesData, expenseEvolutionData]);
};

// ============================================
// LOADING SELECTORS
// ============================================

/**
 * Selector para saving state
 */
export const useSaving = () => {
  const { saving, setSaving } = useLoading();
  return useMemo(() => ({ saving, setSaving }), [saving, setSaving]);
};

/**
 * Selector para paymentSaving state
 */
export const usePaymentSaving = () => {
  const { paymentSaving } = useLoading();
  return paymentSaving;
};

/**
 * Selector para expenseSaving state
 */
export const useExpenseSaving = () => {
  const { expenseSaving, setExpenseSaving } = useLoading();
  return { expenseSaving, setExpenseSaving };
};

// ============================================
// USER SELECTOR
// ============================================

/**
 * Selector para dados do usuário autenticado
 */
export const useUser = () => {
  const { user } = useData();
  return user;
};
