import { useEffect, useRef, useMemo } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { PaymentRow } from './PaymentRow';
import { enviarWhatsAppCobranca } from './enviarWhatsAppCobranca';

const diasEmAtraso = (dueDate) => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
  return Math.round((hoje - d) / 86400000);
};

/**
 * Detalhe das cobranças vencidas do período: quem deve, há quanto tempo,
 * e o mesmo botão Avisar do card de Vencimentos.
 */
export default function OverduePaymentsModal({ isOpen, onClose, payments, students, dashboardRange }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const vencidas = useMemo(
    () => [...payments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [payments]
  );

  const total = useMemo(
    () => vencidas.reduce((soma, p) => soma + Number(p.valuePlanned || 0), 0),
    [vencidas]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overdue-modal-title"
        className="bg-white rounded-su-xl shadow-pop max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-subtle bg-danger-bg flex items-start justify-between gap-4">
          <div>
            <h2 id="overdue-modal-title" className="font-display text-su-h3 font-bold text-danger-fg">Cobranças vencidas</h2>
            <p className="text-su-sm text-danger-fg mt-1">
              {dashboardRange === 'month' ? 'Vencidas e não pagas neste mês' : 'Vencidas e não pagas neste ano'}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 rounded-su-sm text-danger-fg hover:bg-danger-bg transition-colors focus:outline-none focus-visible:shadow-ring-accent"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {vencidas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle size={40} className="text-success mb-3" />
              <h3 className="font-display text-su-h4 font-bold text-content-strong mb-1">Nenhuma cobrança vencida</h3>
              <p className="text-su-sm text-content-muted">Tudo em dia no período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vencidas.map(p => {
                const dias = diasEmAtraso(p.dueDate);
                return (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    tone="red"
                    meta={`há ${dias} dia${dias !== 1 ? 's' : ''}`}
                    onAvisar={(payment) => enviarWhatsAppCobranca(payment, students)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-subtle px-6 py-4 bg-surface-sunken flex items-center justify-between gap-4">
          <p className="text-su-sm text-content-body">
            <span className="font-bold">{vencidas.length}</span> {vencidas.length === 1 ? 'cobrança' : 'cobranças'} ·{' '}
            <span className="font-bold tabular-nums">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ink text-white text-su-sm font-semibold rounded-su-sm hover:bg-gr-800 transition-colors focus:outline-none focus-visible:shadow-ring-accent"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
