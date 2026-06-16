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
  // Parse only the YYYY-MM-DD part as local time to avoid UTC timezone shifts
  const str = typeof date === 'string' ? date : new Date(date).toISOString();
  const [y, m, d] = str.substring(0, 10).split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};
