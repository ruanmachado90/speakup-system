import { MessageCircle } from 'lucide-react';

/**
 * Linha de cobrança com ação de aviso por WhatsApp.
 * `tone` define a urgência: 'red' (vence hoje / vencida) ou 'amber' (próximos dias).
 *
 * Usa os tokens semânticos de feedback do design system (danger/warning), que
 * são propositalmente mais surdos que o vermelho e o âmbar do Tailwind.
 */
export const PaymentRow = ({ payment, tone = 'amber', meta, onAvisar }) => {
  const isRed = tone === 'red';

  // Sem modificador de opacidade: cor declarada como var() não aceita `/30`.
  const shell = isRed
    ? 'bg-danger-bg border-danger'
    : 'bg-warning-bg border-warning';

  const name = isRed ? 'text-danger-fg' : 'text-warning-fg';
  const metaTone = isRed ? 'text-danger-fg' : 'text-warning-fg';
  const action = isRed
    ? 'bg-danger hover:bg-danger-fg'
    : 'bg-warning hover:bg-warning-fg';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-su-md border ${shell}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-su-sm font-semibold truncate ${name}`}>{payment.studentName}</p>
        <p className="text-su-xs text-content-muted truncate">
          {payment.description || 'Mensalidade'} · {Number(payment.valuePlanned || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          {meta && <span className={`ml-1 font-semibold ${metaTone}`}>· {meta}</span>}
        </p>
      </div>
      <button
        onClick={() => onAvisar(payment)}
        className={`
          flex-shrink-0 flex items-center gap-1 text-su-xs font-semibold text-white
          px-2.5 py-1.5 rounded-su-sm transition-colors duration-fast ease-out ${action}
          focus:outline-none focus-visible:shadow-ring-accent
        `}
        title="Enviar aviso por WhatsApp"
      >
        <MessageCircle size={12} /> Avisar
      </button>
    </div>
  );
};

export default PaymentRow;
