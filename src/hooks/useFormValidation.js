// Hook para validações de formulário
export const useFormValidation = () => {
  const validateVendaForm = (form) => {
    const errors = [];
    
    // Validações obrigatórias
    if (!form.aluno?.trim()) errors.push('Nome do aluno é obrigatório');
    if (!form.tipo?.trim()) errors.push('Tipo de venda é obrigatório');
    if (!form.valor?.toString().trim()) errors.push('Valor é obrigatório');
    if (!form.pagamento?.trim()) errors.push('Forma de pagamento é obrigatória');
    if (!form.vencimento?.trim()) errors.push('Data de vencimento é obrigatória');
    
    // Validação específica para Material Didático
    if (form.tipo === 'Material Didático' && !form.livro?.trim()) {
      errors.push('Livro é obrigatório para Material Didático');
    }
    
    // Validação de valor numérico
    const valor = parseFloat(form.valor);
    if (isNaN(valor) || valor <= 0) {
      errors.push('Valor deve ser um número válido maior que zero');
    }
    
    // Validação de data
    const dataVencimento = new Date(form.vencimento);
    if (isNaN(dataVencimento.getTime())) {
      errors.push('Data de vencimento inválida');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const validateEstoqueForm = (form) => {
    const errors = [];
    
    // Validações obrigatórias
    if (!form.categoria?.trim()) errors.push('Categoria é obrigatória');
    if (!form.numeroLivro?.toString().trim()) errors.push('Número do livro é obrigatório');
    if (!form.quantidade?.toString().trim()) errors.push('Quantidade é obrigatória');
    if (!form.precoCusto?.toString().trim()) errors.push('Preço de custo é obrigatório');
    if (!form.precoVenda?.toString().trim()) errors.push('Preço de venda é obrigatório');
    
    // Validações numéricas
    const quantidade = parseInt(form.quantidade);
    if (isNaN(quantidade) || quantidade < 0) {
      errors.push('Quantidade deve ser um número válido maior ou igual a zero');
    }
    
    const estoqueMinimo = parseInt(form.estoqueMinimo || 5);
    if (isNaN(estoqueMinimo) || estoqueMinimo <= 0) {
      errors.push('Estoque mínimo deve ser um número válido maior que zero');
    }
    
    const precoCusto = parseFloat(form.precoCusto);
    if (isNaN(precoCusto) || precoCusto < 0) {
      errors.push('Preço de custo deve ser um número válido maior ou igual a zero');
    }
    
    const precoVenda = parseFloat(form.precoVenda);
    if (isNaN(precoVenda) || precoVenda <= 0) {
      errors.push('Preço de venda deve ser um número válido maior que zero');
    }
    
    // Validação de margem de lucro (alertar se muito baixa)
    if (!isNaN(precoCusto) && !isNaN(precoVenda) && precoVenda <= precoCusto) {
      errors.push('⚠️ Preço de venda deve ser maior que o preço de custo para ter lucro');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0;
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  const validateNumber = (value, min = 0) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min;
  };
  
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, ''); // Remove caracteres perigosos
  };
  
  return {
    validateVendaForm,
    validateEstoqueForm,
    formatCurrency,
    formatDate,
    validateNumber,
    sanitizeInput
  };
};