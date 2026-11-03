import { useMemo } from 'react';
import {
  NOMES_DIAS_CURTOS, minutosParaHora, posicionarNoDia, faixaDeHoras, STATUS_OCORRENCIA,
} from '../../utils/agendaProfessor';
import { TIPOS_AVULSA } from '../../utils/aulasAvulsas';
import { ESTILO_STATUS } from './estiloAgenda';

const HORA_PX = 52;
const PASSO_MIN = 30; // clique numa área vazia arredonda para a meia hora

const rotuloItem = (item) => {
  if (item.tipo === 'evento') return item.evento.titulo;
  if (item.tipo === 'avulsa') return `${TIPOS_AVULSA[item.avulsa.tipo] || 'Aula avulsa'} · ${item.avulsa.turmaNome || 'Turma'}`;
  return item.turma.nome || 'Turma sem nome';
};

const detalheItem = (item) => {
  if (item.tipo === 'evento') return item.evento.aluno || 'Compromisso';
  if (item.tipo === 'avulsa') return (item.avulsa.alunos || []).map((a) => a.nome).filter(Boolean).join(', ') || 'Registrada';
  if (item.status === 'nao-letivo') return item.naoLetivo;
  if (item.status === 'cancelada') return `Aula ${item.aula.status}`;
  if (item.foraDaGrade) return 'Registrada em outro dia';
  return STATUS_OCORRENCIA[item.status];
};

const chaveDeEstilo = (item) => (item.tipo === 'evento' || item.tipo === 'avulsa' ? item.tipo : item.status);

function ItemNaGrade({ item, faixaInicio, onClick }) {
  const estilo = ESTILO_STATUS[chaveDeEstilo(item)];
  const Icone = estilo.icone;
  const top = ((item.inicio - faixaInicio) / 60) * HORA_PX;
  const altura = Math.max(((item.fim - item.inicio) / 60) * HORA_PX - 2, 22);
  const largura = 100 / item.colunas;
  const curto = altura < 44;
  const horario = `${minutosParaHora(item.inicio)}–${minutosParaHora(item.fim)}`;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(item); }}
      title={`${rotuloItem(item)} · ${horario} · ${detalheItem(item)}`}
      className={`absolute rounded-su-xs border px-1.5 py-1 text-left overflow-hidden transition-shadow duration-fast hover:shadow-pop hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${estilo.caixa} ${item.status === 'nao-letivo' ? 'border-dashed' : ''}`}
      style={{ top, height: altura, left: `calc(${item.coluna * largura}% + 2px)`, width: `calc(${largura}% - 4px)` }}
    >
      <span className="flex items-start gap-1">
        {Icone && <Icone size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />}
        <span className={`text-su-2xs font-semibold leading-su-snug ${curto ? 'truncate' : 'line-clamp-2'} ${item.status === 'nao-letivo' || item.status === 'cancelada' ? 'line-through' : ''}`}>
          {rotuloItem(item)}
        </span>
      </span>
      {!curto && (
        <span className="block text-su-2xs leading-su-snug opacity-90 truncate tabular-nums">
          {horario} · {detalheItem(item)}
        </span>
      )}
    </button>
  );
}

/**
 * Grade semanal no estilo Google Agenda: colunas por dia, linhas por hora,
 * itens posicionados pelo horário. Clicar num espaço vazio chama
 * onSlotClick(iso, "HH:MM"); clicar num item chama onItemClick(item).
 * Domingo só aparece se tiver algo marcado.
 */
export default function SemanaGrid({ dias, itens, hojeISO, agoraMin, onSlotClick, onItemClick }) {
  const temDomingo = itens.some((i) => i.diaIndice === 6);
  const indices = temDomingo ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5];
  const faixa = useMemo(() => faixaDeHoras(itens), [itens]);
  const horas = [];
  for (let m = faixa.inicio; m < faixa.fim; m += 60) horas.push(m);
  const alturaTotal = horas.length * HORA_PX;

  const porDia = useMemo(() => {
    const mapa = {};
    indices.forEach((i) => { mapa[i] = posicionarNoDia(itens.filter((it) => it.diaIndice === i)); });
    return mapa;
  }, [itens, temDomingo]); // eslint-disable-line react-hooks/exhaustive-deps

  const clicarNoDia = (iso, e) => {
    if (!onSlotClick) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = faixa.inicio + Math.floor(((y / HORA_PX) * 60) / PASSO_MIN) * PASSO_MIN;
    onSlotClick(iso, minutosParaHora(Math.min(min, faixa.fim - PASSO_MIN)));
  };

  const colunas = `56px repeat(${indices.length}, minmax(104px, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        {/* Cabeçalho dos dias */}
        <div className="grid border-b border-subtle sticky top-0 bg-surface-card z-20" style={{ gridTemplateColumns: colunas }}>
          <div />
          {indices.map((i) => {
            const iso = dias[i];
            const ehHoje = iso === hojeISO;
            return (
              <div key={iso} className="py-2 text-center">
                <p className={`text-su-2xs font-semibold uppercase tracking-caps ${ehHoje ? 'text-accent' : 'text-content-muted'}`}>
                  {NOMES_DIAS_CURTOS[i]}
                </p>
                <p className={`mx-auto mt-0.5 w-8 h-8 flex items-center justify-center rounded-pill font-display font-bold text-su-lg tabular-nums ${ehHoje ? 'bg-accent text-white' : 'text-content-strong'}`}>
                  {Number(iso.slice(8, 10))}
                </p>
              </div>
            );
          })}
        </div>

        {/* Corpo */}
        <div className="grid" style={{ gridTemplateColumns: colunas }}>
          <div className="relative" style={{ height: alturaTotal }}>
            {horas.map((m, idx) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 text-su-2xs text-content-faint tabular-nums" style={{ top: idx * HORA_PX }}>
                {idx === 0 ? '' : minutosParaHora(m)}
              </span>
            ))}
          </div>
          {indices.map((i) => {
            const iso = dias[i];
            const ehHoje = iso === hojeISO;
            return (
              <div
                key={iso}
                onClick={(e) => clicarNoDia(iso, e)}
                className={`relative border-l border-subtle ${onSlotClick ? 'cursor-pointer' : ''}`}
                style={{ height: alturaTotal }}
              >
                {horas.map((m, idx) => (
                  <div key={m} className="absolute inset-x-0 border-t border-subtle" style={{ top: idx * HORA_PX }} />
                ))}
                {ehHoje && agoraMin >= faixa.inicio && agoraMin <= faixa.fim && (
                  <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: ((agoraMin - faixa.inicio) / 60) * HORA_PX }}>
                    <div className="h-0.5 bg-danger" />
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-pill bg-danger" />
                  </div>
                )}
                {porDia[i].map((item) => (
                  <ItemNaGrade key={item.id} item={item} faixaInicio={faixa.inicio} onClick={onItemClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LegendaAgenda() {
  const itens = [
    ['registrada', 'Aula registrada'],
    ['avulsa', 'Reposição ou aula extra'],
    ['pendente', 'Já passou, não registrada'],
    ['prevista', 'Prevista'],
    ['nao-letivo', 'Sem aula (feriado, recesso, cancelada)'],
    ['evento', 'Compromisso agendado'],
  ];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-su-xs text-content-muted">
      {itens.map(([chave, texto]) => (
        <li key={chave} className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-su-xs border ${ESTILO_STATUS[chave].caixa}`} aria-hidden="true" />
          {texto}
        </li>
      ))}
    </ul>
  );
}
