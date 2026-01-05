export const Progress = ({label, value, total, color}) => (
  <div className="bg-white p-6 rounded-2xl border">
    <p className="text-xs mb-2">{label}</p>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`${color} h-full`} style={{width:`${total ? value/total*100 : 0}%`}} />
    </div>
  </div>
);
