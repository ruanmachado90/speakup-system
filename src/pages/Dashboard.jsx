import { Printer } from 'lucide-react';
import { Card, Table, KPI, EvolutionChart, ProfitChart } from '../components';

export const Dashboard = ({ 
  dashboardRange, 
  setDashboardRange, 
  printDashboard, 
  stats, 
  monthlyData, 
  teacherStats, 
  filteredExpenses 
}) => {
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
        <KPI label="Lucro" value={stats.profit} positive />
        <KPI label="Alunos Ativos" value={stats.students} format="number" accent="blue" />
        <KPI label="Matrículas" value={stats.registrations} format="number" accent="green" />
        <KPI label="Cancelamentos" value={stats.cancellations} format="number" accent="red" />
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
    </>
  );
};
