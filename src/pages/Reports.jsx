import { Printer } from 'lucide-react';
import { Card, Table, KPI } from '../components';

export const Reports = ({ 
  reportType, 
  setReportType, 
  reportMonth, 
  setReportMonth, 
  reportYear, 
  setReportYear, 
  payments, 
  expenses, 
  students 
}) => {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setReportType('monthly')} 
            className={`px-4 py-2 rounded-lg font-semibold ${reportType === 'monthly' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Mensal
          </button>
          <button 
            onClick={() => setReportType('yearly')} 
            className={`px-4 py-2 rounded-lg font-semibold ${reportType === 'yearly' ? 'bg-[#005DE4] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Anual
          </button>
        </div>

        <div className="flex items-center gap-4">
          {reportType === 'monthly' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-600">Mês</label>
                <select 
                  value={reportMonth} 
                  onChange={e => setReportMonth(Number(e.target.value))} 
                  className="border px-3 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  {Array.from({length: 12}).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600">Ano</label>
            <input 
              type="number" 
              value={reportYear} 
              onChange={e => setReportYear(Number(e.target.value))} 
              className="border px-3 py-2 rounded-lg w-28 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005DE4]" 
            />
          </div>

          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 rounded-lg bg-slate-100 flex gap-2 items-center hover:bg-slate-200 font-semibold"
          >
            <Printer size={16}/> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-4">
            Relatório {reportType === 'monthly' ? 'Mensal' : 'Anual'} - 
            {reportType === 'monthly' && ` ${new Date(0, reportMonth).toLocaleString('pt-BR', {month: 'long'})}`} {reportYear}
          </h3>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {(() => {
              const p = reportType === 'monthly' 
                ? payments.filter(x => Number(x.year) === reportYear && Number(x.month) === reportMonth)
                : payments.filter(x => Number(x.year) === reportYear);
              
              const e = reportType === 'monthly'
                ? expenses.filter(x => {
                    if (!x.date) return false;
                    const d = new Date(x.date);
                    return d.getFullYear() === reportYear && d.getMonth() === reportMonth;
                  })
                : expenses.filter(x => {
                    if (!x.date) return false;
                    return new Date(x.date).getFullYear() === reportYear;
                  });

              const planned = p.reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
              const paid = p.filter(x => x.status === 'Pago').reduce((a, x) => a + Number(x.valuePaid || x.valuePlanned || 0), 0);
              const pending = p.filter(x => x.status !== 'Pago').reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
              const totalExpenses = e.reduce((a, x) => a + Number(x.value || 0), 0);
              const profit = paid - totalExpenses;

              return (
                <>
                  <KPI label="Receita Prevista" value={planned} accent="blue" />
                  <KPI label="Receita Recebida" value={paid} positive accent="green" />
                  <KPI label="Despesas" value={totalExpenses} warn accent="yellow" />
                  <KPI label="Lucro" value={profit} positive={profit >= 0} warn={profit < 0} />
                </>
              );
            })()}
          </div>

          {/* Tabela de Pagamentos */}
          <div className="mb-6">
            <h4 className="font-bold mb-3">Pagamentos</h4>
            <Table
              header={["Aluno", "Vencimento", "Valor", "Status", "Data Pagamento"]}
              data={
                reportType === 'monthly'
                  ? payments.filter(x => Number(x.year) === reportYear && Number(x.month) === reportMonth)
                  : payments.filter(x => Number(x.year) === reportYear)
              }
              render={p => {
                const student = students.find(s => s.id === p.studentId);
                return (
                  <>
                    <td className="px-6 py-3 font-semibold">{p.studentName || student?.name || '-'}</td>
                    <td className="px-6 py-3">{p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-6 py-3">R$ {Number(p.valuePlanned || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {p.status === 'Pago' && p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </>
                );
              }}
            />
          </div>

          {/* Tabela de Despesas */}
          <div>
            <h4 className="font-bold mb-3">Despesas</h4>
            <Table
              header={["Descrição", "Categoria", "Data", "Valor"]}
              data={
                reportType === 'monthly'
                  ? expenses.filter(x => {
                      if (!x.date) return false;
                      const d = new Date(x.date);
                      return d.getFullYear() === reportYear && d.getMonth() === reportMonth;
                    })
                  : expenses.filter(x => {
                      if (!x.date) return false;
                      return new Date(x.date).getFullYear() === reportYear;
                    })
              }
              render={x => (
                <>
                  <td className="px-6 py-3 font-semibold">{x.description}</td>
                  <td className="px-6 py-3">{x.category}</td>
                  <td className="px-6 py-3">{x.date ? new Date(x.date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-6 py-3">R$ {Number(x.value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </>
              )}
            />
          </div>
        </Card>
      </div>
    </>
  );
};
