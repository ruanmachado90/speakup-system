export const formatCurrency = (value) => {
  return `R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
};

export const formatNumber = (value) => {
  return Number(value).toLocaleString('pt-BR');
};

export const formatPercent = (value) => {
  return `${Number(value).toLocaleString('pt-BR')}%`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};
