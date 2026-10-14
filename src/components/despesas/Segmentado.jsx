/**
 * Alternância segmentada do design system.
 *
 * A tela tinha três tratamentos diferentes para a mesma interação (período,
 * escopo da busca e situação). Este componente padroniza os binários; a
 * situação continua em chip porque são quatro opções com contagem, e uma delas
 * é de alerta.
 *
 * `opcoes`: [{ valor, rotulo }]. `tom`: 'forte' (azul, estado selecionado — nunca
 * botão preto, decisão de 14/10/2026) ou 'card' (sutil, para
 * quando a alternância está dentro de outro bloco).
 */
const TOM_ATIVO = {
  forte: 'bg-accent text-white',
  card: 'bg-surface-card text-content-strong shadow-card',
};

export default function Segmentado({ valor, onChange, opcoes, rotulo, tom = 'forte', tamanho = 'md' }) {
  const cls = tamanho === 'sm'
    ? 'px-2.5 py-1 text-su-xs'
    : 'px-3 py-1.5 text-su-sm';

  return (
    <div className="inline-flex rounded-su-sm bg-surface-sunken p-0.5" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          aria-pressed={valor === o.valor}
          className={`${cls} rounded-su-xs font-semibold transition-colors focus:outline-none focus-visible:shadow-ring-accent ${
            valor === o.valor ? TOM_ATIVO[tom] : 'text-content-body hover:bg-gr-200'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
