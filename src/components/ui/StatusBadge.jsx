const STATUS_COLORS = {
  novo: 'bg-blue-100 text-blue-700',
  contato: 'bg-yellow-100 text-yellow-700',
  matriculado: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700'
};

const STATUS_LABELS = {
  novo: 'Novo',
  contato: 'Em Contato',
  matriculado: 'Matriculado',
  perdido: 'Perdido'
};

const getStatusColor = (status) => STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
const getStatusLabel = (status) => STATUS_LABELS[status] || status;

export const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${getStatusColor(status)}`}>
    {getStatusLabel(status)}
  </span>
);
