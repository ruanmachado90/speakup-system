import { KPI } from '../ui';
import { pct } from '../../utils/despesasAnalise';

/**
 * Faixa de indicadores da tela de Despesas.
 *
 * `resumo` conta só o que já saiu do caixa. Conta a pagar tem card próprio,
 * para não misturar previsão com realizado — é a mesma separação que o
 * relatório mensal faz.
 *
 * Margem e % da receita só aparecem para quem vê receita (admin).
 */
export default function KpisDespesas({
  resumo, aPagar, vencidas, receita, verReceita, margem,
  rotuloAnterior, deltaTotal, qtdLancamentos, hideValues, loading,
}) {
  const margemAccent = margem == null ? undefined : margem >= 15 ? 'green' : margem >= 0 ? 'yellow' : 'red';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPI
        label="Saídas no período"
        value={resumo.total}
        accent="blue"
        delta={deltaTotal}
        invertDelta
        sub={`${qtdLancamentos} lançamento${qtdLancamentos !== 1 ? 's' : ''} pago${qtdLancamentos !== 1 ? 's' : ''}`}
        hidden={hideValues}
        loading={loading}
      />

      <KPI
        label="Custo operacional"
        value={resumo.custoOperacional}
        sub={verReceita && receita > 0
          ? `${pct((resumo.custoOperacional / receita) * 100)} da receita recebida`
          : 'Operacional + impostos'}
        hidden={hideValues}
        loading={loading}
      />

      <KPI
        label="A pagar"
        value={aPagar.total}
        accent={vencidas.quantidade > 0 ? 'red' : undefined}
        badge={vencidas.quantidade > 0 ? `${vencidas.quantidade} vencida${vencidas.quantidade !== 1 ? 's' : ''}` : undefined}
        sub={vencidas.total > 0
          ? `Vencido: ${hideValues ? '••••' : vencidas.rotuloTotal}`
          : aPagar.quantidade > 0
            ? `${aPagar.quantidade} conta${aPagar.quantidade !== 1 ? 's' : ''} em aberto`
            : 'Nenhuma conta em aberto'}
        hidden={hideValues}
        loading={loading}
      />

      {margem != null ? (
        <KPI
          label="Margem operacional"
          value={Math.round(margem * 10) / 10}
          format="percent"
          accent={margemAccent}
          sub="Referência do setor: 15–25%"
          hidden={hideValues}
          loading={loading}
        />
      ) : (
        <KPI
          label={verReceita ? 'Fora do operacional' : 'Período anterior'}
          value={verReceita
            ? resumo.foraOperacional.retiradaSocio + resumo.foraOperacional.investimento
            : resumo.totalAnterior}
          sub={verReceita ? 'Retiradas de sócio + investimentos' : `Saídas em ${rotuloAnterior}`}
          hidden={hideValues}
          loading={loading}
        />
      )}
    </div>
  );
}
