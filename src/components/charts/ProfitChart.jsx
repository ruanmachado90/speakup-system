export const ProfitChart = ({labels, profit}) => {
  const w = 800;
  const h = 220;
  const pad = 28;
  const minVal = Math.min(...profit, 0);
  const maxVal = Math.max(...profit, 0);
  const range = maxVal - minVal || 1;
  const stepX = (w - pad*2) / (labels.length - 1);
  const y = v => pad + ((maxVal - v) / range) * (h - pad*2);
  const pathD = (arr) => arr.map((v,i) => `${i===0? 'M':'L'} ${pad + i*stepX} ${y(v)}`).join(' ');
  const baselineY = y(0);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <g>
          {/* baseline for 0 */}
          <line x1={pad} x2={w - pad} y1={baselineY} y2={baselineY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />

          <path d={pathD(profit)} fill="none" stroke="#f97316" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {labels.map((lbl,i) => {
            const val = profit[i] || 0;
            const formatted = (val < 0 ? '-' : '') + `R$ ${Math.abs(Number(val)).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
            const textY = val >= 0 ? y(val) - 8 : y(val) + 16;
            return (
            <g key={i}>
              <circle cx={pad + i*stepX} cy={y(val)} r={3} fill="#f97316" />
              <text x={pad + i*stepX} y={textY} fontSize={9} textAnchor="middle" fill="#92400e">{formatted}</text>
            </g>
          )})}

          {/* x-axis labels */}
          {labels.map((lbl,i) => (
            <text key={i} x={pad + i*stepX} y={h - 6} fontSize={10} textAnchor="middle" fill="#374151">{lbl}</text>
          ))}
        </g>
      </svg>

      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f97316] inline-block rounded" /> Lucro</div>
      </div>
    </div>
  );
};
