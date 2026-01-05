export const KPI = ({label, value, positive, warn, format='currency', accent}) => {
  const formatted = (() => {
    if (format === 'number') return Number(value).toLocaleString('pt-BR');
    if (format === 'percent') return `${Number(value).toLocaleString('pt-BR')}%`;
    return `R$ ${Number(value).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  })();

  const colorClass = positive ? 'text-emerald-600' : warn ? 'text-amber-500' : '';
  
  const accentColor = accent === 'blue' ? 'bg-[#005DE4]' : 
                      accent === 'green' ? 'bg-emerald-500' : 
                      accent === 'yellow' ? 'bg-amber-400' : 
                      accent === 'red' ? 'bg-red-500' : '';

  return (
    <div className="bg-white rounded-2xl border overflow-hidden flex">
      {accent && <div className={`w-1.5 ${accentColor}`}></div>}
      <div className="p-6 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <h3 className={`text-2xl font-black ${colorClass}`}>
          {formatted}
        </h3>
      </div>
    </div>
  );
};
