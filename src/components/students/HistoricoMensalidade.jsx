import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { MODO_CORRECAO, ROTULO_MODO } from '../../utils/mensalidade';

/**
 * Histórico de mudanças de mensalidade do aluno.
 *
 * É o que responde "por que o MRR caiu em outubro" meses depois. Antes o valor
 * antigo era sobrescrito e essa informação se perdia.
 */
export default function HistoricoMensalidade({ historico }) {
  if (!Array.isArray(historico) || historico.length === 0) return null;

  // Mais recente primeiro; registros antigos podem não ter `registradoEm`.
  const linhas = [...historico].sort((a, b) => (b.registradoEm || 0) - (a.registradoEm || 0));

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <summary className="text-xs font-bold text-slate-500 cursor-pointer">
        Histórico de mensalidade ({linhas.length})
      </summary>
      <ul className="mt-2 space-y-2">
        {linhas.map((h, i) => (
          <li key={h.registradoEm ?? i} className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatCurrency(h.feeAnterior)} → {formatCurrency(h.fee)}
            </span>
            {' · '}
            {ROTULO_MODO[h.modo] || h.modo}
            {h.modo !== MODO_CORRECAO && h.vigenteDesde && <> a partir de {formatDate(h.vigenteDesde)}</>}
            <span className="block text-slate-400">
              {h.registradoEm ? formatDateTime(h.registradoEm) : 'data não registrada'}
              {h.por && ` · ${h.por}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
