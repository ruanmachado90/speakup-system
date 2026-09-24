import { useState } from 'react';
import { FileText, FileBarChart2 } from 'lucide-react';
import {
  useStudents, usePayments, useExpenses, useLeads,
  useParametrosData, useFinanceFilters,
} from '../hooks';
import { useTurmas } from '../hooks/useTurmas';
import { useVendas } from '../hooks/useVendas';
import { useSaldosBancarios } from '../hooks/useSaldosBancarios';

/**
 * Botões de relatório gerencial — mensal e trimestral, ambos em PDF paisagem
 * (formato slides) gerados pelo mesmo motor (utils/relatorioMensal).
 * Puxa os próprios dados — é só soltar onde quiser (hoje: página Financeiro).
 */
export default function RelatoriosGerenciais() {
  const students = useStudents();
  const payments = usePayments();
  const expenses = useExpenses();
  const leads = useLeads();
  const { turmas } = useTurmas();
  const { vendas } = useVendas();
  const { parametros } = useParametrosData();
  const { filterMonth, filterYear } = useFinanceFilters();
  const { porCompetencia } = useSaldosBancarios();
  const saldosBancarios = Object.values(porCompetencia);

  const [gerando, setGerando] = useState(null); // 'mensal' | 'trimestral' | null

  const baixar = async (tipo) => {
    if (gerando) return;
    setGerando(tipo);
    try {
      const hoje = new Date();
      const mes = filterMonth ?? hoje.getMonth();
      const ano = filterYear ?? hoje.getFullYear();
      const mod = await import('../utils/relatorioMensal');
      const dados = { students, payments, expenses, leads, turmas, vendas, saldosBancarios, params: parametros, ano };
      if (tipo === 'trimestral') {
        await mod.gerarRelatorioTrimestralPDF({ ...dados, trimestre: Math.floor(mes / 3) });
      } else {
        await mod.gerarRelatorioMensalPDF({ ...dados, mes });
      }
    } catch (err) {
      console.error(`[RelatoriosGerenciais] Erro ao gerar o relatório ${tipo}:`, err);
      alert('Erro ao gerar o relatório. Tente novamente.');
    } finally {
      setGerando(null);
    }
  };

  return (
    <>
      <button
        onClick={() => baixar('mensal')}
        disabled={!!gerando}
        className="flex items-center gap-2 px-4 py-2 bg-[#0e48fe] text-white rounded-lg hover:bg-[#0b3ad4] transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        title="Baixar o relatório mensal completo em PDF (formato slides)"
      >
        <FileText size={16} />
        <span className="text-sm font-medium">
          {gerando === 'mensal' ? 'Gerando PDF...' : 'Relatório mensal (PDF)'}
        </span>
      </button>

      <button
        onClick={() => baixar('trimestral')}
        disabled={!!gerando}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        title="Baixar o relatório trimestral em PDF (formato slides)"
      >
        <FileBarChart2 size={16} />
        <span className="text-sm font-medium">
          {gerando === 'trimestral' ? 'Gerando PDF...' : 'Relatório trimestral (PDF)'}
        </span>
      </button>
    </>
  );
}
