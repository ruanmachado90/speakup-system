import { Search, Edit, Trash2, FileText } from 'lucide-react';
import { Card, Table } from '../components';

export const Students = ({ 
  students, 
  payments, 
  searchTerm, 
  setSearchTerm, 
  setModal, 
  handleDeleteStudent, 
  handleExcelUpload 
}) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-400">
          Dados salvos em: <code>artifacts/speakup-manager/public/data/students</code>
        </div>
        <div className="flex gap-2">
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
        header={["Nome do aluno", "Contato do aluno", "Curso", "Professor", "Mensalidade", "Vencimento", ""]}
        data={students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))}
        render={s => (
          <>
            <td className="px-6 py-3">
              <div className="font-bold">{s.name}</div>
              {s.responsibleName && (
                <div className="text-xs text-slate-400 mt-1">{s.responsibleName}</div>
              )}
            </td>
            <td className="px-6 py-3">
              <div>{s.contact}</div>
              {s.responsibleContact && (
                <div className="text-xs text-slate-400 mt-1">{s.responsibleContact}</div>
              )}
            </td>
            <td className="px-6 py-3">{s.course}</td>
            <td className="px-6 py-3">{s.teacher}</td>
            <td className="px-6 py-3">
              R$ {Number(s.fee || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </td>
            <td className="px-6 py-3">
              {(() => {
                const next = payments
                  .filter(p => p.studentId === s.id && p.status !== "Pago")
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
                return next ? new Date(next.dueDate).toLocaleDateString('pt-BR') : '-';
              })()}
            </td>
            <td className="px-6 py-3">
              <button 
                onClick={() => setModal({open: true, type: 'view', data: s})} 
                aria-label="Visualizar aluno" 
                className="mr-2"
              >
                <Search size={16}/>
              </button>
              <button 
                onClick={() => setModal({open: true, type: 'student', data: s})} 
                aria-label="Editar aluno" 
                className="mr-2"
              >
                <Edit size={16}/>
              </button>
              <button 
                onClick={() => handleDeleteStudent(s.id)} 
                aria-label="Remover aluno"
              >
                <Trash2 size={16}/>
              </button>
            </td>
          </>
        )}
      />
    </Card>
  );
};
