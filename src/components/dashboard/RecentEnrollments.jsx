import { useMemo } from 'react';
import { Card } from '../ui';

const AVATAR_CORES = ['bg-brand-blue', 'bg-brand-orange', 'bg-brand-pink', 'bg-brand-yellow'];

const initials = (name) => (name || '')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((s) => s[0])
  .join('')
  .toUpperCase() || '?';

const statusPagamento = (payment) => {
  if (!payment) return { text: 'Sem cobrança', classes: 'bg-surface-sunken text-content-muted' };
  if (payment.status === 'Pago') return { text: 'Pago', classes: 'bg-success-bg text-success-fg' };
  if (payment.status === 'cancelada') return { text: 'Cancelada', classes: 'bg-surface-sunken text-content-muted' };
  const vencido = payment.dueDate && new Date(payment.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  return vencido
    ? { text: 'Vencido', classes: 'bg-danger-bg text-danger-fg' }
    : { text: 'Pendente', classes: 'bg-warning-bg text-warning-fg' };
};

/** Últimos N alunos cadastrados, com status da primeira cobrança. */
export default function RecentEnrollments({ students = [], payments = [], limit = 4 }) {
  const matriculasRecentes = useMemo(() => {
    const paymentsByStudent = new Map();
    payments.forEach((p) => {
      if (!paymentsByStudent.has(p.studentId)) paymentsByStudent.set(p.studentId, []);
      paymentsByStudent.get(p.studentId).push(p);
    });
    return [...students]
      .filter((s) => s.createdAt)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, limit)
      .map((s) => {
        const primeira = (paymentsByStudent.get(s.id) || [])
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
        return { ...s, primeiraCobranca: primeira };
      });
  }, [students, payments, limit]);

  return (
    <Card>
      <h3 className="font-bold text-content-strong mb-3">Matrículas recentes</h3>
      {matriculasRecentes.length === 0 ? (
        <p className="text-su-sm text-content-muted text-center py-6">Nenhuma matrícula ainda</p>
      ) : (
        <div className="flex flex-col">
          {matriculasRecentes.map((s, i) => {
            const st = statusPagamento(s.primeiraCobranca);
            return (
              <div key={s.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-subtle' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-su-xs font-bold text-content-on-dark ${AVATAR_CORES[i % AVATAR_CORES.length]}`}>
                  {initials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-su-sm text-content-strong truncate">{s.name}</p>
                  <p className="text-su-xs text-content-muted truncate">{s.course || 'Sem curso'}</p>
                </div>
                <span className={`text-su-2xs font-semibold px-2.5 py-1 rounded-pill flex-shrink-0 ${st.classes}`}>{st.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
