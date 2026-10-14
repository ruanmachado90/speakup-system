import { useMemo, useState } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORIES_LEGADO, formatCurrency } from '../../utils';
import { addMonthsClamped } from '../../utils/dateMath';
import {
  OPCOES_PARCELAS,
  PAGAMENTO_PARCELAVEL,
  dividirEmParcelas,
  hojeLocalYMD,
  ymdParaData,
} from '../../utils/despesaParcelas';
import { statusDe } from '../../utils/despesasAnalise';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Segmentado from '../despesas/Segmentado';

const FORMAS_PAGAMENTO = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência Bancária', 'Dinheiro', 'Cheque'];

const TIPOS_SAIDA = [
  { value: 'operacional', label: 'Operacional', hint: 'Custo do negócio' },
  { value: 'imposto', label: 'Imposto', hint: 'DAS, ISS…' },
  { value: 'retiradaSocio', label: 'Retirada de sócio', hint: 'Pró-labore', soAdmin: true },
  { value: 'investimento', label: 'Investimento', hint: 'Reforma, equipamento' },
];

const mesCurto = (d) => d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

const labelCls = 'block text-su-xs font-semibold text-content-body mb-1.5';
const inputCls = 'w-full border border-strong bg-surface-card rounded-su-sm px-3 py-2.5 text-su-base text-content-strong placeholder:text-content-faint focus:outline-none focus:border-focus focus-visible:shadow-ring-accent disabled:bg-surface-sunken disabled:text-content-muted';
const Obrigatorio = () => <span className="text-danger" aria-hidden="true"> *</span>;

/**
 * Cadastro/edição de despesa. Categoria vem do estado global (DataContext
 * sincroniza ao abrir o modal); o resto é estado local do formulário, que é
 * remontado a cada abertura. Parcelamento só existe na criação com cartão de
 * crédito — o handler grava uma despesa por parcela (ver despesaParcelas.js).
 */
