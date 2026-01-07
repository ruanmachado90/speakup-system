import React, { createContext, useContext, useState, useCallback } from 'react';
import { showToast } from '../utils';

const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Navigation
  const [page, setPage] = useState("dashboard");
  
  // Modal State
  const [modal, setModal] = useState({ open: false, type: null, data: null });
  
  // Toast State
  const [toast, setToast] = useState(null);
  
  // Search
  const [searchTerm, setSearchTerm] = useState("");
  
  // Optimized toast helper
  const toastMsg = useCallback((msg, duration = 3000) => {
    showToast(setToast, msg, duration);
  }, []);
  
  // Optimized modal handlers
  const openModal = useCallback((type, data = null) => {
    setModal({ open: true, type, data });
  }, []);
  
  const closeModal = useCallback(() => {
    setModal({ open: false, type: null, data: null });
  }, []);
  
  const value = {
    // Navigation
    page,
    setPage,
    
    // Modal
    modal,
    setModal,
    openModal,
    closeModal,
    
    // Toast
    toast,
    setToast,
    toastMsg,
    
    // Search
    searchTerm,
    setSearchTerm,
  };
  
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
