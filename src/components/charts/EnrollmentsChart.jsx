import { useState } from 'react';

// Gera path suave com bezier cúbico — mesmo traçado do EvolutionChart, 1 série só.
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

/**
 * Série única de contagem (matrículas por mês) — versão enxuta do
 * EvolutionChart pra quando não há um "previsto" pra comparar.
 */
export const EnrollmentsChart = ({ labels, values, color = 'var(--su-blue)' }) => {
  const [hover, setHover] = useState(null);

  const W = 760, H = 200, PL = 40, PR = 16, PT = 16, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;
  const max = Math.max(...values, 1);
  const GRID = 4;

  const xOf = (i) => PL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yOf = (v) => PT + (1 - v / max) * chartH;

  const pts = values.map((v, i) => [xOf(i), yOf(v)]);
  const linePath = smoothPath(pts);
  const areaPath = linePath + ` L ${xOf(n - 1)} ${PT + chartH} L ${xOf(0)} ${PT + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="enrollAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {Array.from({ length: GRID + 1 }).map((_, i) => {
        const y = PT + (i / GRID) * chartH;
        const val = max * (1 - i / GRID);
        return (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--ink-04)" strokeWidth={1} />
            <text x={PL - 6} y={y + 3.5} fontSize={9} textAnchor="end" fill="var(--gr-500)" fontFamily="var(--font-body)">
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {labels.map((lbl, i) => (
        <text key={i} x={xOf(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">
          {lbl}
        </text>
      ))}

      <path d={areaPath} fill="url(#enrollAreaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={hover === i ? 4.5 : 3} fill={color} stroke="white" strokeWidth={1.5} />
      ))}

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

      {hover !== null && (() => {
        const [x, y] = pts[hover];
        const ttW = 96, ttH = 34;
        const ttX = Math.min(Math.max(x - ttW / 2, PL), W - PR - ttW);
        const ttY = Math.max(y - ttH - 10, PT);
        return (
          <g>
            <rect x={ttX} y={ttY} width={ttW} height={ttH} fill="var(--ink)" rx={8} ry={8} />
            <text x={ttX + ttW / 2} y={ttY + 14} fontSize={9.5} fontWeight="700" textAnchor="middle" fill="var(--text-on-dark)" fontFamily="var(--font-body)">
              {labels[hover]}
            </text>
            <text x={ttX + ttW / 2} y={ttY + 27} fontSize={11} fontWeight="800" textAnchor="middle" fill="var(--gr-300)" fontFamily="var(--font-display)">
              {values[hover]} matrícula{values[hover] === 1 ? '' : 's'}
            </text>
          </g>
        );
      })()}
    </svg>
  );
};
