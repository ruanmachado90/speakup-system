import { Trash2, Edit2, ArrowUp, ArrowDown, ArrowUpDown, Repeat, Check, Undo2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TIPO_SAIDA, tipoDe, estaPaga, estaVencida, FATOR_ATIPICO } from '../../utils/despesasAnalise';

const TH_CLS = 'px-4 py-3 text-su-2xs font-semibold uppercase tracking-caps text-content-muted';
const TAG_CLS = 'inline-flex items-center gap-1 px-2 py-0.5 text-su-2xs font-semibold rounded-pill';
// 36px de alvo: acima do mínimo de 24px da WCAG 2.2 e confortável para "dar
// baixa", que é a ação mais repetida da tela. Antes eram 27px.
const ACAO_CLS = 'p-2.5 rounded-su-xs focus:outline-none focus-visible:shadow-ring-accent';

/**
 * Tabela de lançamentos: cabeçalho ordenável (aria-sort), selos de parcela,
 * custo fixo e valor atípico, ações que aparecem no hover em telas grandes e
 * total no rodapé. Não filtra nem ordena — recebe `linhas` prontas.
 */
export default function TabelaDespesas({
  linhas, ordem, onOrdenar, atipicos, total, rotuloTotal, hoje,
  hideValues, onEditar, onRemover, onBaixar, onReabrir, restantes, onMostrarMais,
}) {
  const mask = (t) => (hideValues ? '••••' : t);

  const cabecalhoOrdenavel = (campo, rotulo, align = 'left') => {
    const ativo = ordem.campo === campo;
    const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={ativo ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`${TH_CLS} ${align === 'right' ? 'text-right' : 'text-left'}`}
      >
        <button
          type="button"
          onClick={() => onOrdenar(campo)}
          className={`inline-flex items-center gap-1 uppercase tracking-caps hover:text-content-body focus:outline-none focus-visible:shadow-ring-accent rounded-su-xs ${ativo ? 'text-content-strong' : ''}`}
        >
          {rotulo}
          <Icone size={12} aria-hidden="true" className={ativo ? '' : 'opacity-50'} />
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-su-sm">
          <thead className="bg-surface-sunken border-y border-subtle">
            <tr>
              {cabecalhoOrdenavel('data', 'Data / venc.')}
              {cabecalhoOrdenavel('descricao', 'Descrição')}
              <th scope="col" className={`${TH_CLS} text-left`}>Categoria</th>
              <th scope="col" className={`${TH_CLS} text-left`}>Pagamento</th>
              {cabecalhoOrdenavel('valor', 'Valor', 'right')}
              <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((x) => {
              const paga = estaPaga(x);
              const vencida = estaVencida(x, hoje);
              return (
              <tr key={x.id} className="group border-b border-subtle hover:bg-gr-50 transition-colors">
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  <span className={vencida ? 'font-semibold text-danger-fg' : 'text-content-muted'}>
                    {formatDate(x.vencimento ?? x.date)}
                  </span>
                  {!paga && (
                    <span className={`block text-su-xs font-semibold ${vencida ? 'text-danger-fg' : 'text-content-muted'}`}>
                      {vencida ? 'vencida' : 'a pagar'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-content-strong font-medium">{x.description}</span>
                    {x.fornecedor && (
                      <span className="text-su-2xs text-content-muted">· {x.fornecedor}</span>
                    )}
                    {x.parcelas > 1 && (
                      <span
                        className={`${TAG_CLS} bg-surface-sunken text-content-muted tabular-nums`}
                        title={`Parcela ${x.parcela} de ${x.parcelas}${x.valorTotal ? ` · compra de ${formatCurrency(x.valorTotal)}` : ''}`}
                      >
                        {x.parcela}/{x.parcelas}
                      </span>
                    )}
                    {x.recorrente && (
                      <span className={`${TAG_CLS} bg-surface-sunken text-content-muted`} title="Despesa recorrente (custo fixo)">
                        <Repeat size={10} aria-hidden="true" /> Fixa
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`${TAG_CLS} bg-blues-50 text-blues-700`}>{x.category || '—'}</span>
                    {tipoDe(x) !== 'operacional' && (
                      <span className={`${TAG_CLS} bg-warning-bg text-warning-fg`}>{TIPO_SAIDA[tipoDe(x)]}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-content-muted whitespace-nowrap">{x.paymentMethod || 'Não especificado'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-content-strong">{mask(formatCurrency(x.value))}</span>
                  {atipicos.has(x.id) && !hideValues && (
                    <span
                      className="block text-su-2xs font-semibold text-warning-fg"
                      title={`Pelo menos ${FATOR_ATIPICO.toLocaleString('pt-BR')}× a média desta categoria nos 6 meses anteriores`}
                    >
                      acima do usual
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                    {paga ? (
                      <button
                        type="button"
                        onClick={() => onReabrir(x)}
                        className={`${ACAO_CLS} text-content-muted hover:text-content-body hover:bg-surface-sunken`}
                        aria-label={`Reabrir ${x.description} como conta a pagar`}
                        title="Reabrir como conta a pagar"
                      >
                        <Undo2 size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBaixar(x)}
                        className={`${ACAO_CLS} text-success-fg hover:bg-success-bg`}
                        aria-label={`Dar baixa em ${x.description}`}
                        title="Dar baixa (marcar como paga)"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditar(x)}
                      className={`${ACAO_CLS} text-content-muted hover:text-content-body hover:bg-surface-sunken`}
                      aria-label={`Editar despesa ${x.description}`}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemover(x)}
                      className={`${ACAO_CLS} text-danger hover:text-danger-fg hover:bg-danger-bg`}
                      aria-label={`Remover despesa ${x.description}`}
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-sunken">
              <td colSpan={4} className="px-4 py-3 text-su-xs font-semibold uppercase tracking-caps text-content-muted">
                {rotuloTotal}
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-content-strong whitespace-nowrap">
                {mask(formatCurrency(total))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {restantes > 0 && (
        <div className="p-4 text-center">
          <button
            type="button"
            onClick={onMostrarMais}
            className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body hover:bg-gr-50 focus:outline-none focus-visible:shadow-ring-accent"
          >
            Mostrar mais ({restantes} restantes)
          </button>
        </div>
      )}
    </>
  );
}
