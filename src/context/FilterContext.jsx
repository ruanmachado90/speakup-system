import React, { createContext, useContext, useState, useMemo } from 'react';

const FilterContext = createContext();

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};

export const FilterProvider = ({ children }) => {
  const currentDate = useMemo(() => new Date(), []);
  
  // General Filters
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth());
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Dashboard
  const [dashboardRange, setDashboardRange] = useState('month');
  
  // Expenses
  const [expenseMonth, setExpenseMonth] = useState(currentDate.getMonth());
  const [expenseYear, setExpenseYear] = useState(currentDate.getFullYear());
  const [expenseView, setExpenseView] = useState('month');
  
  // Expense Category State
  const [expenseCategorySelect, setExpenseCategorySelect] = useState('');
  const [expenseCategoryOther, setExpenseCategoryOther] = useState('');
  
  const value = useMemo(() => ({
    // General Filters
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    filterStatus,
    setFilterStatus,
    
    // Dashboard
    dashboardRange,
    setDashboardRange,
    
    // Expenses
    expenseMonth,
    setExpenseMonth,
    expenseYear,
    setExpenseYear,
    expenseView,
    setExpenseView,
    
    // Expense Category
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther,
    setExpenseCategoryOther,
  }), [
    filterMonth, filterYear, filterStatus,
    dashboardRange,
    expenseMonth, expenseYear, expenseView,
    expenseCategorySelect, expenseCategoryOther
  ]);
  
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};
