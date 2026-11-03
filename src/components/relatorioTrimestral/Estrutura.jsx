// Peças da folha A4 do relatório trimestral: folha com cabeçalho/rodapé,
// título de seção, número com variação, tabela e lista de alertas.
// Tamanhos em px pensados para A4 impresso (corpo 11px ≈ 8,3pt).
import { valorDe } from './formatos';

const LOGO = 'https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png';

export function Folha({ titulo, periodo, numero, total, geradoEm, children }) {
  return (
    <section className="rt-folha bg-gr-white text-content-body flex flex-col">
      <header className="flex items-center justify-between pb-2.5 mb-5 border-b-2 border-accent">
        <img src={LOGO} alt="SpeakUp" className="h-6 object-contain" />
        <div className="text-right">
          <p className="font-display font-bold text-[11px] uppercase tracking-caps text-accent">{titulo}</p>
          <p className="text-[10px] text-content-muted">{periodo}</p>
        </div>
      </header>
      <div className="flex-1 flex flex-col gap-5">{children}</div>
      <footer className="mt-4 pt-2 border-t border-subtle flex justify-between text-[9px] text-content-faint">
        <span>SpeakUp English School · relatório gerencial · uso interno</span>
        <span>Gerado em {geradoEm} · página {numero} de {total}</span>
      </footer>
    </section>
  );
}

export function Secao({ titulo, sub, children, className = '' }) {
  return (
    <div className={`rt-bloco ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="shrink-0 font-display font-extrabold text-[15px] text-content-strong leading-tight">{titulo}</h2>
        {sub && <p className="text-[10px] text-content-muted text-right">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** Seta + % de variação; `inverter` para métrica em que subir é ruim. */
export function Delta({ v, rotulo, inverter = false }) {
  if (!v?.disponivel) return <span className="text-content-faint">{rotulo}: —</span>;
  const bom = v.direcao === 'flat' ? null : (v.direcao === 'up') !== inverter;
  const cor = bom == null ? 'text-content-muted' : bom ? 'text-success-fg' : 'text-danger-fg';
  const seta = v.direcao === 'up' ? '↑' : v.direcao === 'down' ? '↓' : '→';
  const valor = Math.abs(v.pct) >= 1000 ? '>999' : Math.abs(v.pct).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return <span className={`${cor} font-semibold`}>{seta} {valor}% <span className="font-normal text-content-muted">{rotulo}</span></span>;
}

/** Número de resumo: rótulo em caixa alta, valor grande, variações embaixo. */
export function Kpi({ rotulo, valor, sub, variacao, inverter, destaque, alerta }) {
  return (
    <div className={`rt-bloco rounded-su-sm border px-3 py-2.5 ${alerta ? 'border-warning bg-warning-bg' : destaque ? 'border-accent bg-blues-50' : 'border-subtle'}`}>
      <p className="text-[9px] font-semibold uppercase tracking-caps text-content-muted leading-tight">{rotulo}</p>
      <p className="mt-1 font-display font-extrabold text-[19px] leading-none tabular-nums text-content-strong">{valor}</p>
      {sub && <p className="mt-1 text-[9.5px] text-content-muted leading-snug">{sub}</p>}
      {variacao && (
        <p className="mt-1 text-[9px] leading-snug flex flex-col">
          <Delta v={variacao.vsMesAnterior} rotulo="vs. tri. anterior" inverter={inverter} />
          <Delta v={variacao.vsAnoPassado} rotulo="vs. ano passado" inverter={inverter} />
        </p>
      )}
    </div>
  );
}

export function Grade({ colunas = 4, children }) {
  const cls = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }[colunas];
  return <div className={`grid ${cls} gap-2`}>{children}</div>;
}

/**
 * Tabela compacta. `colunas`: [{ titulo, valor(linha), alinhar: 'dir'|'esq', largura }].
 * `limite`: corta e avisa quantas linhas ficaram de fora (a folha é fixa).
 */
export function Tabela({ colunas, linhas, limite, vazio = 'Sem dados no período.', total }) {
  const visiveis = limite ? linhas.slice(0, limite) : linhas;
  if (!linhas.length) return <p className="text-[10.5px] text-content-faint py-2">{vazio}</p>;
  return (
    <>
      <table className="w-full text-[10px] leading-snug border-collapse">
        <thead>
          <tr className="text-left text-[8.5px] uppercase tracking-caps text-content-muted border-b border-strong">
            {colunas.map((c) => (
              <th key={c.titulo} className={`py-1 pr-2 font-semibold ${c.alinhar === 'dir' ? 'text-right' : ''}`} style={c.largura ? { width: c.largura } : undefined}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((l, i) => (
            <tr key={l.id || l.chave || i} className="border-b border-subtle">
              {colunas.map((c) => (
                <td key={c.titulo} className={`py-[3px] pr-2 align-top ${c.alinhar === 'dir' ? 'text-right tabular-nums' : ''}`}>{c.valor(l)}</td>
              ))}
            </tr>
          ))}
          {total && (
            <tr className="border-t border-strong font-semibold text-content-strong">
              {colunas.map((c, i) => (
                <td key={c.titulo} className={`py-1 pr-2 ${c.alinhar === 'dir' ? 'text-right tabular-nums' : ''}`}>{i === 0 ? 'Total' : total[c.titulo] ?? ''}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      {limite && linhas.length > limite && (
        <p className="mt-1 text-[9px] text-content-faint">+ {linhas.length - limite} linha(s) além das {limite} mostradas.</p>
      )}
    </>
  );
}

const NIVEL = {
  critico: { rotulo: 'Crítico', cls: 'border-danger bg-danger-bg text-danger-fg' },
  atencao: { rotulo: 'Atenção', cls: 'border-warning bg-warning-bg text-warning-fg' },
  info: { rotulo: 'Info', cls: 'border-subtle bg-surface-sunken text-content-muted' },
};

export function Alertas({ itens }) {
  if (!itens.length) return <p className="text-[10.5px] text-success-fg font-semibold">Nenhum alerta: indicadores dentro das metas.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {itens.map((a, i) => {
        const n = NIVEL[a.nivel] || NIVEL.info;
        return (
          <li key={i} className="rt-bloco flex gap-2 items-start text-[10px] leading-snug">
            <span className={`shrink-0 mt-px px-1.5 py-px rounded-pill border text-[8.5px] font-bold uppercase tracking-caps ${n.cls}`}>{n.rotulo}</span>
            <span><strong className="text-content-strong">{a.titulo}.</strong> {a.detalhe}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Linha "rótulo ........ valor" para listas tipo DRE. */
export function LinhaValor({ rotulo, valor, forte, recuo, negativo }) {
  return (
    <div className={`flex justify-between gap-3 py-[3px] text-[10.5px] border-b border-subtle ${forte ? 'font-bold text-content-strong border-strong' : ''}`}>
      <span className={recuo ? 'pl-3 text-content-muted' : ''}>{rotulo}</span>
      <span className={`tabular-nums ${negativo && valorDe(valor) !== 0 ? 'text-content-muted' : ''}`}>{valor}</span>
    </div>
  );
}

export function Nota({ children }) {
  return <p className="text-[9px] text-content-faint leading-snug">{children}</p>;
}
