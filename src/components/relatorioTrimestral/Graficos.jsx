// Gráficos vetoriais do relatório trimestral (SVG puro, imprime nítido).
// Paleta validada (dataviz/validate_palette): azul da marca para a série
// principal, laranja-600 da marca para a segunda (despesa). Um eixo só,
// marcas finas, grade discreta, texto sempre na cor de texto — a cor da
// série fica só na marca e no quadradinho da legenda.

const COR_SERIE = ['var(--su-blue)', 'var(--su-orange-600)'];

const escala = (max) => {
  if (max <= 0) return { topo: 1, passos: [0, 1] };
  const bruto = max / 3;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto);
  const topo = Math.ceil(max / passo) * passo;
  const passos = [];
  for (let v = 0; v <= topo + 1e-9; v += passo) passos.push(v);
  return { topo, passos };
};

export function Legenda({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="flex gap-4 text-[9.5px] text-content-muted mb-1">
      {series.map((s, i) => (
        <span key={s.nome} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: COR_SERIE[i] }} aria-hidden="true" />
          {s.nome}
        </span>
      ))}
    </div>
  );
}

/**
 * Colunas (1 ou 2 séries). `dados`: [{ rotulo, valores: [n, n?] }].
 * `rotularTodas`: valor em cima de cada coluna (use com poucas categorias);
 * senão rotula só a última de cada série.
 */
export function Colunas({ dados, series, formato, altura = 150, rotularTodas = false }) {
  const L = 600;
  const margem = { esq: 46, dir: 6, topo: 14, base: 18 };
  const max = Math.max(0, ...dados.flatMap((d) => d.valores.map((v) => v || 0)));
  const { topo, passos } = escala(max);
  const areaH = altura - margem.topo - margem.base;
  const areaL = L - margem.esq - margem.dir;
  const faixa = areaL / Math.max(1, dados.length);
  const gap = 2;
  const largBarra = Math.min(26, (faixa * 0.7 - gap * (series.length - 1)) / series.length);
  const y = (v) => margem.topo + areaH - (Math.max(0, v || 0) / topo) * areaH;

  return (
    <div>
      <Legenda series={series} />
      <svg viewBox={`0 0 ${L} ${altura}`} className="w-full" role="img" aria-label={series.map((s) => s.nome).join(' e ')}>
        {passos.map((p) => (
          <g key={p}>
            <line x1={margem.esq} x2={L - margem.dir} y1={y(p)} y2={y(p)} stroke="var(--border-subtle)" strokeWidth="0.75" />
            <text x={margem.esq - 5} y={y(p) + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)">{formato(p)}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const x0 = margem.esq + i * faixa + (faixa - (largBarra * series.length + gap * (series.length - 1))) / 2;
          return (
            <g key={d.rotulo}>
              {series.map((s, k) => {
                const v = d.valores[k] || 0;
                const x = x0 + k * (largBarra + gap);
                const h = Math.max(0, y(0) - y(v));
                const rotular = rotularTodas || i === dados.length - 1;
                return (
                  <g key={s.nome}>
                    {h > 0 && <rect x={x} y={y(v)} width={largBarra} height={h} rx="1.5" fill={COR_SERIE[k]} />}
                    {rotular && v !== 0 && (
                      <text x={x + largBarra / 2} y={y(v) - 3} textAnchor="middle" fontSize="8" fill="var(--text-body)" fontWeight="600">{formato(v)}</text>
                    )}
                  </g>
                );
              })}
              <text x={margem.esq + i * faixa + faixa / 2} y={altura - 5} textAnchor="middle" fontSize="8.5" fill="var(--text-muted)">{d.rotulo}</text>
            </g>
          );
        })}
        <line x1={margem.esq} x2={L - margem.dir} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/** Barras horizontais de uma série, com valor no fim de cada barra. */
export function BarrasH({ dados, formato, largRotulo = 150, cor = COR_SERIE[0] }) {
  if (!dados.length) return <p className="text-[10.5px] text-content-faint py-2">Sem dados no período.</p>;
  const max = Math.max(...dados.map((d) => d.valor || 0), 0) || 1;
  return (
    <div className="flex flex-col gap-[5px]">
      {dados.map((d) => (
        <div key={d.rotulo} className="flex items-center gap-2 text-[10px]">
          <span className="shrink-0 truncate text-content-body" style={{ width: largRotulo }} title={d.rotulo}>{d.rotulo}</span>
          <span className="flex-1 flex items-center gap-1.5">
            <span className="h-2.5 rounded-r-[2px]" style={{ width: `${Math.max(1, ((d.valor || 0) / max) * 100)}%`, background: cor }} />
            <span className="tabular-nums font-semibold text-content-strong whitespace-nowrap">{formato(d.valor)}</span>
            {d.sub && <span className="text-content-muted whitespace-nowrap">{d.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Barra de progresso fina (ex.: % registrado, ocupação) com meta opcional. */
export function Progresso({ valor, meta, ruimAbaixo = true }) {
  if (valor == null) return <span className="text-content-faint">—</span>;
  const abaixo = meta != null && valor < meta;
  const cor = meta == null ? 'var(--su-blue)' : (abaixo === ruimAbaixo ? 'var(--su-warning)' : 'var(--su-success)');
  return (
    <span className="inline-flex items-center gap-1.5 w-full">
      <span className="relative flex-1 h-1.5 rounded-pill bg-surface-sunken overflow-hidden min-w-[36px]">
        <span className="absolute inset-y-0 left-0 rounded-pill" style={{ width: `${Math.min(100, valor)}%`, background: cor }} />
      </span>
      <span className="tabular-nums w-9 text-right">{Math.round(valor)}%</span>
    </span>
  );
}
