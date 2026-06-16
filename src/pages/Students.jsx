import { useState, useMemo, useEffect } from 'react';
import { Search, Edit, X, FileText, CheckSquare, Square, Trash2, ArrowUpDown, School, Printer, UserCheck, UserX, Users, FileCheck, FileClock, FileMinus, GraduationCap, Loader2, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import { db } from '../firebase';
import { doc, collection, getDoc, setDoc, getDocs, addDoc, onSnapshot, updateDoc, writeBatch, arrayUnion, query, where } from 'firebase/firestore';
import { Card, Table, KPI } from '../components';
import { APP_ID } from '../utils/constants';
import { formatDate } from '../utils/formatters';
import { CATEGORIAS, calcularMediaCategoria } from '../hooks/useNotas';
import { useUI } from '../context/UIContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FrequenciaAlunoModal from '../components/FrequenciaAlunoModal';
import { buildBoletimHTML } from '../utils/boletim';
import { ConfirmarMatriculaModal, ReativarMatriculaModal } from '../components/students/MatriculaModals';
import InserirEmTurmaModal from '../components/students/InserirEmTurmaModal';
import BoletimModal from '../components/students/BoletimModal';

export const Students = ({
  students,
  payments,
  searchTerm,
  setSearchTerm,
  setModal,
  handleCancelEnrollment,
  handleReactivateEnrollment,
  handleDeleteStudent,
  handleExcelUpload,
  dashboardRange
}) => {
  const { toastMsg } = useUI();
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [boletimAluno, setBoletimAluno] = useState(null);
  const [boletimData, setBoletimData] = useState({ turma: '', nivel: '', dia: '', horario: '' });
  const [loadingBoletim, setLoadingBoletim] = useState(false);
  const [generatingBoletimId, setGeneratingBoletimId] = useState(null);
  const [aulasData, setAulasData] = useState([]);
  const [contratosAssinados, setContratosAssinados] = useState({}); // { [studentId]: { nome, timestamp } }
  const [freqAluno, setFreqAluno] = useState(null); // { aluno, turma }
  const [reativarAluno, setReativarAluno] = useState(null); // student object
  const [savingReativar, setSavingReativar] = useState(false);
  const [preCadastros, setPreCadastros] = useState([]);
  const [confirmarMatricula, setConfirmarMatricula] = useState(null); // pre-cadastro object
  const [savingConfirmar, setSavingConfirmar] = useState(false);

  // Carregar aulas para cálculo de frequência
  useEffect(() => {
    getDocs(collection(db, 'aulas'))
      .then(snap => setAulasData(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch((err) => {
        console.error('[Students] Erro ao carregar aulas:', err);
        toastMsg('Erro ao carregar dados de frequência.');
      });
  }, []);

  // Pré-cadastros pendentes em tempo real
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'pre-cadastros'), where('status', '==', 'pendente')),
      snap => setPreCadastros(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const handleConfirmarMatricula = async (preCad, { fee, dueDate, installments }) => {
    setSavingConfirmar(true);
    try {
      const colStudents = collection(db, 'artifacts', APP_ID, 'public', 'data', 'students');
      const studentRef = await addDoc(colStudents, {
        name: preCad.nome, cpf: preCad.cpf || '',
        contact: preCad.celular || '', email: preCad.email || '',
        dataNascimento: preCad.dataNascimento || '', cep: preCad.cep || '',
        address: preCad.endereco || '',
        responsibleName: preCad.responsavelNome || '',
        responsibleContact: preCad.responsavelCelular || '',
        formaPagamento: preCad.formaPagamento || '',
        fee: Number(fee), dueDate, installments: Number(installments),
        status: 'ativo', source: 'pre-cadastro',
        preCadastroId: preCad.id, createdAt: Date.now(),
      });

      const batch = writeBatch(db);
      const start = new Date(dueDate + 'T00:00:00');
      const colPayments = collection(db, 'artifacts', APP_ID, 'public', 'data', 'payments');
      for (let i = 0; i < Number(installments); i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T00:00:00`;
        batch.set(doc(colPayments), {
          studentId: studentRef.id, studentName: preCad.nome,
          installmentNum: i + 1, valuePlanned: Number(fee),
          valuePaid: 0, status: 'Pendente',
          month: d.getMonth() + 1, year: d.getFullYear(), dueDate: iso,
        });
      }
      await batch.commit();

      await updateDoc(doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'pre-cadastros'), preCad.id), {
        status: 'convertido', convertidoEm: Date.now(), studentId: studentRef.id,
      });

      setConfirmarMatricula(null);
      toastMsg(`${preCad.nome} matriculado com sucesso!`);
    } catch (err) {
      console.error(err);
      toastMsg('Erro ao confirmar matrícula. Tente novamente.');
    } finally {
      setSavingConfirmar(false);
    }
  };

  // Carregar contratos assinados
  useEffect(() => {
    getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'contratos'))
      .then(snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data(); });
        setContratosAssinados(map);
      })
      .catch((err) => {
        console.error('[Students] Erro ao carregar contratos:', err);
        toastMsg('Erro ao carregar status dos contratos.');
      });
  }, []);
    // Carregar dados do boletim ao abrir modal
    useEffect(() => {
      if (boletimAluno) {
        setLoadingBoletim(true);
        const boletimRef = doc(collection(doc(db, 'students', boletimAluno.id), 'boletins'), 'ficha');
        getDoc(boletimRef).then((snap) => {
          if (snap.exists()) {
            setBoletimData(snap.data());
          } else {
            setBoletimData({ turma: '', nivel: '', dia: '', horario: '' });
          }
          setLoadingBoletim(false);
        });
      }
    }, [boletimAluno]);
    // Salvar dados do boletim
    const handleSaveBoletim = async () => {
      if (!boletimAluno) return;
      const boletimRef = doc(collection(doc(db, 'students', boletimAluno.id), 'boletins'), 'ficha');
      await setDoc(boletimRef, boletimData);
      toastMsg('Boletim salvo com sucesso!');
    };

  const gerarBoletim = async (student) => {
    const turmaInfo = alunoTurmaMap.get(student.id);
    const turmaId = turmaInfo?.id;
    const anoAtual = new Date().getFullYear();
    setGeneratingBoletimId(student.id);
    try {
      const semestres = [`${anoAtual}-1`, `${anoAtual}-2`];
      const dadosSems = await Promise.all(semestres.map(async (sem) => {
        if (!turmaId) return { avaliacoes: [], scores: {} };
        const [avSnap, gSnap] = await Promise.all([
          getDocs(query(collection(db, 'avaliacoes'), where('turmaId', '==', turmaId), where('semestre', '==', sem))),
          getDocs(query(collection(db, 'grades'), where('turmaId', '==', turmaId), where('semestre', '==', sem))),
        ]);
        const avaliacoes = avSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        const gradeDoc = gSnap.docs.find(d => d.data().studentId === student.id);
        const scores = gradeDoc ? (gradeDoc.data().scores || {}) : {};
        return { avaliacoes, scores };
      }));
      const notasPorSem = dadosSems.map(({ avaliacoes, scores }) =>
        CATEGORIAS.map(cat => {
          const avsCat = avaliacoes.filter(a => a.tipo === cat.tipo);
          const nota = calcularMediaCategoria(avsCat, scores, cat.max);
          return { nota };
        })
      );
      const sum = (semIdx) => notasPorSem[semIdx].reduce((s, n) => s + (n.nota ?? 0), 0);
      const has = (semIdx) => notasPorSem[semIdx].some(n => n.nota != null);
      const total1 = has(0) ? sum(0) : null;
      const total2 = has(1) ? sum(1) : null;
      const totalFinal = total1 != null && total2 != null
        ? Math.round((total1 + total2) / 2)
        : total1 ?? total2 ?? null;
      const win = window.open('', '_blank');
      win.document.write(buildBoletimHTML({ student, turmaInfo, notas: notasPorSem, total1, total2, totalFinal, anoAtual }));
      win.document.close();
    } finally {
      setGeneratingBoletimId(null);
    }
  };
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ativo', 'cancelado', 'sem-turma'
  const [contratoFilter, setContratoFilter] = useState('all'); // 'all', 'assinado', 'pendente'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
  const [teacherFilter, setTeacherFilter] = useState('all'); // 'all' ou nome do professor

  // â”€â”€ Turmas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [turmas, setTurmas] = useState([]);
  const [inserirModal, setInserirModal] = useState(null); // aluno selecionado
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [inserindo, setInserindo] = useState(false);
  const [filtroTurmaProf, setFiltroTurmaProf] = useState('');
  const [filtroTurmaDia, setFiltroTurmaDia] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'turmas'), snap => {
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Set com todos os studentIds que já estão em alguma turma
  const alunosEmTurma = useMemo(() => {
    const ids = new Set();
    turmas.forEach(t => (t.alunosIds || []).forEach(id => ids.add(id)));
    return ids;
  }, [turmas]);

  // Map studentId -> turma para exibição
  const alunoTurmaMap = useMemo(() => {
    const map = new Map();
    turmas.forEach(t => {
      (t.alunosIds || []).forEach(id => {
        if (!map.has(id)) map.set(id, t);
      });
    });
    return map;
  }, [turmas]);

  const handleInserirEmTurma = async () => {
    if (!inserirModal || !turmaSelecionada) return;
    setInserindo(true);
    try {
      const turmaRef = doc(db, 'turmas', turmaSelecionada);
      const turma = turmas.find(t => t.id === turmaSelecionada);
      const novosIds = Array.from(new Set([...(turma?.alunosIds || []), inserirModal.id]));
      await updateDoc(turmaRef, {
        alunosIds: novosIds,
        alunosCount: novosIds.length,
      });
      setInserirModal(null);
      setTurmaSelecionada('');
    } finally {
      setInserindo(false);
    }
  };

  // Função para imprimir lista de alunos ativos
  const printActiveStudents = () => {
    const activeStudentsList = filteredStudents.filter(s => s.status !== 'cancelado');
    
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lista de Alunos Ativos - SpeakUp</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #005DE4; padding-bottom: 15px; }
          .logo { font-size: 18px; font-weight: bold; color: #005DE4; margin-bottom: 5px; }
          .subtitle { color: #64748b; font-size: 10px; }
          .stats { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; background: #f8fafc; padding: 10px; border-radius: 6px; }
          .stat { text-align: center; }
          .stat-value { font-size: 16px; font-weight: bold; color: #005DE4; }
          .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 10px; }
          th { background: #005DE4; color: white; font-weight: bold; }
          tr:nth-child(even) { background: #f8fafc; }
          .student-name { font-weight: bold; color: #1e293b; }
          .responsible { color: #64748b; }
          .mensalidade { font-weight: 600; color: #059669; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #64748b; }
          @media print { 
            body { padding: 10px; font-size: 10px; } 
            th, td { padding: 4px 6px; font-size: 9px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SpeakUp English Language Academy</div>
          <div class="subtitle">Lista de Alunos Ativos</div>
          <div class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${activeStudentsList.length}</div>
            <div class="stat-label">Alunos Ativos</div>
          </div>
          <div class="stat">
            <div class="stat-value">${teacherFilter !== 'all' ? `Filtro: ${teacherFilter}` : 'Todos'}</div>
            <div class="stat-label">Filtro Aplicado</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Nome do Aluno</th>
              <th style="width: 35%">Responsável</th>
              <th style="width: 25%">Mensalidade</th>
            </tr>
          </thead>
          <tbody>
            ${activeStudentsList.map(student => `
              <tr>
                <td class="student-name">${student.name || '-'}</td>
                <td class="responsible">${student.responsibleName || '-'}</td>
                <td class="mensalidade">R$ ${Number(student.monthlyFee || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>SpeakUp English Language Academy - Cataguases/MG</p>
          <p>Total de ${activeStudentsList.length} alunos ativos listados</p>
        </div>

        <script>
          window.onload = function(){ window.print(); setTimeout(()=>window.close(), 200); };
        </script>
      </body>
      </html>`;
    
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  const activeStudents = students.filter(s => s.status !== 'cancelado').length;
  const inactiveStudents = students.filter(s => s.status === 'cancelado').length;
  const pendingCount = preCadastros.length;

  // Lista de professores únicos
  const teachers = useMemo(() => {
    const uniqueTeachers = [...new Set(students.map(s => s.teacher).filter(Boolean))];
    return uniqueTeachers.sort();
  }, [students]);

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAll = () => {
    const filteredStudents = students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    const ok = await requestConfirm({
      title: 'Excluir alunos',
      message: `Excluir ${selectedStudents.length} aluno(s) selecionado(s)? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    selectedStudents.forEach(id => handleDeleteStudent(id));
    setSelectedStudents([]);
  };

  const handleBulkPayment = () => {
    if (selectedStudents.length === 0) return;
    setModal({ open: true, type: 'bulk-payment', data: { studentIds: selectedStudents } });
  };

  const handleBulkCancel = async () => {
    if (selectedStudents.length === 0) return;
    const ok = await requestConfirm({
      title: 'Cancelar matrículas',
      message: `Cancelar matrícula de ${selectedStudents.length} aluno(s) selecionado(s)?`,
      confirmLabel: 'Cancelar matrículas',
      variant: 'danger',
    });
    if (!ok) return;
    selectedStudents.forEach(id => handleCancelEnrollment(id));
    setSelectedStudents([]);
  };

  const semTurmaCount = useMemo(() =>
    students.filter(s => s.status !== 'cancelado' && !alunosEmTurma.has(s.id)).length,
    [students, alunosEmTurma]
  );

  const contratoPendenteCount = useMemo(() =>
    students.filter(s => s.status !== 'cancelado' && !contratosAssinados[s.id]).length,
    [students, contratosAssinados]
  );

  const contratoAssinadoCount = useMemo(() =>
    students.filter(s => s.status !== 'cancelado' && contratosAssinados[s.id]).length,
    [students, contratosAssinados]
  );

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const preCadItems = preCadastros
      .filter(p => !q || p.nome?.toLowerCase().includes(q) || p.celular?.includes(q))
      .filter(() => statusFilter === 'all' || statusFilter === 'aguardando')
      .map(p => ({ ...p, _isPreCad: true, name: p.nome }));

    const studentItems = students
      .filter(s => {
        const nome = (s.name || '').toLowerCase();
        const resp = (s.responsibleName || '').toLowerCase();
        return !q || nome.includes(q) || resp.includes(q);
      })
      .filter(s => {
        if (statusFilter === 'aguardando') return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'ativo') return s.status !== 'cancelado';
        if (statusFilter === 'cancelado') return s.status === 'cancelado';
        if (statusFilter === 'sem-turma') return s.status !== 'cancelado' && !alunosEmTurma.has(s.id);
        return true;
      })
      .filter(s => {
        if (contratoFilter === 'all') return true;
        if (contratoFilter === 'assinado') return !!contratosAssinados[s.id];
        if (contratoFilter === 'pendente') return s.status !== 'cancelado' && !contratosAssinados[s.id];
        return true;
      })
      .filter(s => teacherFilter === 'all' || s.teacher === teacherFilter)
      .sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });

    return [...preCadItems, ...studentItems];
  }, [students, preCadastros, searchTerm, statusFilter, contratoFilter, teacherFilter, sortOrder, alunosEmTurma, contratosAssinados]);

  // Calcular estatísticas do professor baseado em pagamentos do período (igual ao Dashboard)
  const teacherFilteredStats = useMemo(() => {
    if (teacherFilter === 'all') return { count: 0, revenue: 0 };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Criar Map de alunos ativos para lookup rápido
    const activeStudentsMap = new Map();
    students.forEach(s => {
      const status = s.status || 'ativo';
      if (status === 'ativo') {
        activeStudentsMap.set(s.id, s);
      }
    });

    const studentsSet = new Set();
    let revenue = 0;

    payments.forEach(payment => {
      if (!payment.dueDate || !payment.studentId) return;

      const dueDate = new Date(payment.dueDate);
      const isInPeriod = dashboardRange === 'month'
        ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
        : dueDate.getFullYear() === currentYear;

      if (!isInPeriod) return;

      // Buscar aluno e verificar se está ativo
      const student = activeStudentsMap.get(payment.studentId);
      if (!student) return;

      // Verificar se é do professor filtrado
      if (student.teacher !== teacherFilter) return;

      studentsSet.add(payment.studentId);
      revenue += Number(payment.valuePlanned || 0);
    });

    return { count: studentsSet.size, revenue };
  }, [students, payments, teacherFilter, dashboardRange]);

  return (
    <>
      <div className={`grid gap-4 mb-4 ${pendingCount > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <KPI label="ATIVO" value={activeStudents} format="number" accent="blue" />
        <KPI label="INATIVO" value={inactiveStudents} format="number" accent="red" />
        {pendingCount > 0 && <KPI label="AGUARDANDO" value={pendingCount} format="number" accent="blue" />}
      </div>

      {/* Card de estatísticas do professor quando filtro é aplicado */}
      {teacherFilter !== 'all' && (
        <Card className="mb-4">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="p-3 bg-[#005DE4] rounded-full">
              <School size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Professor(a) - {dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</h3>
              <p className="text-2xl font-bold text-[#005DE4] mb-1">{teacherFilter}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700">
                  <strong className="text-[#005DE4] text-xl">{teacherFilteredStats.count}</strong> aluno{teacherFilteredStats.count !== 1 ? 's' : ''} com pagamento{teacherFilteredStats.count !== 1 ? 's' : ''} no período
                </span>
                <span className="text-gray-400">"¢</span>
                <span className="text-gray-700">
                  Receita Prevista: <strong className="text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(teacherFilteredStats.revenue)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-full font-bold text-xs ${
                statusFilter === 'all' 
                  ? 'bg-[#005DE4] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('ativo')}
              className={`px-4 py-2 rounded-full font-bold text-xs ${
                statusFilter === 'ativo' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ativos ({activeStudents})
            </button>
            <button
              onClick={() => setStatusFilter('cancelado')}
              className={`px-4 py-2 rounded-full font-bold text-xs ${
                statusFilter === 'cancelado' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Inativos ({inactiveStudents})
            </button>
            <button
              onClick={() => setStatusFilter('sem-turma')}
              className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 ${
                statusFilter === 'sem-turma'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <UserX size={12} /> Sem turma ({semTurmaCount})
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'aguardando' ? 'all' : 'aguardando')}
                className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 ${
                  statusFilter === 'aguardando'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                <Clock size={12} /> Aguardando ({pendingCount})
              </button>
            )}
            <button
              onClick={() => setContratoFilter(prev => prev === 'pendente' ? 'all' : 'pendente')}
              className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 ${
                contratoFilter === 'pendente'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Alunos ativos sem contrato assinado"
            >
              <FileClock size={12} /> Sem contrato ({contratoPendenteCount})
            </button>
            <button
              onClick={() => setContratoFilter(prev => prev === 'assinado' ? 'all' : 'assinado')}
              className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 ${
                contratoFilter === 'assinado'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileCheck size={12} /> Assinados ({contratoAssinadoCount})
            </button>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 rounded-full font-bold text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center gap-1"
              title={sortOrder === 'asc' ? 'Ordenar Z-A' : 'Ordenar A-Z'}
            >
              <ArrowUpDown size={14} />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Professor:</label>
            <select 
              value={teacherFilter} 
              onChange={e => setTeacherFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg text-xs"
            >
              <option value="all">Todos</option>
              {teachers.map(teacher => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <div className="flex gap-2">
          <button 
            onClick={printActiveStudents}
            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-full font-semibold text-xs flex gap-2 items-center hover:bg-slate-100 transition-colors"
            title="Imprimir lista de alunos ativos"
          >
            <Printer size={15}/> Imprimir lista
          </button>
          {selectedStudents.length > 0 && (
            <>
              <button 
                onClick={handleBulkPayment}
                className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-blue-700"
              >
                Dar Baixa ({selectedStudents.length})
              </button>
              <button 
                onClick={handleBulkCancel}
                className="bg-red-500 text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-red-600"
              >
                <X size={16}/> Cancelar Matrícula ({selectedStudents.length})
              </button>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-700 text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-red-800"
              >
                <Trash2 size={16}/> Excluir ({selectedStudents.length})
              </button>
            </>
          )}
          <input
            type="file"
            id="excelUpload"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelUpload}
          />
          <button 
            onClick={() => document.getElementById('excelUpload').click()} 
            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-full font-semibold text-xs flex gap-2 items-center hover:bg-slate-100 transition-colors"
          >
            <FileText size={15}/> Importar Excel
          </button>
        </div>
      </div>
      
      <input
        placeholder="Buscar aluno..."
        className="mb-4 border p-2 rounded-xl w-full"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      
      <Table
        header={[
          <button key="select-all" onClick={toggleAll} className="flex items-center">
            {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? 
              <CheckSquare size={18}/> : <Square size={18}/>
            }
          </button>,
          <span key="nome">Nome do aluno</span>, 
          <span key="contato">Contato do aluno</span>, 
          <span key="curso">Curso</span>, 
          <span key="professor">Professor</span>, 
          <span key="mensalidade">Mensalidade</span>, 
          <span key="vencimento">Vencimento</span>, 
          <span key="frequencia">Frequência</span>,
          <span key="contrato">Contrato</span>,
          <span key="acoes"></span>
        ]}
        data={filteredStudents}
        render={s => s._isPreCad ? (
          <>
            <td key="select" className="px-6 py-3 text-slate-200"><Square size={18} /></td>
            <td key="name" className="px-6 py-3">
              <div className="font-bold text-xs text-slate-800">{s.nome}</div>
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 mt-0.5">
                <Clock size={9} /> Aguardando matrícula
              </span>
            </td>
            <td key="contact" className="px-6 py-3">
              <div className="text-xs">{s.celular}</div>
              {s.email && <div className="text-[10px] text-slate-400 mt-0.5">{s.email}</div>}
            </td>
            <td key="course" className="px-6 py-3 text-xs text-slate-400">{s.formaPagamento || '"”'}</td>
            <td key="teacher" className="px-6 py-3 text-xs text-slate-300">"”</td>
            <td key="mensalidade" className="px-6 py-3 text-xs text-slate-300">"”</td>
            <td key="vencimento" className="px-6 py-3 text-xs text-slate-400">{s.diaVencimento ? `Dia ${s.diaVencimento}` : '"”'}</td>
            <td key="freq" className="px-6 py-3 text-xs text-slate-300">"”</td>
            <td key="contrato" className="px-6 py-3 text-xs text-slate-300">"”</td>
            <td key="actions" className="px-6 py-3">
              <button
                onClick={() => setConfirmarMatricula(s)}
                title="Confirmar matrícula"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#005DE4] text-white text-xs font-semibold hover:bg-[#0041a8] transition-colors"
              >
                <CheckCircle size={12} /> Confirmar
              </button>
            </td>
          </>
        ) : (
          <>
            <td key="select" className="px-6 py-3">
              <button onClick={() => toggleStudent(s.id)}>
                {selectedStudents.includes(s.id) ?
                  <CheckSquare size={18} className="text-[#005DE4]"/> :
                  <Square size={18} className="text-slate-300"/>
                }
              </button>
            </td>
            <td key="name" className="px-6 py-3">
              <div className="flex items-center gap-1.5">
                <div className="font-bold text-xs">{s.name}</div>
                {s.status !== 'cancelado' && (
                  alunosEmTurma.has(s.id)
                    ? <span title="Inserido em turma"><UserCheck size={13} className="text-emerald-500 flex-shrink-0" /></span>
                    : <span title="Sem turma"><UserX size={13} className="text-orange-400 flex-shrink-0" /></span>
                )}
              </div>
              {s.responsibleName && (
                <div className="text-[10px] text-slate-400 mt-0.5">{s.responsibleName}</div>
              )}
              {alunoTurmaMap.has(s.id) && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 bg-[#0e48fe]/8 text-[#0e48fe] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#0e48fe]/20">
                    <GraduationCap size={10} />
                    {alunoTurmaMap.get(s.id).nome || alunoTurmaMap.get(s.id).name || 'Turma'}
                  </span>
                </div>
              )}
            </td>
            <td key="contact" className="px-6 py-3">
              <div className="text-xs">{s.contact}</div>
              {s.responsibleContact && (
                <div className="text-[10px] text-slate-400 mt-1">{s.responsibleContact}</div>
              )}
            </td>
            <td key="course" className="px-6 py-3 text-xs">{s.course}</td>
            <td key="teacher" className="px-6 py-3 text-xs">{s.teacher}</td>
            <td key="fee" className="px-6 py-3 text-xs">
              {s.status === 'cancelado' ? (
                <span className="text-red-600 font-bold">INATIVO</span>
              ) : (
                `R$ ${Number(s.fee || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
              )}
            </td>
            <td key="nextPayment" className="px-6 py-3 text-xs">
              {(() => {
                const next = payments
                  .filter(p => p.studentId === s.id && p.status !== "Pago")
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
                return next ? formatDate(next.dueDate) : '-';
              })()}
            </td>
            <td key="freq" className="px-6 py-3 text-xs">
              {(() => {
                const aulasAluno = aulasData.filter(a =>
                  (a.chamadas || []).some(c => c.alunoId === s.id)
                );
                if (!aulasAluno.length) return <span className="text-gray-400">"”</span>;
                const presencas = aulasAluno.filter(a =>
                  (a.chamadas || []).find(c => c.alunoId === s.id)?.status === 'presente'
                ).length;
                const pct = Math.round(presencas / aulasAluno.length * 100);
                const cls = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
                return (
                  <button
                    onClick={() => setFreqAluno({ aluno: s, turma: alunoTurmaMap.get(s.id) || null })}
                    className={`font-semibold ${cls} underline-offset-2 hover:underline cursor-pointer bg-transparent border-none p-0`}
                    title={`${presencas}/${aulasAluno.length} aulas "” clique para ver relatório`}
                  >
                    {pct}%
                  </button>
                );
              })()}
            </td>
            <td key="contrato" className="px-6 py-3">
              {s.status === 'cancelado' ? (
                <span className="text-slate-300">"”</span>
              ) : contratosAssinados[s.id] ? (
                <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold" title={`Assinado por ${contratosAssinados[s.id].nome} em ${contratosAssinados[s.id].timestamp}`}>
                  <FileCheck size={13}/> Assinado
                </span>
              ) : s.contratoEnviadoEm ? (
                <span className="flex items-center gap-1 text-amber-600 text-[10px] font-semibold" title={`Link enviado em ${new Date(s.contratoEnviadoEm).toLocaleDateString('pt-BR')}`}>
                  <FileClock size={13}/> Pendente
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                  <FileMinus size={13}/> Não enviado
                </span>
              )}
            </td>
            <td key="actions" className="px-6 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setModal({open: true, type: 'view', data: { ...s, turmaInfo: alunoTurmaMap.get(s.id) || null }})} 
                  aria-label="Visualizar aluno"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <Search size={15}/>
                </button>
                <button
                  onClick={() => { setInserirModal(s); setTurmaSelecionada(''); setFiltroTurmaProf(''); setFiltroTurmaDia(''); }}
                  aria-label="Inserir em turma"
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 hover:text-orange-600 transition-colors"
                  title="Inserir em turma"
                >
                  <Users size={15}/>
                </button>
                <button
                  onClick={() => gerarBoletim(s)}
                  disabled={generatingBoletimId === s.id}
                  aria-label="Gerar boletim do aluno"
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                  title="Gerar Boletim"
                >
                  {generatingBoletimId === s.id ? <Loader2 size={15} className="animate-spin" /> : <School size={15}/>}
                </button>
                <button 
                  onClick={() => setModal({open: true, type: 'student', data: s})}
                  aria-label="Editar aluno"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <Edit size={15}/>
                </button>
                {s.status === 'cancelado' ? (
                  <button
                    onClick={() => setReativarAluno(s)}
                    aria-label="Reativar matrícula"
                    title="Reativar matrícula"
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors"
                  >
                    <RotateCcw size={15}/>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCancelEnrollment(s.id)}
                    aria-label="Cancelar matrícula"
                    title="Cancelar matrícula"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X size={15}/>
                  </button>
                )}
              </div>
            </td>
          </>
        )}
      />

    </Card>
    {inserirModal && (
      <InserirEmTurmaModal
        aluno={inserirModal}
        onClose={() => setInserirModal(null)}
        turmas={turmas}
        filtroProf={filtroTurmaProf}
        setFiltroProf={setFiltroTurmaProf}
        filtroDia={filtroTurmaDia}
        setFiltroDia={setFiltroTurmaDia}
        turmaSelecionada={turmaSelecionada}
        setTurmaSelecionada={setTurmaSelecionada}
        onConfirm={handleInserirEmTurma}
        inserindo={inserindo}
      />
    )}
    {boletimAluno && (
      <BoletimModal
        aluno={boletimAluno}
        boletimData={boletimData}
        setBoletimData={setBoletimData}
        loading={loadingBoletim}
        onSave={handleSaveBoletim}
        onClose={() => setBoletimAluno(null)}
      />
    )}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />

      {confirmarMatricula && (
        <ConfirmarMatriculaModal
          preCad={confirmarMatricula}
          saving={savingConfirmar}
          onClose={() => setConfirmarMatricula(null)}
          onConfirm={async (params) => {
            await handleConfirmarMatricula(confirmarMatricula, params);
          }}
        />
      )}

      {reativarAluno && (
        <ReativarMatriculaModal
          aluno={reativarAluno}
          saving={savingReativar}
          onClose={() => setReativarAluno(null)}
          onConfirm={async (params) => {
            setSavingReativar(true);
            await handleReactivateEnrollment(reativarAluno.id, params);
            setSavingReativar(false);
            setReativarAluno(null);
          }}
        />
      )}

      {freqAluno && (
        <FrequenciaAlunoModal
          aluno={freqAluno.aluno}
          aulas={aulasData}
          turma={freqAluno.turma}
          onClose={() => setFreqAluno(null)}
        />
      )}
    </>
  );
};

export default Students;
