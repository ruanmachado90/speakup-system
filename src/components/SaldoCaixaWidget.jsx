import { useState, useEffect } from 'react';
import { Wallet, Pencil, Check, X } from 'lucide-react';
import { useSaldosBancarios } from '../hooks/useSaldosBancarios';
import { MONTHS_PT } from '../utils/constants';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * "Sobrevivo?" — o KPI que o relatório antigo não tinha. Lucro contábil e
 * variação de caixa são coisas diferentes: em agosto/2026 o sistema anunciou
 * R$16k de lucro num mês em que a conta caiu de R$1.644 pra R$929.
 * Entrada manual (sem integração bancária ainda): um saldo inicial/final por mês.
 */
export default function SaldoCaixaWidget({ filterMonth, filterYear }) {
  const { doMes, salvarSaldo, loading } = useSaldosBancarios();
  const registro = doMes(filterMonth, filterYear);
  const [editando, setEditando] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saldoFinal, setSaldoFinal] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setSaldoInicial(registro?.saldoInicial ?? '');
    setSaldoFinal(registro?.saldoFinal ?? '');
    setEditando(false);
  }, [registro?.id, registro?.saldoInicial, registro?.saldoFinal, filterMonth, filterYear]);

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarSaldo(filterMonth, filterYear, { saldoInicial, saldoFinal });
      setEditando(false);
    } catch (err) {
      console.error('[SaldoCaixaWidget] Erro ao salvar saldo:', err);
      alert('Erro ao salvar o saldo em caixa.');
    } finally {
      setSalvando(false);
    }
  };

  const temAmbos = registro?.saldoInicial != null && registro?.saldoFinal != null;
  const delta = temAmbos ? registro.saldoFinal - registro.saldoInicial : null;

  if (loading) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-[#0e48fe]" />
          <div>
            <h3 className="font-bold text-sm text-slate-800">Saldo em caixa — {MONTHS_PT[filterMonth]} {filterYear}</h3>
            <p className="text-xs text-slate-400">A pergunta é: sobrevivo? Lucro e variação de caixa não são a mesma coisa.</p>
          </div>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#0e48fe] hover:underline"
          >
            <Pencil size={13} /> {temAmbos ? 'Editar' : 'Registrar saldo do mês'}
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={handleSalvar} className="flex flex-wrap items-end gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo inicial (R$)</label>
            <input
              type="number" step="0.01" value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="border px-3 py-2 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-[#0e48fe]"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo final (R$)</label>
            <input
              type="number" step="0.01" value={saldoFinal}
              onChange={(e) => setSaldoFinal(e.target.value)}
              className="border px-3 py-2 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-[#0e48fe]"
              placeholder="0,00"
            />
          </div>
          <button type="submit" disabled={salvando} className="flex items-center gap-1 px-3 py-2 bg-[#0e48fe] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
            <Check size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setEditando(false)} className="flex items-center gap-1 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm">
            <X size={15} /> Cancelar
          </button>
        </form>
      ) : temAmbos ? (
        <div className="flex items-center gap-6 mt-3 flex-wrap">
          <div>
            <div className="text-xs text-slate-400">Inicial</div>
            <div className="text-lg font-bold text-slate-700">{fmt(registro.saldoInicial)}</div>
          </div>
          <div className="text-slate-300 text-xl">→</div>
          <div>
            <div className="text-xs text-slate-400">Final</div>
            <div className="text-lg font-bold text-slate-800">{fmt(registro.saldoFinal)}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {delta >= 0 ? '+' : ''}{fmt(delta)} no mês
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 mt-3">Sem saldo registrado neste mês — dado indisponível no relatório até você preencher.</p>
      )}
    </div>
  );
}
