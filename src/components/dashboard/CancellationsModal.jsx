import { Printer, X, User, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils';

export default function CancellationsModal({ isOpen, onClose, students, dashboardRange }) {
  if (!isOpen) return null;

  const printCancellations = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Cancelamentos - SpeakUp</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 10px; margin-top: 3px; }
          .info-box { margin-bottom: 15px; font-size: 10px; }
          .info-row { margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #000; font-size: 10px; font-weight: bold; }
          td { padding: 5px 4px; border-bottom: 1px solid #ddd; font-size: 10px; vertical-align: top; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #000; font-size: 9px; }
          @media print { body { padding: 10px; } tr { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SpeakUp English Language Academy</div>
          <div class="subtitle">Relatório de Cancelamentos - ${dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</div>
          <div class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
        <div class="info-box">
          <div class="info-row"><strong>Total de Cancelamentos:</strong> ${students.length}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Responsável</th><th>Cancelamento</th>
              <th>Professor</th><th>Curso</th><th>Mensalidade</th><th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(student => `<tr>
              <td><strong>${student.name || '---'}</strong></td>
              <td>${student.responsibleName || '-'}</td>
              <td>${formatDate(student.cancelDate)}</td>
              <td>${student.teacher || '-'}</td>
              <td>${student.course || '-'}</td>
              <td>${formatCurrency(Number(student.fee || 0))}</td>
              <td>${student.responsiblePhone || student.phone || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>SpeakUp English Language Academy - Cataguases/MG</p>
          <p>Total de ${students.length} cancelamento${students.length !== 1 ? 's' : ''}</p>
        </div>
        <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 200); };</script>
      </body>
      </html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Alunos Cancelados</h2>
            <p className="text-red-100 text-sm mt-1">
              {dashboardRange === 'month' ? 'Alunos cancelados neste mês' : 'Alunos cancelados neste ano'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-gray-100 rounded-full p-6 mb-4"><User size={48} className="text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum cancelamento encontrado</h3>
              <p className="text-sm text-gray-500">Não há cancelamentos registrados no período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map(student => (
                <div key={student.id} className="border border-red-200 bg-red-50 rounded-xl p-4 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-white rounded-full shadow-sm"><User size={20} className="text-red-600" /></div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{student.name}</h3>
                        {student.responsibleName && <p className="text-sm text-gray-600 mt-1">Resp.: {student.responsibleName}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={14} />Cancelamento: {formatDate(student.cancelDate)}</span>
                          {student.teacher && <span>Professor: {student.teacher}</span>}
                          {student.course && <span>Curso: {student.course}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Mensalidade</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(student.fee || 0))}</p>
                    </div>
                  </div>
                  {student.responsiblePhone && (
                    <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-600">
                      Telefone: {student.responsiblePhone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total: <span className="font-bold">{students.length}</span> {students.length === 1 ? 'cancelamento' : 'cancelamentos'}
          </p>
          <div className="flex gap-2">
            <button onClick={printCancellations} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
              <Printer size={16} /> Imprimir
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
