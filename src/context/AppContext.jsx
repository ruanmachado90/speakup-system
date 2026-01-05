import React, { createContext, useContext, useState, useEffect } from 'react';
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

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Navigation
  const [page, setPage] = useState("dashboard");
  
  // Modal & UI State
  const [modal, setModal] = useState({ open: false, type: null, data: null });
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Dashboard
  const [dashboardRange, setDashboardRange] = useState('month');
  
  // Reports
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('monthly');
  
  // Expenses
  const [expenseMonth, setExpenseMonth] = useState(new Date().getMonth());
  const [expenseYear, setExpenseYear] = useState(new Date().getFullYear());
  const [expenseView, setExpenseView] = useState('month');
  
  // Loading States
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  
  // Expense Category
  const [expenseCategorySelect, setExpenseCategorySelect] = useState('');
  const [expenseCategoryOther, setExpenseCategoryOther] = useState('');
  
  // Auth & Firebase
  const user = useAuth(auth, (msg) => showToast(setToast, msg, 4000));
  const students = useFirestore(db, APP_ID, "students", user);
  const payments = useFirestore(db, APP_ID, "payments", user);
  const expenses = useFirestore(db, APP_ID, "expenses", user);
  
  // Calculated Data (Hooks)
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
  }, [modal]);
  
  // Helper
  const toastMsg = msg => showToast(setToast, msg);
  
  const value = {
    // Navigation
    page,
    setPage,
    
    // Modal & UI
    modal,
    setModal,
    toast,
    setToast,
    toastMsg,
    searchTerm,
    setSearchTerm,
    
    // Filters
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    filterStatus,
    setFilterStatus,
    
    // Dashboard
    dashboardRange,
    setDashboardRange,
    
    // Reports
    reportMonth,
    setReportMonth,
    reportYear,
    setReportYear,
    reportType,
    setReportType,
    
    // Expenses
    expenseMonth,
    setExpenseMonth,
    expenseYear,
    setExpenseYear,
    expenseView,
    setExpenseView,
    
    // Loading
    saving,
    setSaving,
    paymentSaving,
    setPaymentSaving,
    expenseSaving,
    setExpenseSaving,
    
    // Expense Category
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther,
    setExpenseCategoryOther,
    
    // Firebase Data
    user,
    students,
    payments,
    expenses,
    
    // Calculated Data
    stats,
    teacherStats,
    filteredExpenses,
    monthlyData,
    financeStats,
    filteredPayments,
    filteredExpensesData,
    expenseEvolutionData
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
