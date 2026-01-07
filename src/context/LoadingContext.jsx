import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({
    general: false,
    payment: false,
    expense: false,
    student: false,
  });
  
  // Optimized setter for specific loading state
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Helper functions for specific actions
  const setSaving = useCallback((value) => setLoading('general', value), [setLoading]);
  const setPaymentSaving = useCallback((value) => setLoading('payment', value), [setLoading]);
  const setExpenseSaving = useCallback((value) => setLoading('expense', value), [setLoading]);
  const setStudentSaving = useCallback((value) => setLoading('student', value), [setLoading]);
  
  // Check if any operation is loading
  const isAnyLoading = useMemo(() => 
    Object.values(loadingStates).some(state => state),
    [loadingStates]
  );
  
  const value = useMemo(() => ({
    // Individual loading states
    saving: loadingStates.general,
    paymentSaving: loadingStates.payment,
    expenseSaving: loadingStates.expense,
    studentSaving: loadingStates.student,
    
    // Setters
    setSaving,
    setPaymentSaving,
    setExpenseSaving,
    setStudentSaving,
    setLoading,
    
    // Computed
    isAnyLoading,
    loadingStates,
  }), [loadingStates, setSaving, setPaymentSaving, setExpenseSaving, setStudentSaving, setLoading, isAnyLoading]);
  
  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};
