export const ExpenseEvolutionChart = ({labels, values, year}) => {
  const w = 800;
  const h = 250;
  const pad = 50;
  const max = Math.max(...values, 1);
  const stepX = (w - pad*2) / (labels.length - 1);
  const y = v => h - pad - ((v / max) * (h - pad*2));
  
  // Linhas de grade
  const gridLines = 5;
  const gridStep = (h - pad*2) / gridLines;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e48fe" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#0e48fe" stopOpacity="0.01"/>
          </linearGradient>
          <style>{`
            .expense-point { transition: r 0.2s; cursor: pointer; }
            .expense-point:hover { r: 6; }
            .expense-label { opacity: 0; transition: opacity 0.2s; pointer-events: none; font-size: 10px; font-weight: 600; }
            .expense-group:hover .expense-label { opacity: 1; }
          `}</style>
        </defs>
        
        {/* Linhas de grade */}
        <g>
          {Array.from({length: gridLines + 1}).map((_, i) => {
            const yPos = pad + i * gridStep;
            const value = max * (1 - i / gridLines);
            return (
              <g key={i}>
                <line 
                  x1={pad} 
                  x2={w - pad} 
                  y1={yPos} 
                  y2={yPos} 
                  stroke="rgba(0,0,0,0.04)" 
                  strokeWidth={1}
                />
                <text 
                  x={pad - 8} 
                  y={yPos + 3} 
                  fontSize={9} 
                  textAnchor="end" 
                  fontFamily="Montserrat,sans-serif"
                  fill="#9ca3af"
                >
                  {value >= 1000 ? `${(value/1000).toFixed(1)}k` : value.toFixed(0)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Área preenchida */}
        <path
          d={`
            M ${pad} ${h - pad}
            ${values.map((v, i) => `L ${pad + i*stepX} ${y(v)}`).join(' ')}
            L ${pad + (labels.length - 1)*stepX} ${h - pad}
            Z
          `}
          fill="url(#expenseGradient)"
        />

        {/* Linha */}
        <path
          d={values.map((v, i) => `${i===0? 'M':'L'} ${pad + i*stepX} ${y(v)}`).join(' ')}
          fill="none"
          stroke="#0e48fe"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos */}
        {labels.map((lbl, i) => {
          const val = values[i] || 0;
          const xPos = pad + i*stepX;
          const yPos = y(val);
          
          return (
            <g key={i} className="expense-group">
              <circle 
                cx={xPos} 
                cy={yPos} 
                r={3} 
                fill="#0e48fe"
                className="expense-point"
              >
                <title>{lbl}: R$ {Number(val).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</title>
              </circle>
              <text 
                x={xPos} 
                y={yPos - 10} 
                textAnchor="middle" 
                fill="#0e48fe"
                className="expense-label"
              >
                R$ {Number(val).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </text>
              <text 
                x={xPos} 
                y={h - 10} 
                fontSize={10} 
                fontWeight="500" 
                fontFamily="Montserrat,sans-serif"
                textAnchor="middle" 
                fill="#9ca3af"
              >
                {lbl}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
