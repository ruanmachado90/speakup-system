export const KPI = ({ label, value, positive, warn, format = 'currency', accent, size = 'normal', badge, hidden }) => {
  const formatted = (() => {
    if (hidden) return '••••';
    if (format === 'number') return Number(value).toLocaleString('pt-BR');
    if (format === 'percent') return `${Number(value).toLocaleString('pt-BR')}%`;
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  })();

  const valueColor =
    accent === 'red' ? 'text-red-600' :
    accent === 'green' ? 'text-emerald-600' :
    accent === 'yellow' ? 'text-amber-500' :
    'text-slate-800';

  const borderColor =
    accent === 'red' ? 'border-red-400 bg-red-50' :
    accent === 'yellow' ? 'border-amber-400 bg-amber-50' :
    'border-slate-200 bg-white';

  const valueSize = size === 'large' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${borderColor}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{badge}</span>
          )}
        </div>
        <h3 className={`${valueSize} font-black ${valueColor}`}>
          {formatted}
        </h3>
      </div>
    </div>
  );
};
