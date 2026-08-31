import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  writeBatch,
  getDocs,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { APP_ID } from "./constants";
import { addMonthsClamped } from "./dateMath";

const appId = APP_ID;
const col = (name) => collection(db, "artifacts", appId, "public", "data", name);

// Helper para converter Date para ISO string sem alterar timezone
const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00`;
};

/**
 * Save or update a student
 */
export const saveStudent = async (e, user, modal, toastMsg, setModal, setSaving) => {
  e.preventDefault();

  const form = new FormData(e.target);
  const data = Object.fromEntries(form.entries());

  if (!user) {
    toastMsg('Você não está autenticado. Recarregue a página.');
    return;
  }

  try {
    if (modal.data?.id) {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "students", modal.data.id),
        data
      );

      const q = query(
        col("payments"),
        where("studentId", "==", modal.data.id),
        where("status", "==", "Pendente")
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const batch = writeBatch(db);
        const hasDateChange = data.dueDate && data.dueDate !== modal.data.dueDate;
        const newBaseDate = hasDateChange ? new Date(data.dueDate + 'T00:00:00') : null;

        snap.forEach(paymentDoc => {
          const payment = paymentDoc.data();
          const updates = {};

          if (data.name && data.name !== modal.data.name) {
            updates.studentName = data.name;
          }

          if (data.fee && Number(data.fee) !== Number(modal.data.fee)) {
            updates.valuePlanned = Number(data.fee);
          }

          if (hasDateChange) {
            const newDueDate = addMonthsClamped(newBaseDate, payment.installmentNum - 1);
            updates.dueDate = toLocalISOString(newDueDate);
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc(col("payments"), paymentDoc.id), updates);
          }
        });

        await batch.commit();
      }

      toastMsg("Aluno atualizado com sucesso");
      setModal({ open: false, type: null, data: null });
      return;
    }

    const fee = Number(data.fee || 0);
    const installments = Number(data.installments || 1);

    if (!data.dueDate) {
      toastMsg('Data de vencimento é obrigatória');
      setSaving(false);
      return;
    }

    setSaving(true);

    const ref = await addDoc(
      col("students"),
      {
        ...data,
        fee,
        installments,
        status: "ativo",
        createdAt: Date.now()
      }
    );

    const batch = writeBatch(db);
    const start = new Date(data.dueDate + 'T00:00:00');

    for (let i = 0; i < installments; i++) {
      const d = addMonthsClamped(start, i);

      batch.set(
        doc(col("payments")),
        {
          studentId: ref.id,
          studentName: data.name,
          installmentNum: i + 1,
          valuePlanned: fee,
          valuePaid: 0,
          status: "Pendente",
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          dueDate: toLocalISOString(d)
        }
      );
    }

    await batch.commit();
    toastMsg(`Aluno cadastrado (id: ${ref.id})`);
    setModal({ open: false, type: null, data: null });

  } catch (err) {
    console.error("Erro ao salvar aluno:", err);
    toastMsg(`Erro ao salvar aluno: ${err?.message || 'ver console'}`);
  } finally {
    setSaving(false);
  }
};

/**
 * Delete a student and all related payments
 */
export const handleDeleteStudent = async (id, toastMsg) => {
  if (!confirm('Remover aluno e pagamentos associados?')) return;

  try {
    await deleteDoc(doc(col("students"), id));

    const q = query(col("payments"), where("studentId", "==", id));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(doc(col("payments"), d.id)));
    await batch.commit();

    toastMsg('Aluno e pagamentos removidos');
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao remover aluno');
  }
};

/**
 * Cancel student enrollment
 */
export const handleReactivateEnrollment = async (id, { studentName, fee, dueDate, installments, installmentDates }, toastMsg) => {
  try {
    await updateDoc(doc(col("students"), id), {
      status: 'ativo',
      reactivatedAt: Date.now(),
      canceledAt: null,
      fee: Number(fee),
      dueDate,
      installments: Number(installments),
    });

    if (Number(fee) > 0 && Number(installments) > 0 && dueDate) {
      const batch = writeBatch(db);

      // installmentDates traz a data (já ajustada manualmente, se for o caso) de
      // cada parcela; se não vier (chamada legada), cai no cálculo mensal padrão.
      for (let i = 0; i < Number(installments); i++) {
        const dataStr = installmentDates?.[i];
        const d = dataStr ? new Date(dataStr + 'T00:00:00') : addMonthsClamped(new Date(dueDate + 'T00:00:00'), i);
        batch.set(doc(col('payments')), {
          studentId: id,
          studentName,
          installmentNum: i + 1,
          valuePlanned: Number(fee),
          valuePaid: 0,
          status: 'Pendente',
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          dueDate: toLocalISOString(d),
        });
      }
      await batch.commit();
    }

    toastMsg('Matrícula reativada com sucesso');
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao reativar matrícula');
  }
};

export const handleCancelEnrollment = async (id, toastMsg) => {
  if (!confirm('Cancelar matrícula deste aluno? As parcelas pendentes serão excluídas.')) return;

  try {
    await updateDoc(doc(col("students"), id), {
      status: 'cancelado',
      canceledAt: Date.now()
    });

    const q = query(
      col("payments"),
      where("studentId", "==", id),
      where("status", "==", "Pendente")
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(doc(col("payments"), d.id)));
      await batch.commit();
    }

    toastMsg('Matrícula cancelada com sucesso');
  } catch (err) {
    console.error(err);
    toastMsg('Erro ao cancelar matrícula');
  }
};

/**
 * Save a payment
 */
export const savePayment = async (e, modal, toastMsg, setModal, setPaymentSaving) => {
  e.preventDefault();
  if (!modal.data) return;

  const form = new FormData(e.target);
  const valuePaid = Number(form.get('valuePaid') || 0);
  const paymentDate = form.get('paymentDate');
  const paymentMethod = form.get('paymentMethod') || 'PIX';
  const bank = form.get('bank') || 'Asaas';

  if (isNaN(valuePaid) || valuePaid <= 0) {
    toastMsg('Informe um valor válido');
    return;
  }

  try {
    setPaymentSaving(true);

    const updateData = {
      status: 'Pago',
      valuePaid: valuePaid,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod,
      bank: bank
    };

    if (!modal.data.paidAt) {
      updateData.paidAt = Date.now();
    }

    await updateDoc(doc(col('payments'), modal.data.id), updateData);

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
      paymentMethod
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
              const match = String(dueDate).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
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
              fee = parseFloat(rawFee.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
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
