import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ModalShell } from '../students/MatriculaModals';
import { validarCampanha } from '../../utils/renovacaoPainel';

const FORMAS = ['PIX', 'Boleto', 'Dinheiro', 'Cartão de crédito'];
const DIAS = [5, 10, 15, 20, 25];

const inputCls = 'w-full border border-strong bg-surface-card rounded-su-sm px-3 py-2 text-su-sm text-content-body focus:outline-none focus-visible:shadow-ring-accent';
const labelCls = 'block text-su-xs font-semibold text-content-body mb-1';
const secaoCls = 'space-y-3 border-t border-subtle pt-4';
const tituloCls = 'font-display font-bold text-su-sm text-content-strong';

const numero = (v) => (v === '' ? NaN : Number(v));

/** Configuração da campanha de renovação. Só admin. */
export default function ConfigCampanhaModal({ campanha, onSalvar, onClose }) {
  const [c, setC] = useState(() => structuredClone(campanha));
  const [erros, setErros] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const set = (patch) => setC((atual) => ({ ...atual, ...patch }));
  const setPlano = (id, patch) => set({ planos: c.planos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setNoPrazo = (patch) => set({ descontoRenovacaoNoPrazo: { ...c.descontoRenovacaoNoPrazo, ...patch } });
  const alternar = (lista, item) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = validarCampanha(c);
    setErros(encontrados);
    if (encontrados.length) return;
    setSalvando(true);
    try {
      const r = await onSalvar(c);
      if (r?.ok) onClose();
      else setErros(r?.erros || ['Não foi possível salvar.']);
    } catch (err) {
      setErros([`Erro ao salvar: ${err.message}`]);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalShell icon={<SlidersHorizontal size={18} />} iconBg="bg-accent" title={`Configurar a renovação ${c.anoLetivo}`} subtitle="Os valores do painel e dos links seguem esta configuração" onClose={onClose}>
      <form onSubmit={enviar} className="p-5 space-y-4" noValidate>
        <div className="space-y-3">
          <p className={tituloCls}>Período da campanha</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Abertura</span>
              <input type="date" className={inputCls} value={c.abertura || ''} onChange={(e) => set({ abertura: e.target.value || null })} /></label>
            <label className="block"><span className={labelCls}>Encerramento</span>
              <input type="date" className={inputCls} value={c.encerramento || ''} onChange={(e) => set({ encerramento: e.target.value || null })} /></label>
          </div>
        </div>

        <div className={secaoCls}>
          <p className={tituloCls}>Reajuste</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Reajuste (%)</span>
              <input type="number" step="0.1" min="0" className={inputCls} value={c.reajustePct} onChange={(e) => set({ reajustePct: numero(e.target.value) })} /></label>
            <label className="block"><span className={labelCls}>Arredondamento</span>
              <select className={inputCls} value={c.arredondamento} onChange={(e) => set({ arredondamento: e.target.value })}>
                <option value="centavos">Centavos</option>
                <option value="real">Real inteiro</option>
              </select></label>
          </div>
        </div>

        <div className={secaoCls}>
          <p className={tituloCls}>Planos e descontos</p>
          <p className="text-su-xs text-content-muted">Nenhum desconto acumula: em cada plano vale o maior que se aplicar.</p>
          {c.planos.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_8rem] items-end gap-3">
              <div>
                <p className="text-su-sm font-semibold text-content-strong">{p.rotulo}</p>
                <p className="text-su-xs text-content-muted">{p.meses.length === 1 ? '1 pagamento em janeiro' : p.meses.length === 2 ? '2 pagamentos: janeiro e julho' : `${p.meses.length} parcelas, janeiro a dezembro`}</p>
              </div>
              <label className="block"><span className={labelCls}>Desconto (%)</span>
                <input type="number" step="0.5" min="0" className={inputCls} value={p.descontoPct} onChange={(e) => setPlano(p.id, { descontoPct: numero(e.target.value) })} /></label>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Renovação no prazo (%) — 12x</span>
              <input type="number" step="0.5" min="0" className={inputCls} value={c.descontoRenovacaoNoPrazo.pct} onChange={(e) => setNoPrazo({ pct: numero(e.target.value) })} /></label>
            <label className="block"><span className={labelCls}>Pagar a 1ª parcela até</span>
              <input type="date" className={inputCls} value={c.descontoRenovacaoNoPrazo.primeiraParcelaPagaAte || ''} onChange={(e) => setNoPrazo({ primeiraParcelaPagaAte: e.target.value || null })} /></label>
          </div>
          <label className="block w-1/2 pr-1.5"><span className={labelCls}>Desconto de irmão (%) — marcado aluno a aluno</span>
            <input type="number" step="0.5" min="0" className={inputCls} value={c.descontoIrmao?.pct ?? 0} onChange={(e) => set({ descontoIrmao: { pct: numero(e.target.value) } })} /></label>
        </div>

        <div className={secaoCls}>
          <p className={tituloCls}>Pagamento</p>
          <fieldset>
            <legend className={labelCls}>Formas de pagamento</legend>
            <div className="flex flex-wrap gap-3">
              {FORMAS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-su-sm text-content-body">
                  <input type="checkbox" className="accent-accent" checked={c.formasPagamento.includes(f)} onChange={() => set({ formasPagamento: alternar(c.formasPagamento, f) })} />{f}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Dias de vencimento</legend>
            <div className="flex flex-wrap gap-3">
              {DIAS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-su-sm text-content-body">
                  <input type="checkbox" className="accent-accent" checked={c.diasVencimento.includes(d)} onChange={() => set({ diasVencimento: alternar(c.diasVencimento, d).sort((a, b) => a - b) })} />Dia {d}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className={secaoCls}>
          <p className={tituloCls}>Revisão manual de valor</p>
          <p className="text-su-xs text-content-muted">Mensalidades fora desta faixa, ou de cursos com estes nomes, ficam marcadas para a secretaria conferir antes do envio.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={labelCls}>Mínimo (R$)</span>
              <input type="number" min="0" className={inputCls} value={c.faixaMensalidadeRegular?.min ?? ''} onChange={(e) => set({ faixaMensalidadeRegular: { ...c.faixaMensalidadeRegular, min: numero(e.target.value) } })} /></label>
            <label className="block"><span className={labelCls}>Máximo (R$)</span>
              <input type="number" min="0" className={inputCls} value={c.faixaMensalidadeRegular?.max ?? ''} onChange={(e) => set({ faixaMensalidadeRegular: { ...c.faixaMensalidadeRegular, max: numero(e.target.value) } })} /></label>
          </div>
          <label className="block"><span className={labelCls}>Cursos (separados por vírgula)</span>
            <input type="text" className={inputCls} value={(c.cursosRevisaoManual || []).join(', ')} onChange={(e) => set({ cursosRevisaoManual: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></label>
        </div>

        {erros.length > 0 && (
          <ul role="alert" className="rounded-su-sm border border-red-200 bg-red-50 px-3 py-2 text-su-sm text-red-800 list-disc list-inside">
            {erros.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="flex justify-end gap-2 border-t border-subtle pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body hover:bg-gr-50">Cancelar</button>
          <button type="submit" disabled={salvando} className="px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Salvar configuração'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
