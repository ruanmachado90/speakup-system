import { useState } from 'react';

const fmt = (v) =>
  v >= 1000
    ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
    : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/**
 * Evolução mensal — barras agrupadas Realizado (sólida) x Previsto (hachurada),
 * seguindo o template do design handoff: mês com dado pago mostra as duas
 * barras lado a lado, mês futuro (paid=0) mostra só a barra Previsto.
 */
export const EvolutionChart = ({ labels, planned, paid, hidden = false }) => {
  const [hover, setHover] = useState(null); // index

  const W = 760, H = 220, PL = 40, PR = 8, PT = 16, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;
  const max = Math.max(...planned, ...paid, 1);
  const GRID = 4;

  const groupW = chartW / n;
  const barW = Math.min(20, groupW * 0.32);
  const barGap = 3;
  const xOfGroup = (i) => PL + i * groupW;
  const yOf = (v) => PT + (1 - v / max) * chartH;
  const baseY = PT + chartH;

  return (
    <div>
      {/* Legenda */}
      <div className="flex items-center gap-5 mb-3 text-xs font-semibold" style={{ color: 'var(--gr-500)', fontFamily: 'var(--font-body)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm" style={{ width: 12, height: 12, background: 'var(--su-blue)' }} />
          Realizado
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12">
            <rect width="12" height="12" rx="2" fill="url(#hatch)" stroke="var(--gr-400)" strokeWidth="1" strokeDasharray="2 1.5" />
          </svg>
          Previsto
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--surface-sunken)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--gr-400)" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Grid lines + y-axis labels */}
        {Array.from({ length: GRID + 1 }).map((_, i) => {
          const y = PT + (i / GRID) * chartH;
          const val = max * (1 - i / GRID);
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--ink-04)" strokeWidth={1} />
              <text x={PL - 6} y={y + 3.5} fontSize={9} textAnchor="end" fill="var(--gr-500)" fontFamily="var(--font-body)">
                {hidden ? '••' : (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0))}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((lbl, i) => (
          <text key={i} x={xOfGroup(i) + groupW / 2} y={H - 6} fontSize={10}
            textAnchor="middle" fill="var(--gr-500)" fontFamily="var(--font-body)">{lbl}</text>
        ))}

        {/* Barras agrupadas */}
        {labels.map((_, i) => {
          const cx = xOfGroup(i) + groupW / 2;
          const xPaid = cx - barGap / 2 - barW;
          const xPlan = cx + barGap / 2;
          const vPaid = paid[i] || 0;
          const vPlan = planned[i] || 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={cx - groupW / 2} y={PT} width={groupW} height={chartH} fill="transparent" />
              {vPaid > 0 && (
                <rect
                  x={xPaid} y={yOf(vPaid)} width={barW} height={Math.max(baseY - yOf(vPaid), 1)}
                  rx={2} fill={hover === i ? 'var(--su-blue-700)' : 'var(--su-blue)'}
                />
              )}
              {vPlan > 0 && (
                <rect
                  x={xPlan} y={yOf(vPlan)} width={barW} height={Math.max(baseY - yOf(vPlan), 1)}
                  rx={2} fill="url(#hatch)" stroke="var(--gr-400)" strokeWidth={1} strokeDasharray="3 2"
                />
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hover !== null && (() => {
          const cx = xOfGroup(hover) + groupW / 2;
          const ttW = 150, ttH = 56;
          const ttX = Math.min(Math.max(cx - ttW / 2, PL), W - PR - ttW);
          const ttY = PT + 4;
          return (
            <g>
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
