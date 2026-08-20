import {
  saveStudent as saveStudentHandler,
  handleCancelEnrollment as cancelEnrollmentHandler,
  handleReactivateEnrollment as reactivateEnrollmentHandler,
  handleDeleteStudent as deleteStudentHandler,
  savePayment as savePaymentHandler,
  handleAddPayment as addPaymentHandler,
  handleEditDueDate as editDueDateHandler,
  handleUndoPayment as undoPaymentHandler,
  handleDeletePayment as deletePaymentHandler,
  saveExpense as saveExpenseHandler,
  handleDeleteExpense as deleteExpenseHandler,
  handleExcelUpload as excelUploadHandler,
  saveLead as saveLeadHandler
} from '../utils';
import { 
  printDashboard as printDashboardFn, 
  printFicha as printFichaFn, 
  generateContract as generateContractFn 
} from '../utils/print';

export const useStudentActions = (user, modal, toastMsg, setModal, setSaving) => {
  const saveStudent = (e) => saveStudentHandler(e, user, modal, toastMsg, setModal, setSaving);
  const handleCancelEnrollment = (id) => cancelEnrollmentHandler(id, toastMsg);
  const handleReactivateEnrollment = (id, params) => reactivateEnrollmentHandler(id, params, toastMsg);
  const handleDeleteStudent = (id) => deleteStudentHandler(id, toastMsg);
  const handleExcelUpload = (e) => excelUploadHandler(e, toastMsg, setSaving);

  return { saveStudent, handleCancelEnrollment, handleReactivateEnrollment, handleDeleteStudent, handleExcelUpload };
};

export const usePaymentActions = (modal, toastMsg, setModal, setPaymentSaving) => {
  const savePayment = (e) => savePaymentHandler(e, modal, toastMsg, setModal, setPaymentSaving);
  const handleEditDueDate = async (id, newDueDate) => {
    setPaymentSaving(true);
    await editDueDateHandler(id, newDueDate, toastMsg);
    setPaymentSaving(false);
    setModal({ open: false, type: null, data: null });
  };
  const handleAddPayment = async (payload) => {
    setPaymentSaving(true);
    await addPaymentHandler(payload, toastMsg, setModal);
    setPaymentSaving(false);
  };
  const handleUndoPayment = (id) => undoPaymentHandler(id, toastMsg);
  const handleDeletePayment = (id) => deletePaymentHandler(id, toastMsg);

  return { savePayment, handleEditDueDate, handleAddPayment, handleUndoPayment, handleDeletePayment };
};

export const useExpenseActions = (user, modal, toastMsg, setModal, setExpenseSaving) => {
  const saveExpense = (e) => saveExpenseHandler(e, user, modal, toastMsg, setModal, setExpenseSaving);
  const handleDeleteExpense = (id) => deleteExpenseHandler(id, toastMsg);

  return { saveExpense, handleDeleteExpense };
};

export const useLeadActions = (user, modal, toastMsg, setModal, setSaving) => {
  const saveLead = (e) => saveLeadHandler(e, user, modal, toastMsg, setModal, setSaving);

  return { saveLead };
};

export const usePrintActions = (dashboardRange, stats, monthlyData, teacherStats, filteredExpenses, modal, payments, professores = []) => {
  const printDashboard = () => printDashboardFn({
    dashboardRange,
    stats,
    monthlyData,
    teacherStats,
    filteredExpenses
  });

  // Resolve o nome canônico do professor (por professorId) antes de imprimir,
  // pra não repetir grafia antiga do texto livre (ex: "VERA") no papel.
  const resolveStudentTeacher = (student) => {
    if (!student?.professorId) return student;
    const professor = professores.find((p) => p.id === student.professorId);
    return professor ? { ...student, teacher: professor.nome } : student;
  };

  const printFicha = () => printFichaFn(resolveStudentTeacher(modal.data), payments);
  const generateContract = () => generateContractFn(resolveStudentTeacher(modal.data), payments);

  return { printDashboard, printFicha, generateContract };
};
