import { useState } from 'react';
import { UserX, BadgeDollarSign, CheckCheck } from 'lucide-react';
import { ModalShell } from '../students/MatriculaModals';
import { MOTIVOS_CANCELAMENTO } from '../../utils/matricula';
import { paraCentavos, reajustar } from '../../utils/renovacao';

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inputCls = 'w-full border border-strong bg-surface-card rounded-su-sm px-3 py-2 text-su-sm text-content-body focus:outline-none focus-visible:shadow-ring-accent';
const labelCls = 'block text-su-xs font-semibold text-content-body mb-1';
const btnSec = 'px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body hover:bg-gr-50';
const btnPri = 'px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover disabled:opacity-50';

function Rodape({ erro, salvando, rotulo, onClose }) {
  return (
    <>
      {erro && <p role="alert" className="rounded-su-sm border border-red-200 bg-red-50 px-3 py-2 text-su-sm text-red-800">{erro}</p>}
      <div className="flex justify-end gap-2 border-t border-subtle pt-4">
        <button type="button" onClick={onClose} className={btnSec}>Cancelar</button>
        <button type="submit" disabled={salvando} className={btnPri}>{salvando ? 'Salvando…' : rotulo}</button>
      </div>
    </>
  );
}

/** Executa `acao`; fecha se der certo, mostra o erro se não. */
function useEnvio(acao, onClose) {
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const enviar = async (...args) => {
    setSalvando(true);
    setErro('');
    try { await acao(...args); onClose(); } catch (e) { setErro(e.message); } finally { setSalvando(false); }
  };
  return { erro, setErro, salvando, enviar };
}

/**
 * Registra que o aluno não vai renovar. Não cancela nada de 2026: o contrato
 * atual segue até o fim; isto só tira o aluno da campanha.
 */
export function NaoRenovaraModal({ nome, onConfirmar, onClose }) {
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const { erro, setErro, salvando, enviar } = useEnvio(onConfirmar, onClose);

  const submeter = (e) => {
    e.preventDefault();
    if (!motivo) return setErro('Escolha o motivo.');
    enviar({ motivo, observacao });
  };

  return (
    <ModalShell icon={<UserX size={18} />} iconBg="bg-accent" title="Não renovará" subtitle={nome} onClose={onClose}>
      <form onSubmit={submeter} className="p-5 space-y-4" noValidate>
        <p className="text-su-sm text-content-body">
          A matrícula atual continua valendo até dezembro. O aluno só sai da lista de envio; dá para desfazer depois.
        </p>
        <label className="block"><span className={labelCls}>Motivo</span>
          <select className={inputCls} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Selecione</option>
            {MOTIVOS_CANCELAMENTO.map((m) => <option key={m} value={m}>{m}</option>)}
          </select></label>
        <label className="block"><span className={labelCls}>Observação (opcional, uso interno)</span>
          <textarea rows={3} className={inputCls} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></label>
        <Rodape erro={erro} salvando={salvando} rotulo="Registrar" onClose={onClose} />
      </form>
    </ModalShell>
  );
}

/** Confirma o registro de envio feito fora do sistema. */
export function ConfirmarEnvioModal({ quantidade, onConfirmar, onClose }) {
  const { erro, salvando, enviar } = useEnvio(onConfirmar, onClose);
  return (
    <ModalShell icon={<CheckCheck size={18} />} iconBg="bg-accent" title="Marcar como enviado" subtitle={`${quantidade} convite(s)`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="p-5 space-y-4">
        <p className="text-su-sm text-content-body">
          Use quando a mensagem já saiu por fora do sistema (outro celular, e-mail, recado). Os convites passam a contar como enviados.
          Os que estão com valor a revisar ficam de fora.
        </p>
        <Rodape erro={erro} salvando={salvando} rotulo="Marcar como enviado" onClose={onClose} />
      </form>
    </ModalShell>
  );
}

/**
 * Mensalidade-base do convite (antes do reajuste). Usado para VIP, In Company
 * e valores fora da faixa; salvar, mesmo sem mudar, confirma a revisão.
 */
export function AjustarValorModal({ nome, convite, campanha, onConfirmar, onClose }) {
  const [valor, setValor] = useState(() => (convite.mensalidadeBaseCentavos / 100).toFixed(2));
  const { erro, salvando, enviar } = useEnvio(onConfirmar, onClose);
  const base = paraCentavos(String(valor).replace(',', '.'));
  const nova = base > 0 ? reajustar(base, campanha.reajustePct, campanha.arredondamento) : 0;

  return (
    <ModalShell icon={<BadgeDollarSign size={18} />} iconBg="bg-accent" title="Valor da renovação" subtitle={nome} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); enviar(String(valor).replace(',', '.')); }} className="p-5 space-y-4" noValidate>
        <p className="text-su-sm text-content-body">
          Mensalidade atual no sistema: <strong>{brl(convite.mensalidadeAtualCentavos)}</strong>.
          Informe a base de {campanha.anoLetivo}; o reajuste de {String(campanha.reajustePct).replace('.', ',')}% é aplicado em cima dela.
        </p>
        <label className="block"><span className={labelCls}>Mensalidade-base (R$)</span>
          <input type="text" inputMode="decimal" className={inputCls} value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /></label>
        <p className="text-su-sm text-content-body tabular-nums">
          Mensalidade {campanha.anoLetivo}: <strong className="text-content-strong">{nova ? brl(nova) : '—'}</strong>
        </p>
        <Rodape erro={erro} salvando={salvando} rotulo="Salvar valor" onClose={onClose} />
      </form>
    </ModalShell>
  );
}
