/**
 * SpeakUp Card — superfície branca e quieta. Raio 8px, borda hairline,
 * sombra quase plana. O `accent`, quando usado, é uma régua de 2px no topo:
 * a cor da marca é detalhe, não preenchimento.
 *
 * Espelha components/data/Card.jsx do SpeakUp Design System.
 * Props do sistema: children, padding, accent, hover.
 * `className` é extra local — o app já dependia dele para layout.
 */
const ACCENTS = {
  blue: 'border-t-brand-blue',
  pink: 'border-t-brand-pink',
  orange: 'border-t-brand-orange',
  yellow: 'border-t-brand-yellow',
  green: 'border-t-success',
};

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = ({
  children,
  padding = 'md',
  accent = null,
  hover = false,
  className = '',
}) => (
  <div
    className={`
      flex flex-col bg-surface-card rounded-su-md border border-subtle shadow-card
      transition-shadow duration-base ease-out
      ${accent ? `border-t-2 ${ACCENTS[accent] || ''}` : ''}
      ${hover ? 'hover:shadow-card-lg' : ''}
      ${PADDING[padding] ?? PADDING.md}
      ${className}
    `}
  >
    {children}
  </div>
);
