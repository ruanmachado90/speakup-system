import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROTAS_ADMIN, paginaDaUrl } from '../utils/rotasAdmin';
import { showToast } from '../utils';

export const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Navigation — a URL é a fonte da verdade (utils/rotasAdmin); setPage só
  // navega, então as chamadas existentes de setPage continuam iguais.
  const location = useLocation();
  const navigate = useNavigate();
  const page = paginaDaUrl(location.pathname);
  const setPage = useCallback((p) => {
    const destino = ROTAS_ADMIN[p] || '/';
    if (destino !== location.pathname) navigate(destino);
  }, [navigate, location.pathname]);

  // Modal State
  const [modal, setModal] = useState({ open: false, type: null, data: null });

  // Trocar de tela (inclusive pelo "voltar" do navegador) fecha o modal aberto,
  // pra não sobrar o formulário de uma tela por cima da outra.
  const [paginaAnterior, setPaginaAnterior] = useState(page);
  if (paginaAnterior !== page) {
    setPaginaAnterior(page);
    setModal({ open: false, type: null, data: null });
  }
  
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
