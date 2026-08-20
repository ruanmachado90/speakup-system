import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { APP_ID } from './utils/constants';
import { formatDate } from './utils/formatters';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import {
  Users,
  LayoutDashboard,
  FileText,
  PieChart,
  PlusCircle,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  UserPlus,
  Menu,
  Sparkles,
  MessageSquare,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen
} from "lucide-react";

import {
  Modal,
  Logo,
  Nav
} from './components';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { StudentForm, PaymentForm, EditDueDateForm, NovaCobrancaForm, ExpenseForm, LeadForm } from './components/forms';
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
  useUser,
  useProfessoresData
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
const Vendas = lazy(() => import('./pages/Vendas'));
const VendasSimple = lazy(() => import('./pages/VendasSimple'));
const Recibo = lazy(() => import('./pages/Recibo'));
const PaymentLink = lazy(() => import('./pages/PaymentLink'));
const AgendaGoogle = lazy(() => import('./pages/Agenda'));
const Turmas = lazy(() => import('./pages/Turmas'));
const ProfessorDashboard = lazy(() => import('./pages/ProfessorDashboard'));
const ProfessorHome = lazy(() => import('./pages/ProfessorHome'));
const ConteudoFrequenciaPage = lazy(() => import('./pages/ConteudoFrequenciaPage'));
const NotasParciais = lazy(() => import('./pages/NotasParciais'));
const RelatorioNotas = lazy(() => import('./pages/RelatorioNotas'));
const TarefasPage = lazy(() => import('./pages/TarefasPage'));
const AvisosPage = lazy(() => import('./pages/AvisosPage'));
const ProfessorWikiPage = lazy(() => import('./pages/ProfessorWikiPage'));
const HistoricoPage = lazy(() => import('./pages/HistoricoPage'));
const Notas = lazy(() => import('./pages/Notas'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfessorLoginPage = lazy(() => import('./pages/ProfessorLoginPage'));
const Recados = lazy(() => import('./pages/Recados').then(m => ({ default: m.Recados })));
const AulasAdmin = lazy(() => import('./pages/AulasAdmin'));
const Registro = lazy(() => import('./pages/Registro'));

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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

// ── Guard: admin ou secretaria ───────────────────────────────────────────
function RequireAdminAuth({ children }) {
  const { user, role, loading } = useAuthContext();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user || !['admin', 'secretaria'].includes(role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// ── Guard: professor (ou admin/secretaria para suporte) ───────────────────
function RequireProfessorAuth({ children }) {
  const { user, role, loading } = useAuthContext();
  const { professorSlug } = useParams();

  if (loading) return <PageLoader />;
  if (!user || !['professor', 'admin', 'secretaria'].includes(role)) {
    if (professorSlug) localStorage.setItem('pendingProfessorSlug', professorSlug);
    return <Navigate to="/professor-login" replace />;
  }
  return children;
}

function AppContent() {
  const navigate = useNavigate();
  const { user: authUser, role } = useAuthContext();
  const [sidebarMode, setSidebarMode] = useState('open'); // 'open' | 'mini' | 'closed'
  const [recadosNaoLidos, setRecadosNaoLidos] = useState(0);
  const [modalContratoStatus, setModalContratoStatus] = useState(null); // null | 'loading' | { assinado, ... }

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

  // Busca status do contrato quando modal de aluno abre
  useEffect(() => {
    if (modal?.type === 'view' && modal?.data?.id) {
      setModalContratoStatus('loading');
      getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'contratos', modal.data.id))
        .then(snap => {
          if (snap.exists()) {
            setModalContratoStatus({ assinado: true, ...snap.data() });
          } else {
            setModalContratoStatus({ assinado: false, enviadoEm: modal.data.contratoEnviadoEm || null });
          }
        })
        .catch(() => setModalContratoStatus({ assinado: false, enviadoEm: null }));
    } else {
      setModalContratoStatus(null);
    }
  }, [modal?.type, modal?.data?.id]);
  
  // Listener em tempo real para recados não lidos
  useEffect(() => {
    const q = query(collection(db, 'recados'), where('lido', '==', false));
    const unsub = onSnapshot(q, snap => setRecadosNaoLidos(snap.size));
    return unsub;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarMode('closed');
      } else {
        setSidebarMode(prev => prev === 'closed' ? 'open' : prev);
      }
    };
    
    // Executar na montagem
    handleResize();
    
    // Escutar mudanças de tamanho
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { saving, setSaving } = useSaving();
  const { paymentSaving } = usePaymentSaving();
  const { expenseSaving } = useExpenseSaving();
  const user = useUser();
  const students = useStudents();
  const payments = usePayments();
  const expenses = useExpenses();
  const leads = useLeads();
  const professores = useProfessoresData();
  const { stats, teacherStats, filteredExpenses, monthlyData } = useDashboardStats();
  const { financeStats, filteredPayments } = useFinanceData();
  const { filteredExpensesData, expenseEvolutionData } = useExpenseData();

  /* ================= ACTIONS ================= */
  const { saveStudent, handleCancelEnrollment, handleReactivateEnrollment, handleDeleteStudent, handleExcelUpload } = useStudentActions(user, modal, toastMsg, setModal, setSaving);
  const { savePayment, handleEditDueDate, handleAddPayment, handleUndoPayment } = usePaymentActions(modal, toastMsg, setModal, setSaving);
  const { saveExpense, handleDeleteExpense } = useExpenseActions(user, modal, toastMsg, setModal, setSaving);
  const { saveLead } = useLeadActions(user, modal, toastMsg, setModal, setSaving);
  const { printDashboard, printFicha } = usePrintActions(dashboardRange, stats, monthlyData, teacherStats, filteredExpenses, modal, payments, professores);
  const nomeProfessorModal = professores.find((p) => p.id === modal.data?.professorId)?.nome || modal.data?.teacher;

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
      <aside className={`bg-white border-r border-slate-200 fixed h-full flex flex-col transition-all duration-300 ease-in-out z-20 shadow-lg ${
        sidebarMode === 'open' ? 'w-60 translate-x-0' :
        sidebarMode === 'mini' ? 'w-16 translate-x-0' :
        'w-60 -translate-x-full'
      }`}>
        <Logo collapsed={sidebarMode === 'mini'} />

        {/* Nav items — scrollável */}
        <nav className={`sidebar-nav flex-1 overflow-y-auto py-3 space-y-0.5 ${sidebarMode === 'mini' ? 'px-1' : 'px-3'}`}>
          {/* Dashboard */}
          <Nav collapsed={sidebarMode === 'mini'} icon={<LayoutDashboard size={16} />} label="Dashboard" active={page==="dashboard"} onClick={()=>setPage("dashboard")} />

          {/* PEDAGÓGICO */}
          <Nav collapsed={sidebarMode === 'mini'} icon={<Users size={16} />} label="Alunos" active={page==="students"} onClick={()=>setPage("students")} />
          <Nav collapsed={sidebarMode === 'mini'} icon={<Users size={16} />} label="Turmas" active={page==="turmas"} onClick={()=>setPage("turmas")} />
          {role === 'admin' && (
            <Nav collapsed={sidebarMode === 'mini'} icon={<BookOpen size={16} />} label="Aulas" active={page==="aulas"} onClick={()=>setPage("aulas")} />
          )}
          {(role === 'admin' || role === 'secretaria') && (
            <Nav collapsed={sidebarMode === 'mini'} icon={<ClipboardCheck size={16} />} label="Agenda" active={page==="agenda"} onClick={()=>setPage("agenda")} />
          )}
          {role === 'admin' && (
            <Nav collapsed={sidebarMode === 'mini'} icon={<Calendar size={16} />} label="Calendário" active={page==="calendar"} onClick={()=>setPage("calendar")} />
          )}

          {/* COMERCIAL */}
          <Nav collapsed={sidebarMode === 'mini'} icon={<UserPlus size={16} />} label="Leads" active={page==="leads"} onClick={()=>setPage("leads")} />
          <Nav collapsed={sidebarMode === 'mini'} icon={<FileText size={16} />} label="Vendas" active={page==="vendas"} onClick={()=>setPage("vendas")} />

          {/* FINANCEIRO */}
          <Nav collapsed={sidebarMode === 'mini'} icon={<FileText size={16} />} label="Financeiro" active={page==="finance"} onClick={()=>setPage("finance")} />
          <Nav collapsed={sidebarMode === 'mini'} icon={<PieChart size={16} />} label="Despesas" active={page==="expenses"} onClick={()=>setPage("expenses")} />

          {/* GESTÃO (Admin only) */}
          {role === 'admin' && (
            <>
              <Nav collapsed={sidebarMode === 'mini'} icon={<Users size={16} />} label="Professores" active={page==="professores"} onClick={()=>setPage("professores")} />
              <Nav
                collapsed={sidebarMode === 'mini'}
                icon={
                  <span className="relative">
                    <MessageSquare size={16} />
                    {recadosNaoLidos > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full leading-none">
                        {recadosNaoLidos > 9 ? '9+' : recadosNaoLidos}
                      </span>
                    )}
                  </span>
                }
                label="Recados"
                active={page==="recados"}
                onClick={()=>setPage("recados")}
              />
              <Nav collapsed={sidebarMode === 'mini'} icon={<Sparkles size={16} />} label="IA Gerencial" active={page==="ia"} onClick={()=>setPage("ia")} />
            </>
          )}
        </nav>

        {/* Usuário logado na parte inferior da sidebar */}
        <div className="flex-shrink-0 border-t border-slate-100 py-3">
          {sidebarMode === 'mini' ? (
            <div className="flex justify-center">
              {authUser?.photoURL ? (
                <img src={authUser.photoURL} alt="" title={authUser?.displayName || authUser?.email} className="w-8 h-8 rounded-full border-2 border-slate-200 cursor-pointer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#005DE4]/10 flex items-center justify-center text-sm font-bold text-[#005DE4] cursor-pointer" title={authUser?.displayName || authUser?.email}>
                  {(authUser?.displayName || authUser?.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4">
              <div className="flex items-center gap-2.5 mb-2">
                {authUser?.photoURL ? (
                  <img src={authUser.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-slate-200 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#005DE4]/10 flex items-center justify-center text-sm font-bold text-[#005DE4] flex-shrink-0">
                    {(authUser?.displayName || authUser?.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{authUser?.displayName || authUser?.email}</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5 capitalize">
                    {role === 'admin' ? 'Administrador' : role === 'secretaria' ? 'Secretaria' : role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut(auth).then(() => navigate('/login'))}
                className="w-full text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-left"
              >
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay para mobile */}
      {sidebarMode === 'open' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarMode('closed')}
          aria-hidden="true"
        />
      )}

      {/* MAIN */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        sidebarMode === 'open' ? 'ml-60' :
        sidebarMode === 'mini' ? 'ml-16' :
        'ml-0'
      }`}>

        {/* HEADER */}
        <header className="bg-white border-b px-6 py-3.5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarMode(prev => prev === 'open' ? 'closed' : 'open');
                } else {
                  setSidebarMode(prev => prev === 'open' ? 'mini' : 'open');
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-slate-800 text-base">
              {page === "dashboard" && "Painel de controle"}
              {page === "students" && "Gestão de alunos"}
              {page === "leads" && "Leads"}
              {page === "finance" && "Financeiro"}
              {page === "expenses" && "Despesas"}
              {page === "ia" && "IA Gerencial"}
              {page === "calendar" && "Calendário"}
              {page === "turmas" && "Turmas"}
              {page === "agenda" && "Agenda"}
              {page === "vendas" && "Vendas"}
              {page === "recados" && "Recados"}
              {page === "professores" && "Professores"}
              {page === "aulas" && "Registro de Aulas"}
            </h1>
          </div>

          <div className="flex gap-2 items-center">
            {page !== "dashboard" && (
              <button
                onClick={() => setModal({ open: true, type: page === 'expenses' ? 'expense' : 'student' })}
                className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-semibold text-sm flex gap-2 items-center hover:bg-[#0041a8] transition-colors"
              >
                <PlusCircle size={15}/> Novo
              </button>
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
              professores={professores}
              role={role}
            />}

            {page === "students" && <Students
              students={students}
              payments={payments}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setModal={setModal}
              handleCancelEnrollment={handleCancelEnrollment}
              handleReactivateEnrollment={handleReactivateEnrollment}
              handleDeleteStudent={handleDeleteStudent}
              handleExcelUpload={handleExcelUpload}
              dashboardRange={dashboardRange}
            />}

            {page === "finance" && <Finance 
              students={students}
              payments={payments}
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

            {page === "ia" && (
              role === 'admin'
                ? <AIManager
                    students={students}
                    payments={payments}
                    expenses={expenses}
                    leads={leads}
                    filterMonth={filterMonth}
                    filterYear={filterYear}
                  />
                : <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Sparkles size={40} className="mb-3 opacity-30" />
                    <p className="font-medium">Acesso restrito ao administrador</p>
                  </div>
            )}

            {page === "expenses" && <Expenses 
              expenseView={expenseView}
              setExpenseView={setExpenseView}
              expenseMonth={expenseMonth}
              setExpenseMonth={setExpenseMonth}
              expenseYear={expenseYear}
              setExpenseYear={setExpenseYear}
              expenses={expenses}
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
            {page === "recados" && <Recados />}
            {page === "professores" && role === 'admin' && <ProfessoresAdmin />}
            {page === "aulas" && role === 'admin' && <AulasAdmin />}
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

          {modal.type === 'edit-due-date' && (
            <EditDueDateForm
              modal={modal}
              saving={paymentSaving}
              onSubmit={handleEditDueDate}
              onCancel={()=>setModal({open:false,type:null,data:null})}
            />
          )}

          {modal.type === 'new-charge' && (
            <NovaCobrancaForm
              students={students}
              saving={paymentSaving}
              onSubmit={handleAddPayment}
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
                      <div className="border rounded-lg p-3">{nomeProfessorModal}</div>
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

                    <div className="col-span-3">
                      <p className="text-xs text-slate-500 mb-1">Turma</p>
                      {modal.data?.turmaInfo ? (
                        <div className="border rounded-lg p-3 flex items-center justify-between bg-[#f0f2f7]">
                          <div>
                            <span className="font-semibold text-[#0e48fe]">{modal.data.turmaInfo.nome || modal.data.turmaInfo.name || '—'}</span>
                            {modal.data.turmaInfo.professor && (
                              <span className="text-xs text-slate-400 ml-2">• Prof. {modal.data.turmaInfo.professor}</span>
                            )}
                            {modal.data.turmaInfo.horario && (
                              <span className="text-xs text-slate-400 ml-2">• {modal.data.turmaInfo.horario}</span>
                            )}
                          </div>
                          <button
                            onClick={() => { setModal({open:false,type:null,data:null}); setPage('turmas'); }}
                            className="text-xs text-[#0e48fe] hover:underline font-semibold ml-4 flex-shrink-0"
                          >
                            Ver turma →
                          </button>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-3 text-slate-400 text-xs">Nenhuma turma atribuída</div>
                      )}
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
                          <td className="px-4 py-2">{p.dueDate ? formatDate(p.dueDate) : '-'}</td>
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

              <div className="flex justify-end gap-2 items-center flex-wrap">
                {/* Badge status do contrato */}
                {modalContratoStatus === 'loading' && (
                  <span className="text-xs text-slate-400 mr-auto">Verificando contrato...</span>
                )}
                {modalContratoStatus && modalContratoStatus !== 'loading' && (
                  <span className={`mr-auto text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    modalContratoStatus.assinado
                      ? 'bg-emerald-100 text-emerald-700'
                      : modalContratoStatus.enviadoEm
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {modalContratoStatus.assinado ? (
                      <>✓ Contrato assinado em {modalContratoStatus.timestamp} por {modalContratoStatus.nome}</>
                    ) : modalContratoStatus.enviadoEm ? (
                      <>⏳ Link enviado em {new Date(modalContratoStatus.enviadoEm).toLocaleDateString('pt-BR')} — aguardando assinatura</>
                    ) : (
                      <>— Contrato não enviado</>
                    )}
                  </span>
                )}
                <button onClick={printFicha} className="px-4 py-2 rounded bg-[#005DE4] text-white">Imprimir ficha</button>
                <button
                  onClick={async () => {
                    if (modal.data?.id) {
                      const link = `${window.location.origin}/contrato/${modal.data.id}`;
                      navigator.clipboard.writeText(link).then(() => toastMsg('Link do contrato copiado!'));
                      const enviadoEm = new Date().toISOString();
                      try {
                        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'students', modal.data.id), { contratoEnviadoEm: enviadoEm });
                        setModalContratoStatus(prev => prev?.assinado ? prev : { assinado: false, enviadoEm });
                      } catch (e) {
                        console.error('[App] Erro ao registrar envio do contrato:', e);
                        toastMsg('Erro ao salvar data de envio do contrato.');
                      }
                    }
                  }}
                  className="px-4 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Copiar link contrato
                </button>
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




// ── Gerenciamento de Professores (admin) ──────────────────────────────────────
import { getFunctions, httpsCallable } from 'firebase/functions';

function ProfessoresAdmin() {
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', slug: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUid, setResetUid] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { nome, email, senha }

  const fns = getFunctions();

  // Carrega professores do Firestore
  useEffect(() => {
    const qry = query(collection(db, 'users'), where('role', '==', 'professor'));
    const unsub = onSnapshot(qry, snap => {
      setProfessores(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.nome || !form.email || !form.slug || !form.senha) {
      setError('Preencha todos os campos.'); return;
    }
    if (form.senha.length < 6) { setError('Senha mínima: 6 caracteres.'); return; }
    setSaving(true);
    try {
      const fn = httpsCallable(fns, 'createProfessor');
      await fn({ nome: form.nome, email: form.email, slug: form.slug, password: form.senha });
      setCreatedCredentials({ nome: form.nome, email: form.email, senha: form.senha });
      setSuccess('');
      setForm({ nome: '', email: '', slug: '', senha: '' });
    } catch (err) {
      setError(err.message || 'Erro ao criar professor.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSenha = async (uid) => {
    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha mínima: 6 caracteres.'); return; }
    setResetSaving(true); setError('');
    try {
      const fn = httpsCallable(fns, 'updateProfessorPassword');
      await fn({ uid, password: novaSenha });
      setSuccess('Senha atualizada!');
      setResetUid(null); setNovaSenha('');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async (uid, nome) => {
    if (!window.confirm(`Remover professor ${nome}? Esta ação não pode ser desfeita.`)) return;
    setError('');
    try {
      const fn = httpsCallable(fns, 'deleteProfessor');
      await fn({ uid });
      setSuccess(`${nome} removido.`);
    } catch (err) {
      setError(err.message || 'Erro ao remover professor.');
    }
  };

  const [fixingCadastros, setFixingCadastros] = useState(false);
  const handleCorrigirCadastros = async () => {
    setFixingCadastros(true); setError(''); setSuccess('');
    try {
      const fn = httpsCallable(fns, 'backfillProfessorNomeKeys');
      const res = await fn();
      setSuccess(`Cadastros corrigidos: ${res.data.updated} professor(es) atualizados.`);
    } catch (err) {
      setError(err.message || 'Erro ao corrigir cadastros.');
    } finally {
      setFixingCadastros(false);
    }
  };

  // Auto-gerar slug a partir do nome
  const handleNomeChange = (e) => {
    const nome = e.target.value;
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, nome, slug }));
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <GraduationCap size={22} className="text-[#005DE4]" />
          <h2 className="text-xl font-bold text-slate-800">Gerenciar Professores</h2>
        </div>
        <button
          onClick={handleCorrigirCadastros}
          disabled={fixingCadastros}
          title="Corrige o cadastro de professores existentes para tolerar acentos/maiúsculas ao lançar conteúdo (execute uma vez após a atualização do sistema)"
          className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >{fixingCadastros ? 'Corrigindo...' : 'Corrigir cadastros (acentos)'}</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

      {/* Credenciais do professor recém-criado/atualizado */}
      {createdCredentials && (
        <div className="bg-blue-50 border border-[#005DE4]/30 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#005DE4] mb-2">✅ Conta de <span className="font-bold">{createdCredentials.nome}</span> pronta!</p>
              <p className="text-xs text-slate-600 mb-1">Passe estas credenciais para o professor:</p>
              <div className="mt-2 space-y-1 font-mono text-sm bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p><span className="text-slate-400 text-xs">E-mail:</span> <span className="text-slate-800 font-medium">{createdCredentials.email}</span></p>
                <p><span className="text-slate-400 text-xs">Senha:</span> <span className="text-slate-800 font-medium">{createdCredentials.senha}</span></p>
                <p><span className="text-slate-400 text-xs">Link:</span> <span className="text-slate-800 font-medium">{window.location.origin}/professor-login</span></p>
              </div>
            </div>
            <button
              onClick={() => {
                const txt = `Professor: ${createdCredentials.nome}\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.senha}\nAcesso: ${window.location.origin}/professor-login`;
                navigator.clipboard.writeText(txt);
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs border border-[#005DE4]/40 text-[#005DE4] rounded-lg hover:bg-[#005DE4]/10 transition-colors"
            >Copiar</button>
          </div>
          <button onClick={() => setCreatedCredentials(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600">Fechar</button>
        </div>
      )}

      {/* Formulário de criação */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-[#005DE4]" /> Novo Professor
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nome completo</label>
            <input
              value={form.nome}
              onChange={handleNomeChange}
              placeholder="Ex: Cecília Lima"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Slug (URL do painel)</label>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="Ex: cecilia-lima"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] font-mono"
            />
            {form.slug && <p className="text-xs text-slate-400 mt-1">/professor/{form.slug}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="professor@email.com"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Senha inicial</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              />
              <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#005DE4] text-white rounded-xl text-sm font-semibold hover:bg-[#0041a8] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de professores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Professores cadastrados</h3>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
        ) : professores.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Nenhum professor cadastrado ainda.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {professores.map(p => (
              <div key={p.uid} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#005DE4]/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={16} className="text-[#005DE4]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">{p.email} · <span className="font-mono">/professor/{p.slug}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setResetUid(resetUid === p.uid ? null : p.uid); setNovaSenha(''); setError(''); setSuccess(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:border-[#005DE4] hover:text-[#005DE4] transition-colors"
                      title="Redefinir senha"
                    >
                      <KeyRound size={13} /> Senha
                    </button>
                    <button
                      onClick={() => handleDelete(p.uid, p.nome)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover professor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Formulário de reset de senha inline */}
                {resetUid === p.uid && (
                  <div className="mt-3 flex items-center gap-3 pl-13">
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type={showNovaSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      />
                      <button type="button" onClick={() => setShowNovaSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                        {showNovaSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleResetSenha(p.uid)}
                      disabled={resetSaving}
                      className="px-4 py-2 bg-[#005DE4] text-white text-xs rounded-lg hover:bg-[#0041a8] disabled:opacity-50"
                    >
                      {resetSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setResetUid(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Páginas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/professor-login" element={<ProfessorLoginPage />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/contrato/:id" element={<ContratoAssinatura />} />
            <Route path="/recibo/:id" element={<Recibo />} />
            <Route path="/pagamento/:paymentId" element={<PaymentLink />} />
            <Route path="/notas/view/:turmaId/:semestre" element={<Notas readOnly={true} />} />

            {/* Rotas do professor (magic link) */}
            <Route path="/professor/dashboard" element={<Navigate to="/" replace />} />
            <Route
              path="/professor/:professorSlug/home"
              element={
                <RequireProfessorAuth>
                  <ProfessorHome />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/frequencia"
              element={
                <RequireProfessorAuth>
                  <ConteudoFrequenciaPage />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/notas"
              element={
                <RequireProfessorAuth>
                  <NotasParciais />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/avisos"
              element={
                <RequireProfessorAuth>
                  <AvisosPage />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/tarefas"
              element={
                <RequireProfessorAuth>
                  <TarefasPage />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/wiki"
              element={
                <RequireProfessorAuth>
                  <ProfessorWikiPage />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/historico"
              element={
                <RequireProfessorAuth>
                  <HistoricoPage />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug/relatorio-notas"
              element={
                <RequireProfessorAuth>
                  <RelatorioNotas />
                </RequireProfessorAuth>
              }
            />
            <Route
              path="/professor/:professorSlug"
              element={
                <RequireProfessorAuth>
                  <ProfessorDashboard />
                </RequireProfessorAuth>
              }
            />

            {/* Painel admin (Google Sign-In) */}
            <Route
              path="*"
              element={
                <RequireAdminAuth>
                  <AppProvider>
                    <AppContent />
                  </AppProvider>
                </RequireAdminAuth>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}