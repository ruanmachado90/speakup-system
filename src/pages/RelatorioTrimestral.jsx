import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Loader2 } from 'lucide-react';
import { useHojeISO } from '../hooks/useHojeISO';
import { useAgoraMin } from '../hooks/useAgendaSemana';
import { useDadosRelatorioTrimestral } from '../hooks/useDadosRelatorioTrimestral';
import { montarRelatorioCompleto } from '../utils/relatorioTrimestralModelo';
import { trimestreDe } from '../utils/relatorioTrimestral';
import { FolhaSumario, FolhaReceita, FolhaDespesas, FolhaInadimplencia } from '../components/relatorioTrimestral/FolhasFinanceiro';
import {
  FolhaAlunos, FolhaComercial, FolhaPedagogico, FolhaNotas, FolhaTurmas, FolhaEquipe, FolhaPlano,
} from '../components/relatorioTrimestral/FolhasOperacao';

const FOLHAS = [
  FolhaSumario, FolhaReceita, FolhaDespesas, FolhaInadimplencia, FolhaAlunos, FolhaComercial,
  FolhaPedagogico, FolhaNotas, FolhaTurmas, FolhaEquipe, FolhaPlano,
];

// A4 em pé. Na impressão some o app inteiro (#root) e fica só o portal do
// relatório, uma folha por página. Cores sem hex: tokens do design system.
const CSS_IMPRESSAO = `
  @page { size: A4 portrait; margin: 0; }
  .rt-folha { width: 210mm; min-height: 297mm; padding: 12mm 13mm 9mm; margin: 0 auto 8mm; box-shadow: var(--shadow-card-lg); font-family: 'Source Sans 3', system-ui, sans-serif; }
  @media print {
    html, body { background: white !important; }
    body > #root { display: none !important; }
    .rt-raiz { position: static !important; overflow: visible !important; background: white !important; padding: 0 !important; }
    .rt-folha { margin: 0 !important; box-shadow: none !important; break-after: page; min-height: 296mm; }
    .rt-folha:last-child { break-after: auto; }
    .rt-bloco { break-inside: avoid; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

const lerPeriodo = (search, hojeISO) => {
  const p = new URLSearchParams(search);
  const atual = trimestreDe(hojeISO);
  const tri = Number(p.get('tri'));
  const ano = Number(p.get('ano'));
  return {
    tri: Number.isInteger(tri) && tri >= 0 && tri <= 3 ? tri : atual.tri,
    ano: Number.isInteger(ano) && ano > 2000 ? ano : atual.ano,
  };
};

/**
 * Relatório gerencial do trimestre em folhas A4 para imprimir (ou "Salvar
 * como PDF" no navegador). Abre por cima do Financeiro com
 * ?relatorio=trimestral&ano=2026&tri=3 (RelatoriosGerenciais).
 */
export default function RelatorioTrimestral() {
  const location = useLocation();
  const navigate = useNavigate();
  const hojeISO = useHojeISO();
  const agoraMin = useAgoraMin();
  const { tri, ano } = lerPeriodo(location.search, hojeISO);
  const dados = useDadosRelatorioTrimestral(tri, ano);

  const M = useMemo(
    () => (dados.carregando ? null : montarRelatorioCompleto({ ...dados, tri, ano, hojeISO, agoraMin })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados.carregando, dados.students, dados.payments, dados.expenses, dados.leads, dados.turmas, dados.aulas, dados.avulsas,
      dados.eventos, dados.avaliacoes, dados.grades, dados.contratosAssinados, dados.calendarioAno, dados.params, dados.vendas,
      dados.saldosBancarios, dados.professores, tri, ano, hojeISO]
  );

  const irPara = (delta) => {
    const indice = ano * 4 + tri + delta;
    navigate(`${location.pathname}?relatorio=trimestral&ano=${Math.floor(indice / 4)}&tri=${indice % 4}`, { replace: true });
  };
  const fechar = () => navigate(location.pathname);
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const ctx = M && {
    titulo: 'Relatório trimestral',
    periodo: `${M.intervalo.rotulo} · ${M.intervalo.faixa}`,
    total: FOLHAS.length,
    geradoEm,
  };

  return createPortal(
    <div className="rt-raiz fixed inset-0 z-50 overflow-auto bg-gr-200 pb-10">
      <style>{CSS_IMPRESSAO}</style>
      <div className="print:hidden sticky top-0 z-10 bg-surface-card border-b border-subtle mb-6">
        <div className="max-w-[210mm] mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={fechar} className="p-2 -ml-2 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Fechar o relatório">
              <ArrowLeft size={20} />
            </button>
            <button type="button" onClick={() => irPara(-1)} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Trimestre anterior"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => irPara(1)} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Próximo trimestre"><ChevronRight size={20} /></button>
            <h1 className="font-display font-bold text-su-lg text-content-strong">{M ? M.intervalo.rotulo : 'Relatório trimestral'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-su-xs text-content-muted hidden sm:inline">{FOLHAS.length} folhas A4 · Ctrl+P ou “Salvar como PDF”</span>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!M}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
            >
              <Printer size={16} /> Imprimir
            </button>
          </div>
        </div>
        {dados.avisos.length > 0 && <p className="max-w-[210mm] mx-auto px-4 pb-2 text-su-xs text-warning-fg">{dados.avisos.join(' ')}</p>}
      </div>

      {!M ? (
        <div className="flex items-center justify-center gap-2 py-24 text-su-sm text-content-muted">
          <Loader2 size={18} className="animate-spin" /> Calculando o trimestre…
        </div>
      ) : (
        FOLHAS.map((Folha, i) => <Folha key={i} M={M} ctx={ctx} numero={i + 1} />)
      )}
    </div>,
    document.body
  );
}
