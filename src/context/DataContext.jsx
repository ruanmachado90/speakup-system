import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  useAuth, 
  useFirestore, 
  useStats, 
  useTeacherStats, 
  useFilteredExpenses, 
  useMonthlyData, 
  useFinanceStats, 
  useFilteredPayments, 
  useFilteredExpensesData, 
  useExpenseEvolutionData 
} from '../hooks';
import { showToast, APP_ID, EXPENSE_CATEGORIES } from '../utils';
import { useFilters } from './FilterContext';
import { useUI } from './UIContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { modal, setToast } = useUI();
  const {
    filterMonth,
    filterYear,
    filterStatus,
    dashboardRange,
    expenseView,
    expenseMonth,
    expenseYear,
    setExpenseCategorySelect,
    setExpenseCategoryOther,
  } = useFilters();
  
  // Auth & Firebase Data
  const user = useAuth(auth, (msg) => showToast(setToast, msg, 4000));
  const students = useFirestore(db, APP_ID, "students", user);
  const payments = useFirestore(db, APP_ID, "payments", user);
  const expenses = useFirestore(db, APP_ID, "expenses", user);
  const leads = useFirestore(db, APP_ID, "leads", user);
  
  // Calculated Data (Memoized Hooks)
  const stats = useStats(students, payments, expenses, dashboardRange);
  const teacherStats = useTeacherStats(students);
  const filteredExpenses = useFilteredExpenses(expenses, dashboardRange);
  const monthlyData = useMonthlyData(payments, expenses);
  const financeStats = useFinanceStats(payments, filterMonth, filterYear);
  const filteredPayments = useFilteredPayments(payments, filterMonth, filterYear, filterStatus);
  const filteredExpensesData = useFilteredExpensesData(expenses, expenseView, expenseMonth, expenseYear);
  const expenseEvolutionData = useExpenseEvolutionData(expenses, expenseYear);
  
  // Sync expense category fields when opening expense modal
  useEffect(() => {
    if (!modal.open || modal.type !== 'expense') return;
    const cat = modal.data?.category || '';
    if (EXPENSE_CATEGORIES.includes(cat)) {
      setExpenseCategorySelect(cat);
      setExpenseCategoryOther('');
    } else if (cat) {
      setExpenseCategorySelect('Outro');
      setExpenseCategoryOther(cat);
    } else {
      setExpenseCategorySelect('');
      setExpenseCategoryOther('');
    }
  }, [modal, setExpenseCategorySelect, setExpenseCategoryOther]);
  
  const value = useMemo(() => ({
    // Firebase Data
    user,
    students,
    payments,
    expenses,
    leads,
    
    // Calculated Data
    stats,
    teacherStats,
    filteredExpenses,
    monthlyData,
    financeStats,
    filteredPayments,
    filteredExpensesData,
    expenseEvolutionData,
  }), [
    user, students, payments, expenses, leads,
    stats, teacherStats, filteredExpenses, monthlyData,
    financeStats, filteredPayments, filteredExpensesData, expenseEvolutionData
  ]);
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
