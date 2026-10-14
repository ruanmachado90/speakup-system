import { AlertCircle } from 'lucide-react';
import { Card } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { pct } from '../../utils/despesasAnalise';

// `abaixo` era bg-gr-400, que dava 2,2:1 contra a trilha — abaixo dos 3:1 de
// elemento gráfico. gr-500 resolve e continua neutro (abaixo da faixa não é erro).
const COR_BARRA = { acima: 'bg-danger', dentro: 'bg-success', abaixo: 'bg-gr-500' };
const ROTULO_STATUS = { acima: 'Acima da faixa', dentro: 'Dentro da faixa', abaixo: 'Abaixo da faixa' };
const COR_STATUS = { acima: 'text-danger-fg', dentro: 'text-success-fg', abaixo: 'text-content-muted' };

/**
 * Peso de cada grupo de custo (DRE) sobre a receita, contra a faixa de
 * referência do setor. Clicar num grupo filtra a lista de lançamentos.
 * `estrutura` vem de estruturaDeCustos() em utils/despesasAnalise.
 */
export default function EstruturaCustos({
  estrutura, rotuloPeriodo, verReceita, foraOperacional,
  grupoFiltro, onFiltrarGrupo, hideValues, loading, className = '',
}) {
  const mask = (t) => (hideValues ? '••••' : t);
  const comFaixa = estrutura.modo === 'receita';

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-display font-bold text-base text-content-strong">Estrutura de custos</h3>
        {comFaixa && (
          <span className="flex items-center gap-1.5 text-su-xs text-content-muted whitespace-nowrap">
            <span className="relative inline-block w-5 h-2.5 rounded-pill bg-surface-sunken" aria-hidden="true">
              <span className="absolute -top-0.5 -bottom-0.5 left-1 w-0.5 bg-gr-600 rounded-su-xs" />
              <span className="absolute -top-0.5 -bottom-0.5 right-1 w-0.5 bg-gr-600 rounded-su-xs" />
            </span>
            limites de referência
          </span>
        )}
      </div>
      <p className="text-su-sm text-content-muted mb-4">
        {comFaixa
          ? `% da receita recebida em ${rotuloPeriodo.toLowerCase()} · comparado a escolas de idiomas de pequeno e médio porte`
          : verReceita
            ? 'Sem receita recebida no período — mostrando a participação de cada grupo no custo operacional'
            : 'Participação de cada grupo no custo operacional do período'}
      </p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 rounded-su-xs bg-surface-sunken animate-pulse" />)}
        </div>
      ) : estrutura.linhas.length === 0 ? (
        <div className="py-10 text-center text-content-muted text-su-sm">
          <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
          Sem despesas operacionais no período
        </div>
      ) : (
        <ul className="space-y-1">
          {estrutura.linhas.map((l) => {
            const ativo = grupoFiltro === l.id;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onFiltrarGrupo(ativo ? '' : l.id)}
                  aria-pressed={ativo}
                  // A explicação do grupo vivia só no `title`: não aparece no
                  // toque e leitor de tela não anuncia de forma confiável.
                  // Agora vai no rótulo acessível e fica visível no selecionado.
                  aria-label={`${l.nome}: ${pct(l.pct)}${l.nota ? `. ${l.nota}` : ''} Filtrar a lista por este grupo.`}
                  className={`w-full text-left rounded-su-sm px-2 py-2 transition-colors focus:outline-none focus-visible:shadow-ring-accent ${ativo ? 'bg-blues-50' : 'hover:bg-surface-sunken'}`}
                >
                  <div className="flex items-baseline justify-between gap-3 text-su-sm">
                    <span className="font-semibold text-content-strong truncate">{l.nome}</span>
                    <span className="flex items-baseline gap-2 tabular-nums whitespace-nowrap">
                      <span className="text-content-muted">{mask(formatCurrency(l.valor))}</span>
                      {/* Percentual é razão, não valor: fica visível com
                          "ocultar valores" — não revela faturamento e é o que
                          mantém o painel útil com alguém olhando a tela. */}
                      <span className="font-bold text-content-strong w-14 text-right">{pct(l.pct)}</span>
                    </span>
                  </div>
                  {/* A faixa do setor era uma banda cinza-sobre-cinza com 1,1:1
                      de contraste — invisível. Agora são dois marcadores de
                      limite, que também leem melhor: o que importa é onde o
                      aceitável começa e termina, não preencher o intervalo. */}
                  <div className="relative mt-1.5 h-2.5 rounded-pill bg-surface-sunken">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-pill ${l.status ? COR_BARRA[l.status] : 'bg-brand-blue'}`}
                      style={{ width: `${l.barra.preenchido}%` }}
                      aria-hidden="true"
                    />
                    {l.barra.marcadores.map((pos, i) => (
                      <span
                        key={i}
                        className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-gr-600 rounded-su-xs"
                        style={{ left: `${pos}%` }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  {l.meta > 0 ? (
                    <div className="mt-1 flex justify-between gap-2 text-su-xs">
                      <span className="text-content-muted">
                        Orçamento {mask(formatCurrency(l.meta))}
                        {' · '}{pct(l.orcamentoPct)} usado
                      </span>
                      <span className={`font-semibold ${COR_STATUS[l.status]}`}>
                        {l.status === 'acima'
                          ? `Estourou ${mask(formatCurrency(l.valor - l.meta))}`
                          : `Resta ${mask(formatCurrency(l.meta - l.valor))}`}
                      </span>
                    </div>
                  ) : comFaixa && l.faixa ? (
                    <div className="mt-1 flex justify-between gap-2 text-su-xs">
                      <span className="text-content-muted">Referência {l.faixa[0]}–{l.faixa[1]}%</span>
                      <span className={`font-semibold ${COR_STATUS[l.status]}`}>{ROTULO_STATUS[l.status]}</span>
                    </div>
                  ) : null}
                  {ativo && l.nota && (
                    <p className="mt-1.5 text-su-xs text-content-body">{l.nota}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && estrutura.linhas.some((l) => l.legado && l.valor > 0) && (
        <div className="mt-4 rounded-su-sm bg-info-bg px-4 py-3 text-su-sm text-info-fg">
          <span className="font-semibold">Folha a reclassificar: </span>
          há lançamentos na categoria antiga &ldquo;Salários&rdquo;. Edite cada um para
          &ldquo;Professores&rdquo; ou &ldquo;Equipe administrativa&rdquo; — é o que permite comparar a
          folha docente (30–40% da receita) com o mercado.
        </div>
      )}

      {!loading && estrutura.acima.length > 0 && (
        <div className="mt-4 rounded-su-sm bg-warning-bg px-4 py-3 text-su-sm text-warning-fg">
          <span className="font-semibold">Ponto de atenção: </span>
          {estrutura.acima.map((l) => l.nome.toLowerCase()).join(', ')} acima {estrutura.acima.some((l) => l.meta > 0) ? 'do orçamento' : 'da faixa de referência'}.
          {estrutura.acima.some((l) => l.id === 'pessoal') && ' Revise ocupação das turmas antes de cortar horas de professor.'}
        </div>
      )}

      {verReceita && !loading && (foraOperacional.retiradaSocio > 0 || foraOperacional.investimento > 0) && (
        <p className="mt-3 text-su-xs text-content-muted">
          Fora do operacional (não entram na margem): retirada de sócio {mask(formatCurrency(foraOperacional.retiradaSocio))}
          {' · '}investimento {mask(formatCurrency(foraOperacional.investimento))}
        </p>
      )}
    </Card>
  );
}
