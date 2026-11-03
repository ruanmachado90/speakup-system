import { lazy, Suspense, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, FileBarChart2 } from 'lucide-react';
import {
  useStudents, usePayments, useExpenses, useLeads,
  useParametrosData, useFinanceFilters,
} from '../hooks';
import { useTurmas } from '../hooks/useTurmas';
import { useVendas } from '../hooks/useVendas';
import { useSaldosBancarios } from '../hooks/useSaldosBancarios';

const RelatorioTrimestral = lazy(() => import('../pages/RelatorioTrimestral'));

/**
 * Botões de relatório gerencial. Mensal: PDF paisagem (utils/relatorioMensal).
 * Trimestral: folhas A4 para imprimir (pages/RelatorioTrimestral), abertas
 * por cima desta página com ?relatorio=trimestral&ano=&tri= — o endereço
 * pode ser recarregado e compartilhado.
 * Puxa os próprios dados — é só soltar onde quiser (hoje: página Financeiro).
 */
export default function RelatoriosGerenciais() {
  const location = useLocation();
  const navigate = useNavigate();
  const abertoTrimestral = new URLSearchParams(location.search).get('relatorio') === 'trimestral';
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
      await mod.gerarRelatorioMensalPDF({ ...dados, mes });
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
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        title="Baixar o relatório mensal completo em PDF (formato slides)"
      >
        <FileText size={16} />
        <span className="text-sm font-medium">
          {gerando === 'mensal' ? 'Gerando PDF...' : 'Relatório mensal (PDF)'}
        </span>
      </button>

      <button
        onClick={() => {
          const hoje = new Date();
          const mes = filterMonth ?? hoje.getMonth();
          const ano = filterYear ?? hoje.getFullYear();
          navigate(`${location.pathname}?relatorio=trimestral&ano=${ano}&tri=${Math.floor(mes / 3)}`);
        }}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        title="Relatório trimestral completo em folhas A4 para imprimir"
      >
        <FileBarChart2 size={16} />
        <span className="text-sm font-medium">Relatório trimestral (A4)</span>
      </button>
      {abertoTrimestral && (
        <Suspense fallback={null}>
          <RelatorioTrimestral />
        </Suspense>
      )}
    </>
  );
}
