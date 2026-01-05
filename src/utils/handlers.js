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

const appId = APP_ID;
const col = (name) => collection(db, "artifacts", appId, "public", "data", name);

/**
 * Save or update a student
 * @param {Event} e - Form event
 * @param {Object} user - Current authenticated user
 * @param {Object} modal - Modal state with data
 * @param {Function} toastMsg - Toast notification function
 * @param {Function} setModal - Function to update modal state
 * @param {Function} setSaving - Function to update saving state
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
      // ✏️ EDITAR ALUNO
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "students", modal.data.id),
        data
      );

      toastMsg("Aluno atualizado com sucesso");
      setModal({ open: false, type: null, data: null });
      return;
    }

    // ➕ NOVO ALUNO
    const fee = Number(data.fee || 0);
    const installments = Number(data.installments || 1);

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

    // 📄 GERAR PARCELAS
    const batch = writeBatch(db);
    const start = new Date(data.dueDate);

    for (let i = 0; i < installments; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);

      batch.set(
        doc(col("payments")),
        {
          studentId: ref.id,
          studentName: data.name,
          installmentNum: i + 1,
          valuePlanned: fee,
          valuePaid: 0,
          status: "Pendente",
          month: d.getMonth(),
          year: d.getFullYear(),
          dueDate: d.toISOString()
        }
      );
    }

    await batch.commit();
    console.log('Aluno salvo em:', `artifacts/${appId}/public/data/students/${ref.id}`);
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
 * @param {string} id - Student ID
 * @param {Function} toastMsg - Toast notification function
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
 * Save a payment
 * @param {Event} e - Form event
 * @param {Object} modal - Modal state with payment data
 * @param {Function} toastMsg - Toast notification function
 * @param {Function} setModal - Function to update modal state
 * @param {Function} setPaymentSaving - Function to update saving state
 */
export const savePayment = async (e, modal, toastMsg, setModal, setPaymentSaving) => {
  e.preventDefault();
  if (!modal.data) return;

  const form = new FormData(e.target);
  const valuePaid = Number(form.get('valuePaid') || 0);
  const paymentDate = form.get('paymentDate');

  if (isNaN(valuePaid) || valuePaid <= 0) {
    toastMsg('Informe um valor válido');
    return;
  }

  try {
    setPaymentSaving(true);
    await updateDoc(doc(col('payments'), modal.data.id), {
      status: 'Pago',
      valuePaid,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paidAt: Date.now()
    });

    toastMsg('Pagamento registrado');
    setModal({ open: false, type: null, data: null });
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    toastMsg('Erro ao registrar pagamento');
  } finally {
    setPaymentSaving(false);
  }
};

/**
 * Save an expense
 * @param {Event} e - Form event
 * @param {Object} user - Current authenticated user
 * @param {Function} toastMsg - Toast notification function
 * @param {Function} setModal - Function to update modal state
 * @param {Function} setExpenseSaving - Function to update saving state
 */
export const saveExpense = async (e, user, toastMsg, setModal, setExpenseSaving) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const description = form.get('description')?.trim();
  const categoryRaw = form.get('category')?.trim();
  const category = categoryRaw === 'Outro' ? (form.get('categoryOther')?.trim() || 'Outro') : categoryRaw;
  const value = Number(form.get('value') || 0);
  const dateStr = form.get('date');

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
    await addDoc(col('expenses'), {
      description,
      category,
      value,
      date: d.toISOString(),
      month: d.getMonth(),
      year: d.getFullYear(),
      createdAt: Date.now()
    });

    toastMsg('Despesa registrada');
    setModal({ open: false, type: null, data: null });
  } catch (err) {
    console.error('Erro ao salvar despesa:', err);
    toastMsg('Erro ao salvar despesa');
  } finally {
    setExpenseSaving(false);
  }
};

/**
 * Delete an expense
 * @param {string} id - Expense ID
 * @param {Function} toastMsg - Toast notification function
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
 * @param {Event} e - File input event
 * @param {Function} toastMsg - Toast notification function
 * @param {Function} setSaving - Function to update saving state
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
        const workbook = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
          .then(m => m.read(data, { type: 'array' }));
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
          .then(m => m.utils.sheet_to_json(worksheet));

        if (!jsonData || jsonData.length === 0) {
          toastMsg('Nenhum dado encontrado no arquivo');
          return;
        }

        setSaving(true);
        let imported = 0;
        let errors = 0;

        for (const row of jsonData) {
          try {
            const studentData = {
              name: row['Nome'] || row['nome'] || '',
              contact: row['Contato'] || row['contato'] || '',
              responsibleName: row['Responsável'] || row['responsavel'] || '',
              responsibleContact: row['Contato Responsável'] || row['contato_responsavel'] || '',
              course: row['Curso'] || row['curso'] || '',
              teacher: row['Professor'] || row['professor'] || '',
              fee: Number(row['Mensalidade'] || row['mensalidade'] || 0),
              installments: Number(row['Parcelas'] || row['parcelas'] || 12),
              dueDate: row['Data Vencimento'] || row['data_vencimento'] || row['Vencimento'] || row['vencimento'] || new Date().toISOString().split('T')[0],
              status: 'ativo',
              createdAt: Date.now()
            };

            if (!studentData.name || !studentData.fee) {
              errors++;
              continue;
            }

            const ref = await addDoc(col('students'), studentData);

            const batch = writeBatch(db);
            const start = new Date(studentData.dueDate);

            for (let i = 0; i < studentData.installments; i++) {
              const d = new Date(start);
              d.setMonth(start.getMonth() + i);

              batch.set(doc(col('payments')), {
                studentId: ref.id,
                studentName: studentData.name,
                installmentNum: i + 1,
                valuePlanned: studentData.fee,
                valuePaid: 0,
                status: 'Pendente',
                month: d.getMonth(),
                year: d.getFullYear(),
                dueDate: d.toISOString()
              });
            }

            await batch.commit();
            imported++;

          } catch (err) {
            console.error('Erro ao importar linha:', err);
            errors++;
          }
        }

        toastMsg(`Importação concluída: ${imported} alunos importados${errors > 0 ? `, ${errors} erros` : ''}`);
        
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
