import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  MODO_PLANO,
  MODO_CORRECAO,
  planoDeAlteracao,
  sugerirVigencia,
} from '../../utils/mensalidade';

const labelCls = 'block text-sm font-semibold text-slate-600 mb-1';
const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent';

const OPCOES = [
  {
    valor: MODO_PLANO,
    titulo: 'O aluno mudou de plano',
    hint: 'Reduziu ou aumentou a carga horária. Vale a partir de um vencimento; o que já venceu mantém o valor antigo.',
  },
  {
    valor: MODO_CORRECAO,
    titulo: 'Foi erro de cadastro',
    hint: 'O valor nunca foi esse. Corrige todas as parcelas em aberto, inclusive as vencidas.',
  },
];

/**
 * Passo que aparece só quando a mensalidade muda na edição do aluno.
 *
 * Existe porque os dois motivos têm consequência contábil oposta: mudança de
 * plano não pode reescrever parcela vencida (isso apagaria dívida que o aluno
 * contraiu no preço antigo), e correção de cadastro precisa reescrever.
 *
 * Grava a decisão em dois campos escondidos lidos por `saveStudent`.
 */
export default function MudancaMensalidade({ fee, feeAnterior, parcelas }) {
  const [modo, setModo] = useState(MODO_PLANO);
  const sugerida = useMemo(() => sugerirVigencia(parcelas), [parcelas]);
  const [vigencia, setVigencia] = useState(sugerida);

  const plano = useMemo(
    () => planoDeAlteracao(parcelas, { fee, modo, aPartirDe: vigencia }),
    [parcelas, fee, modo, vigencia],
  );

  const { resumo } = plano;
  const aumentou = fee > feeAnterior;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-sm text-amber-900">
          A mensalidade vai de <strong>{formatCurrency(feeAnterior)}</strong> para{' '}
          <strong>{formatCurrency(fee)}</strong>. O que aconteceu?
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Motivo da mudança</legend>
        {OPCOES.map((o) => (
          <label
            key={o.valor}
            className={`flex gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
              modo === o.valor ? 'border-accent bg-white' : 'border-slate-200 bg-white/60 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="feeModo"
              value={o.valor}
              checked={modo === o.valor}
              onChange={() => setModo(o.valor)}
              className="mt-1 h-4 w-4 text-accent focus:ring-accent"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">{o.titulo}</span>
              <span className="block text-xs text-slate-500">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {modo === MODO_PLANO && (
        <div>
          <label htmlFor="feeVigenteDesde" className={labelCls}>Vale a partir do vencimento</label>
          <input
            id="feeVigenteDesde"
            name="feeVigenteDesde"
            type="date"
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-slate-500 mt-1">
            Sugestão: {formatDate(sugerida)}, o próximo vencimento ainda não vencido.
          </p>
        </div>
      )}

      {/* Prévia: o usuário vê exatamente quais parcelas mudam antes de gravar. */}
      <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-1.5" aria-live="polite">
        {resumo.quantidade === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma parcela em aberto muda de valor.</p>
        ) : (
          <p className="text-sm text-slate-800">
            <strong>{resumo.quantidade} parcela(s)</strong>
            {resumo.primeiro && (
              <> de {formatDate(resumo.primeiro)}{resumo.ultimo !== resumo.primeiro && <> a {formatDate(resumo.ultimo)}</>}</>
            )}
            {' '}passam para {formatCurrency(fee)}.
          </p>
        )}

        {resumo.vencidasMantidas > 0 && (
          <p className="text-sm text-slate-600">
            {resumo.vencidasMantidas} vencida(s) continua(m) em {formatCurrency(feeAnterior)} — dívida do período no preço antigo.
          </p>
        )}

        {plano.fechadas > 0 && (
          <p className="text-xs text-slate-500">
            {plano.fechadas} parcela(s) paga(s) ou cancelada(s) não são alteradas.
          </p>
        )}

        <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
          Dívida em aberto: {formatCurrency(resumo.dividaAntes)} → {formatCurrency(resumo.dividaDepois)}
        </p>
      </div>

      {/* Correção que mexe em vencida muda a inadimplência: precisa ser dito. */}
      {resumo.vencidasAlteradas > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">
            {resumo.vencidasAlteradas} parcela(s) <strong>já vencida(s)</strong> vão mudar de valor,
            {aumentou ? ' aumentando' : ' reduzindo'} a dívida do aluno em{' '}
            <strong>{formatCurrency(Math.abs(resumo.delta))}</strong>. Use isto só se o valor foi digitado errado.
          </p>
        </div>
      )}
    </div>
  );
}
