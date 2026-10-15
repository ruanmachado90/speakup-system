import { useEffect, useRef, useState } from 'react';
import { X, MessageCircle, Copy, SkipForward, PhoneOff, Check } from 'lucide-react';
import { mensagemDoGrupo, urlWhatsApp } from '../../utils/renovacaoEnvio';

const btnSec = 'px-3 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body flex items-center gap-2 hover:bg-gr-50 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';
const btnPri = 'px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold flex items-center gap-2 hover:bg-accent-hover disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

/** Contato que não vai pelo WhatsApp: copia a mensagem e marca à mão. */
function OutroMeio({ grupo, mensagem, onEnviado }) {
  const [estado, setEstado] = useState('');
  const codigos = grupo.itens.map((i) => i.convite.codigo);
  return (
    <li className="rounded-su-sm border border-subtle p-3 space-y-2">
      <p className="text-su-sm font-semibold text-content-strong">{grupo.itens.map((i) => i.convite.alunoNome).join(', ')}</p>
      <p className="text-su-xs text-content-muted">{grupo.responsavel} · {grupo.telefone || 'sem telefone no cadastro'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSec} onClick={async () => setEstado((await copiar(mensagem)) ? 'Mensagem copiada.' : 'Não foi possível copiar.')}>
          <Copy size={14} aria-hidden="true" /> Copiar mensagem
        </button>
        <button type="button" className={btnSec} disabled={estado === 'enviado'}
          onClick={async () => { try { await onEnviado(codigos, 'manual'); setEstado('enviado'); } catch (e) { setEstado(e.message); } }}>
          <Check size={14} aria-hidden="true" /> {estado === 'enviado' ? 'Marcado como enviado' : 'Marcar como enviado'}
        </button>
      </div>
      {estado && estado !== 'enviado' && <p role="status" className="text-su-xs text-content-muted">{estado}</p>}
    </li>
  );
}

/**
 * Fila de envio pelo WhatsApp: uma família por vez (irmãos com o mesmo
 * telefone numa mensagem só). O botão principal já vem focado, então Enter
 * abre o WhatsApp, registra o envio e passa para a próxima.
 */
export default function FilaEnvio({ grupos, semTelefone, campanha, origem, onEnviado, onClose }) {
  const [indice, setIndice] = useState(0);
  const [enviados, setEnviados] = useState(0);
  const [pulados, setPulados] = useState(0);
  const [semWhatsApp, setSemWhatsApp] = useState([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const principal = useRef(null);

  const msg = (grupo) => mensagemDoGrupo({ modelo: campanha.mensagemWhatsApp, grupo, campanha, origem });
  const atual = grupos[indice];
  const proximo = () => { setErro(''); setIndice((i) => i + 1); };

  useEffect(() => { principal.current?.focus(); }, [indice]);
  useEffect(() => {
    const fechar = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [onClose]);

  const enviarAtual = async () => {
    // abre a aba já no clique (senão o navegador bloqueia o pop-up)
    window.open(urlWhatsApp(atual.telefone, msg(atual)), '_blank', 'noopener');
    setOcupado(true);
    try {
      await onEnviado(atual.itens.map((i) => i.convite.codigo), 'whatsapp');
      setEnviados((n) => n + 1);
      proximo();
    } catch (e) {
      setErro(`O WhatsApp abriu, mas o envio não foi registrado: ${e.message}`);
    } finally {
      setOcupado(false);
    }
  };

  const outros = [
    ...semWhatsApp,
    ...semTelefone.map((item) => ({ chave: item.convite.codigo, telefone: '', responsavel: item.responsavel || item.convite.alunoNome, itens: [item] })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="fila-titulo">
      <div className="h-full w-full max-w-lg bg-surface-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-subtle p-4">
          <div>
            <h3 id="fila-titulo" className="font-display font-bold text-content-strong">Envio pelo WhatsApp</h3>
            <p className="text-su-xs text-content-muted tabular-nums">
              {Math.min(indice + 1, grupos.length)} de {grupos.length} · {enviados} enviado(s) · {pulados} pulado(s)
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-su-sm hover:bg-gr-50 text-content-muted"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {atual ? (
            <>
              <div>
                <p className="text-su-xs uppercase tracking-wide text-content-muted">Para</p>
                <p className="font-semibold text-content-strong">{atual.responsavel}</p>
                <p className="text-su-sm text-content-body tabular-nums">{atual.telefone}</p>
                <ul className="mt-2 space-y-1">
                  {atual.itens.map((i) => (
                    <li key={i.convite.codigo} className="text-su-sm text-content-body">
                      {i.convite.alunoNome}
                      {i.convite.temPendencia && <span className="ml-2 text-su-xs font-semibold text-orange-800">tem parcela vencida</span>}
                      {i.convite.enviosQtd > 0 && <span className="ml-2 text-su-xs text-content-muted">já enviado {i.convite.enviosQtd}x</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-su-xs uppercase tracking-wide text-content-muted mb-1">Mensagem</p>
                <p className="whitespace-pre-wrap break-words rounded-su-sm border border-subtle bg-surface-sunken p-3 text-su-sm text-content-body">{msg(atual)}</p>
              </div>
              {erro && <p role="alert" className="rounded-su-sm border border-red-200 bg-red-50 px-3 py-2 text-su-sm text-red-800">{erro}</p>}
              <div className="flex flex-wrap gap-2">
                <button ref={principal} type="button" className={btnPri} disabled={ocupado} onClick={enviarAtual}>
                  <MessageCircle size={16} aria-hidden="true" /> Abrir WhatsApp e marcar enviado
                </button>
                <button type="button" className={btnSec} onClick={() => { setPulados((n) => n + 1); proximo(); }}>
                  <SkipForward size={14} aria-hidden="true" /> Pular
                </button>
                <button type="button" className={btnSec} onClick={() => { setSemWhatsApp((l) => [...l, atual]); proximo(); }}>
                  <PhoneOff size={14} aria-hidden="true" /> Sem WhatsApp
                </button>
              </div>
              <p className="text-su-xs text-content-muted">Enter abre o WhatsApp da família atual. Pular deixa o convite como está para enviar depois.</p>
            </>
          ) : (
            <div className="rounded-su-sm border border-emerald-200 bg-emerald-50 p-3 text-su-sm text-emerald-900">
              {grupos.length ? `Fila concluída: ${enviados} enviado(s), ${pulados} pulado(s).` : 'Nenhuma família com telefone na fila.'}
            </div>
          )}

          {outros.length > 0 && (
            <div className="space-y-2 border-t border-subtle pt-4">
              <p className="font-display font-bold text-su-sm text-content-strong">Contato por outro meio ({outros.length})</p>
              <p className="text-su-xs text-content-muted">Sem telefone válido no cadastro ou sem WhatsApp. Copie a mensagem, envie como preferir e marque como enviado.</p>
              <ul className="space-y-2">
                {outros.map((g) => <OutroMeio key={g.chave} grupo={g} mensagem={msg(g)} onEnviado={onEnviado} />)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