export const ExpenseForm = ({
  modal,
  expenseSaving,
  expenseCategorySelect,
  setExpenseCategorySelect,
  expenseCategoryOther,
  onSubmit,
  onCancel
}) => {
  const dados = modal.data || {};
  const isEditing = !!dados.id;
  const ehParcela = isEditing && dados.parcelas > 1;
  // Pró-labore é lançamento de sócio: a regra do Firestore recusa a escrita
  // vinda da secretaria, então a opção não aparece para ela.
  const { role } = useAuthContext();
  const tiposDisponiveis = TIPOS_SAIDA.filter((t) => !t.soAdmin || role === 'admin');
  // Autocompletar de fornecedor: o que já foi digitado nas despesas.
  const { expenses = [] } = useData();
  const fornecedores = useMemo(
    () => [...new Set(expenses.map((e) => e.fornecedor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [expenses]
  );

  const [paymentMethod, setPaymentMethod] = useState(dados.paymentMethod || '');
  const [parcelas, setParcelas] = useState(1);
  const [valor, setValor] = useState(dados.value ?? '');
  const [status, setStatus] = useState(isEditing ? statusDe(dados) : 'pago');
  const [data, setData] = useState(() => {
    const bruta = status === 'pendente' ? (dados.vencimento ?? dados.date) : dados.date;
    return bruta ? String(bruta).slice(0, 10) : hojeLocalYMD();
  });
  const [tipoSaida, setTipoSaida] = useState(dados.tipoSaida || 'operacional');

  const aPagar = status === 'pendente';
  const parcelavel = !isEditing && paymentMethod === PAGAMENTO_PARCELAVEL;
  const nParcelas = parcelavel ? parcelas : 1;
  const parcelado = nParcelas > 1;

  const previa = useMemo(() => {
    const total = Number(valor);
    const inicio = ymdParaData(data);
    if (!parcelado || !(total > 0) || !inicio) return null;
    const valores = dividirEmParcelas(total, nParcelas);
    return {
      valores,
      primeiroMes: mesCurto(inicio),
      ultimoMes: mesCurto(addMonthsClamped(inicio, nParcelas - 1)),
    };
  }, [valor, data, parcelado, nParcelas]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h3 className="font-display text-su-h3 font-extrabold text-content-strong">
          {isEditing ? 'Editar despesa' : 'Nova despesa'}
        </h3>
        {ehParcela && (
          <p className="mt-2 flex items-start gap-2 rounded-su-sm bg-info-bg px-3 py-2 text-su-sm text-info-fg">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Parcela {dados.parcela} de {dados.parcelas}
              {dados.valorTotal ? ` de uma compra de ${formatCurrency(dados.valorTotal)}` : ''}.
              As alterações valem só para esta parcela.
            </span>
          </p>
        )}
      </div>

      {/* Já saiu do caixa ou é conta a pagar. Define o que todo relatório soma:
          só o que foi pago entra na despesa do mês. */}
      <Segmentado
        rotulo="Situação da despesa"
        valor={status}
        onChange={setStatus}
        opcoes={[{ valor: 'pago', rotulo: 'Já paguei' }, { valor: 'pendente', rotulo: 'A pagar' }]}
      />
      <input type="hidden" name="status" value={status} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        <div className="sm:col-span-2">
          <label htmlFor="exp-description" className={labelCls}>Descrição<Obrigatorio /></label>
          <input
            id="exp-description"
            name="description"
            defaultValue={dados.description}
            required
            autoFocus={!isEditing}
            autoComplete="off"
            placeholder="Ex.: Aluguel da sede, livros Cambridge, Google Ads"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="exp-value" className={labelCls}>
            {ehParcela ? 'Valor da parcela' : parcelado ? 'Valor total da compra' : 'Valor'}<Obrigatorio />
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-su-sm text-content-muted" aria-hidden="true">R$</span>
            <input
              id="exp-value"
              name="value"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              placeholder="0,00"
              className={`${inputCls} pl-10 tabular-nums`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="exp-date" className={labelCls}>
            {parcelado ? (aPagar ? 'Vencimento da 1ª parcela' : 'Data da 1ª parcela') : aPagar ? 'Vencimento' : 'Data do pagamento'}
            <Obrigatorio />
          </label>
          <input
            id="exp-date"
            name="date"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            className={inputCls}
          />
          {aPagar && (
            <p className="mt-1 text-su-xs text-content-muted">
              Só entra na despesa do mês quando você der baixa.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="exp-category" className={labelCls}>Categoria<Obrigatorio /></label>
          <select
            id="exp-category"
            name="category"
            value={expenseCategorySelect}
            onChange={(e) => setExpenseCategorySelect(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Selecione</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            {/* Categoria antiga só aparece ao editar um lançamento que já a usa,
                para a folha ir sendo reclassificada em Professores/Equipe. */}
            {EXPENSE_CATEGORIES_LEGADO.filter((c) => c === dados.category).map((c) => (
              <option key={c} value={c}>{c} (categoria antiga)</option>
            ))}
            <option value="Outro">Outra…</option>
          </select>
          {EXPENSE_CATEGORIES_LEGADO.includes(dados.category) && (
            <p className="mt-1 text-su-xs text-warning-fg">
              Troque para Professores ou Equipe administrativa — é o que separa a folha docente no comparativo.
            </p>
          )}
          {expenseCategorySelect === 'Outro' && (
            <input
              name="categoryOther"
              defaultValue={expenseCategoryOther}
              placeholder="Nome da categoria (ex.: Contador)"
              aria-label="Nome da categoria"
              className={`${inputCls} mt-2`}
              required
            />
          )}
        </div>

        <div>
          <label htmlFor="exp-payment" className={labelCls}>Forma de pagamento<Obrigatorio /></label>
          <select
            id="exp-payment"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Selecione</option>
            {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="exp-fornecedor" className={labelCls}>Fornecedor</label>
          <input
            id="exp-fornecedor"
            name="fornecedor"
            list="exp-fornecedores"
            defaultValue={dados.fornecedor || ''}
            autoComplete="off"
            placeholder="Opcional — ex.: Cambridge University Press, Imobiliária Santos"
            className={inputCls}
          />
          {fornecedores.length > 0 && (
            <datalist id="exp-fornecedores">
              {fornecedores.map((f) => <option key={f} value={f} />)}
            </datalist>
          )}
        </div>

        {parcelavel && (
          <div className="sm:col-span-2 rounded-su-md border border-subtle bg-surface-sunken p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="sm:w-40">
                <label htmlFor="exp-parcelas" className={labelCls}>
                  <CreditCard size={14} className="inline -mt-0.5 mr-1" aria-hidden="true" />
                  Parcelamento
                </label>
                <select
                  id="exp-parcelas"
                  name="parcelas"
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  className={inputCls}
                >
                  {OPCOES_PARCELAS.map((n) => (
                    <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 text-su-sm" aria-live="polite">
                {!parcelado ? (
                  <p className="text-content-muted">Escolha o número de parcelas se a compra foi parcelada na fatura.</p>
                ) : previa ? (
                  <>
                    <p className="font-semibold text-content-strong tabular-nums">
                      {nParcelas}x de {formatCurrency(previa.valores[nParcelas - 1])}
                      {previa.valores[0] !== previa.valores[nParcelas - 1] && (
                        <span className="font-normal text-content-muted"> (1ª de {formatCurrency(previa.valores[0])})</span>
                      )}
                    </p>
                    <p className="text-content-muted">
                      Uma despesa por mês, de {previa.primeiroMes} a {previa.ultimoMes}.
                    </p>
                  </>
                ) : (
                  <p className="text-content-muted">Informe o valor total para ver as parcelas.</p>
                )}
              </div>
            </div>
            {parcelado && (
              <p className="mt-3 text-su-xs text-content-muted">
                Dica: use como data da 1ª parcela o vencimento da fatura em que ela cai. Assim cada parcela fica no mês em que sai do caixa.
              </p>
            )}
          </div>
        )}

        <fieldset className="sm:col-span-2">
          <legend className={labelCls}>Tipo de saída</legend>
          <div className={`grid grid-cols-2 gap-2 ${tiposDisponiveis.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            {tiposDisponiveis.map((t) => {
              const ativo = tipoSaida === t.value;
              return (
                <label
                  key={t.value}
                  className={`cursor-pointer rounded-su-sm border px-3 py-2 transition-colors has-[:focus-visible]:shadow-ring-accent ${
                    ativo ? 'border-accent bg-accent text-white' : 'border-strong bg-surface-card text-content-body hover:bg-gr-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoSaida"
                    value={t.value}
                    checked={ativo}
                    onChange={() => setTipoSaida(t.value)}
                    className="sr-only"
                  />
                  <span className="block text-su-sm font-semibold">{t.label}</span>
                  <span className={`block text-su-2xs ${ativo ? 'text-gr-300' : 'text-content-muted'}`}>{t.hint}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-1.5 text-su-xs text-content-muted">
            Só operacional e imposto entram no lucro operacional. Retirada de sócio e investimento aparecem à parte.
          </p>
        </fieldset>

        <label className={`sm:col-span-2 flex items-start gap-3 rounded-su-sm border border-subtle px-4 py-3 transition-colors ${parcelado ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gr-50'}`}>
          <input
            type="checkbox"
            name="recorrente"
            defaultChecked={!!dados.recorrente}
            disabled={parcelado}
            className="mt-0.5 h-4 w-4 rounded border-strong text-accent focus:ring-accent"
          />
          <span>
            <span className="block text-su-sm font-semibold text-content-strong">Despesa recorrente (custo fixo)</span>
            <span className="block text-su-xs text-content-muted">
              {parcelado
                ? 'Parcelas de uma compra não são custo fixo.'
                : 'Aluguel, salários, assinaturas: o que se repete todo mês. Entra no ponto de equilíbrio do relatório.'}
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-subtle">
        <button
          type="button"
          onClick={onCancel}
          disabled={expenseSaving}
          className="px-5 py-2.5 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body hover:bg-gr-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={expenseSaving}
          className="px-5 py-2.5 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover transition-colors disabled:bg-gr-300 disabled:cursor-not-allowed focus:outline-none focus-visible:shadow-ring-accent"
        >
          {expenseSaving
            ? 'Salvando…'
            : isEditing
              ? 'Salvar alterações'
              : parcelado
                ? `Registrar ${nParcelas} parcelas`
                : 'Registrar despesa'}
        </button>
      </div>
    </form>
  );
};
