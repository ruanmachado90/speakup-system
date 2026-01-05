export const DonutChart = ({data}) => {
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 90;
  const innerRadius = 60;
  
  const colors = [
    '#005DE4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  // Agrupar despesas por categoria
  const categoryData = data.reduce((acc, expense) => {
    const cat = expense.category || 'Sem categoria';
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += Number(expense.value || 0);
    return acc;
  }, {});

  const categories = Object.keys(categoryData);
  const total = Object.values(categoryData).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-400">
        Nenhuma despesa registrada
      </div>
    );
  }

  // Calcular ângulos para cada fatia
  let currentAngle = -90; // Começar do topo
  const slices = categories.map((cat, i) => {
    const value = categoryData[cat];
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

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
            fontSize="24"
            fontWeight="bold"
            fill="#334155"
          >
            R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            fontSize="12"
            fill="#94a3b8"
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
              className="w-4 h-4 rounded flex-shrink-0"
              style={{backgroundColor: slice.color}}
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
