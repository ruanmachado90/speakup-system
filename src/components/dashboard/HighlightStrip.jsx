import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils';

/**
 * Faixa de destaque — Receita recebida (hero azul da marca) + Cobranças
 * vencidas (hero de alerta). Idêntica nos dois dashboards (Gestão e
 * Secretaria) por design — os dois precisam da mesma primeira leitura de
 * "como estamos".
 */
export default function HighlightStrip({
  receita, deltaReceita, vencidas, vencidasSub,
  dashboardRange = 'month', dataLoading = false, onClickVencidas,
}) {
  const VencidasWrapper = onClickVencidas ? 'button' : 'div';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-brand-blue rounded-su-lg shadow-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-su-2xs font-bold uppercase tracking-caps text-blues-100">Receita recebida</p>
          <TrendingUp size={18} className="text-blues-100" />
        </div>
        {dataLoading ? (
          <div className="h-10 w-40 max-w-full rounded-su-xs bg-white/20 animate-pulse mt-3" />
        ) : (
          <div className="flex items-baseline gap-3 mt-3">
            <h3 className="font-display font-extrabold text-4xl text-content-on-dark leading-none tabular-nums">
              {formatCurrency(receita)}
            </h3>
            {deltaReceita && (
              <span className="text-su-sm font-bold text-brand-yellow">
                {deltaReceita.direction === 'up' ? '↑ ' : deltaReceita.direction === 'down' ? '↓ ' : ''}{deltaReceita.text}
              </span>
            )}
          </div>
        )}
        <p className="mt-2.5 text-su-sm text-blues-100">
          {dashboardRange === 'month' ? 'Mês atual' : 'Ano corrente'} · fechado até hoje
        </p>
      </div>

      <VencidasWrapper
        {...(onClickVencidas ? { type: 'button', onClick: onClickVencidas, 'aria-label': 'Cobranças vencidas: ver quem está devendo' } : {})}
        className={`bg-danger-bg border border-danger rounded-su-lg shadow-card p-6 text-left w-full ${onClickVencidas ? 'transition-colors hover:border-danger-fg focus:outline-none focus-visible:shadow-ring-accent' : ''}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-su-2xs font-bold uppercase tracking-caps text-danger-fg">Cobranças vencidas</p>
          <AlertTriangle size={18} className="text-danger" />
        </div>
        {dataLoading ? (
          <div className="h-10 w-40 max-w-full rounded-su-xs bg-red-200 animate-pulse mt-3" />
        ) : (
          <h3 className="font-display font-extrabold text-4xl text-danger-fg leading-none tabular-nums mt-3">
            {formatCurrency(vencidas)}
          </h3>
        )}
        {vencidasSub && <p className="mt-2.5 text-su-sm text-danger-fg">{vencidasSub}</p>}
      </VencidasWrapper>
    </div>
  );
}
