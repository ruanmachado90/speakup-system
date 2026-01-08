import { useState, useMemo } from 'react';
import { Search, Edit, X, FileText, CheckSquare, Square, Trash2, ArrowUpDown } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ativo', 'cancelado'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
  const [teacherFilter, setTeacherFilter] = useState('all'); // 'all' ou nome do professor

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
    </>
  );
};

export default Students;
