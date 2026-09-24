import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  writeBatch,
  getDocs,
  getDoc,
  where,
  arrayUnion
} from "firebase/firestore";
import { db } from "../firebase";
import { APP_ID } from "./constants";
import { addMonthsClamped } from "./dateMath";
import {
  lerCamposMatricula,
  validarContrato,
  montarParcelas,
  turmasDoAluno,
  alunosIdsSem,
  alunosIdsCom,
  separarParcelasNoCancelamento,
} from "./matricula";
import { montarBaixa } from "./pagamento";

const appId = APP_ID;
const col = (name) => collection(db, "artifacts", appId, "public", "data", name);

// Helper para converter Date para ISO string sem alterar timezone
const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00`;
};

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

const parcelasPendentes = (studentId) => getDocs(query(
  col("payments"),
  where("studentId", "==", studentId),
  where("status", "==", "Pendente")
));

/**
 * Cria ou edita um aluno pelo formulário "Novo aluno"/"Editar".
 *
 * Criação: aluno + parcelas num batch só (antes era aluno primeiro, parcelas
 * depois — falha no meio deixava aluno sem parcela).
 * Edição: só dados cadastrais, curso/professor e mensalidade. Vencimento e
 * número de parcelas não são mais editáveis aqui: recalcular tudo a partir da
 * 1ª parcela desfazia ajustes manuais (ex: semestralidade). Data de uma
 * parcela se ajusta no Financeiro.
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

      const batch = writeBatch(db);
      batch.update(doc(col("students"), id), { ...cadastro, ...vinculo, fee });

      // Parcelas pendentes acompanham nome, mensalidade e vínculo atuais;
      // pagas/canceladas ficam como estavam (histórico).
      const snap = await parcelasPendentes(id);
      const feeMudou = fee !== Number(modal.data.fee);
      snap.forEach((p) => {
        const updates = {
          studentName: cadastro.name || p.data().studentName,
          course: vinculo.course,
          professorId: vinculo.professorId,
        };
        if (feeMudou) updates.valuePlanned = fee;
        batch.update(p.ref, updates);
      });

      await batch.commit();
      toastMsg(feeMudou && !snap.empty
        ? `Aluno atualizado; ${snap.size} parcela(s) pendente(s) com a nova mensalidade`
        : 'Aluno atualizado com sucesso');
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

/**
 * Confirma um pré-cadastro online como matrícula. Tudo num batch: aluno,
 * parcelas e o pré-cadastro marcado como convertido — sem estado parcial.
 * Antes, CPF/e-mail do responsável se perdiam aqui e o contrato saía com o
 * CPF do aluno como contratante.
 */
export const confirmarPreCadastro = async (preCad, campos, toastMsg) => {
  try {
    const batch = writeBatch(db);
    const studentRef = doc(col("students"));
    batch.set(studentRef, {
      name: preCad.nome,
      cpf: preCad.cpf || '',
      contact: preCad.celular || '',
      email: preCad.email || '',
      dataNascimento: preCad.dataNascimento || '',
      cep: preCad.cep || '',
      address: preCad.endereco || '',
      responsibleName: preCad.responsavelNome || '',
      responsibleCpf: preCad.responsavelCpf || '',
      responsibleContact: preCad.responsavelCelular || '',
      responsibleEmail: preCad.responsavelEmail || '',
      formaPagamento: preCad.formaPagamento || '',
      course: campos.course,
      book: campos.book,
      teacher: campos.teacher,
      professorId: campos.professorId,
      fee: Number(campos.fee),
      dueDate: campos.dueDate,
      installments: Number(campos.installments),
      status: 'ativo',
      source: 'pre-cadastro',
      preCadastroId: preCad.id,
      createdAt: Date.now(),
    });
    montarParcelas({
      studentId: studentRef.id,
      studentName: preCad.nome,
      fee: campos.fee,
      installmentDates: campos.installmentDates,
      course: campos.course,
      professorId: campos.professorId,
    }).forEach((p) => batch.set(doc(col("payments")), p));
    batch.update(doc(col('pre-cadastros'), preCad.id), {
      status: 'convertido', convertidoEm: Date.now(), studentId: studentRef.id,
    });

    await batch.commit();
    toastMsg(`${preCad.nome} matriculado com sucesso!`);
    return true;
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao confirmar matrícula. Nada foi gravado, tente novamente.');
    return false;
  }
};

/** Pré-cadastro de quem já é aluno ativo: sai da fila sem criar duplicata. */
export const descartarPreCadastro = async (preCadId, alunoExistenteId, toastMsg) => {
  try {
    await updateDoc(doc(col('pre-cadastros'), preCadId), {
      status: 'duplicado', descartadoEm: Date.now(), studentId: alunoExistenteId,
    });
    toastMsg('Pré-cadastro descartado (aluno já matriculado)');
    return true;
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao descartar pré-cadastro');
    return false;
  }
};

/**
 * Exclui um aluno (só admin — regra do Firestore). A confirmação é de quem
 * chama. Parcelas nunca são deletadas: pagas ficam intactas, pendentes viram
 * 'cancelada'. Tudo num batch.
 */
export const handleDeleteStudent = async (id, toastMsg, { silencioso = false } = {}) => {
  try {
    const snap = await parcelasPendentes(id);
    const batch = writeBatch(db);
    batch.delete(doc(col("students"), id));
    snap.forEach((p) => batch.update(p.ref, {
      status: 'cancelada',
      canceledAt: Date.now(),
      cancelReason: 'Aluno removido',
    }));
    await batch.commit();
    if (!silencioso) toastMsg('Aluno removido; parcelas preservadas');
    return true;
  } catch (err) {
    console.error(err);
    if (!silencioso) toastMsg('Erro ao remover aluno');
    return false;
  }
};

/**
 * Reativa uma matrícula cancelada com novo contrato. O cancelamento anterior
 * vai pra `historicoCancelamentos` antes de limpar `canceledAt` — antes ele era
 * simplesmente apagado e o histórico do aluno se perdia.
 */
export const handleReactivateEnrollment = async (id, campos, toastMsg, { preCadastroId } = {}) => {
  try {
    const atual = (await getDoc(doc(col("students"), id))).data() || {};
    const agora = Date.now();
    const batch = writeBatch(db);

    const update = {
      status: 'ativo',
      reactivatedAt: agora,
      canceledAt: null,
      cancelReason: null,
      cancelNote: null,
      fee: Number(campos.fee),
      dueDate: campos.dueDate,
      installments: Number(campos.installments),
      turmasNoCancelamento: null,
      parcelasEmAbertoNoCancelamento: null,
    };
    for (const k of ['course', 'book', 'teacher', 'professorId']) {
      if (campos[k] !== undefined) update[k] = campos[k];
    }
    if (atual.canceledAt) {
      update.historicoCancelamentos = arrayUnion({
        canceladoEm: atual.canceledAt,
        motivo: atual.cancelReason || null,
        observacao: atual.cancelNote || null,
        turmas: atual.turmasNoCancelamento || [],
        reativadoEm: agora,
      });
    }
    batch.update(doc(col("students"), id), update);

    montarParcelas({
      studentId: id,
      studentName: campos.studentName || atual.name,
      fee: campos.fee,
      installmentDates: campos.installmentDates,
      course: update.course ?? atual.course,
      professorId: update.professorId ?? atual.professorId,
    }).forEach((p) => batch.set(doc(col('payments')), p));

    // Volta pra(s) turma(s) de onde saiu no cancelamento, se a secretaria marcou.
    const turmasDeVolta = await Promise.all(
      (campos.voltarTurmaIds || []).map((tid) => getDoc(doc(db, 'turmas', tid)))
    );
    turmasDeVolta.filter((s) => s.exists()).forEach((s) => {
      const ids = alunosIdsCom(s.data(), id);
      batch.update(s.ref, { alunosIds: ids, alunosCount: ids.length, updatedAt: new Date(agora).toISOString() });
    });

    if (preCadastroId) {
      batch.update(doc(col('pre-cadastros'), preCadastroId), {
        status: 'convertido', convertidoEm: agora, studentId: id, reativacao: true,
      });
    }

    await batch.commit();
    toastMsg('Matrícula reativada com sucesso');
    return true;
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao reativar matrícula. Nada foi gravado.');
    return false;
  }
};

/**
 * Cancela a matrícula — uma operação só, num batch:
 *  - aluno: status, data, motivo, e as turmas de onde saiu (`turmasNoCancelamento`,
 *    usado pra oferecer a volta na reativação e pra ocupação histórica da turma);
 *  - turmas: aluno sai de `alunosIds` (antes ficava na chamada e na contagem);
 *  - parcelas: as que vencem de hoje em diante viram 'cancelada'; as vencidas
 *    ficam em aberto se `manterVencidas` (é dívida, não pode sumir).
 * A confirmação (modal com motivo) é de quem chama.
 */
export const handleCancelEnrollment = async (
  id,
  toastMsg,
  { motivo = '', observacao = '', manterVencidas = true, silencioso = false } = {}
) => {
  try {
    const agora = Date.now();
    const [parcelasSnap, turmasSnap] = await Promise.all([
      parcelasPendentes(id),
      getDocs(collection(db, 'turmas')),
    ]);
    const turmas = turmasSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
    const saiuDe = turmasDoAluno(turmas, id);

    const { cancelar, manter } = separarParcelasNoCancelamento(
      parcelasSnap.docs.map((d) => ({ ref: d.ref, ...d.data() })),
      new Date(agora),
      manterVencidas
    );

    const batch = writeBatch(db);
    batch.update(doc(col("students"), id), {
      status: 'cancelado',
      canceledAt: agora,
      cancelReason: motivo || null,
      cancelNote: observacao || null,
      turmasNoCancelamento: saiuDe.map((t) => ({ id: t.id, nome: t.nome || '' })),
      parcelasEmAbertoNoCancelamento: manter.length,
    });
    saiuDe.forEach((t) => {
      const ids = alunosIdsSem(t, id);
      batch.update(t.ref, { alunosIds: ids, alunosCount: ids.length, updatedAt: new Date(agora).toISOString() });
    });
    cancelar.forEach((p) => batch.update(p.ref, {
      status: 'cancelada',
      canceledAt: agora,
      cancelReason: motivo || 'Matrícula cancelada',
    }));
    await batch.commit();

    if (!silencioso) {
      const partes = ['Matrícula cancelada'];
      if (saiuDe.length) partes.push(`removido de ${saiuDe.map((t) => t.nome).join(', ')}`);
      if (manter.length) partes.push(`${manter.length} parcela(s) vencida(s) continuam em aberto`);
      toastMsg(partes.join(' · '));
    }
    return true;
  } catch (err) {
    console.error(err);
    if (!silencioso) toastMsg('Erro ao cancelar matrícula. Nada foi gravado.');
    return false;
  }
};

/**
 * Limpeza única: alunos já cancelados que ficaram em turmas (antes o
 * cancelamento não tirava). `turmas`/`students` vêm do estado da tela; devolve
 * quantos saíram. Registra `turmasNoCancelamento` no aluno se ainda não tiver.
 */
export const removerCanceladosDasTurmas = async (turmas, students) => {
  const cancelados = new Map(students.filter((s) => s.status === 'cancelado').map((s) => [s.id, s]));
  const batch = writeBatch(db);
  const saidasPorAluno = new Map();
  let removidos = 0;

  for (const t of turmas) {
    let ids = t.alunosIds || [];
    for (const alunoId of ids.map((m) => (m && typeof m === 'object' ? m.id : m))) {
      if (!cancelados.has(alunoId)) continue;
      ids = alunosIdsSem({ alunosIds: ids }, alunoId);
      removidos += 1;
      if (!saidasPorAluno.has(alunoId)) saidasPorAluno.set(alunoId, []);
      saidasPorAluno.get(alunoId).push({ id: t.id, nome: t.nome || '' });
    }
    if (ids.length !== (t.alunosIds || []).length) {
      batch.update(doc(db, 'turmas', t.id), { alunosIds: ids, alunosCount: ids.length, updatedAt: new Date().toISOString() });
    }
  }
  saidasPorAluno.forEach((saidas, alunoId) => {
    if (!cancelados.get(alunoId).turmasNoCancelamento) {
      batch.update(doc(col('students'), alunoId), { turmasNoCancelamento: saidas });
    }
  });

  if (removidos > 0) await batch.commit();
  return removidos;
};

/**
 * Save a payment
 */
export const savePayment = async (e, modal, toastMsg, setModal, setPaymentSaving) => {
  e.preventDefault();
  if (!modal.data) return;

  const form = new FormData(e.target);
  const { erro, dados } = montarBaixa(modal.data, {
    valuePaid: form.get('valuePaid'),
    paymentDate: form.get('paymentDate'),
    paymentMethod: form.get('paymentMethod'),
    bank: form.get('bank'),
  });
  if (erro) {
    toastMsg(erro);
    return;
  }

  try {
    setPaymentSaving(true);
    await updateDoc(doc(col('payments'), modal.data.id), dados);

    toastMsg(modal.data.status === 'Pago' ? 'Pagamento atualizado' : 'Pagamento registrado');
    setModal({ open: false, type: null, data: null });
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    toastMsg('Erro ao registrar pagamento');
  } finally {
    setPaymentSaving(false);
  }
};

/**
 * Cria uma cobrança avulsa pra um aluno já ativo, fora do lote de parcelas
 * gerado na matrícula/reativação (ex: uma 2ª parcela de semestralidade
 * vencendo em julho, adicionada depois).
 */
export const handleAddPayment = async (
  { studentId, studentName, valuePlanned, dueDate, description },
  toastMsg,
  setModal
) => {
  try {
    const d = new Date(dueDate + 'T00:00:00');
    await addDoc(col('payments'), {
      studentId, studentName,
      valuePlanned: Number(valuePlanned),
      valuePaid: 0,
      status: 'Pendente',
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dueDate: toLocalISOString(d),
      description: description || '',
      createdAt: Date.now(),
    });
    toastMsg('Cobrança criada com sucesso');
    setModal({ open: false, type: null, data: null });
  } catch (err) {
    console.error('Erro ao criar cobrança:', err);
    toastMsg('Erro ao criar cobrança');
  }
};

/**
 * Edita o vencimento de uma parcela (pendente ou já paga), sem mexer em
 * status/valor pago. Recalcula month/year junto, já que os filtros do
 * Financeiro usam esses campos, não o dueDate diretamente.
 */
export const handleEditDueDate = async (paymentId, newDueDate, toastMsg) => {
  if (!newDueDate) {
    toastMsg('Informe uma data de vencimento válida');
    return;
  }
  try {
    const d = new Date(newDueDate + 'T00:00:00');
    await updateDoc(doc(col('payments'), paymentId), {
      dueDate: toLocalISOString(d),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
    toastMsg('Vencimento atualizado');
  } catch (err) {
    console.error('Erro ao editar vencimento:', err);
    toastMsg('Erro ao editar vencimento');
  }
};

/**
 * Undo a payment
 */
export const handleUndoPayment = async (paymentId, toastMsg) => {
  try {
    await updateDoc(doc(col('payments'), paymentId), {
      status: 'Pendente',
      valuePaid: null,
      paymentDate: null,
      paidAt: null,
      paymentMethod: null,
      bank: null
    });

    toastMsg('Pagamento desfeito');
  } catch (err) {
    console.error('Erro ao desfazer pagamento:', err);
    toastMsg('Erro ao desfazer pagamento');
  }
};

/**
 * Delete a payment (cobrança)
 */
export const handleDeletePayment = async (id, toastMsg) => {
  if (!confirm('Remover esta cobrança?')) return;
  try {
    await deleteDoc(doc(col('payments'), id));
    toastMsg('Cobrança removida');
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Erro ao remover cobrança:', err);
    }
    toastMsg('Erro ao remover cobrança');
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
  // checkbox: presente ('on') só quando marcado
  const recorrente = form.get('recorrente') === 'on';
  const tipoSaidaRaw = form.get('tipoSaida')?.trim();
  const tipoSaida = ['operacional', 'retiradaSocio', 'investimento', 'imposto'].includes(tipoSaidaRaw)
    ? tipoSaidaRaw
    : 'operacional';

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
    const d = dateStr ? new Date(dateStr) : new Date();
    const expenseData = {
      description,
      category,
      value,
      date: d.toISOString(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      paymentMethod,
      recorrente,
      tipoSaida
    };

    if (modal.data?.id) {
      await updateDoc(doc(col('expenses'), modal.data.id), {
        ...expenseData,
        updatedAt: Date.now()
      });
      toastMsg('Despesa atualizada com sucesso!');
    } else {
      await addDoc(col('expenses'), {
        ...expenseData,
        createdAt: Date.now()
      });
      toastMsg('Despesa registrada com sucesso!');
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
 * Delete an expense
 */
export const handleDeleteExpense = async (id, toastMsg) => {
  if (!confirm('Remover despesa?')) return;
  try {
    await deleteDoc(doc(col('expenses'), id));
    toastMsg('Despesa removida');
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao remover despesa');
  }
};

/**
 * Handle Excel file upload and import students
 */
export const handleExcelUpload = async (e, toastMsg, setSaving) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    toastMsg('Processando arquivo...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const XLSX = await import('xlsx');

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          toastMsg('Nenhum dado encontrado no arquivo');
          return;
        }

        setSaving(true);
        let imported = 0;
        let updated = 0;
        let errors = 0;

        const studentsSnapshot = await getDocs(col('students'));
        const existingStudents = {};
        studentsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.cpf) existingStudents[data.cpf] = { id: doc.id, ...data };
        });

        for (const row of jsonData) {
          try {
            const rawName = String(row['Nome'] || row['nome'] || row['Nome do aluno'] || row['nome do aluno'] || '').trim();
            const rawCpf = String(row['CPF'] || row['cpf'] || row['CPF do aluno'] || row['cpf do aluno'] || '').trim();
            const rawContact = String(row['Contato'] || row['contato'] || row['contato do aluno'] || row['Contato do aluno'] || '').trim();
            const rawCourse = String(row['Curso'] || row['curso'] || '').trim();

            if (!rawName ||
                rawName.match(/^(Coluna|Column)\s*\d+$/i) ||
                rawCourse.match(/^(Coluna|Column)\s*\d+$/i) ||
                rawContact.match(/^(Coluna|Column)\s*\d+$/i)) {
              errors++;
              continue;
            }

            let dueDate = row['Data Vencimento'] || row['data_vencimento'] || row['Vencimento'] || row['vencimento'] || row['Data'] || row['data'];

            if (typeof dueDate === 'number') {
              if (dueDate >= 1 && dueDate <= 31) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(Math.floor(dueDate)).padStart(2, '0');
                dueDate = `${year}-${month}-${day}`;
              } else {
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (dueDate - 2) * 86400000);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                dueDate = `${year}-${month}-${day}`;
              }
            } else if (dueDate) {
              const match = String(dueDate).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
              if (match) {
                const [_, day, month, year] = match;
                dueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else {
                const dayNum = parseInt(String(dueDate).trim());
                if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(dayNum).padStart(2, '0');
                  dueDate = `${year}-${month}-${day}`;
                }
              }
            }

            if (!dueDate || dueDate === 'Invalid Date') {
              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, '0');
              dueDate = `${year}-${month}-10`;
            }

            const rawFee = row['Mensalidade'] || row['mensalidade'] || row['Valor'] || row['valor'] || 0;
            let fee = 0;
            if (typeof rawFee === 'string') {
              fee = parseFloat(rawFee.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
            } else {
              fee = Number(rawFee) || 0;
            }

            const studentData = {
              name: rawName,
              cpf: rawCpf,
              contact: rawContact,
              responsibleName: String(row['Responsável'] || row['responsavel'] || row['Nome responsável'] || row['nome responsável'] || '').trim(),
              responsibleCpf: String(row['CPF Responsável'] || row['cpf responsável'] || row['CPF responsável'] || row['cpf_responsavel'] || '').trim(),
              responsibleContact: String(row['Contato Responsável'] || row['contato_responsavel'] || row['Contato responsável'] || row['contato responsável'] || '').trim(),
              course: rawCourse,
              teacher: String(row['Professor'] || row['professor'] || '').trim(),
              fee: fee,
              installments: Number(row['Parcelas'] || row['parcelas'] || 12),
              dueDate: dueDate,
              status: 'ativo'
            };

            if (!studentData.name || !studentData.cpf || studentData.cpf === '') {
              errors++;
              continue;
            }

            const existingStudent = existingStudents[studentData.cpf];

            if (existingStudent) {
              await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "students", existingStudent.id), studentData);
              updated++;
            } else {
              studentData.createdAt = Date.now();
              const ref = await addDoc(col('students'), studentData);

              if (studentData.fee > 0 && studentData.installments > 0) {
                const batch = writeBatch(db);
                const start = new Date(studentData.dueDate + 'T00:00:00');

                for (let i = 0; i < studentData.installments; i++) {
                  const d = addMonthsClamped(start, i);

                  const payment = {
                    studentId: ref.id,
                    studentName: studentData.name,
                    installmentNum: i + 1,
                    valuePlanned: studentData.fee,
                    valuePaid: 0,
                    status: 'Pendente',
                    month: d.getMonth() + 1,
                    year: d.getFullYear(),
                    dueDate: toLocalISOString(d)
                  };

                  const paymentRef = doc(col('payments'));
                  batch.set(paymentRef, payment);
                }

                await batch.commit();
              }
              imported++;
            }

          } catch (err) {
            console.error('Erro ao importar linha:', err);
            errors++;
          }
        }

        toastMsg(`Importação concluída: ${imported} novos, ${updated} atualizados${errors > 0 ? `, ${errors} erros` : ''}`);

      } catch (err) {
        console.error('Erro ao processar Excel:', err);
        toastMsg('Erro ao processar arquivo. Verifique o formato.');
      } finally {
        setSaving(false);
        e.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);

  } catch (err) {
    console.error('Erro ao ler arquivo:', err);
    toastMsg('Erro ao ler arquivo');
  }
};

/**
 * Save a lead
 */
export const saveLead = async (e, user, modal, toastMsg, setModal, setSaving) => {
  e.preventDefault();

  if (!user) {
    toastMsg('Você não está autenticado. Recarregue a página.');
    return;
  }

  const form = new FormData(e.target);
  const data = Object.fromEntries(form.entries());

  try {
    setSaving(true);

    if (modal.data?.id) {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "leads", modal.data.id),
        { ...data, updatedAt: Date.now() }
      );
      toastMsg("Lead atualizado com sucesso");
    } else {
      await addDoc(
        col("leads"),
        { ...data, status: data.status || 'novo', createdAt: Date.now() }
      );
      toastMsg("Lead cadastrado com sucesso");
    }

    setModal({ open: false, type: null, data: null });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    toastMsg("Erro ao salvar lead");
  } finally {
    setSaving(false);
  }
};
