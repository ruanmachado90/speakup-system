import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from 'react-router-dom';
import {
  Users,
  LayoutDashboard,
  FileText,
  PieChart,
  PlusCircle,
  Printer,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  UserPlus,
  Menu,
  X,
  Sparkles
} from "lucide-react";

import { 
  Modal,
  Logo,
  Nav
} from './components';
import { StudentForm, PaymentForm, ExpenseForm, LeadForm } from './components/forms';
import { AppProvider } from './context';
import { 
  useStudentActions, 
  usePaymentActions, 
  useExpenseActions, 
  useLeadActions, 
  usePrintActions,
  usePage,
  useModal,
  useToast,
  useSearch,
  useFinanceFilters,
  useExpenseFilters,
  useDashboardRange,
  useStudents,
  usePayments,
  useExpenses,
  useLeads,
  useDashboardStats,
  useFinanceData,
  useExpenseData,
  useSaving,
  usePaymentSaving,
  useExpenseSaving,
  useUser
} from './hooks';

// Lazy loading de páginas para melhor performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Finance = lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Leads = lazy(() => import('./pages/Leads').then(m => ({ default: m.Leads })));
const AIManager = lazy(() => import('./pages/AIManager'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const ContratoAssinatura = lazy(() => import('./pages/ContratoAssinatura'));
const Vendas = lazy(() => import('./pages').then(m => ({ default: m.Vendas })));
const VendasSimple = lazy(() => import('./pages/VendasSimple'));
const Recibo = lazy(() => import('./pages/Recibo'));
const PaymentLink = lazy(() => import('./pages/PaymentLink'));
const AgendaGoogle = lazy(() => import('./pages/Agenda'));
const Turmas = lazy(() => import('./pages/Turmas'));

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Componente de loading para Suspense
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '400px',
    color: '#005DE4',
    fontSize: '14px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '3px solid #e2e8f0',
        borderTopColor: '#005DE4',
        borderRadius: '50%',
        margin: '0 auto 12px',
        animation: 'spin 0.8s linear infinite'
      }} />
      Carregando...
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function AppContent() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Ajustar sidebar baseado no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Executar na montagem
    handleResize();
    
    // Escutar mudanças de tamanho
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  /* ================= CONTEXT (usando hooks seletores para performance) ================= */
  const { page, setPage } = usePage();
  const { modal, setModal } = useModal();
  const { toast, toastMsg } = useToast();
  const { searchTerm, setSearchTerm } = useSearch();
  const { filterMonth, setFilterMonth, filterYear, setFilterYear, filterStatus, setFilterStatus } = useFinanceFilters();
  const { dashboardRange, setDashboardRange } = useDashboardRange();
  const { 
    expenseMonth, 
    setExpenseMonth, 
    expenseYear, 
    setExpenseYear, 
    expenseView, 
    setExpenseView,
    expenseCategorySelect,
    setExpenseCategorySelect,
    expenseCategoryOther
  } = useExpenseFilters();
  const { saving, setSaving } = useSaving();
  const { paymentSaving } = usePaymentSaving();
  const { expenseSaving } = useExpenseSaving();
  const user = useUser();
  const students = useStudents();
  const payments = usePayments();
  const expenses = useExpenses();
  const leads = useLeads();
  const { stats, teacherStats, filteredExpenses, monthlyData } = useDashboardStats();
  const { financeStats, filteredPayments } = useFinanceData();
  const { filteredExpensesData, expenseEvolutionData } = useExpenseData();

  /* ================= ACTIONS ================= */
  const { saveStudent, handleCancelEnrollment, handleDeleteStudent, handleExcelUpload } = useStudentActions(user, modal, toastMsg, setModal, setSaving);
  const { savePayment, handleUndoPayment } = usePaymentActions(modal, toastMsg, setModal, setSaving);
  const { saveExpense, handleDeleteExpense } = useExpenseActions(user, modal, toastMsg, setModal, setSaving);
  const { saveLead } = useLeadActions(user, modal, toastMsg, setModal, setSaving);
  const { printDashboard, printFicha } = usePrintActions(dashboardRange, stats, monthlyData, teacherStats, filteredExpenses, modal, payments);

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
      <aside className={`w-64 bg-[#005DE4] text-white fixed h-full p-6 transition-transform duration-300 ease-in-out z-20 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } shadow-2xl`}>
        <Logo />
        <Nav icon={<LayoutDashboard />} label="Dashboard" active={page==="dashboard"} onClick={()=>setPage("dashboard")} />
        <Nav icon={<Users />} label="Alunos" active={page==="students"} onClick={()=>setPage("students")} />
        <Nav icon={<UserPlus />} label="Leads" active={page==="leads"} onClick={()=>setPage("leads")} />
        <Nav icon={<FileText />} label="Financeiro" active={page==="finance"} onClick={()=>setPage("finance")} />
        <Nav icon={<PieChart />} label="Despesas" active={page==="expenses"} onClick={()=>setPage("expenses")} />
        <Nav icon={<Sparkles />} label="IA Gerencial" active={page==="ia"} onClick={()=>setPage("ia")} />
        <Nav icon={<Calendar />} label="Calendário" active={page==="calendar"} onClick={()=>setPage("calendar")} />
        <Nav icon={<ClipboardCheck />} label="Agenda" active={page==="agenda"} onClick={()=>setPage("agenda")} />
        <Nav icon={<Users />} label="Turmas" active={page==="turmas"} onClick={()=>setPage("turmas")} />
        <Nav icon={<FileText />} label="Vendas" active={page==="vendas"} onClick={()=>setPage("vendas")} />
        {/* <Nav icon={<PieChart />} label="Pedagógico" active={page==="pedagogico"} onClick={()=>setPage("pedagogico")} /> */}
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>

        {/* HEADER */}
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
              aria-label="Toggle menu"
              title={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          <h1 className="font-black text-xl uppercase">
            {page === "dashboard" && "Painel de Controle"}
            {page === "students" && "Gestão de Alunos"}
            {page === "leads" && "Leads"}
            {page === "finance" && "Financeiro"}
            {page === "expenses" && "Despesas"}
            {page === "ia" && "IA Gerencial"}
            {page === "calendar" && "Calendário"}
            {page === "turmas" && "Turmas"}
            {/* {page === "pedagogico" && "PEDAGÓGICO"} */}
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
          <Suspense fallback={<PageLoader />}>
            {page === "dashboard" && <Dashboard 
              dashboardRange={dashboardRange}
              setDashboardRange={setDashboardRange}
              printDashboard={printDashboard}
              stats={stats}
              monthlyData={monthlyData}
              teacherStats={teacherStats}
              filteredExpenses={filteredExpenses}
              students={students}
              payments={payments}
            />}

            {page === "students" && <Students 
              students={students}
              payments={payments}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setModal={setModal}
              handleCancelEnrollment={handleCancelEnrollment}
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
              handleUndoPayment={handleUndoPayment}
            />}

            {page === "ia" && <AIManager
              students={students}
              payments={payments}
              expenses={expenses}
              leads={leads}
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

            {page === "leads" && <Leads setModal={setModal} leads={leads} />}

            {page === "calendar" && <CalendarPage />}

            {page === "agenda" && <AgendaGoogle />}

            {page === "turmas" && <Turmas students={students} />}

            {page === "vendas" && <Vendas />}
            {/* {page === "pedagogico" && <Pedagogico />} */}
          </Suspense>
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

          {modal.type === 'edit-payment' && (
            <PaymentForm 
              modal={modal}
              paymentSaving={paymentSaving}
              onSubmit={savePayment}
              onCancel={()=>setModal({open:false,type:null,data:null})}
              isEdit={true}
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

          {modal.type === 'lead' && (
            <LeadForm 
              modal={modal}
              saving={saving}
              onSubmit={saveLead}
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
                  <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-preto.png" alt="Logo" className="w-full mb-4" />
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
                <button
                  onClick={() => {
                    if (modal.data?.id) {
                      navigate(`/contrato/${modal.data.id}`);
                    } else {
                      alert('ID do aluno não encontrado.');
                    }
                  }}
                  className="px-4 py-2 rounded bg-amber-500 text-white"
                >
                  Gerar contrato
                </button>
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
      <Router>
        <Routes>
          <Route path="/contrato/:id" element={<ContratoAssinatura />} />
          <Route path="/recibo/:id" element={<Recibo />} />
          <Route path="/pagamento/:paymentId" element={<PaymentLink />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}