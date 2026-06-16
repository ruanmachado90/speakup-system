import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Modal de confirmação acessível que substitui o `confirm()` nativo.
 *
 * Props:
 *   isOpen   - boolean
 *   title    - string
 *   message  - string
 *   confirmLabel - string (default "Confirmar")
 *   cancelLabel  - string (default "Cancelar")
 *   variant  - 'danger' | 'warning' | 'info' (default 'danger')
 *   onConfirm - () => void
 *   onCancel  - () => void
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // Foco inicial no botão cancelar (padrão seguro)
  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  // Fechar com ESC e fazer trap de foco
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
        return;
      }

      // Trap de foco: Tab e Shift+Tab dentro do dialog
      if (e.key === 'Tab') {
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: <Trash2 size={22} className="text-red-500" />,
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      iconBg: 'bg-red-100',
    },
    warning: {
      icon: <AlertTriangle size={22} className="text-amber-500" />,
      confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
      iconBg: 'bg-amber-100',
    },
    info: {
      icon: <AlertTriangle size={22} className="text-blue-500" />,
      confirmClass: 'bg-[#005DE4] hover:bg-[#0048b3] text-white',
      iconBg: 'bg-blue-100',
    },
  }[variant] ?? variantConfig.danger;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Fechar */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Ícone + Título */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${variantConfig.iconBg}`}>
            {variantConfig.icon}
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900 leading-snug">
              {title}
            </h2>
            {message && (
              <p id="confirm-dialog-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${variantConfig.confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
