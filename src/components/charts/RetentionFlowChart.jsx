import { useState } from 'react';

const COR_ENTRADA = 'var(--su-blue)';
const COR_SAIDA = 'var(--su-pink)';
const RAIO = 4;

// Barra com cantos arredondados só na ponta do dado; a base fica reta, colada
// na linha zero. `sentido` -1 = sobe (entradas), 1 = desce (saídas).
const barraPath = (x, base, w, h, sentido) => {
  const r = Math.min(RAIO, h, w / 2);
  const ponta = base + sentido * h;
  const curva = ponta - sentido * r;
  return `M ${x} ${base} L ${x} ${curva} Q ${x} ${ponta} ${x + r} ${ponta} `
    + `L ${x + w - r} ${ponta} Q ${x + w} ${ponta} ${x + w} ${curva} L ${x + w} ${base} Z`;
};

const sinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/**
 * Fluxo de alunos: matrículas sobem, cancelamentos descem a partir da mesma
 * linha zero, numa escala só. O último mês (corrente) leva rótulo direto; os
 * demais mostram os números no hover.
 */
export const RetentionFlowChart = ({ labels, entradas, saidas }) => {
  const [hover, setHover] = useState(null);

  const W = 400, H = 170, PL = 8, PR = 8, PT = 20, PB = 34;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = labels.length;
  const slot = chartW / n;
  const barW = Math.min(slot * 0.42, 26);

  // Linha zero proporcional aos picos de cada lado: não sobra área vazia
  // embaixo quando quase ninguém cancela.
  const maxUp = Math.max(...entradas, 1);
  const maxDown = Math.max(...saidas, 1);
  const escala = chartH / (maxUp + maxDown);
  const zeroY = PT + maxUp * escala;

  const atual = n - 1;
  const foco = hover ?? atual;
  const xCentro = (i) => PL + slot * i + slot / 2;

  const resumo = labels
    .map((l, i) => `${l}: ${entradas[i]} matrículas, ${saidas[i]} cancelamentos`)
    .join('; ');

  return (
    <div>
      <div className="flex gap-4 text-su-2xs font-bold uppercase tracking-caps text-content-muted mb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_ENTRADA }} /> Matrículas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_SAIDA }} /> Cancelamentos
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Matrículas e cancelamentos por mês. ${resumo}`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={PL} x2={W - PR} y1={zeroY} y2={zeroY} stroke="var(--gr-300)" strokeWidth={1} />

        {labels.map((lbl, i) => {
          const cx = xCentro(i);
          const x = cx - barW / 2;
          const hUp = entradas[i] * escala;
          const hDown = saidas[i] * escala;
          const esmaecido = hover !== null && hover !== i;
          const destaque = i === foco;
          return (
            <g key={lbl + i} opacity={esmaecido ? 0.35 : 1} style={{ transition: 'opacity 120ms' }}>
              {/* 1px de folga de cada lado da linha zero separa as duas barras */}
              {hUp > 0 && <path d={barraPath(x, zeroY - 1, barW, hUp, -1)} fill={COR_ENTRADA} />}
              {hDown > 0 && <path d={barraPath(x, zeroY + 1, barW, hDown, 1)} fill={COR_SAIDA} />}

              {destaque && (
                <>
                  <text x={cx} y={zeroY - 1 - hUp - 5} fontSize={10.5} fontWeight="800" textAnchor="middle" fill="var(--text-strong)" fontFamily="var(--font-display)">
                    {entradas[i]}
                  </text>
                  <text x={cx} y={zeroY + 1 + hDown + 12} fontSize={10.5} fontWeight="800" textAnchor="middle" fill="var(--text-strong)" fontFamily="var(--font-display)">
                    {saidas[i]}
                  </text>
                </>
              )}

              <text
                x={cx}
                y={H - 6}
                fontSize={10}
                fontWeight={i === atual ? 800 : 400}
                textAnchor="middle"
                fill={i === atual ? 'var(--ink)' : 'var(--gr-500)'}
                fontFamily="var(--font-body)"
              >
                {lbl}
              </text>
            </g>
          );
        })}

        {/* Alvo de hover: a coluna inteira do mês, maior que as barras */}
        {labels.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={PL + slot * i}
            y={0}
            width={slot}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {hover !== null && (() => {
          const ttW = 118, ttH = 44;
          const cx = xCentro(hover);
          const ttX = Math.min(Math.max(cx - ttW / 2, PL), W - PR - ttW);
          const ttY = PT - 16;
          const saldo = entradas[hover] - saidas[hover];
          return (
            <g pointerEvents="none">
              <rect x={ttX} y={ttY} width={ttW} height={ttH} fill="var(--ink)" rx={8} ry={8} />
              <text x={ttX + 10} y={ttY + 15} fontSize={9.5} fontWeight="700" fill="var(--text-on-dark)" fontFamily="var(--font-body)">
                {labels[hover]} · saldo {sinal(saldo)}
              </text>
              <text x={ttX + 10} y={ttY + 32} fontSize={10.5} fontWeight="800" fill="var(--gr-300)" fontFamily="var(--font-display)">
                {sinal(entradas[hover])} entradas  {sinal(-saidas[hover])} saídas
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
