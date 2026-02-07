import { useState, useMemo, useEffect } from 'react';
import { Search, Edit, X, FileText, CheckSquare, Square, Trash2, ArrowUpDown, School, Printer } from 'lucide-react';
import { db } from '../firebase';
import { doc, collection, getDoc, setDoc } from 'firebase/firestore';
import { Card, Table, KPI } from '../components';

export const Students = ({ 
  students, 
  payments, 
  searchTerm, 
  setSearchTerm, 
  setModal, 
  handleCancelEnrollment,
  handleDeleteStudent, 
  handleExcelUpload 
}) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [boletimAluno, setBoletimAluno] = useState(null);
  const [boletimData, setBoletimData] = useState({ turma: '', nivel: '', dia: '', horario: '' });
  const [loadingBoletim, setLoadingBoletim] = useState(false);
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
      alert('Boletim salvo com sucesso!');
    };
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ativo', 'cancelado'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
  const [teacherFilter, setTeacherFilter] = useState('all'); // 'all' ou nome do professor

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

  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) return;
    if (!confirm(`Excluir ${selectedStudents.length} aluno(s) selecionado(s)?`)) return;
    
    selectedStudents.forEach(id => handleDeleteStudent(id));
    setSelectedStudents([]);
  };

  const handleBulkPayment = () => {
    if (selectedStudents.length === 0) return;
    setModal({ open: true, type: 'bulk-payment', data: { studentIds: selectedStudents } });
  };

  const handleBulkCancel = () => {
    if (selectedStudents.length === 0) return;
    if (!confirm(`Cancelar matrícula de ${selectedStudents.length} aluno(s) selecionado(s)?`)) return;
    
    selectedStudents.forEach(id => handleCancelEnrollment(id));
    setSelectedStudents([]);
  };

  const filteredStudents = useMemo(() => 
    students
      .filter(s => {
        const searchLower = searchTerm.toLowerCase();
        const studentName = (s.name || '').toLowerCase();
        const responsibleName = (s.responsibleName || '').toLowerCase();
        return studentName.includes(searchLower) || responsibleName.includes(searchLower);
      })
      .filter(s => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'ativo') return s.status !== 'cancelado';
        if (statusFilter === 'cancelado') return s.status === 'cancelado';
        return true;
      })
      .filter(s => {
        if (teacherFilter === 'all') return true;
        return s.teacher === teacherFilter;
      })
      .sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }),
    [students, searchTerm, statusFilter, teacherFilter, sortOrder]
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <KPI 
          label="ATIVO"
          value={activeStudents}
          format="number"
          accent="blue"
        />
        <KPI
          label="INATIVO"
          value={inactiveStudents}
          format="number"
          accent="red"
        />
      </div>

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
            className="bg-gray-600 text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-gray-700"
            title="Imprimir lista de alunos ativos"
          >
            <Printer size={16}/> Imprimir Lista
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
            className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-emerald-600"
          >
            <FileText size={16}/> Importar Excel
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
          <span key="acoes"></span>
        ]}
        data={filteredStudents}
        render={s => (
          <>
            <td className="px-6 py-3">
              <button onClick={() => toggleStudent(s.id)}>
                {selectedStudents.includes(s.id) ? 
                  <CheckSquare size={18} className="text-[#005DE4]"/> : 
                  <Square size={18} className="text-slate-300"/>
                }
              </button>
            </td>
            <td className="px-6 py-3">
              <div className="font-bold text-xs">{s.name}</div>
              {s.responsibleName && (
                <div className="text-[10px] text-slate-400 mt-1">{s.responsibleName}</div>
              )}
            </td>
            <td className="px-6 py-3">
              <div className="text-xs">{s.contact}</div>
              {s.responsibleContact && (
                <div className="text-[10px] text-slate-400 mt-1">{s.responsibleContact}</div>
              )}
            </td>
            <td className="px-6 py-3 text-xs">{s.course}</td>
            <td className="px-6 py-3 text-xs">{s.teacher}</td>
            <td className="px-6 py-3 text-xs">
              {s.status === 'cancelado' ? (
                <span className="text-red-600 font-bold">INATIVO</span>
              ) : (
                `R$ ${Number(s.fee || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
              )}
            </td>
            <td className="px-6 py-3 text-xs">
              {(() => {
                const next = payments
                  .filter(p => p.studentId === s.id && p.status !== "Pago")
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
                return next ? new Date(next.dueDate).toLocaleDateString('pt-BR') : '-';
              })()}
            </td>
            <td className="px-6 py-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModal({open: true, type: 'view', data: s})} 
                  aria-label="Visualizar aluno"
                >
                  <Search size={16}/>
                </button>
                <button
                  onClick={() => setBoletimAluno(s)}
                  aria-label="Boletim do aluno"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <School size={16}/>
                </button>
                <button 
                  onClick={() => setModal({open: true, type: 'student', data: s})}
                  aria-label="Editar aluno"
                >
                  <Edit size={16}/>
                </button>
                <button
                  onClick={() => handleCancelEnrollment(s.id)}
                  aria-label="Cancelar matrícula"
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16}/>
                </button>
              </div>
            </td>
          </>
        )}
      />
    </Card>
    {/* Modal Boletim */}
    {boletimAluno && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative print:p-0 print:shadow-none print:bg-white">
          <button className="absolute top-2 right-2 p-2 print:hidden" onClick={() => setBoletimAluno(null)}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex flex-col items-center border-b pb-2 mb-4">
            <div className="flex w-full items-center">
              <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo" className="h-24 w-24 object-contain mr-4 filter brightness-0" />
              <div className="flex-1 text-center">
                <div className="font-bold text-lg">SPEAKUP ENGLISH LANGUAGE ACADEMY</div>
                <div className="text-xs">Praça Governador Valadares 119, Centro - Cataguases MG</div>
                <div className="text-xs">CNPJ: 28.649.636/0001-88</div>
              </div>
            </div>
            <div className="font-bold text-xl mt-2">Boletim</div>
          </div>
          <table className="w-full text-sm border mb-4">
            <tbody>
              <tr>
                <td className="border px-2 py-1 font-semibold">Turma</td>
                <td className="border px-2 py-1">
                  <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.turma} onChange={e => setBoletimData(d => ({...d, turma: e.target.value}))} disabled={loadingBoletim} />
                </td>
                <td className="border px-2 py-1 font-semibold">Nível:</td>
                <td className="border px-2 py-1">
                  <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.nivel} onChange={e => setBoletimData(d => ({...d, nivel: e.target.value}))} disabled={loadingBoletim} />
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">Aluno</td>
                <td className="border px-2 py-1">{boletimAluno.name}</td>
                <td className="border px-2 py-1 font-semibold">Dia:</td>
                <td className="border px-2 py-1">
                  <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.dia} onChange={e => setBoletimData(d => ({...d, dia: e.target.value}))} disabled={loadingBoletim} />
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">Professor:</td>
                <td className="border px-2 py-1">{boletimAluno.teacher || '-'}</td>
                <td className="border px-2 py-1 font-semibold">Horário:</td>
                <td className="border px-2 py-1">
                  <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.horario} onChange={e => setBoletimData(d => ({...d, horario: e.target.value}))} disabled={loadingBoletim} />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex gap-2 print:hidden">
            <button
              className="bg-[#005DE4] text-white px-6 py-2 rounded-lg font-bold mt-2"
              onClick={handleSaveBoletim}
              disabled={loadingBoletim}
            >Salvar</button>
            <button
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold mt-2"
              onClick={() => window.print()}
            >Imprimir</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Students;
