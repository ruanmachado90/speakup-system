import { useState } from 'react';

// Gera path suave com bezier cúbico
const smoothPath = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
  }
  return d;
};

const fmt = (v) =>
  (v < 0 ? '-' : '') +
  (Math.abs(v) >= 1000
    ? `R$ ${(Math.abs(v) / 1000).toFixed(1).replace('.', ',')}k`
    : `R$ ${Math.abs(Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

/**
 * Evolução do lucro — linha suave com área preenchida, seguindo o template
 * do design handoff (era gráfico de barras; virou linha, como no mensal).
 */
export const ProfitChart = ({ labels, profit, hidden = false }) => {
  const [hover, setHover] = useState(null);

  const W = 760, H = 200, PL = 44, PR = 16, PT = 16, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;

  const minVal = Math.min(...profit, 0);
  const maxVal = Math.max(...profit, 1);
  const range = maxVal - minVal || 1;
  const GRID = 4;

  const xOf = (i) => PL + (i / (n - 1)) * chartW;
  const yOf = (v) => PT + ((maxVal - v) / range) * chartH;
  const zeroY = yOf(0);

  const pts = profit.map((v, i) => [xOf(i), yOf(v)]);
  const linePath = smoothPath(pts);
  const areaPath = linePath + ` L ${xOf(n - 1)} ${zeroY} L ${xOf(0)} ${zeroY} Z`;

  const lastIdx = n - 1;

  return (
    <div>
      {/* Legenda */}
      <div className="flex items-center gap-5 mb-3 text-xs font-semibold" style={{ color: 'var(--gr-500)', fontFamily: 'var(--font-body)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--su-blue)' }} />
          Lucro
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--su-blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--su-blue)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines + y-axis labels */}
        {Array.from({ length: GRID + 1 }).map((_, i) => {
          const y = PT + (i / GRID) * chartH;
          const val = maxVal - (i / GRID) * range;
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--ink-04)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} fontSize={9} textAnchor="end" fill="var(--gr-500)" fontFamily="var(--font-body)">
                {hidden ? '••' : (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0))}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((lbl, i) => (
          <text key={i} x={xOf(i)} y={H - 6} fontSize={10}
            textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">{lbl}</text>
        ))}

        {/* Área preenchida */}
        <path d={areaPath} fill="url(#profitAreaGrad)" />

        {/* Linha */}
        <path d={linePath} fill="none"
          stroke="var(--su-blue)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Pontos em cada mês */}
        {pts.map(([x, y], i) => (
          i === lastIdx ? (
            <g key={i}>
              <circle cx={x} cy={y} r={8} fill="var(--su-blue)" fillOpacity="0.16" />
              <circle cx={x} cy={y} r={4.5} fill="var(--su-blue)" stroke="white" strokeWidth={2} />
            </g>
          ) : (
            <circle key={i} cx={x} cy={y} r={3.5} fill="var(--su-blue)" stroke="white" strokeWidth={1.5} />
          )
        ))}

        {/* Hover zones invisíveis */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={xOf(i) - chartW / n / 2}
            y={PT}
            width={chartW / n}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Tooltip */}
        {hover !== null && (() => {
          const x = xOf(hover);
          const v = profit[hover] || 0;
          const isPos = v >= 0;
          const ttW = 130, ttH = 42;
          const ttX = Math.min(Math.max(x - ttW / 2, PL), W - PR - ttW);
          const ttY = PT + 4;
          return (
            <g>
              <line x1={x} x2={x} y1={PT} y2={PT + chartH}
                stroke="var(--gr-300)" strokeWidth={1} strokeDasharray="3 3" />
              <rect x={ttX} y={ttY} width={ttW} height={ttH}
                fill="var(--ink)" rx={8} ry={8} />
              <text x={ttX + 10} y={ttY + 16} fontSize={10} fontWeight="700" fill="var(--text-on-dark)" fontFamily="var(--font-body)">
                {labels[hover]}
              </text>
              <circle cx={ttX + 10} cy={ttY + 28} r={3} fill="var(--su-blue)" />
              <text x={ttX + 17} y={ttY + 32} fontSize={9.5} fill={isPos ? 'var(--gr-300)' : 'var(--su-danger)'} fontFamily="var(--font-body)">
                {hidden ? '••••' : fmt(v)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
