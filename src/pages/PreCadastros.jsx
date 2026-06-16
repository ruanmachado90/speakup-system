import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, doc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import {
  ClipboardList, User, Phone, CreditCard,
  CheckCircle, X, Eye, Archive, Loader2, Search, Calendar,
  Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useUI } from '../context/UIContext';

const col = (name) => collection(db, 'artifacts', APP_ID, 'public', 'data', name);

const STATUS_CFG = {
  pendente:   { label: 'Pendente',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  convertido: { label: 'Convertido', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  arquivado:  { label: 'Arquivado',  bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-200' },
};

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pendente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 break-all">{value}</span>
    </div>
  );
}

function ConfirmarMatriculaModal({ reg, onClose, onConfirm, saving }) {
  const [fee, setFee] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  });
  const [installments, setInstallments] = useState(12);
  const [erro, setErro] = useState('');

  const handleSubmit = () => {
    if (!fee || Number(fee) <= 0) return setErro('Informe um valor de mensalidade válido.');
    if (!dueDate) return setErro('Informe a data de vencimento da 1ª parcela.');
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-[#005DE4] text-white p-2 rounded-lg"><CheckCircle size={18} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Confirmar Matrícula</h3>
              <p className="text-sm text-slate-500">{reg.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumo do aluno */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
            {reg.celular && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-28 shrink-0 text-xs pt-0.5">Celular</span>
                <span className="text-slate-700">{reg.celular}</span>
              </div>
            )}
            {reg.email && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-28 shrink-0 text-xs pt-0.5">Email</span>
                <span className="text-slate-700">{reg.email}</span>
              </div>
            )}
            {reg.formaPagamento && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-28 shrink-0 text-xs pt-0.5">Pagamento</span>
                <span className="text-slate-700">
                  {reg.formaPagamento}{reg.diaVencimento ? ` · Dia ${reg.diaVencimento}` : ''}
                </span>
              </div>
            )}
            {reg.papel === 'responsavel' && reg.responsavelNome && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-28 shrink-0 text-xs pt-0.5">Responsável</span>
                <span className="text-slate-700">{reg.responsavelNome}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            Defina os valores do contrato para gerar as parcelas automaticamente.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor da mensalidade (R$)</label>
            <input
              type="number" min="0" step="0.01" value={fee}
              onChange={e => { setFee(e.target.value); setErro(''); }}
              placeholder="Ex: 350.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento da 1ª parcela</label>
            <input
              type="date" value={dueDate}
              onChange={e => { setDueDate(e.target.value); setErro(''); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de parcelas</label>
            <input
              type="number" min="1" max="24" value={installments}
              onChange={e => { setInstallments(e.target.value); setErro(''); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
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
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#005DE4] text-white rounded-lg text-sm font-semibold hover:bg-[#0041a8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
              : <><CheckCircle size={15} /> Confirmar matrícula</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalheModal({ reg, onClose, onConverter, onArquivar, convertendo }) {
  const [open, setOpen] = useState({ aluno: true, responsavel: false, pagamento: false });
  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-55 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0e48fe]/10 flex items-center justify-center text-[#0e48fe] font-bold text-base">
              {(reg.nome || '?')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{reg.nome}</h3>
              <div className="mt-0.5"><Badge status={reg.status} /></div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

          {/* Seção Aluno */}
          <div>
            <button onClick={() => toggle('aluno')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User size={14} className="text-[#0e48fe]" /> Dados do Aluno</span>
              {open.aluno ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {open.aluno && (
              <div className="px-5 pb-3">
                <InfoRow label="CPF"              value={reg.cpf} />
                <InfoRow label="Celular"          value={reg.celular} />
                <InfoRow label="E-mail"           value={reg.email} />
                <InfoRow label="Data nasc."       value={reg.dataNascimento ? new Date(reg.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
                <InfoRow label="CEP"              value={reg.cep} />
                <InfoRow label="Endereço"         value={reg.endereco} />
              </div>
            )}
          </div>

          {/* Seção Responsável */}
          {reg.papel === 'responsavel' && (
            <div>
              <button onClick={() => toggle('responsavel')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 text-left">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Users size={14} className="text-[#0e48fe]" /> Responsável</span>
                {open.responsavel ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>
              {open.responsavel && (
                <div className="px-5 pb-3">
                  <InfoRow label="Nome"    value={reg.responsavelNome} />
                  <InfoRow label="CPF"     value={reg.responsavelCpf} />
                  <InfoRow label="Celular" value={reg.responsavelCelular} />
                  <InfoRow label="E-mail"  value={reg.responsavelEmail} />
                </div>
              )}
            </div>
          )}

          {/* Seção Pagamento */}
          <div>
            <button onClick={() => toggle('pagamento')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CreditCard size={14} className="text-[#0e48fe]" /> Preferências de Pagamento</span>
              {open.pagamento ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {open.pagamento && (
              <div className="px-5 pb-3">
                <InfoRow label="Forma"         value={reg.formaPagamento} />
                <InfoRow label="Vencimento"    value={reg.diaVencimento ? `Todo dia ${reg.diaVencimento}` : null} />
                <InfoRow label="Notificação"   value={reg.notificacaoCobranca} />
              </div>
            )}
          </div>

          {/* Data envio */}
          <div className="px-5 py-3">
            <InfoRow
              label="Enviado em"
              value={reg.createdAt?.toDate ? reg.createdAt.toDate().toLocaleString('pt-BR') : '—'}
            />
          </div>
        </div>

        {/* Footer */}
        {reg.status === 'pendente' && (
          <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={() => onArquivar(reg.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Archive size={15} /> Arquivar
            </button>
            <button
              onClick={() => onConverter(reg)}
              disabled={convertendo}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0e48fe] text-white rounded-xl text-sm font-semibold hover:bg-[#0041d4] transition-colors disabled:opacity-60"
            >
              {convertendo
                ? <><Loader2 size={15} className="animate-spin" /> Convertendo...</>
                : <><CheckCircle size={15} /> Confirmar matrícula</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreCadastros() {
  const { toastMsg } = useUI();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendente');
  const [detalhe, setDetalhe] = useState(null);
  const [matriculaModal, setMatriculaModal] = useState(null); // reg a ser confirmado
  const [convertendo, setConvertendo] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(col('pre-cadastros'), snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setRegistros(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtrados = useMemo(() => {
    return registros.filter(r => {
      const matchStatus = filtroStatus === 'todos' || r.status === filtroStatus;
      const q = busca.toLowerCase();
      const matchBusca = !q || r.nome?.toLowerCase().includes(q) || r.cpf?.includes(q) || r.celular?.includes(q);
      return matchStatus && matchBusca;
    });
  }, [registros, busca, filtroStatus]);

  const pendentes = registros.filter(r => r.status === 'pendente').length;

  const handleArquivar = async (id) => {
    try {
      await updateDoc(doc(col('pre-cadastros'), id), { status: 'arquivado' });
      setDetalhe(null);
      toastMsg('Registro arquivado.');
    } catch { toastMsg('Erro ao arquivar.'); }
  };

  const handleConverter = async (reg, { fee, dueDate, installments }) => {
    setConvertendo(true);
    try {
      const isResponsavel = reg.papel === 'responsavel';

      // Cria o aluno
      const studentRef = await addDoc(col('students'), {
        name: reg.nome,
        cpf: reg.cpf || '',
        contact: reg.celular || '',
        email: reg.email || '',
        dataNascimento: reg.dataNascimento || '',
        cep: reg.cep || '',
        address: reg.endereco || '',
        responsibleName: isResponsavel ? (reg.responsavelNome || '') : '',
        responsibleContact: isResponsavel ? (reg.responsavelCelular || '') : '',
        responsibleCpf: isResponsavel ? (reg.responsavelCpf || '') : '',
        responsibleEmail: isResponsavel ? (reg.responsavelEmail || '') : '',
        formaPagamento: reg.formaPagamento || '',
        diaVencimento: reg.diaVencimento || '',
        fee: Number(fee),
        dueDate,
        installments: Number(installments),
        status: 'ativo',
        source: 'pre-cadastro',
        preCadastroId: reg.id,
        createdAt: Date.now(),
      });

      // Gera as parcelas em batch
      const batch = writeBatch(db);
      const start = new Date(dueDate + 'T00:00:00');
      for (let i = 0; i < Number(installments); i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;
        batch.set(doc(col('payments')), {
          studentId: studentRef.id,
          studentName: reg.nome,
          installmentNum: i + 1,
          valuePlanned: Number(fee),
          valuePaid: 0,
          status: 'Pendente',
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          dueDate: iso,
        });
      }
      await batch.commit();

      // Marca o pré-cadastro como convertido
      await updateDoc(doc(col('pre-cadastros'), reg.id), {
        status: 'convertido',
        convertidoEm: Date.now(),
        studentId: studentRef.id,
      });

      setMatriculaModal(null);
      setDetalhe(null);
      toastMsg(`${reg.nome} matriculado com sucesso!`);
    } catch (err) {
      console.error('[PreCadastros] Erro ao converter:', err);
      toastMsg('Erro ao confirmar matrícula. Tente novamente.');
    } finally {
      setConvertendo(false);
    }
  };

  const tabs = [
    { key: 'pendente',   label: 'Pendentes',   count: registros.filter(r => r.status === 'pendente').length },
    { key: 'convertido', label: 'Convertidos',  count: registros.filter(r => r.status === 'convertido').length },
    { key: 'arquivado',  label: 'Arquivados',   count: registros.filter(r => r.status === 'arquivado').length },
    { key: 'todos',      label: 'Todos',        count: registros.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-[#0e48fe]" />
            Pré-cadastros
            {pendentes > 0 && (
              <span className="bg-[#0e48fe] text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendentes}</span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Formulários enviados pelo link público de cadastro.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="font-mono text-xs text-[#0e48fe] font-semibold">{window.location.origin}/registro</span>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.origin + '/registro'); toastMsg('Link copiado!'); }}
            className="text-xs font-medium text-[#0e48fe] hover:underline ml-1"
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFiltroStatus(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filtroStatus === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                filtroStatus === t.key ? 'bg-[#0e48fe]/10 text-[#0e48fe]' : 'bg-slate-200 text-slate-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou celular..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0e48fe]/30 focus:border-[#0e48fe]"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro encontrado.</p>
          {filtroStatus === 'pendente' && (
            <p className="text-sm mt-1">Compartilhe o link de pré-cadastro para receber inscrições.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(reg => {
            const dt = reg.createdAt?.toDate?.();
            const dataFmt = dt ? dt.toLocaleDateString('pt-BR') : '—';
            const horaFmt = dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div
                key={reg.id}
                className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-[#0e48fe]/20 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setDetalhe(reg)}
              >
                <div className="w-10 h-10 rounded-full bg-[#0e48fe]/8 flex items-center justify-center text-[#0e48fe] font-bold text-base flex-shrink-0">
                  {(reg.nome || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{reg.nome}</span>
                    <Badge status={reg.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    {reg.celular && <span className="flex items-center gap-1"><Phone size={11} />{reg.celular}</span>}
                    {reg.formaPagamento && <span className="flex items-center gap-1"><CreditCard size={11} />{reg.formaPagamento}</span>}
                    {reg.diaVencimento && <span className="flex items-center gap-1"><Calendar size={11} />Dia {reg.diaVencimento}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 flex-shrink-0">
                  <div>{dataFmt}</div>
                  <div>{horaFmt}</div>
                </div>
                <Eye size={15} className="text-slate-300 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <DetalheModal
          reg={detalhe}
          onClose={() => setDetalhe(null)}
          onConverter={(reg) => setMatriculaModal(reg)}
          onArquivar={handleArquivar}
          convertendo={convertendo}
        />
      )}

      {/* Modal confirmar matrícula (abre por cima do detalhe) */}
      {matriculaModal && (
        <ConfirmarMatriculaModal
          reg={matriculaModal}
          saving={convertendo}
          onClose={() => setMatriculaModal(null)}
          onConfirm={(params) => handleConverter(matriculaModal, params)}
        />
      )}
    </div>
  );
}
