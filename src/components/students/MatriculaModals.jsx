import { useState } from 'react';
import { CheckCircle, RotateCcw, X, Loader2 } from 'lucide-react';

export function ConfirmarMatriculaModal({ preCad, onConfirm, onClose, saving }) {
  const [fee, setFee] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  });
  const [installments, setInstallments] = useState(12);
  const [erro, setErro] = useState('');

  const handleSubmit = () => {
    if (!dueDate) return setErro('Informe a data de vencimento.');
    if (!fee || Number(fee) <= 0) return setErro('Informe um valor de mensalidade válido.');
    if (!installments || Number(installments) < 1) return setErro('Informe ao menos 1 parcela.');
    setErro('');
    onConfirm({ fee: Number(fee), dueDate, installments: Number(installments) });
  };

  const previewEnd = (() => {
    if (!dueDate || !installments) return null;
    const d = new Date(dueDate + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(installments) - 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-[#005DE4] text-white p-2 rounded-lg"><CheckCircle size={18} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Confirmar Matrícula</h3>
              <p className="text-sm text-slate-500">{preCad.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-100">
            {preCad.celular && <div className="flex gap-2"><span className="text-slate-400 w-24 shrink-0 text-xs">Celular</span><span className="text-slate-700">{preCad.celular}</span></div>}
            {preCad.email && <div className="flex gap-2"><span className="text-slate-400 w-24 shrink-0 text-xs">Email</span><span className="text-slate-700">{preCad.email}</span></div>}
            {preCad.formaPagamento && <div className="flex gap-2"><span className="text-slate-400 w-24 shrink-0 text-xs">Pagamento</span><span className="text-slate-700">{preCad.formaPagamento}{preCad.diaVencimento ? ` · Dia ${preCad.diaVencimento}` : ''}</span></div>}
            {preCad.responsavelNome && <div className="flex gap-2"><span className="text-slate-400 w-24 shrink-0 text-xs">Responsável</span><span className="text-slate-700">{preCad.responsavelNome}</span></div>}
          </div>
          <p className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            Defina os valores do contrato para gerar as parcelas automaticamente.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor da mensalidade (R$)</label>
            <input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} placeholder="Ex: 350.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento da 1ª parcela</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de parcelas</label>
            <input type="number" min="1" max="24" value={installments} onChange={e => setInstallments(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]" />
          </div>
          {previewEnd && Number(fee) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm text-blue-800">
              <span className="font-semibold">{installments}x</span> de{' '}
              <span className="font-semibold">R$ {Number(fee).toFixed(2).replace('.', ',')}</span>
              {' '}— até <span className="font-semibold">{previewEnd}</span>
            </div>
          )}
          {erro && <p className="text-red-500 text-xs">{erro}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2 bg-[#005DE4] text-white rounded-lg text-sm font-semibold hover:bg-[#0041a8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><CheckCircle size={15} /> Confirmar matrícula</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReativarMatriculaModal({ aluno, onConfirm, onClose, saving }) {
  const [fee, setFee] = useState(aluno.fee ?? '');
  const [dueDate, setDueDate] = useState(() => {
    if (aluno.dueDate) return aluno.dueDate.slice(0, 10);
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  });
  const [installments, setInstallments] = useState(aluno.installments ?? 12);
  const [erro, setErro] = useState('');

  const handleSubmit = () => {
    if (!dueDate) return setErro('Informe a data de vencimento.');
    if (!fee || Number(fee) <= 0) return setErro('Informe um valor de mensalidade válido.');
    if (!installments || Number(installments) < 1) return setErro('Informe ao menos 1 parcela.');
    setErro('');
    onConfirm({ studentName: aluno.name, fee: Number(fee), dueDate, installments: Number(installments) });
  };

  const previewEnd = (() => {
    if (!dueDate || !installments) return null;
    const d = new Date(dueDate + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(installments) - 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-2 rounded-lg"><RotateCcw size={18} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Reativar Matrícula</h3>
              <p className="text-sm text-slate-500">{aluno.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5">
            Informe as condições do novo contrato. Novas parcelas serão geradas automaticamente.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor da mensalidade (R$)</label>
            <input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} placeholder="Ex: 350.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento da 1ª parcela</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de parcelas</label>
            <input type="number" min="1" max="24" value={installments} onChange={e => setInstallments(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          {previewEnd && Number(fee) > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm text-emerald-800">
              <span className="font-semibold">{installments}x</span> de{' '}
              <span className="font-semibold">R$ {Number(fee).toFixed(2).replace('.', ',')}</span>
              {' '}— até <span className="font-semibold">{previewEnd}</span>
            </div>
          )}
          {erro && <p className="text-red-500 text-xs">{erro}</p>}
        </div>

        <div className="flex justify-between items-center px-5 pb-5 gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><RotateCcw size={15} /> Reativar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
