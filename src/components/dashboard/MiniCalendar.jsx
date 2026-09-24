import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card } from '../ui';

const DIAS_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Calendário do mês corrente, hoje destacado — sem eventos por dia (só a data). */
export default function MiniCalendar() {
  const calendario = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const dias = [];
    for (let i = 0; i < primeiroDiaSemana; i += 1) dias.push(null);
    for (let d = 1; d <= diasNoMes; d += 1) dias.push(d);
    const rotulo = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return { dias, hoje: hoje.getDate(), rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
  }, []);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-brand-blue" />
        <h3 className="font-bold text-content-strong">Calendário</h3>
      </div>
      <p className="text-su-sm font-bold text-content-muted mb-2.5">{calendario.rotulo}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS_CURTO.map((d, i) => (
          <span key={i} className="text-su-2xs font-bold text-content-faint py-1">{d}</span>
        ))}
        {calendario.dias.map((d, i) => (
          <span
            key={i}
            className={`text-su-sm rounded-su-sm py-1.5 ${
              d === calendario.hoje
                ? 'bg-brand-blue text-content-on-dark font-extrabold'
                : d
                  ? 'text-content-body font-medium'
                  : ''
            }`}
          >
            {d || ''}
          </span>
        ))}
      </div>
    </Card>
  );
}
