/**
 * AppContext - Contexto Principal Otimizado
 * 
 * Compõe múltiplos contexts especializados:
 * - UIContext: Estado da interface (modal, toast, navegação)
 * - FilterContext: Estados de filtros
 * - DataContext: Dados do Firebase e cálculos
 * - LoadingContext: Estados de loading
 * 
 * ⚡ RECOMENDADO: Use hooks seletores (useSelectors.js) para melhor performance
 * Exemplo: usePage(), useModal(), useStudents() ao invés de useAppContext()
 */

import React from 'react';
import { UIProvider, useUI } from './UIContext';
import { FilterProvider, useFilters } from './FilterContext';
import { DataProvider, useData } from './DataContext';
import { LoadingProvider, useLoading } from './LoadingContext';

/**
 * Provider Principal da Aplicação (Otimizado)
 * Remove CombinedContextProvider desnecessário
 */
export const AppProvider = ({ children }) => {
  return (
    <UIProvider>
      <FilterProvider>
        <LoadingProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </LoadingProvider>
      </FilterProvider>
    </UIProvider>
  );
};

// Re-exporta hooks especializados para facilitar imports
export { useUI, useFilters, useData, useLoading };

/** @deprecated Use specialized hooks or selectors for better performance */
export const useAppContext = () => ({
  ...useUI(),
  ...useFilters(),
  ...useData(),
  ...useLoading(),
});
