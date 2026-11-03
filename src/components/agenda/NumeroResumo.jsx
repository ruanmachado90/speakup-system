/**
 * Número de resumo da agenda (turmas, horas, registro…), no desenho do KPI do
 * design system: rótulo em caixa alta, número grande, linha de apoio. Quando
 * pede atenção, quem avisa é a régua de 2px no topo e o texto em âmbar.
 * Aceita texto no valor ("3 de 5", "12h30"), que o KPI não formata.
 */
export default function NumeroResumo({ rotulo, valor, sub, alerta, carregando }) {
  return (
    <div className={`bg-surface-card rounded-su-md border border-subtle px-5 py-4 ${alerta ? 'border-t-2 border-t-warning' : ''}`}>
      <p className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">{rotulo}</p>
      {carregando ? (
        <div className="mt-2 h-8 w-20 rounded-su-xs bg-surface-sunken animate-pulse" aria-label={`Carregando ${rotulo}`} />
      ) : (
        <p className="mt-2 font-display font-extrabold text-su-h2 leading-su-tight tabular-nums text-content-strong">{valor}</p>
      )}
      {sub && !carregando && <p className={`mt-1 text-su-sm ${alerta ? 'text-warning-fg font-semibold' : 'text-content-muted'}`}>{sub}</p>}
    </div>
  );
}
