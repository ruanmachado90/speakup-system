// Hook para gerenciamento de erros
export const useErrorHandler = (showToast) => {
  const handleError = (error, context = 'Operação') => {
    console.error(`Erro em ${context}:`, error);
    
    let userMessage = `Erro ao executar ${context.toLowerCase()}. Tente novamente.`;
    
    // Tratamento específico para diferentes tipos de erro
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          userMessage = 'Você não tem permissão para realizar esta operação.';
          break;
        case 'unavailable':
          userMessage = 'Serviço temporariamente indisponível. Verifique sua conexão.';
          break;
        case 'network-request-failed':
          userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        case 'invalid-argument':
          userMessage = 'Dados inválidos fornecidos.';
          break;
        default:
          if (error.message) {
            userMessage = error.message;
          }
      }
    } else if (error.message) {
      userMessage = error.message;
    }
    
    showToast(userMessage, 'error');
    return userMessage;
  };
  
  const wrapAsync = (asyncFn, context) => {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        handleError(error, context);
        throw error; // Re-throw para permitir tratamento específico se necessário
      }
    };
  };
  
  return {
    handleError,
    wrapAsync
  };
};