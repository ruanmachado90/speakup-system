import { useEffect, useState } from 'react';
import { FilePlus2, MessageCircle, Link2, CheckCheck, X } from 'lucide-react';
import {
  podeEnviar, gruposDeEnvio, linkDoConvite, csvConvites, SITUACAO_CONVITE,
} from '../../utils/renovacaoEnvio';
import FilaEnvio from './FilaEnvio';
import { NaoRenovaraModal, AjustarValorModal, ConfirmarEnvioModal } from './ConviteModais';

const TONS_AVISO = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

/** Aviso curto no canto da tela; some sozinho (erro fica até fechar). */
function useAviso() {
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    if (!aviso || aviso.tipo === 'error') return undefined;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);
  const mostrar = (texto, tipo = 'info') => setAviso({ texto, tipo, id: Date.now() });
  const elemento = aviso && (
    <div role={aviso.tipo === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-su-md border px-4 py-3 shadow-card text-su-sm flex items-start gap-3 ${TONS_AVISO[aviso.tipo]}`}>
      <span className="flex-1">{aviso.texto}</span>
      <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100"><X size={16} /></button>
    </div>
  );
  return [mostrar, elemento];
}

const btnCls = 'px-3 py-1.5 rounded-su-sm border border-strong bg-surface-card text-su-xs font-semibold text-content-body flex items-center gap-1.5 hover:bg-gr-50 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';
const btnPri = 'px-3 py-1.5 rounded-su-sm bg-accent text-white text-su-xs font-semibold flex items-center gap-1.5 hover:bg-accent-hover disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';

const origem = () => window.location.origin;

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

function baixar(nome, conteudo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Ações da etapa 3 sobre os convites: barra da seleção (gerar, enviar,
 * copiar, marcar enviado), ações de cada linha, modais e fila de envio.
 * Devolve { barra, onAcao, exportar, camadas } para a página montar.
 */
export function useAcoesRenovacao({ renovacoes, campanha, linhas, selecionados, students, uid }) {
  const [showToast, avisoElemento] = useAviso();
  const [modal, setModal] = useState(null); // { tipo: 'naoRenovara' | 'valor' | 'marcarEnviados', l? }
  const [fila, setFila] = useState(null);   // grupos congelados ao abrir
  const [ocupado, setOcupado] = useState(false);

  const aberta = campanha?.status === 'aberta';
  const sel = linhas.filter((l) => selecionados.has(l.id));
  const semConvite = sel.filter((l) => !l.convite);
  const enviaveis = sel.filter((l) => podeEnviar(l.convite));
  const prontos = enviaveis.filter((l) => !l.convite.revisarValor);
  const aRevisar = enviaveis.length - prontos.length;
  const student = (id) => students.find((s) => s.id === id);

  const executar = async (fn, sucesso) => {
    setOcupado(true);
    try { const r = await fn(); if (sucesso) showToast(sucesso(r), 'success'); } catch (e) { showToast(e.message, 'error'); } finally { setOcupado(false); }
  };

  const gerar = () => executar(
    () => renovacoes.gerarConvites({ itens: semConvite.map((l) => ({ student: student(l.id), linha: l })), campanha, por: uid }),
    (n) => `${n} convite(s) gerado(s). Nada foi enviado ainda.`
  );

  const abrirFila = () => {
    if (aRevisar) showToast(`${aRevisar} aluno(s) com valor a revisar ficaram fora da fila.`, 'warning');
    setFila(gruposDeEnvio(prontos.map((l) => ({ convite: l.convite, telefone: l.telefone, responsavel: l.responsavel || l.nome }))));
  };

  const copiarLinks = async () => {
    const texto = enviaveis.map((l) => `${l.nome}: ${linkDoConvite(origem(), l.convite.codigo)}`).join('\n');
    showToast((await copiar(texto)) ? `${enviaveis.length} link(s) copiado(s).` : 'Não foi possível copiar.', 'info');
  };

  const exportar = () => {
    const com = linhas.filter((l) => l.convite);
    if (!com.length) return showToast('Ainda não há convites para exportar.', 'info');
    baixar(`renovacao-${campanha.anoLetivo}.csv`, csvConvites(com.map((l) => ({
      aluno: l.nome, responsavel: l.responsavel, telefone: l.telefone, curso: l.curso,
      mensalidadeAtual: l.convite.mensalidadeAtualCentavos, mensalidadeNova: l.convite.mensalidadeNovaCentavos,
      status: (SITUACAO_CONVITE[l.convite.status] || [l.convite.status])[0],
      link: linkDoConvite(origem(), l.convite.codigo),
    }))));
  };

  const onAcao = async (tipo, l) => {
    const c = l.convite;
    if (tipo === 'copiar') {
      showToast((await copiar(linkDoConvite(origem(), c.codigo))) ? `Link de ${l.nome} copiado.` : 'Não foi possível copiar.', 'info');
    } else if (tipo === 'irmao') {
      executar(() => renovacoes.marcarIrmao(c.codigo, !c.descontoIrmao, uid), () => (c.descontoIrmao ? 'Desconto de irmão retirado.' : 'Desconto de irmão marcado.'));
    } else if (tipo === 'desfazer') {
      executar(() => renovacoes.desfazerNaoRenovara(c.codigo, uid), () => `${l.nome} voltou para a campanha.`);
    } else {
      setModal({ tipo, l });
    }
  };

  const avisoFechada = aberta ? undefined : 'Abra a campanha na configuração para enviar';
  const barra = selecionados.size > 0 && (
    <>
      <button type="button" className={btnCls} disabled={!semConvite.length || ocupado} onClick={gerar}>
        <FilePlus2 size={14} aria-hidden="true" /> Gerar convites ({semConvite.length})
      </button>
      <button type="button" className={btnCls} disabled={!enviaveis.length} onClick={copiarLinks}>
        <Link2 size={14} aria-hidden="true" /> Copiar links ({enviaveis.length})
      </button>
      <button type="button" className={btnCls} disabled={!aberta || !prontos.length || ocupado} title={avisoFechada} onClick={() => setModal({ tipo: 'marcarEnviados' })}>
        <CheckCheck size={14} aria-hidden="true" /> Marcar como enviado
      </button>
      <button type="button" className={btnPri} disabled={!aberta || !prontos.length} title={avisoFechada} onClick={abrirFila}>
        <MessageCircle size={14} aria-hidden="true" /> Enviar por WhatsApp ({prontos.length})
      </button>
    </>
  );

  const fechar = () => setModal(null);
  const camadas = (
    <>
      {modal?.tipo === 'naoRenovara' && (
        <NaoRenovaraModal nome={modal.l.nome} onClose={fechar}
          onConfirmar={({ motivo, observacao }) => (modal.l.convite
            ? renovacoes.marcarNaoRenovara(modal.l.convite.codigo, { motivo, observacao, por: uid })
            : renovacoes.naoRenovaraSemConvite({ student: student(modal.l.id), linha: modal.l, campanha, motivo, observacao, por: uid }))} />
      )}
      {modal?.tipo === 'valor' && (
        <AjustarValorModal nome={modal.l.nome} convite={modal.l.convite} campanha={campanha} onClose={fechar}
          onConfirmar={(valor) => renovacoes.ajustarBase(modal.l.convite.codigo, valor, campanha, uid)} />
      )}
      {modal?.tipo === 'marcarEnviados' && (
        <ConfirmarEnvioModal quantidade={prontos.length} onClose={fechar}
          onConfirmar={async () => {
            await renovacoes.registrarEnvio(prontos.map((l) => l.convite.codigo), { canal: 'manual', por: uid });
            showToast('Envio registrado.', 'success');
          }} />
      )}
      {fila && (
        <FilaEnvio grupos={fila.grupos} semTelefone={fila.semTelefone} campanha={campanha} origem={origem()}
          onEnviado={(codigos, canal) => renovacoes.registrarEnvio(codigos, { canal, por: uid })} onClose={() => setFila(null)} />
      )}
      {avisoElemento}
    </>
  );

  return { barra, onAcao, exportar, camadas, aberta };
}
