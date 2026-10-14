import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  writeBatch,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { APP_ID } from "./constants";
import { montarLancamentos, hojeLocalYMD, PAGAMENTO_PARCELAVEL } from "./despesaParcelas";
import { recorrentesDoMes, baixaDeConta } from "./despesasRecorrentes";

const col = (name) => collection(db, "artifacts", APP_ID, "public", "data", name);

/** Escreve em lotes de 400 (writeBatch do Firestore aceita 500 operações). */
const LOTE = 400;
const gravarEmLotes = async (operacoes) => {
  for (let i = 0; i < operacoes.length; i += LOTE) {
    const batch = writeBatch(db);
    for (const op of operacoes.slice(i, i + LOTE)) op(batch);
    await batch.commit();
  }
};

/**
 * Save or update an expense
 */
export const saveExpense = async (e, user, modal, toastMsg, setModal, setExpenseSaving) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const description = form.get('description')?.trim();
  const categoryRaw = form.get('category')?.trim();
  const category = categoryRaw === 'Outro' ? (form.get('categoryOther')?.trim() || 'Outro') : categoryRaw;
  const value = Number(form.get('value') || 0);
  const dateStr = form.get('date');
  const paymentMethod = form.get('paymentMethod')?.trim() || 'Não especificado';
  const fornecedor = form.get('fornecedor')?.trim() || '';
  // Conta a pagar: 'pendente' até dar baixa. Enquanto aberta, `date` carrega o
  // vencimento como previsão; a baixa reescreve com o dia do pagamento real.
  const status = form.get('status') === 'pendente' ? 'pendente' : 'pago';
  // checkbox: presente ('on') só quando marcado
  const recorrente = form.get('recorrente') === 'on';
  const tipoSaidaRaw = form.get('tipoSaida')?.trim();
  const tipoSaida = ['operacional', 'retiradaSocio', 'investimento', 'imposto'].includes(tipoSaidaRaw)
    ? tipoSaidaRaw
    : 'operacional';
  // Parcelamento só na criação e só no cartão. Editar mexe numa parcela só.
  const parcelas = !modal.data?.id && paymentMethod === PAGAMENTO_PARCELAVEL
    ? Math.max(1, parseInt(form.get('parcelas'), 10) || 1)
    : 1;
  const dataYMD = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') ? dateStr : hojeLocalYMD();

  if (!description || isNaN(value) || value <= 0) {
    toastMsg('Descrição e valor são obrigatórios');
    return;
  }

  if (!user) {
    toastMsg('Você não está autenticado');
    return;
  }

  try {
    setExpenseSaving(true);
    const campos = {
      description,
      category,
      paymentMethod,
      fornecedor,
      // Parcela de compra não é custo fixo — não pode inflar o ponto de equilíbrio.
      recorrente: parcelas > 1 ? false : recorrente,
      tipoSaida
    };

    // Conta em aberto: cada parcela vence na própria data de caixa prevista.
    const comStatus = (l) => (status === 'pendente'
      ? { ...l, status: 'pendente', vencimento: l.date }
      : { ...l, status: 'pago' });

    if (modal.data?.id) {
      const [lancamento] = montarLancamentos({ ...campos, dataYMD, valor: value });
      await updateDoc(doc(col('expenses'), modal.data.id), {
        ...comStatus(lancamento),
        updatedAt: Date.now()
      });
      toastMsg('Despesa atualizada com sucesso!');
    } else if (parcelas > 1) {
      const refs = Array.from({ length: parcelas }, () => doc(col('expenses')));
      const lancamentos = montarLancamentos({ ...campos, dataYMD, valor: value, parcelas, grupoId: refs[0].id });
      const agora = Date.now();
      await gravarEmLotes(
        lancamentos.map((l, i) => (batch) => batch.set(refs[i], { ...comStatus(l), createdAt: agora }))
      );
      toastMsg(`Despesa registrada em ${parcelas}x`);
    } else {
      const [lancamento] = montarLancamentos({ ...campos, dataYMD, valor: value });
      await addDoc(col('expenses'), {
        ...comStatus(lancamento),
        createdAt: Date.now()
      });
      toastMsg(status === 'pendente' ? 'Conta a pagar registrada' : 'Despesa registrada com sucesso!');
    }

    setModal({ open: false, type: null, data: null });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Erro ao salvar despesa:', err);
    }
    toastMsg('Erro ao salvar despesa');
  } finally {
    setExpenseSaving(false);
  }
};

/**
 * Delete an expense. With `grupoParcelamento`, removes every installment of
 * the purchase. Confirmation is the caller's job (ConfirmDialog in Expenses).
 */
export const handleDeleteExpense = async (id, toastMsg, grupoParcelamento = null) => {
  try {
    if (grupoParcelamento) {
      const snap = await getDocs(query(col('expenses'), where('grupoParcelamento', '==', grupoParcelamento)));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      if (!snap.docs.some((d) => d.id === id)) batch.delete(doc(col('expenses'), id));
      await batch.commit();
      toastMsg(`${Math.max(snap.size, 1)} parcela(s) removida(s)`);
      return;
    }
    await deleteDoc(doc(col('expenses'), id));
    toastMsg('Despesa removida');
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao remover despesa');
  }
};

/**
 * Dá baixa numa conta a pagar. A competência passa a ser o dia do pagamento,
 * então a despesa migra para o mês em que o dinheiro saiu de verdade.
 */
export const marcarDespesaPaga = async (id, dataPagamentoYMD, toastMsg) => {
  try {
    await updateDoc(doc(col('expenses'), id), {
      ...baixaDeConta(dataPagamentoYMD || hojeLocalYMD()),
      updatedAt: Date.now(),
    });
    toastMsg('Conta baixada');
  } catch (err) {
    if (import.meta.env.DEV) console.error('Erro ao dar baixa:', err);
    toastMsg('Erro ao dar baixa na conta');
  }
};

/** Volta uma conta paga para "a pagar" (baixa dada por engano). */
export const reabrirDespesa = async (id, vencimentoISO, toastMsg) => {
  try {
    await updateDoc(doc(col('expenses'), id), {
      status: 'pendente',
      pagoEm: null,
      ...(vencimentoISO ? { vencimento: vencimentoISO } : {}),
      updatedAt: Date.now(),
    });
    toastMsg('Conta reaberta');
  } catch (err) {
    if (import.meta.env.DEV) console.error('Erro ao reabrir conta:', err);
    toastMsg('Erro ao reabrir a conta');
  }
};

/**
 * Cria as contas fixas do mês a partir das recorrentes do mês anterior.
 * Idempotente: conta que já existe no mês de destino não é duplicada, então
 * clicar duas vezes não gera nada a mais.
 */
export const gerarDespesasRecorrentes = async (expenses, origem, destino, toastMsg) => {
  try {
    const { lancamentos, jaExistiam } = recorrentesDoMes(expenses, { origem, destino });
    if (lancamentos.length === 0) {
      toastMsg(jaExistiam > 0
        ? `As ${jaExistiam} contas fixas do mês já estão lançadas`
        : 'Nenhuma despesa recorrente no mês anterior');
      return 0;
    }
    const agora = Date.now();
    await gravarEmLotes(
      lancamentos.map((l) => (batch) => batch.set(doc(col('expenses')), { ...l, createdAt: agora }))
    );
    toastMsg(`${lancamentos.length} conta(s) fixa(s) gerada(s) em aberto`);
    return lancamentos.length;
  } catch (err) {
    if (import.meta.env.DEV) console.error('Erro ao gerar recorrentes:', err);
    toastMsg('Erro ao gerar as contas fixas');
    return 0;
  }
};
