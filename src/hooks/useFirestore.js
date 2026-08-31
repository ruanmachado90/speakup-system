import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

/**
 * Hook otimizado para Firestore com memoização e ordenação
 * 
 * @param {Object} db - Instância do Firestore
 * @param {string} appId - ID da aplicação
 * @param {string} collectionName - Nome da coleção
 * @param {Object} user - Usuário autenticado
 * @param {Object} options - Opções de query
 * @param {string} options.orderByField - Campo para ordenação
 * @param {string} options.orderDirection - Direção da ordenação ('asc' ou 'desc')
 * @param {number} options.limitTo - Limite de documentos
 * 
 * @returns {{ data: Array, isLoading: boolean }} Documentos memoizados e estado de carregamento
 */
export const useFirestoreCollection = (db, appId, collectionName, user, options = {}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const dataRef = useRef([]);
  const isInitialMount = useRef(true);

  const { orderByField, orderDirection = 'asc', limitTo } = options;

  useEffect(() => {
    if (!user) {
      setData([]);
      dataRef.current = [];
      setIsLoading(false);
      return;
    }

    // Troca de coleção ou de usuário: voltamos a não saber nada até o próximo
    // snapshot. No primeiro mount o estado já nasce carregando.
    if (!isInitialMount.current) setIsLoading(true);

    const col = collection(db, "artifacts", appId, "public", "data", collectionName);
    
    // Construir query com ordenação e limite se fornecidos
    let firestoreQuery = query(col);
    
    if (orderByField) {
      firestoreQuery = query(firestoreQuery, orderBy(orderByField, orderDirection));
    }
    
    if (limitTo) {
      firestoreQuery = query(firestoreQuery, limit(limitTo));
    }
    
    const unsubscribe = onSnapshot(
      firestoreQuery,
      snap => {
        const newData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Compara com dados anteriores para evitar re-render desnecessário
        const hasChanged = isInitialMount.current || 
          newData.length !== dataRef.current.length ||
          newData.some((item, idx) => {
            const prev = dataRef.current[idx];
            return !prev || item.id !== prev.id || JSON.stringify(item) !== JSON.stringify(prev);
          });
        
        if (hasChanged) {
          dataRef.current = newData;
          setData(newData);
          isInitialMount.current = false;
        }

        setIsLoading(false);
      },
      error => {
        console.error(`Erro ao carregar ${collectionName}:`, error);
        setData([]);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [db, appId, collectionName, user, orderByField, orderDirection, limitTo]);

  // Memoiza o resultado para manter referência estável
  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
};

/**
 * Mesma coleção, apenas o array. Mantido para os consumidores que não
 * precisam distinguir "ainda carregando" de "vazio".
 */
export const useFirestore = (db, appId, collectionName, user, options = {}) =>
  useFirestoreCollection(db, appId, collectionName, user, options).data;
