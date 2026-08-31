import { ChevronRight } from 'lucide-react';

/**
 * SpeakUp KPI — o "grid rigor tile" do design system.
 *
 * Espelha components/data/StatCard.jsx: label em caixa alta pequena, figura
 * grande em ink, delta pequeno e colorido. Sem bloco colorido — quando o
 * número é ruim, quem avisa é a régua de 2px no topo, o badge e o delta,
 * não um cartão vermelho inteiro.
 *
 * Props do sistema: label, value, delta, deltaDirection, icon.
 * Extras deste app, que o kit do DS não tem porque roda com dados fabricados:
 * loading (esqueleto), hidden (ocultar valores), onClick (drill-through),
 * sub, badge, format, size.
 */
const ACCENT_RULE = {
  blue: 'border-t-brand-blue',
  green: 'border-t-success',
  yellow: 'border-t-brand-yellow',
  red: 'border-t-danger',
};

export const KPI = ({
  label,
  value,
  positive,
  warn,
  format = 'currency',
  accent,
  size = 'normal',
  badge,
  hidden,
  loading,
  sub,
  delta,
  icon,
  onClick,
  actionLabel,
}) => {
  const formatted = (() => {
    if (hidden) return '••••';
    if (format === 'number') return Number(value).toLocaleString('pt-BR');
    if (format === 'percent') return `${Number(value).toLocaleString('pt-BR')}%`;
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  })();

  const valueSize = size === 'large' ? 'text-su-h1' : 'text-su-h2';
  const skeletonWidth = size === 'large' ? 'w-48' : 'w-28';
  const skeletonHeight = size === 'large' ? 'h-9' : 'h-7';

  const deltaTone =
    !delta ? '' :
    delta.direction === 'up' ? 'text-success-fg' :
    delta.direction === 'down' ? 'text-danger-fg' :
    'text-content-muted';

  const deltaArrow =
    !delta || delta.direction === 'flat' ? '' :
    delta.direction === 'up' ? '↑ ' : '↓ ';

  const shell = `
    bg-surface-card rounded-su-md border border-subtle
    ${accent ? `border-t-2 ${ACCENT_RULE[accent] || ''}` : ''}
  `;

  const body = (
    <div className="px-5 py-[18px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">
          {label}
        </p>
        {badge && !loading ? (
          <span className="text-su-2xs font-semibold px-2 py-0.5 rounded-pill bg-danger-bg text-danger-fg">
            {badge}
          </span>
        ) : icon ? (
          <span className="inline-flex text-content-faint">{icon}</span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-2.5">
          <div className={`${skeletonHeight} ${skeletonWidth} max-w-full rounded-su-xs bg-surface-sunken animate-pulse`} />
          <span className="sr-only">Carregando {label}</span>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2.5 mt-2.5">
            <h3 className={`font-display font-extrabold leading-su-tight tabular-nums text-content-strong ${valueSize}`}>
              {formatted}
            </h3>
            {delta && !hidden && (
              <span className={`text-su-xs font-bold ${deltaTone}`}>
                {deltaArrow}{delta.text}
              </span>
            )}
          </div>
          {sub && !hidden && (
            <p className="mt-1 text-su-sm text-content-muted">{sub}</p>
          )}
        </>
      )}
    </div>
  );

  if (!onClick) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={actionLabel || `${label}: ver detalhes`}
      className={`
        group relative w-full text-left ${shell}
        transition-colors duration-fast ease-out hover:border-strong
        focus:outline-none focus-visible:shadow-ring-accent
        disabled:cursor-default
      `}
    >
      {body}
      {!loading && (
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="absolute bottom-5 right-4 text-content-faint transition-colors group-hover:text-content-body"
        />
      )}
    </button>
  );
};
