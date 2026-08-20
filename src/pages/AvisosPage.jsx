import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send, Plus, X, ChevronDown, ChevronUp,
  MessageSquare, Clock, CheckCheck, Inbox, AlertCircle,
} from 'lucide-react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ProfessorPageHeader } from '../components/professor/PageLoading';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  geral:    { label: 'Geral',    bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-l-blue-400' },
  urgente:  { label: 'Urgente',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-l-red-500'  },
  material: { label: 'Material', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-l-purple-400' },
  falta:    { label: 'Falta',    bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-l-amber-400' },
};

function fmtTempo(ts) {
  if (!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 1)   return `${Math.floor((now - d) / 60000)}min atrás`;
  if (diffH < 24)  return `${Math.floor(diffH)}h atrás`;
  if (diffH < 48)  return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.geral;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Card de mensagem recebida ─────────────────────────────────────────────────
function CardRecebido({ msg, professorNome, onMarcarLido, onResponder, onDeletar }) {
  const [aberto, setAberto] = useState(false);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = TIPO_CONFIG[msg.tipo] || TIPO_CONFIG.geral;

  const handleAbrir = () => {
    setAberto(v => !v);
    if (!msg.lido) onMarcarLido(msg.id);
  };

  const handleResponder = async () => {
    if (!resposta.trim()) return;
    setEnviando(true);
    await onResponder(msg.id, resposta.trim());
    setResposta('');
    setEnviando(false);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 overflow-hidden ${cfg.border}`}>
      {/* Cabeçalho clicável */}
      <button className="w-full text-left px-4 py-3.5 flex items-start gap-3" onClick={handleAbrir}>
        {/* Avatar secretaria */}
        <div className="w-9 h-9 rounded-full bg-[#005DE4] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-sm font-bold">S</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600">Secretaria</span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtTempo(msg.createdAt)}</span>
          </div>
          <p className={`text-sm mt-0.5 leading-snug line-clamp-2 ${!msg.lido ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
            {msg.texto}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <TipoBadge tipo={msg.tipo} />
            {!msg.lido && (
              <span className="w-2 h-2 rounded-full bg-[#005DE4] inline-block" />
            )}
            {msg.resposta && (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCheck size={11} /> Respondido
              </span>
            )}
          </div>
        </div>

        {aberto ? <ChevronUp size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                 : <ChevronDown size={16} className="text-slate-400 mt-1 flex-shrink-0" />}
      </button>

      {/* Conteúdo expandido */}
      {aberto && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-sm text-slate-700 leading-relaxed pt-3">{msg.texto}</p>

          {/* Ações rápidas */}
          <div className="flex items-center gap-2 mt-3">
            {!msg.lido && (
              <button
                onClick={() => onMarcarLido(msg.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#005DE4] border border-[#005DE4]/30 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <CheckCheck size={13} /> Marcar como lido
              </button>
            )}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
              >
                <X size={13} /> Excluir
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500">Confirmar?</span>
                <button
                  onClick={() => onDeletar(msg.id)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg"
                >
                  Não
                </button>
              </div>
            )}
          </div>

          {/* Resposta enviada */}
          {msg.resposta && (
            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-emerald-600 font-bold mb-1 uppercase tracking-wide">
                Sua resposta
              </p>
              <p className="text-xs text-slate-700">{msg.resposta}</p>
            </div>
          )}

          {/* Input para responder */}
          {!msg.resposta && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResponder()}
                placeholder="Responder à secretaria..."
                className="flex-1 text-sm border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] bg-slate-50"
              />
              <button
                onClick={handleResponder}
                disabled={!resposta.trim() || enviando}
                className="w-10 h-10 bg-[#005DE4] text-white rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card de mensagem enviada ──────────────────────────────────────────────────
function CardEnviado({ msg, onDeletar }) {
  const [aberto, setAberto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-slate-300 overflow-hidden">
      <button className="w-full text-left px-4 py-3.5 flex items-start gap-3" onClick={() => setAberto(v => !v)}>
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-slate-600 text-sm font-bold">Eu</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600">Para: Secretaria</span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtTempo(msg.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{msg.texto}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <TipoBadge tipo={msg.tipo} />
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              {msg.lido
                ? <><CheckCheck size={11} className="text-[#005DE4]" /> Lido</>
                : <><Clock size={11} /> Enviado</>}
            </span>
          </div>
        </div>
        {aberto ? <ChevronUp size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                 : <ChevronDown size={16} className="text-slate-400 mt-1 flex-shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-700 leading-relaxed">{msg.texto}</p>
          <div className="flex justify-end mt-3">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X size={13} /> Excluir
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Confirmar?</span>
                <button
                  onClick={() => onDeletar(msg.id)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg"
                >
                  Não
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal novo aviso ──────────────────────────────────────────────────────────
function ModalNovoAviso({ professorNome, professorSlug, onClose, onEnviado }) {
  const [texto, setTexto]   = useState('');
  const [tipo, setTipo]     = useState('geral');
  const [enviando, setEnviando] = useState(false);
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, 'recados'), {
        professor: professorNome,
        professorSlug,
        texto: texto.trim(),
        tipo,
        lido: false,
        createdAt: Date.now(),
      });
      onEnviado();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Novo aviso para secretaria</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                tipo === key
                  ? `${cfg.bg} ${cfg.text} border-current`
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Texto */}
        <textarea
          ref={textRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escreva sua mensagem para a secretaria..."
          rows={4}
          className="w-full border-2 border-slate-200 focus:border-[#005DE4] rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none transition-colors"
        />

        <button
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
          className="mt-3 w-full bg-[#005DE4] text-white font-bold py-3.5 rounded-2xl text-base disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Send size={18} />
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AvisosPage() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  const professorNome = professorSlug
    ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? '';

  const [aba, setAba]               = useState('recebidos');
  const [recebidos, setRecebidos]   = useState([]);
  const [enviados, setEnviados]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [toastMsg, setToastMsg]     = useState('');
  const [loadError, setLoadError]   = useState(false);

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // ── Listeners Firestore ───────────────────────────────────────────────────
  useEffect(() => {
    if (!professorSlug) return;

    // Recebidos (admin → professor)
    const qR = query(
      collection(db, 'recados'),
      where('professorSlug', '==', professorSlug),
      where('origem', '==', 'admin'),
      orderBy('createdAt', 'desc')
    );
    const unsubR = onSnapshot(qR, snap => {
      setRecebidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Erro ao carregar avisos recebidos:', err);
      setLoadError(true);
      setLoading(false);
    });

    // Enviados (professor → secretaria)
    const qE = query(
      collection(db, 'recados'),
      where('professorSlug', '==', professorSlug),
      orderBy('createdAt', 'desc')
    );
    const unsubE = onSnapshot(qE, snap => {
      // Filtra apenas os que o professor enviou (sem origem: 'admin')
      setEnviados(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.origem !== 'admin')
      );
    }, err => {
      console.error('Erro ao carregar avisos enviados:', err);
      setLoadError(true);
    });

    return () => { unsubR(); unsubE(); };
  }, [professorSlug]);

  const marcarLido = async (id) => {
    try {
      await updateDoc(doc(db, 'recados', id), { lido: true, lidoEm: Date.now() });
    } catch (err) {
      console.error('Erro ao marcar aviso como lido:', err);
      toast('Não foi possível marcar como lido. Tente novamente.');
    }
  };

  const responder = async (id, texto) => {
    try {
      await updateDoc(doc(db, 'recados', id), {
        resposta: texto,
        respondidoEm: Date.now(),
      });
    } catch (err) {
      console.error('Erro ao responder aviso:', err);
      toast('Não foi possível enviar a resposta. Tente novamente.');
    }
  };

  const deletar = async (id) => {
    try {
      await deleteDoc(doc(db, 'recados', id));
      toast('Aviso excluído');
    } catch (err) {
      console.error('Erro ao excluir aviso:', err);
      toast('Não foi possível excluir. Tente novamente.');
    }
  };

  const naoLidos = recebidos.filter(r => !r.lido).length;
  const lista    = aba === 'recebidos' ? recebidos : enviados;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      <ProfessorPageHeader
        onBack={() => navigate(`/professor/${professorSlug}/home`)}
        title="Avisos"
        subtitle={naoLidos > 0 ? `${naoLidos} não lido${naoLidos > 1 ? 's' : ''}` : 'Tudo em dia'}
        accent="#D7263D"
        rightSlot={
          <button
            onClick={() => setShowCompose(true)}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Plus size={20} className="text-white" />
          </button>
        }
      >
        {/* Abas */}
        <div className="relative flex mt-3 -mb-4">
          {['recebidos', 'enviados'].map(tab => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              className={`flex-1 py-2.5 text-sm font-bold capitalize transition-all border-b-2 ${
                aba === tab
                  ? 'text-white border-white'
                  : 'text-blue-100 border-transparent hover:text-white'
              }`}
            >
              {tab === 'recebidos' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Inbox size={14} /> Recebidos
                  {naoLidos > 0 && (
                    <span className="bg-white text-[#D7263D] text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {naoLidos}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Send size={14} /> Enviados
                </span>
              )}
            </button>
          ))}
        </div>
      </ProfessorPageHeader>

      {/* Lista de mensagens */}
      <div className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        {loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400">
            <AlertCircle size={40} className="mb-3 opacity-60" />
            <p className="font-semibold text-sm text-red-500">Não foi possível carregar os avisos</p>
            <p className="text-xs text-slate-400 mt-1">Verifique sua conexão e tente novamente.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-[#005DE4]/20 border-t-[#005DE4] rounded-full animate-spin mb-3" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="font-semibold text-sm">
              {aba === 'recebidos' ? 'Nenhum aviso recebido' : 'Nenhuma mensagem enviada'}
            </p>
            {aba === 'enviados' && (
              <button
                onClick={() => setShowCompose(true)}
                className="mt-4 px-5 py-2 bg-[#005DE4] text-white rounded-xl text-sm font-semibold"
              >
                Enviar mensagem
              </button>
            )}
          </div>
        ) : (
          lista.map(msg =>
            aba === 'recebidos' ? (
              <CardRecebido
                key={msg.id}
                msg={msg}
                professorNome={professorNome}
                onMarcarLido={marcarLido}
                onResponder={responder}
                onDeletar={deletar}
              />
            ) : (
              <CardEnviado key={msg.id} msg={msg} onDeletar={deletar} />
            )
          )
        )}
      </div>

      {/* FAB — compor nova mensagem */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-6 right-5 w-14 h-14 bg-[#005DE4] text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all z-40"
      >
        <Plus size={26} />
      </button>

      {/* Modal compor */}
      {showCompose && (
        <ModalNovoAviso
          professorNome={professorNome}
          professorSlug={professorSlug}
          onClose={() => setShowCompose(false)}
          onEnviado={() => { setAba('enviados'); toast('Mensagem enviada!'); }}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg z-50">
          {toastMsg}
        </div>
      )}

    </div>
  );
}
