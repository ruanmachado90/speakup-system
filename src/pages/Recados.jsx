import React, { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Check, Trash2, Send, RefreshCw, Plus, X, ChevronDown } from 'lucide-react';
import { PROFESSORES } from '../constants/turmasConfig';
import { buildProfessorSlug } from '../utils/turmas';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useUI } from '../context/UIContext';

const TIPOS = {
  geral:    { label: 'Geral',    color: 'bg-slate-100 text-slate-700 border-slate-300' },
  falta:    { label: 'Falta',    color: 'bg-amber-100 text-amber-700 border-amber-300' },
  material: { label: 'Material', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  urgente:  { label: 'Urgente',  color: 'bg-red-100 text-red-700 border-red-300' },
};

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const FORM_INICIAL = { professor: '', tipo: 'geral', texto: '' };

export function Recados() {
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();
  const { toastMsg } = useUI();

  const [recados, setRecados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos | nao-lidos | lidos | enviados
  const [resposta, setResposta] = useState({}); // { [id]: texto }
  const [sending, setSending] = useState({});

  // ── Enviar recado para professor ─────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'recados'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRecados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const marcarLido = async (id) => {
    try {
      await updateDoc(doc(db, 'recados', id), { lido: true, lidoEm: Date.now() });
    } catch (err) {
      console.error('[Recados] Erro ao marcar como lido:', err);
      toastMsg('Erro ao marcar recado como lido.');
    }
  };

  const excluir = async (id) => {
    const ok = await requestConfirm({
      title: 'Excluir recado',
      message: 'Excluir este recado permanentemente?',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'recados', id));
    } catch (err) {
      console.error('[Recados] Erro ao excluir recado:', err);
      toastMsg('Erro ao excluir recado.');
    }
  };

  const enviarResposta = async (recado) => {
    const texto = (resposta[recado.id] || '').trim();
    if (!texto) return;
    setSending(s => ({ ...s, [recado.id]: true }));
    try {
      await updateDoc(doc(db, 'recados', recado.id), {
        lido: true,
        lidoEm: Date.now(),
        resposta: texto,
        respondidoEm: Date.now(),
      });
      setResposta(r => ({ ...r, [recado.id]: '' }));
    } catch (err) {
      console.error('[Recados] Erro ao enviar resposta:', err);
      toastMsg('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSending(s => ({ ...s, [recado.id]: false }));
    }
  };

  const enviarRecado = async (e) => {
    e.preventDefault();
    if (!form.professor || !form.texto.trim()) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, 'recados'), {
        professor: form.professor,
        professorSlug: buildProfessorSlug(form.professor),
        tipo: form.tipo,
        texto: form.texto.trim(),
        lido: false,
        createdAt: Date.now(),
        origem: 'admin', // distingue recados enviados pela coordenação
      });
      setForm(FORM_INICIAL);
      setShowForm(false);
    } catch (err) {
      console.error('[Recados] Erro ao enviar recado:', err);
      toastMsg('Erro ao enviar recado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const filtrados = recados.filter(r => {
    if (filtro === 'nao-lidos') return !r.lido && !r.origem;
    if (filtro === 'lidos')     return r.lido && !r.origem;
    if (filtro === 'enviados')  return r.origem === 'admin';
    return true;
  });

  const naoLidos = recados.filter(r => !r.lido && !r.origem).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-5 h-28 border" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={22} className="text-[#005DE4]" />
            Recados
          </h2>
          {naoLidos > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {naoLidos} novo{naoLidos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'todos',     label: 'Todos' },
            { id: 'nao-lidos', label: 'Não lidos' },
            { id: 'lidos',     label: 'Lidos' },
            { id: 'enviados',  label: 'Enviados por mim' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtro === f.id
                  ? 'bg-[#005DE4] text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => { setShowForm(v => !v); setForm(FORM_INICIAL); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancelar' : 'Enviar recado'}
          </button>
        </div>
      </div>

      {/* Formulário de envio de recado para professor */}
      {showForm && (
        <form
          onSubmit={enviarRecado}
          className="bg-white border border-emerald-200 rounded-xl p-5 mb-5 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Send size={16} className="text-emerald-600" />
            Enviar recado para professor
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Professor */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Professor *</label>
              <select
                value={form.professor}
                onChange={e => setForm(f => ({ ...f, professor: e.target.value }))}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {PROFESSORES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(TIPOS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mensagem *</label>
            <textarea
              value={form.texto}
              onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
              required
              rows={3}
              placeholder="Digite o recado para o professor..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(FORM_INICIAL); }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !form.professor || !form.texto.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum recado encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtrados.map(r => {
            const tipo = TIPOS[r.tipo] || TIPOS.geral;
            const isEnviado = r.origem === 'admin';
            return (
              <div
                key={r.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  isEnviado
                    ? 'border-emerald-200 border-l-4 border-l-emerald-500'
                    : !r.lido
                    ? 'border-l-4 border-l-[#005DE4] shadow-sm'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header do recado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{r.professor}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tipo.color}`}>
                      {tipo.label}
                    </span>
                    {isEnviado && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                        Enviado por mim
                      </span>
                    )}
                    {!isEnviado && !r.lido && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        Novo
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(r.createdAt)}</span>
                </div>

                {/* Texto */}
                <p className="text-slate-700 text-sm mb-3 leading-relaxed">{r.texto}</p>

                {/* Resposta existente */}
                {r.resposta && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-emerald-600 font-semibold mb-1">Resposta da coordenação:</p>
                    <p className="text-sm text-emerald-800">{r.resposta}</p>
                    <p className="text-xs text-emerald-500 mt-1">{formatDate(r.respondidoEm)}</p>
                  </div>
                )}

                {/* Campo de resposta — só para recados recebidos dos professores */}
                {!isEnviado && !r.resposta && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Responder ao professor..."
                      value={resposta[r.id] || ''}
                      onChange={e => setResposta(prev => ({ ...prev, [r.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && enviarResposta(r)}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4]"
                    />
                    <button
                      onClick={() => enviarResposta(r)}
                      disabled={sending[r.id] || !resposta[r.id]?.trim()}
                      className="flex items-center gap-1 px-3 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] disabled:opacity-40 transition-colors text-sm"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  {!isEnviado && !r.lido && (
                    <button
                      onClick={() => marcarLido(r.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <Check size={12} />
                      Marcar como lido
                    </button>
                  )}
                  <button
                    onClick={() => excluir(r.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}
