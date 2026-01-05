export const EvolutionChart = ({labels, planned, paid}) => {
  const w = 800;
  const h = 250;
  const pad = 50;
  const groups = labels.length;
  const groupWidth = (w - pad*2) / groups;
  const barWidth = Math.min(40, groupWidth * 0.36);
  const max = Math.max(...planned, ...paid, 1);
  
  // Linhas de grade
  const gridLines = 5;
  const gridStep = (h - pad*2) / gridLines;

  return (
    <div className="flex gap-6 items-center">
      <div className="flex-1">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
          <defs>
            <style>{`
              .bar-rect { transition: opacity 0.2s, filter 0.2s; cursor: pointer; }
              .bar-rect:hover { opacity: 0.85; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
              .bar-label { opacity: 0; transition: opacity 0.2s; pointer-events: none; font-size: 10px; font-weight: 600; }
              .bar-group:hover .bar-label { opacity: 1; }
            `}</style>
          </defs>
          
          {/* Linhas de grade */}
          <g>
            {Array.from({length: gridLines + 1}).map((_, i) => {
              const y = pad + i * gridStep;
              const value = max * (1 - i / gridLines);
              return (
                <g key={i}>
                  <line 
                    x1={pad} 
                    x2={w - pad} 
                    y1={y} 
                    y2={y} 
                    stroke="#e2e8f0" 
                    strokeWidth={1}
                  />
                  <text 
                    x={pad - 8} 
                    y={y + 3} 
                    fontSize={9} 
                    textAnchor="end" 
                    fill="#94a3b8"
                  >
                    {value >= 1000 ? `${(value/1000).toFixed(1)}k` : value.toFixed(0)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Barras */}
          <g>
            {labels.map((lbl,i) => {
              const cx = pad + i * groupWidth + groupWidth / 2;
              const plannedVal = planned[i] || 0;
              const paidVal = paid[i] || 0;
              const planH = (plannedVal / max) * (h - pad*2);
              const paidH = (paidVal / max) * (h - pad*2);
              const planY = h - pad - planH;
              const paidY = h - pad - paidH;
              const planX = cx - barWidth - 2;
              const paidX = cx + 2;

              return (
                <g key={i} className="bar-group">
                  {/* Barra Previsto */}
                  <rect 
                    x={planX} 
                    y={planY} 
                    width={barWidth} 
                    height={planH} 
                    fill="#93c5fd" 
                    rx={3}
                    className="bar-rect"
                  >
                    <title>Previsto: R$ {Number(plannedVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</title>
                  </rect>
                  <text 
                    x={planX + barWidth/2} 
                    y={planY - 6} 
                    textAnchor="middle" 
                    fill="#1e40af"
                    className="bar-label"
                  >
                    R$ {Number(plannedVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </text>

                  {/* Barra Realizado */}
                  <rect 
                    x={paidX} 
                    y={paidY} 
                    width={barWidth} 
                    height={paidH} 
                    fill="#10b981" 
                    rx={3}
                    className="bar-rect"
                  >
                    <title>Realizado: R$ {Number(paidVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</title>
                  </rect>
                  <text 
                    x={paidX + barWidth/2} 
                    y={paidY - 6} 
                    textAnchor="middle" 
                    fill="#065f46"
                    className="bar-label"
                  >
                    R$ {Number(paidVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </text>

                  {/* Label do mês */}
                  <text x={cx} y={h - 10} fontSize={11} fontWeight="500" textAnchor="middle" fill="#374151">{lbl}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legenda lateral */}
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#93c5fd] inline-block rounded"></span>
          <span className="font-medium">Previsto</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#10b981] inline-block rounded"></span>
          <span className="font-medium">Realizado</span>
        </div>
      </div>
    </div>
  );
};
