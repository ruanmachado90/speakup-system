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
          month: d.getMonth() + 1,
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
      month: d.getMonth() + 1,
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
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        
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

        // Buscar todos os alunos existentes
        const studentsSnapshot = await getDocs(col('students'));
        const existingStudents = {};
        studentsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.cpf) existingStudents[data.cpf] = { id: doc.id, ...data };
        });

        for (const row of jsonData) {
          try {
            console.log('Processando linha:', JSON.stringify(row, null, 2));
            
            // Extrair valores brutos
            const rawName = String(row['Nome'] || row['nome'] || row['Nome do aluno'] || row['nome do aluno'] || '').trim();
            const rawCpf = String(row['CPF'] || row['cpf'] || row['CPF do aluno'] || row['cpf do aluno'] || '').trim();
            const rawContact = String(row['Contato'] || row['contato'] || row['contato do aluno'] || row['Contato do aluno'] || '').trim();
            const rawCourse = String(row['Curso'] || row['curso'] || '').trim();
            
            // Ignorar linhas com placeholders ou vazias
            if (!rawName || 
                rawName.match(/^(Coluna|Column)\s*\d+$/i) || 
                rawCourse.match(/^(Coluna|Column)\s*\d+$/i) ||
                rawContact.match(/^(Coluna|Column)\s*\d+$/i)) {
              console.warn('Linha ignorada - placeholder detectado');
              errors++;
              continue;
            }
            
            // Converter data do Excel se necessário
            let dueDate = row['Data Vencimento'] || row['data_vencimento'] || row['Vencimento'] || row['vencimento'];
            if (typeof dueDate === 'number') {
              // Se for número pequeno (1-31), é apenas o dia do mês
              if (dueDate >= 1 && dueDate <= 31) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(Math.floor(dueDate)).padStart(2, '0');
                dueDate = `${year}-${month}-${day}`;
              } else {
                // Número grande - é data serial do Excel (dias desde 1900-01-01)
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (dueDate - 2) * 86400000);
                dueDate = date.toISOString().split('T')[0];
              }
            } else if (dueDate) {
              // Tentar converter string de data DD/MM/YYYY para YYYY-MM-DD
              const match = String(dueDate).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
              if (match) {
                const [_, day, month, year] = match;
                dueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else {
                // Se for apenas número como string, tratar como dia do mês
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
            if (!dueDate) dueDate = new Date().toISOString().split('T')[0];
            
            const studentData = {
              name: rawName,
              cpf: rawCpf,
              contact: rawContact,
              responsibleName: String(row['Responsável'] || row['responsavel'] || row['Nome responsável'] || row['nome responsável'] || '').trim(),
              responsibleCpf: String(row['CPF Responsável'] || row['cpf responsável'] || row['CPF responsável'] || row['cpf_responsavel'] || '').trim(),
              responsibleContact: String(row['Contato Responsável'] || row['contato_responsavel'] || row['Contato responsável'] || row['contato responsável'] || '').trim(),
              course: rawCourse,
              teacher: String(row['Professor'] || row['professor'] || '').trim(),
              fee: Number(row['Mensalidade'] || row['mensalidade'] || 0),
              installments: Number(row['Parcelas'] || row['parcelas'] || 12),
              dueDate: dueDate,
              status: 'ativo'
            };

            console.log('Dados processados:', JSON.stringify(studentData, null, 2));

            if (!studentData.name || !studentData.cpf || studentData.cpf === '') {
              console.warn('Linha ignorada - faltando nome ou CPF:', JSON.stringify(studentData, null, 2));
              errors++;
              continue;
            }

            // Verificar se aluno já existe
            const existingStudent = existingStudents[studentData.cpf];
            
            if (existingStudent) {
              // ATUALIZAR aluno existente
              await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "students", existingStudent.id), studentData);
              updated++;
            } else {
              // CRIAR novo aluno
              studentData.createdAt = Date.now();
              const ref = await addDoc(col('students'), studentData);

              console.log('Aluno criado, gerando parcelas. Fee:', studentData.fee, 'Installments:', studentData.installments, 'DueDate:', studentData.dueDate);

              // Criar parcelas de pagamento apenas para novos alunos
              if (studentData.fee > 0 && studentData.installments > 0) {
                const start = new Date(studentData.dueDate);

                for (let i = 0; i < studentData.installments; i++) {
                  const d = new Date(start);
                  d.setMonth(start.getMonth() + i);

                  const payment = {
                    studentId: ref.id,
                    studentName: studentData.name,
                    installmentNum: i + 1,
                    valuePlanned: studentData.fee,
                    valuePaid: 0,
                    status: 'Pendente',
                    month: d.getMonth() + 1,
                    year: d.getFullYear(),
                    dueDate: d.toISOString()
                  };

                  console.log(`Criando parcela ${i + 1}:`, payment);
                  await addDoc(col('payments'), payment);
                }
                console.log(`${studentData.installments} parcelas criadas para ${studentData.name}`);
              } else {
                console.warn('Parcelas não criadas. Fee:', studentData.fee, 'Installments:', studentData.installments);
              }
              imported++;
            }

          } catch (err) {
            console.error('Erro ao importar linha:', err);
            console.error('Detalhes do erro:', err.message, err.stack);
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
