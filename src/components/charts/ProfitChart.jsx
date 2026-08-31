import { useState } from 'react';

const fmt = (v) =>
  (v < 0 ? '-' : '') +
  (Math.abs(v) >= 1000
    ? `R$ ${(Math.abs(v) / 1000).toFixed(1).replace('.', ',')}k`
    : `R$ ${Math.abs(Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

export const ProfitChart = ({ labels, profit, hidden = false }) => {
  const [hover, setHover] = useState(null);

  const W = 760, H = 200, PL = 56, PR = 16, PT = 16, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;

  const minVal = Math.min(...profit, 0);
  const maxVal = Math.max(...profit, 0);
  const range  = maxVal - minVal || 1;
  const GRID   = 4;

  const barW = Math.max(8, (chartW / n) * 0.6);
  const xOf  = (i) => PL + (i + 0.5) * (chartW / n);
  const yOf  = (v) => PT + ((maxVal - v) / range) * chartH;
  const zeroY = yOf(0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {Array.from({ length: GRID + 1 }).map((_, i) => {
          const y   = PT + (i / GRID) * chartH;
          const val = maxVal - (i / GRID) * range;
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--gr-200)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} fontSize={9} textAnchor="end" fill="var(--gr-500)">
                {hidden ? '••' : (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0))}
              </text>
            </g>
          );
        })}

        {/* Linha zero */}
        <line x1={PL} x2={W - PR} y1={zeroY} y2={zeroY} stroke="var(--gr-500)" strokeWidth={1.5} />

        {/* Barras */}
        {profit.map((v, i) => {
          const x    = xOf(i);
          const isPos = v >= 0;
          const barY  = isPos ? yOf(v) : zeroY;
          const barH  = Math.max(Math.abs(yOf(v) - zeroY), 1);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect
                x={x - barW / 2} y={barY}
                width={barW} height={barH}
                fill={hover === i ? 'var(--su-blue-700)' : (isPos ? 'var(--su-blue)' : 'var(--su-danger)')}
                rx={3}
              />
              <text x={x} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--gr-500)">
                {labels[i]}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hover !== null && (() => {
          const x   = xOf(hover);
          const v   = profit[hover] || 0;
          const isPos = v >= 0;
          const ttW = 130, ttH = 42;
          const ttX = Math.min(Math.max(x - ttW / 2, PL), W - PR - ttW);
          const ttY = PT + 4;
          return (
            <g>
              <rect x={ttX} y={ttY} width={ttW} height={ttH}
                fill="var(--surface-card)" rx={6} stroke="var(--gr-200)" strokeWidth={1}
                filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))" />
              <text x={ttX + 10} y={ttY + 15} fontSize={10} fontWeight="600" fill="var(--gr-700)">
                {labels[hover]}
              </text>
              <circle cx={ttX + 10} cy={ttY + 28} r={3} fill={isPos ? 'var(--su-blue)' : 'var(--su-danger)'} />
              <text x={ttX + 17} y={ttY + 32} fontSize={9.5} fill={isPos ? 'var(--gr-700)' : 'var(--su-danger)'}>
                {hidden ? '••••' : fmt(v)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
