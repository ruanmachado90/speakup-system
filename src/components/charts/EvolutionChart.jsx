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
  v >= 1000
    ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
    : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export const EvolutionChart = ({ labels, planned, paid, hidden = false }) => {
  const [hover, setHover] = useState(null); // index

  const W = 760, H = 220, PL = 56, PR = 16, PT = 16, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;
  const max = Math.max(...planned, ...paid, 1);
  const GRID = 4;

  const xOf = (i) => PL + (i / (n - 1)) * chartW;
  const yOf = (v) => PT + (1 - v / max) * chartH;

  const paidPts  = paid.map((v, i) => [xOf(i), yOf(v)]);
  const planPts  = planned.map((v, i) => [xOf(i), yOf(v)]);

  const paidPath = smoothPath(paidPts);
  const planPath = smoothPath(planPts);

  // Área sob "Realizado"
  const areaPath = paidPath
    + ` L ${xOf(n - 1)} ${PT + chartH} L ${xOf(0)} ${PT + chartH} Z`;

  return (
    <div>
      {/* Legenda */}
      <div className="flex items-center gap-5 mb-3 text-xs font-semibold" style={{color:'var(--gr-500)',fontFamily:'var(--font-body)'}}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded" style={{width:12,height:3,background:'var(--su-blue)'}} />
          Realizado
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="var(--gr-400)" strokeWidth="2" strokeDasharray="4 3" /></svg>
          Previsto
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="var(--su-blue)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--su-blue)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines + y-axis labels */}
        {Array.from({ length: GRID + 1 }).map((_, i) => {
          const y = PT + (i / GRID) * chartH;
          const val = max * (1 - i / GRID);
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y}
                stroke="var(--ink-04)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} fontSize={9} textAnchor="end" fill="var(--gr-500)" fontFamily="var(--font-body)">
                {hidden ? '••' : (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0))}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((lbl, i) => (
          <text key={i} x={xOf(i)} y={H - 6} fontSize={10}
            textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">{lbl}</text>
        ))}

        {/* Área preenchida (Realizado) */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Linha Previsto — tracejada */}
        <path d={planPath} fill="none"
          stroke="var(--gr-400)" strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Linha Realizado — sólida */}
        <path d={paidPath} fill="none"
          stroke="var(--su-blue)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

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

        {/* Ponto + tooltip no hover */}
        {hover !== null && (() => {
          const x = xOf(hover);
          const yPaid = yOf(paid[hover] || 0);
          const yPlan = yOf(planned[hover] || 0);
          const ttW = 150, ttH = 56, ttX = Math.min(x - ttW / 2, W - PR - ttW), ttY = PT + 4;
          return (
            <g>
              {/* Linha vertical */}
              <line x1={x} x2={x} y1={PT} y2={PT + chartH}
                stroke="var(--gr-300)" strokeWidth={1} strokeDasharray="3 3" />

              {/* Ponto Realizado */}
              <circle cx={x} cy={yPaid} r={4} fill="var(--su-blue)" stroke="white" strokeWidth={2} />
              {/* Ponto Previsto */}
              <circle cx={x} cy={yPlan} r={4} fill="var(--gr-500)" stroke="white" strokeWidth={2} />

              {/* Tooltip */}
              <rect x={ttX} y={ttY} width={ttW} height={ttH}
                fill="var(--ink)" rx={8} ry={8} />
              <text x={ttX + 10} y={ttY + 16} fontSize={10} fontWeight="700" fill="var(--text-on-dark)" fontFamily="var(--font-body)">
                {labels[hover]}
              </text>
              <circle cx={ttX + 10} cy={ttY + 28} r={3} fill="var(--su-blue)" />
              <text x={ttX + 17} y={ttY + 32} fontSize={9.5} fill="var(--gr-300)" fontFamily="var(--font-body)">
                Realizado: {hidden ? '••••' : fmt(paid[hover] || 0)}
              </text>
              <circle cx={ttX + 10} cy={ttY + 44} r={3} fill="var(--gr-500)" />
              <text x={ttX + 17} y={ttY + 48} fontSize={9.5} fill="var(--gr-300)" fontFamily="var(--font-body)">
                Previsto: {hidden ? '••••' : fmt(planned[hover] || 0)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
