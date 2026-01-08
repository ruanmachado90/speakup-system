import { 
  saveStudent as saveStudentHandler,
  handleCancelEnrollment as cancelEnrollmentHandler,
  handleDeleteStudent as deleteStudentHandler,
  savePayment as savePaymentHandler,
  saveExpense as saveExpenseHandler,
  handleDeleteExpense as deleteExpenseHandler,
  handleExcelUpload as excelUploadHandler
} from '../utils';
import { 
  printDashboard as printDashboardFn, 
  printFicha as printFichaFn, 
  generateContract as generateContractFn 
} from '../utils/print';

export const useStudentActions = (user, modal, toastMsg, setModal, setSaving) => {
  const saveStudent = (e) => saveStudentHandler(e, user, modal, toastMsg, setModal, setSaving);
  const handleCancelEnrollment = (id) => cancelEnrollmentHandler(id, toastMsg);
  const handleDeleteStudent = (id) => deleteStudentHandler(id, toastMsg);
  const handleExcelUpload = (e) => excelUploadHandler(e, toastMsg, setSaving);

  return { saveStudent, handleCancelEnrollment, handleDeleteStudent, handleExcelUpload };
};

export const usePaymentActions = (modal, toastMsg, setModal, setPaymentSaving) => {
  const savePayment = (e) => savePaymentHandler(e, modal, toastMsg, setModal, setPaymentSaving);

  return { savePayment };
};

export const useExpenseActions = (user, modal, toastMsg, setModal, setExpenseSaving) => {
  const saveExpense = (e) => saveExpenseHandler(e, user, toastMsg, setModal, setExpenseSaving);
  const handleDeleteExpense = (id) => deleteExpenseHandler(id, toastMsg);

  return { saveExpense, handleDeleteExpense };
};

export const usePrintActions = (dashboardRange, stats, monthlyData, teacherStats, filteredExpenses, modal, payments) => {
  const printDashboard = () => printDashboardFn({
    dashboardRange,
    stats,
    monthlyData,
    teacherStats,
    filteredExpenses
  });

  const printFicha = () => printFichaFn(modal.data, payments);
  const generateContract = () => generateContractFn(modal.data, payments);

  return { printDashboard, printFicha, generateContract };
};
