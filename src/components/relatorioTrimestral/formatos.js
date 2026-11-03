// Formatação do relatório trimestral (pt-BR). Valor ausente vira "—", nunca 0.

const vazio = (v) => v == null || Number.isNaN(v);
const valorDe = (v) => (v && typeof v === 'object' && 'valor' in v ? (v.disponivel === false ? null : v.valor) : v);

export const brl = (v, { centavos = false } = {}) => {
  const n = valorDe(v);
  if (vazio(n)) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0,
  });
};

export const brlCurto = (v) => {
  const n = valorDe(v);
  if (vazio(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? '−' : ''}R$ ${(abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return brl(n);
};

export const pct = (v, casas = 1) => {
  const n = valorDe(v);
  return vazio(n) ? '—' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 })}%`;
};

export const num = (v, casas = 0) => {
  const n = valorDe(v);
  return vazio(n) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas });
};

export const horas = (min) => {
  if (vazio(min)) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export const dataBR = (raw) => {
  if (!raw) return '—';
  const d = typeof raw === 'string' ? new Date(raw.length === 10 ? `${raw}T00:00:00` : raw) : raw?.toDate ? raw.toDate() : new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export { valorDe };
