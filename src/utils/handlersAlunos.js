import { collection, doc, getDocs, query, where, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { APP_ID } from "./constants";
import { formatCurrency } from "./formatters";
import { lerCamposMatricula, validarContrato, montarParcelas } from "./matricula";
import {
  MODO_PLANO,
  MODO_CORRECAO,
  planoDeAlteracao,
  entradaHistorico,
  parcelaEmAberto,
} from "./mensalidade";

const col = (name) => collection(db, "artifacts", APP_ID, "public", "data", name);

// Campos cadastrais (texto) que o formulário de aluno pode gravar. Lista
// explícita: o que não está aqui não vai pro Firestore por acidente.
const CAMPOS_CADASTRAIS = [
  'name', 'cpf', 'contact', 'email', 'dataNascimento',
  'responsibleName', 'responsibleCpf', 'responsibleContact', 'responsibleEmail',
];

const lerCadastro = (formData) => Object.fromEntries(
  CAMPOS_CADASTRAIS
    .filter((k) => formData.has(k))
    .map((k) => [k, String(formData.get(k)).trim()])
);

/**
 * TODAS as parcelas do aluno. A mudança de mensalidade precisa ver a carteira
 * inteira (paga, vencida, a vencer) para decidir o que pode mexer — filtrar por
 * status == 'Pendente' na query deixava de fora o legado 'Atrasado' e não
 * distinguia vencida de futura, que é justamente a decisão em jogo.
 */
const parcelasDoAluno = (studentId) => getDocs(query(
  col("payments"),
  where("studentId", "==", studentId)
));

/**
 * Cria ou edita um aluno pelo formulário "Novo aluno"/"Editar".
 *
 * Criação: aluno + parcelas num batch só (antes era aluno primeiro, parcelas
 * depois — falha no meio deixava aluno sem parcela).
 *
 * Edição: dados cadastrais, curso/professor e mensalidade. Vencimento e número
 * de parcelas não são editáveis aqui: recalcular tudo a partir da 1ª parcela
 * desfazia ajustes manuais (ex: semestralidade). Data de uma parcela se ajusta
 * no Financeiro.
 *
 * Mensalidade: o formulário manda `feeModo` ('plano' | 'correcao') e
 * `feeVigenteDesde`. Antes isto reescrevia o valor de TODA parcela pendente,
 * inclusive vencida — e com isso apagava dívida contraída no preço antigo.
 * Ver src/utils/mensalidade.js.
 */
export const saveStudent = async (e, user, modal, toastMsg, setModal, setSaving) => {
  e.preventDefault();

  if (!user) {
    toastMsg('Você não está autenticado. Recarregue a página.');
    return;
  }

  const formData = new FormData(e.target);
  const cadastro = lerCadastro(formData);
  const campos = lerCamposMatricula(formData);
  const vinculo = {
    course: campos.course,
    book: campos.book,
    teacher: campos.teacher,
    professorId: campos.professorId,
  };

  setSaving(true);
  try {
    if (modal.data?.id) {
      const id = modal.data.id;
      const fee = Number(campos.fee);
      if (!(fee > 0)) {
        toastMsg('Informe um valor de mensalidade válido.');
        return;
      }

      const feeAnterior = Number(modal.data.fee);
      const feeMudou = fee !== feeAnterior;
      const modo = formData.get('feeModo') === MODO_CORRECAO ? MODO_CORRECAO : MODO_PLANO;
      const vigenciaForm = formData.get('feeVigenteDesde') || null;

      const snap = await parcelasDoAluno(id);
      const parcelas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const refPorId = new Map(snap.docs.map((d) => [d.id, d.ref]));

      // Quais parcelas o novo valor atinge. Mudança de plano vale da vigência
      // em diante (vencida mantém o valor antigo — o aluno já consumiu aula
      // naquele preço); correção de cadastro atinge toda parcela em aberto.
      const plano = feeMudou
        ? planoDeAlteracao(parcelas, { fee, modo, aPartirDe: vigenciaForm })
        : null;

      const batch = writeBatch(db);
      batch.update(doc(col("students"), id), {
        ...cadastro,
        ...vinculo,
        fee,
        // Sem histórico o valor antigo some, e ninguém explica meses depois
        // por que o MRR caiu naquele mês.
        ...(feeMudou ? {
          historicoMensalidade: arrayUnion(entradaHistorico({
            fee,
            feeAnterior,
            modo,
            vigenteDesde: plano.vigenteDesde,
            por: user.email || user.uid || null,
          })),
        } : {}),
      });

      // Nome, curso e professor seguem o cadastro atual em toda parcela em
      // aberto; valor só nas que o plano escolheu.
      const novoValor = new Map((plano?.alterar || []).map((a) => [a.id, a.para]));
      for (const p of parcelas.filter(parcelaEmAberto)) {
        const updates = {
          studentName: cadastro.name || p.studentName,
          course: vinculo.course,
          professorId: vinculo.professorId,
        };
        if (novoValor.has(p.id)) updates.valuePlanned = novoValor.get(p.id);
        batch.update(refPorId.get(p.id), updates);
      }

      await batch.commit();

      if (!plano || plano.alterar.length === 0) {
        toastMsg('Aluno atualizado com sucesso');
      } else {
        const mantidas = plano.resumo.vencidasMantidas;
        toastMsg(
          `Aluno atualizado; ${plano.alterar.length} parcela(s) a ${formatCurrency(fee)}`
          + (mantidas > 0 ? ` · ${mantidas} vencida(s) mantida(s) em ${formatCurrency(feeAnterior)}` : '')
        );
      }
      setModal({ open: false, type: null, data: null });
      return;
    }

    const problema = validarContrato(campos);
    if (problema) {
      toastMsg(problema);
      return;
    }

    const batch = writeBatch(db);
    const studentRef = doc(col("students"));
    batch.set(studentRef, {
      ...cadastro,
      ...vinculo,
      fee: Number(campos.fee),
      dueDate: campos.dueDate,
      installments: Number(campos.installments),
      status: "ativo",
      source: 'balcao',
      createdAt: Date.now(),
    });
    montarParcelas({
      studentId: studentRef.id,
      studentName: cadastro.name,
      fee: campos.fee,
      installmentDates: campos.installmentDates,
      course: vinculo.course,
      professorId: vinculo.professorId,
    }).forEach((p) => batch.set(doc(col("payments")), p));

    await batch.commit();
    toastMsg(`${cadastro.name} matriculado com ${campos.installments} parcela(s)`);
    setModal({ open: false, type: null, data: null });

  } catch (err) {
    console.error("Erro ao salvar aluno:", err);
    toastMsg(`Erro ao salvar aluno: ${err?.message || 'ver console'}`);
  } finally {
    setSaving(false);
  }
};
