import { useState, useMemo } from 'react';
import { Printer, X, User, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, Table, KPI, EvolutionChart, ProfitChart } from '../components';
import { formatCurrency, formatDate } from '../utils';

export const Dashboard = ({ 
  dashboardRange, 
  setDashboardRange, 
  printDashboard, 
  stats, 
  monthlyData, 
  teacherStats, 
  filteredExpenses,
  students,
  payments 
}) => {
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showCancellationsModal, setShowCancellationsModal] = useState(false);

  // Filtrar alunos matriculados no período (otimizado com Map lookup)
  const registeredStudents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      if (dashboardRange === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return d.getFullYear() === currentYear;
    };

    // Criar Map de payments por studentId para lookup O(1)
    const paymentsByStudent = new Map();
    payments.forEach(payment => {
      if (!paymentsByStudent.has(payment.studentId)) {
        paymentsByStudent.set(payment.studentId, []);
      }
      paymentsByStudent.get(payment.studentId).push(payment);
    });

    return students
      .filter(s => inPeriod(s.createdAt))
      .map(student => {
        // Lookup O(1) ao invés de filter O(n)
        const studentPayments = paymentsByStudent.get(student.id) || [];
        const sortedPayments = studentPayments
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        const firstPayment = sortedPayments[0];
        
        return {
          ...student,
          matriculaDate: student.createdAt ? new Date(Number(student.createdAt)) : null,
          firstPayment: firstPayment || null,
          paymentStatus: firstPayment?.status || 'Sem pagamento'
        };
      })
      .sort((a, b) => (b.matriculaDate?.getTime() || 0) - (a.matriculaDate?.getTime() || 0));
  }, [students, payments, dashboardRange]);

  // Filtrar alunos cancelados no período
  const cancelledStudents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      if (dashboardRange === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return d.getFullYear() === currentYear;
    };

    return students
      .filter(s => s.status === 'cancelado' && inPeriod(s.canceledAt))
      .map(student => ({
        ...student,
        cancelDate: student.canceledAt ? new Date(Number(student.canceledAt)) : null,
      }))
      .sort((a, b) => (b.cancelDate?.getTime() || 0) - (a.cancelDate?.getTime() || 0));
  }, [students, dashboardRange]);

  // Função para imprimir lista de matrículas
  const printRegistrations = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Matrículas - SpeakUp</title>
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
          @media print {
            body { padding: 10px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SpeakUp English Language Academy</div>
          <div class="subtitle">Relatório de Novas Matrículas - ${dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</div>
          <div class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>

        <div class="info-box">
          <div class="info-row"><strong>Período:</strong> ${dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</div>
          <div class="info-row"><strong>Total de Matrículas:</strong> ${registeredStudents.length} ${registeredStudents.length === 1 ? 'aluno' : 'alunos'}</div>
          <div class="info-row"><strong>Receita Estimada:</strong> ${formatCurrency(registeredStudents.reduce((acc, s) => acc + Number(s.fee || 0), 0))}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Responsável</th>
              <th>Matrícula</th>
              <th>Curso</th>
              <th>Mensalidade</th>
              <th>Status</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${registeredStudents.map(student => {
              const statusText = 
                student.paymentStatus === 'Pago' ? 'Pago' :
                student.paymentStatus === 'Sem pagamento' ? 'Sem Cobrança' :
                (student.firstPayment?.dueDate && new Date(student.firstPayment.dueDate) < new Date()) ? 'Vencido' :
                'Pendente';

              return `
                <tr>
                  <td><strong>${student.name}</strong></td>
                  <td>${student.responsibleName || '-'}</td>
                  <td>${formatDate(student.matriculaDate)}</td>
                  <td>${student.course || '-'}</td>
                  <td>${formatCurrency(Number(student.fee || 0))}</td>
                  <td>${statusText}</td>
                  <td>${student.firstPayment ? formatDate(student.firstPayment.dueDate) : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>SpeakUp English Language Academy - Cataguases/MG</p>
          <p>Total de ${registeredStudents.length} ${registeredStudents.length === 1 ? 'matrícula' : 'matrículas'} listadas</p>
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

  // Função para imprimir lista de cancelamentos
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
          @media print {
            body { padding: 10px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SpeakUp English Language Academy</div>
          <div class="subtitle">Relatório de Cancelamentos - ${dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</div>
          <div class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>

        <div class="info-box">
          <div class="info-row"><strong>Período:</strong> ${dashboardRange === 'month' ? 'Mês Atual' : 'Ano Atual'}</div>
          <div class="info-row"><strong>Total de Cancelamentos:</strong> ${cancelledStudents.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Responsável</th>
              <th>Cancelamento</th>
              <th>Professor</th>
              <th>Curso</th>
              <th>Mensalidade</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${cancelledStudents.map(student => `
              <tr>
                <td><strong>${student.name || '---'}</strong></td>
                <td>${student.responsibleName || '-'}</td>
                <td>${formatDate(student.cancelDate)}</td>
                <td>${student.teacher || '-'}</td>
                <td>${student.course || '-'}</td>
                <td>${formatCurrency(Number(student.fee || 0))}</td>
                <td>${student.responsiblePhone || student.phone || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>SpeakUp English Language Academy - Cataguases/MG</p>
          <p>Total de ${cancelledStudents.length} cancelamento${cancelledStudents.length !== 1 ? 's' : ''} listado${cancelledStudents.length !== 1 ? 's' : ''}</p>
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

  // Modal de alunos matriculados
  const RegistrationsModal = () => {
    if (!showRegistrationsModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Novas Matrículas</h2>
              <p className="text-emerald-100 text-sm mt-1">
                {dashboardRange === 'month' ? 'Alunos matriculados neste mês' : 'Alunos matriculados neste ano'}
              </p>
            </div>
            <button
              onClick={() => setShowRegistrationsModal(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {registeredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 rounded-full p-6 mb-4">
                  <User size={48} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhuma matrícula encontrada
                </h3>
                <p className="text-sm text-gray-500">
                  Não há matrículas registradas no período selecionado.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {registeredStudents.map(student => {
                  const getStatusIcon = () => {
                    if (student.paymentStatus === 'Pago') {
                      return <CheckCircle size={18} className="text-emerald-600" />;
                    }
                    if (student.paymentStatus === 'Sem pagamento') {
                      return <XCircle size={18} className="text-gray-400" />;
                    }
                    const isOverdue = student.firstPayment?.dueDate && 
                      new Date(student.firstPayment.dueDate) < new Date();
                    return isOverdue ? 
                      <XCircle size={18} className="text-red-600" /> : 
                      <Clock size={18} className="text-amber-600" />;
                  };

                  const getStatusColor = () => {
                    if (student.paymentStatus === 'Pago') return 'bg-emerald-50 border-emerald-200';
                    if (student.paymentStatus === 'Sem pagamento') return 'bg-gray-50 border-gray-200';
                    const isOverdue = student.firstPayment?.dueDate && 
                      new Date(student.firstPayment.dueDate) < new Date();
                    return isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
                  };

                  return (
                    <div 
                      key={student.id} 
                      className={`border rounded-xl p-4 ${getStatusColor()} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Student Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-white rounded-full shadow-sm">
                            <User size={20} className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{student.name}</h3>
                            {student.responsibleName && (
                              <p className="text-sm text-gray-600 mt-1">
                                Resp.: {student.responsibleName}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                Matrícula: {formatDate(student.matriculaDate)}
                              </span>
                              {student.course && (
                                <span>Curso: {student.course}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Mensalidade</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(Number(student.fee || 0))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className="text-xs text-gray-500 mb-1">Status</p>
                              <p className="text-xs font-semibold">
                                {student.paymentStatus === 'Sem pagamento' 
                                  ? 'Sem cobrança' 
                                  : student.paymentStatus}
                              </p>
                            </div>
                            {getStatusIcon()}
                          </div>
                        </div>
                      </div>

                      {/* First Payment Details */}
                      {student.firstPayment && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            Vencimento: {formatDate(student.firstPayment.dueDate)}
                          </span>
                          {student.firstPayment.paymentMethod && (
                            <span className="text-gray-600">
                              Forma: {student.firstPayment.paymentMethod}
                            </span>
                          )}
                          <span className="text-gray-600">
                            Valor: {formatCurrency(Number(student.firstPayment.valuePlanned || 0))}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total: <span className="font-bold">{registeredStudents.length}</span> {registeredStudents.length === 1 ? 'matrícula' : 'matrículas'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={printRegistrations}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Printer size={16} />
                Imprimir
              </button>
              <button
                onClick={() => setShowRegistrationsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CancellationsModal = () => {
    if (!showCancellationsModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Alunos Cancelados</h2>
              <p className="text-red-100 text-sm mt-1">
                {dashboardRange === 'month' ? 'Alunos cancelados neste mês' : 'Alunos cancelados neste ano'}
              </p>
            </div>
            <button
              onClick={() => setShowCancellationsModal(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {cancelledStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 rounded-full p-6 mb-4">
                  <User size={48} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum cancelamento encontrado
                </h3>
                <p className="text-sm text-gray-500">
                  Não há cancelamentos registrados no período selecionado.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cancelledStudents.map(student => (
                  <div 
                    key={student.id} 
                    className="border border-red-200 bg-red-50 rounded-xl p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                          <User size={20} className="text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{student.name}</h3>
                          {student.responsibleName && (
                            <p className="text-sm text-gray-600 mt-1">
                              Resp.: {student.responsibleName}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              Cancelamento: {formatDate(student.cancelDate)}
                            </span>
                            {student.teacher && (
                              <span>Professor: {student.teacher}</span>
                            )}
                            {student.course && (
                              <span>Curso: {student.course}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fee Info */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Mensalidade</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(Number(student.fee || 0))}
                        </p>
                      </div>
                    </div>

                    {/* Additional Details */}
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

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total: <span className="font-bold">{cancelledStudents.length}</span> {cancelledStudents.length === 1 ? 'cancelamento' : 'cancelamentos'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={printCancellations}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Printer size={16} />
                Imprimir
              </button>
              <button
                onClick={() => setShowCancellationsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button 
            onClick={() => setDashboardRange('month')} 
            className={`px-3 py-1 rounded ${dashboardRange === 'month' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Mês atual
          </button>
          <button 
            onClick={() => setDashboardRange('year')} 
            className={`px-3 py-1 rounded ${dashboardRange === 'year' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Ano
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={printDashboard} 
            className="px-4 py-2 rounded-full bg-slate-100 flex gap-2 items-center hover:bg-slate-200"
          >
            <Printer size={16}/> Imprimir
          </button>
          <div className="text-xs text-slate-400">Visão: {dashboardRange === 'month' ? 'Mês atual' : 'Ano'}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <KPI label="Receita Prevista" value={stats.planned} accent="blue" />
        <KPI label="Receita Recebida" value={stats.paid} positive accent="green" />
        <KPI label="Pendências" value={stats.pending} warn accent="yellow" />
        <KPI label="Cobranças Vencidas" value={stats.overdue} accent="red" />
        <KPI label="Alunos Ativos" value={stats.students} format="number" accent="blue" />
        <div 
          onClick={() => setShowRegistrationsModal(true)}
          className="cursor-pointer transition-transform hover:scale-105"
          title="Clique para ver detalhes das matrículas"
        >
          <KPI label="Matrículas" value={stats.registrations} format="number" accent="green" />
        </div>
        <div 
          onClick={() => setShowCancellationsModal(true)}
          className="cursor-pointer transition-transform hover:scale-105"
          title="Clique para ver detalhes dos cancelamentos"
        >
          <KPI label="Cancelamentos" value={stats.cancellations} format="number" accent="red" />
        </div>
        <KPI label="Inadimplência" value={stats.inadimplenciaPercent} format="percent" warn />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h3 className="font-bold mb-2">Evolução Mensal (Previsto vs Realizado)</h3>
          <EvolutionChart labels={monthlyData.labels} planned={monthlyData.planned} paid={monthlyData.paid} />
        </Card>

        <Card>
          <h3 className="font-bold mb-2">Evolução do Lucro (Mensal)</h3>
          <ProfitChart labels={monthlyData.labels} profit={monthlyData.profit} />
        </Card>

        <Card>
          <h3 className="font-bold mb-2">Alunos por Professor</h3>
          <Table
            header={["Professor", "Quantidade de Alunos", "Mensalidade Total"]}
            data={teacherStats}
            render={item => (
              <>
                <td className="px-6 py-3 font-semibold">{item.teacher}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center justify-center bg-[#005DE4] text-white rounded-full w-8 h-8 text-sm font-bold">
                    {item.count}
                  </span>
                </td>
                <td className="px-6 py-3 font-semibold">
                  R$ {Number(item.revenue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
              </>
            )}
          />
        </Card>

        <Card>
          <h3 className="font-bold mb-2">Despesas do {dashboardRange === 'month' ? 'Mês' : 'Ano'}</h3>
          <Table
            header={["Descrição", "Categoria", "Data", "Valor"]}
            data={filteredExpenses}
            render={x => (
              <>
                <td className="px-6 py-3 font-semibold">{x.description}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{x.category}</td>
                <td className="px-6 py-3 text-sm">
                  {x.date ? new Date(x.date).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-3 font-semibold">
                  R$ {Number(x.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
              </>
            )}
          />
          {filteredExpenses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma despesa registrada</p>
          )}
        </Card>
      </div>

      {/* Modal de Matrículas */}
      <RegistrationsModal />

      {/* Modal de Cancelamentos */}
      <CancellationsModal />
    </>
  );
};

export default Dashboard;
