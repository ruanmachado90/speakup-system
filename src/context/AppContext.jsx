/**
 * AppContext - Contexto Principal Refatorado
 * 
 * Este arquivo agora compõe múltiplos contexts especializados:
 * - UIContext: Estado da interface (modal, toast, navegação)
 * - FilterContext: Estados de filtros
 * - DataContext: Dados do Firebase e cálculos
 * - LoadingContext: Estados de loading
 * 
 * Mantém compatibilidade retroativa com useAppContext()
 * mas incentiva uso de hooks especializados para melhor performance
 */

import React, { createContext, useContext, useMemo } from 'react';
import { UIProvider, useUI } from './UIContext';
import { FilterProvider, useFilters } from './FilterContext';
import { DataProvider, useData } from './DataContext';
import { LoadingProvider, useLoading } from './LoadingContext';

const AppContext = createContext();

/**
 * Hook para acesso ao contexto completo
 * @deprecated Prefira usar hooks especializados (useUI, useFilters, useData, useLoading)
 * ou hooks de seleção (usePage, useModal, etc.) para melhor performance
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

/**
 * Componente interno que combina todos os contexts
 */
const CombinedContextProvider = ({ children }) => {
  const ui = useUI();
  const filters = useFilters();
  const data = useData();
  const loading = useLoading();
  
  // Memoiza o valor combinado para evitar re-renders desnecessários
  const value = useMemo(() => ({
    ...ui,
    ...filters,
    ...data,
    ...loading,
  }), [ui, filters, data, loading]);
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Provider Principal da Aplicação
 * Compõe todos os providers especializados
 */
export const AppProvider = ({ children }) => {
  return (
    <UIProvider>
      <LoadingProvider>
        <FilterProvider>
          <DataProvider>
            <CombinedContextProvider>
              {children}
            </CombinedContextProvider>
          </DataProvider>
        </FilterProvider>
      </LoadingProvider>
    </UIProvider>
  );
};
