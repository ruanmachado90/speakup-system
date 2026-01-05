import React from "react";
import {
  Users,
  LayoutDashboard,
  FileText,
  PieChart,
  PlusCircle,
  Printer,
  ClipboardList,
  Calendar
} from "lucide-react";

import { 
  Modal,
  Logo,
  Nav
} from './components';
import { StudentForm, PaymentForm, ExpenseForm } from './components/forms';
import { Dashboard, Students, Finance, Reports, Expenses } from './pages';
import CalendarPage from './pages/Calendar';
import { AppProvider, useAppContext } from './context';
import { useStudentActions, usePaymentActions, useExpenseActions, usePrintActions } from './hooks';

function AppContent() {
  const {
    page,
    setPage,
    modal,
    setModal,
    toast,
    toastMsg,
    searchTerm,
    setSearchTerm,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    filterStatus,
    setFilterStatus,
    dashboardRange,
    setDashboardRange,
    reportMonth,
    setReportMonth,
    reportYear,
    setReportYear,
    reportType,
    setReportType,
    expenseMonth,
    setExpenseMonth,
    expenseYear,
    setExpenseYear,
    expenseView,
    setExpenseView,
    saving,
    setSaving,
    paymentSaving,
    expenseSaving,
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther,
    user,
    students,
    payments,
    expenses,
    stats,
    teacherStats,
    filteredExpenses,
    monthlyData,
    financeStats,
    filteredPayments,
    filteredExpensesData,
    expenseEvolutionData
  } = useAppContext();

  /* ================= ACTIONS ================= */
  const { saveStudent, handleDeleteStudent, handleExcelUpload } = useStudentActions(user, modal, toastMsg, setModal, setSaving);
  const { savePayment } = usePaymentActions(modal, toastMsg, setModal);
  const { saveExpense, handleDeleteExpense } = useExpenseActions(user, modal, toastMsg, setModal);
  const { printDashboard, printFicha, generateContract } = usePrintActions(dashboardRange, stats, monthlyData, teacherStats, filteredExpenses, modal, payments);

  /* ================= RENDER ================= */
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          aside { display: none !important; }
          header { display: none !important; }
          .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#005DE4] text-white fixed h-full p-6">
        <Logo />
        <Nav icon={<LayoutDashboard />} label="Dashboard" active={page==="dashboard"} onClick={()=>setPage("dashboard")} />
        <Nav icon={<Users />} label="Alunos" active={page==="students"} onClick={()=>setPage("students")} />
        <Nav icon={<FileText />} label="Financeiro" active={page==="finance"} onClick={()=>setPage("finance")} />
        <Nav icon={<PieChart />} label="Despesas" active={page==="expenses"} onClick={()=>setPage("expenses")} />
        <Nav icon={<ClipboardList />} label="Relatórios" active={page==="reports"} onClick={()=>setPage("reports")} />
        <Nav icon={<Calendar />} label="Calendário" active={page==="calendar"} onClick={()=>setPage("calendar")} />
      </aside>

      {/* MAIN */}
      <main className="ml-64 flex-1">

        {/* HEADER */}
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
          <h1 className="font-black text-xl uppercase">
            {page === "dashboard" && "Painel de Controle"}
            {page === "students" && "Gestão de Alunos"}
            {page === "finance" && "Financeiro"}
            {page === "expenses" && "Despesas"}
            {page === "reports" && "Relatórios"}
            {page === "calendar" && "Calendário"}
          </h1>
        </div>

          <div className="flex gap-3">
            {page !== "dashboard" && (
              <button
                onClick={() => setModal({ open: true, type: page === 'expenses' ? 'expense' : 'student' })}
                className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2"
              >
                <PlusCircle size={16}/> Novo
              </button>
            )}
            {page === "reports" && (
              <div className="flex gap-2 items-center">
                <button onClick={()=>window.print()} className="px-4 py-2 rounded-full bg-slate-100 flex gap-2">
                  <Printer size={16}/> Imprimir
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-8 space-y-8">

          {page === "dashboard" && <Dashboard 
            dashboardRange={dashboardRange}
            setDashboardRange={setDashboardRange}
            printDashboard={printDashboard}
            stats={stats}
            monthlyData={monthlyData}
            teacherStats={teacherStats}
            filteredExpenses={filteredExpenses}
          />}

          {page === "students" && <Students 
            students={students}
            payments={payments}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setModal={setModal}
            handleDeleteStudent={handleDeleteStudent}
            handleExcelUpload={handleExcelUpload}
          />}

          {page === "finance" && <Finance 
            students={students}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            financeStats={financeStats}
            filteredPayments={filteredPayments}
            setModal={setModal}
          />}

          {page === "reports" && <Reports 
            reportType={reportType}
            setReportType={setReportType}
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            reportYear={reportYear}
            setReportYear={setReportYear}
            payments={payments}
            expenses={expenses}
            students={students}
          />}

          {page === "expenses" && <Expenses 
            expenseView={expenseView}
            setExpenseView={setExpenseView}
            expenseMonth={expenseMonth}
            setExpenseMonth={setExpenseMonth}
            expenseYear={expenseYear}
            setExpenseYear={setExpenseYear}
            filteredExpensesData={filteredExpensesData}
            expenseEvolutionData={expenseEvolutionData}
            setModal={setModal}
            handleDeleteExpense={handleDeleteExpense}
          />}

          {page === "calendar" && <CalendarPage />}

        </div>
      </main>

      {/* MODAL */}
      {modal.open && (
        <Modal onClose={()=>setModal({open:false,type:null,data:null})}>
          {modal.type === 'student' && (
            <StudentForm 
              modal={modal}
              saving={saving}
              onSubmit={saveStudent}
              onCancel={()=>setModal({open:false,type:null,data:null})}
            />
          )}

          {modal.type === 'payment' && (
            <PaymentForm 
              modal={modal}
              paymentSaving={paymentSaving}
              onSubmit={savePayment}
              onCancel={()=>setModal({open:false,type:null,data:null})}
            />
          )}

          {modal.type === 'expense' && (
            <ExpenseForm 
              modal={modal}
              expenseSaving={expenseSaving}
              expenseCategorySelect={expenseCategorySelect}
              setExpenseCategorySelect={setExpenseCategorySelect}
              expenseCategoryOther={expenseCategoryOther}
              onSubmit={saveExpense}
              onCancel={()=>setModal({open:false,type:null,data:null})}
            />
          )}


          {modal.type === 'view' && (
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <div className="flex-1 bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-bold mb-4">Ficha de Matrícula</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Nome do aluno</p>
                      <div className="border rounded-lg p-3 font-semibold">{modal.data?.name}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">CPF</p>
                      <div className="border rounded-lg p-3">{modal.data?.cpf}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Contato</p>
                      <div className="border rounded-lg p-3">{modal.data?.contact}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Curso</p>
                      <div className="border rounded-lg p-3">{modal.data?.course}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Professor</p>
                      <div className="border rounded-lg p-3">{modal.data?.teacher}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Mensalidade</p>
                      <div className="border rounded-lg p-3 font-semibold">R$ {Number(modal.data?.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Parcelas</p>
                      <div className="border rounded-lg p-3">{modal.data?.installments || 12}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Data de início</p>
                      <div className="border rounded-lg p-3">{modal.data?.startDate}</div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <div className="border rounded-lg p-3">{modal.data?.status}</div>
                    </div>
                  </div>
                </div>

                <div className="w-56 flex-shrink-0 text-center">
                  <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo" className="w-full mb-4 filter brightness-0" />
                  <div className="bg-white p-4 rounded-xl border">
                    <p className="text-xs text-slate-400">Mensalidade</p>
                    <p className="font-bold">R$ {Number(modal.data?.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                    <p className="text-xs text-slate-400 mt-2">Parcelas: {modal.data?.installments || 12}</p>
                  </div>
                </div>
              </div>

              {/* Full payments history */}
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-bold mb-3">Histórico de Pagamentos</h4>
                <p className="text-xs text-slate-400 mb-4">Listando todas as parcelas registradas para este aluno.</p>

                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs">#</th>
                      <th className="px-4 py-2 text-left text-xs">Vencimento</th>
                      <th className="px-4 py-2 text-left text-xs">Valor</th>
                      <th className="px-4 py-2 text-left text-xs">Status</th>
                      <th className="px-4 py-2 text-left text-xs">Mês/Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => p.studentId === modal.data?.id)
                      .sort((a,b)=> (a.year - b.year) || (a.installmentNum - b.installmentNum))
                      .map(p => (
                        <tr key={p.id} className="border-t">
                          <td className="px-4 py-2">{p.installmentNum}</td>
                          <td className="px-4 py-2">{p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="px-4 py-2">R$ {Number(p.valuePlanned||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : (new Date(p.dueDate) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">{p.month}/{p.year}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={printFicha} className="px-4 py-2 rounded bg-[#005DE4] text-white">Imprimir ficha</button>
                <button onClick={generateContract} className="px-4 py-2 rounded bg-amber-500 text-white">Gerar contrato</button>
                <button onClick={()=>setModal({open:false,type:null,data:null})} className="px-4 py-2 rounded bg-slate-100">Fechar</button>
              </div>
            </div>
          )}

        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#005DE4] text-white px-6 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

    </div>
  );
}


export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}