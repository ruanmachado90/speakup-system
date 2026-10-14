export const DonutChart = ({data}) => {
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 90;
  const innerRadius = 60;
  
  // Tokens do design system (sem hex cru) e SEM repetição: a lista antiga
  // tinha 10 posições mas repetia a partir da 6ª, então duas categorias
  // diferentes recebiam o mesmo azul. Agora são 5 cores distintas e o
  // excedente é agrupado em "Outras" — repetir cor numa legenda engana mais
  // do que agrupar.
  const colors = [
    'var(--su-blue)', 'var(--su-orange)', 'var(--su-yellow)',
    'var(--su-pink)', 'var(--su-blue-300)', 'var(--gr-400)',
  ];
  const MAX_FATIAS = 5;

  // Agrupar despesas por categoria
  const categoryData = data.reduce((acc, expense) => {
    const cat = expense.category || 'Sem categoria';
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += Number(expense.value || 0);
    return acc;
  }, {});

  // Maiores primeiro; o que passar do limite vira uma fatia "Outras".
  const porValor = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
  const fatias = porValor.length > MAX_FATIAS + 1
    ? [
        ...porValor.slice(0, MAX_FATIAS),
        [`Outras (${porValor.length - MAX_FATIAS})`, porValor.slice(MAX_FATIAS).reduce((s, [, v]) => s + v, 0)],
      ]
    : porValor;

  const valorDa = Object.fromEntries(fatias);
  const categories = fatias.map(([c]) => c);
  const total = fatias.reduce((a, [, v]) => a + v, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-content-muted">
        Nenhuma despesa registrada
      </div>
    );
  }

  // Ângulo onde cada fatia começa, somado de uma vez. Antes era um acumulador
  // reatribuído dentro do map — o compilador do React não aceita reatribuição
  // depois do render.
  const inicioDe = [];
  categories.reduce((acc, cat) => {
    inicioDe.push(acc);
    return acc + (valorDa[cat] / total) * 360;
  }, -90); // -90: começa no topo

  const slices = categories.map((cat, i) => {
    const value = valorDa[cat];
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;

    const startAngle = inicioDe[i];
    const endAngle = startAngle + angle;

    // Converter ângulos para radianos
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calcular pontos do arco externo
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // Calcular pontos do arco interno
    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathD = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return {
      category: cat,
      value,
      percentage,
      color: colors[i % colors.length],
      pathD
    };
  });

  return (
    <div className="flex items-center gap-8">
      <div className="flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <style>{`
              .donut-slice {
                transition: opacity 0.2s, transform 0.2s;
                cursor: pointer;
              }
              .donut-slice:hover {
                opacity: 0.85;
                transform-origin: ${centerX}px ${centerY}px;
              }
            `}</style>
          </defs>
          
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathD}
              fill={slice.color}
              className="donut-slice"
            >
              <title>{slice.category}: R$ {slice.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ({slice.percentage.toFixed(1)}%)</title>
            </path>
          ))}
          
          {/* Texto central */}
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            fontSize="20"
            fontWeight="700"
            fontFamily="Manrope, sans-serif"
            fill="var(--text-strong)"
          >
            R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            fontSize="11"
            fontFamily="Source Sans 3, sans-serif"
            fill="var(--text-muted)"
          >
            Total
          </text>
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="flex-shrink-0 inline-block"
              style={{backgroundColor: slice.color, width: 12, height: 4, borderRadius: 2}}
            ></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-700 truncate">{slice.category}</div>
              <div className="text-xs text-slate-500">
                R$ {slice.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ({slice.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
