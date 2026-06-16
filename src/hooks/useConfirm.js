import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar confirmações programáticas via ConfirmDialog.
 *
 * Uso:
 *   const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();
 *
 *   // Disparar um diálogo e aguardar a resposta:
 *   const confirmed = await requestConfirm({
 *     title: 'Excluir turma?',
 *     message: 'Esta ação não pode ser desfeita.',
 *     variant: 'danger',
 *     confirmLabel: 'Excluir',
 *   });
 *   if (confirmed) { ... }
 *
 *   // No JSX, renderizar o diálogo:
 *   <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
  });

  const resolverRef = { current: null };

  const requestConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        isOpen: true,
        title: options.title ?? 'Confirmar ação',
        message: options.message ?? '',
        variant: options.variant ?? 'danger',
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = useCallback(() => {
    setConfirmState((s) => ({ ...s, isOpen: false }));
    resolverRef.current?.(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = useCallback(() => {
    setConfirmState((s) => ({ ...s, isOpen: false }));
    resolverRef.current?.(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { confirmState, requestConfirm, handleConfirm, handleCancel };
}
