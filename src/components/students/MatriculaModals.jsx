import { useState } from 'react';
import { CheckCircle, RotateCcw, X, Loader2 } from 'lucide-react';
import { CursoBookSelect, TeacherSelect, ContratoFinanceiroFields, AvisoCpfExistente } from './MatriculaFields';
import { lerCamposMatricula, validarContrato, proximaDataParaDia, MOTIVOS_CANCELAMENTO } from '../../utils/matricula';

function ModalShell({ icon, iconBg, title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`${iconBg} text-white p-2 rounded-lg`}>{icon}</div>
            <div>
              <h3 className="font-bold text-slate-800">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Confirma um pré-cadastro online como matrícula: pede curso, book, professor e
 * o contrato financeiro — antes só o financeiro, e o aluno entrava sem curso e
 * sem professor. O 1º vencimento já vem no dia que a família escolheu.
 */
export function ConfirmarMatriculaModal({ preCad, duplicados = [], onConfirm, onReativarExistente, onDescartar, onClose, saving }) {
  const [erro, setErro] = useState('');
  const bloqueado = duplicados.some((s) => s.status !== 'cancelado');

  const handleSubmit = (e) => {
    e.preventDefault();
    const campos = lerCamposMatricula(new FormData(e.currentTarget));
    const problema = validarContrato(campos);
    if (problema) return setErro(problema);
    setErro('');
    onConfirm(campos);
  };

  return (
    <ModalShell icon={<CheckCircle size={18} />} iconBg="bg-[#0e48fe]" title="Confirmar Matrícula" subtitle={preCad.nome} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <AvisoCpfExistente duplicados={duplicados} onReativar={onReativarExistente} onDescartar={onDescartar} />

          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-100">
            {preCad.cpf && <Linha rotulo="CPF" valor={preCad.cpf} />}
            {preCad.celular && <Linha rotulo="Celular" valor={preCad.celular} />}
            {preCad.email && <Linha rotulo="Email" valor={preCad.email} />}
            {preCad.formaPagamento && <Linha rotulo="Pagamento" valor={`${preCad.formaPagamento}${preCad.diaVencimento ? ` · Dia ${preCad.diaVencimento}` : ''}`} />}
            {preCad.responsavelNome && <Linha rotulo="Responsável" valor={`${preCad.responsavelNome}${preCad.responsavelCpf ? ` · CPF ${preCad.responsavelCpf}` : ''}`} />}
          </div>

          <CursoBookSelect />
          <TeacherSelect required />
          <ContratoFinanceiroFields defaultFee="" defaultDueDate={proximaDataParaDia(preCad.diaVencimento)} />

          {erro && <p role="alert" className="text-red-600 text-sm">{erro}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving || bloqueado}
            className="flex-1 py-2 bg-[#0e48fe] text-white rounded-lg text-sm font-semibold hover:bg-[#0b3ad4] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><CheckCircle size={15} /> Confirmar matrícula</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const Linha = ({ rotulo, valor }) => (
  <div className="flex gap-2"><span className="text-slate-400 w-24 shrink-0 text-xs">{rotulo}</span><span className="text-slate-700">{valor}</span></div>
);

/**
 * Reativa uma matrícula cancelada: novo contrato financeiro e, se mudou,
 * curso/professor (quem volta costuma voltar em outro nível).
 */
export function ReativarMatriculaModal({ aluno, turmas = [], onConfirm, onClose, saving }) {
  const [erro, setErro] = useState('');

  // Turmas de onde saiu no cancelamento que ainda existem.
  const turmasAnteriores = (aluno.turmasNoCancelamento || [])
    .map((t) => turmas.find((x) => x.id === t.id))
    .filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const campos = lerCamposMatricula(fd);
    const problema = validarContrato(campos);
    if (problema) return setErro(problema);
    setErro('');
    onConfirm({ ...campos, studentName: aluno.name, voltarTurmaIds: fd.getAll('voltarTurmaIds') });
  };

  return (
    <ModalShell icon={<RotateCcw size={18} />} iconBg="bg-emerald-500" title="Reativar Matrícula" subtitle={aluno.name} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5">
            Confira curso e professor e informe o novo contrato. As parcelas serão geradas automaticamente.
          </p>
          <CursoBookSelect defaultCurso={aluno.course} defaultBook={aluno.book} />
          <TeacherSelect defaultValue={aluno.teacher} defaultProfessorId={aluno.professorId} required />
          {turmasAnteriores.length > 0 && (
            <fieldset className="border border-slate-200 rounded-lg px-3 py-2.5">
              <legend className="text-sm font-bold text-slate-600 px-1">Voltar para a turma anterior</legend>
              {turmasAnteriores.map((t) => {
                const ocupados = (t.alunosIds || []).length;
                const lotada = t.maxAlunos && ocupados >= t.maxAlunos;
                return (
                  <label key={t.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input type="checkbox" name="voltarTurmaIds" value={t.id} defaultChecked={!lotada} />
                    <span>{t.nome} <span className="text-slate-400">· {t.professor} · {ocupados}/{t.maxAlunos || '?'} alunos</span></span>
                    {lotada && <span className="text-xs font-semibold text-amber-700">lotada</span>}
                  </label>
                );
              })}
            </fieldset>
          )}
          <ContratoFinanceiroFields
            accent="green"
            defaultFee={aluno.fee ?? ''}
            defaultDueDate={proximaDataParaDia(aluno.dueDate ? Number(String(aluno.dueDate).slice(8, 10)) : null)}
            defaultInstallments={aluno.installments ?? 12}
          />
          {erro && <p role="alert" className="text-red-600 text-sm">{erro}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><RotateCcw size={15} /> Reativar</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/**
 * Cancelamento com motivo obrigatório (lista fechada) — serve pra um aluno ou
 * pra seleção em lote. Substitui o confirm() do navegador.
 */
export function CancelarMatriculaModal({ nomes, resumo, onConfirm, onClose, saving }) {
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [manterVencidas, setManterVencidas] = useState(true);
  const [erro, setErro] = useState('');
  const varios = nomes.length > 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo) return setErro('Escolha o motivo do cancelamento.');
    setErro('');
    onConfirm({ motivo, observacao: observacao.trim(), manterVencidas });
  };

  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <ModalShell
      icon={<X size={18} />}
      iconBg="bg-red-500"
      title={varios ? `Cancelar ${nomes.length} matrículas` : 'Cancelar matrícula'}
      subtitle={varios ? `${nomes.slice(0, 3).join(', ')}${nomes.length > 3 ? '…' : ''}` : nomes[0]}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <ul className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-2.5 space-y-1 list-disc list-inside">
            <li>
              {resumo?.turmas?.length
                ? <>Sai {varios ? 'das turmas' : 'da turma'} <strong>{resumo.turmas.join(', ')}</strong> (vaga liberada, some da chamada).</>
                : 'Não está em nenhuma turma.'}
            </li>
            <li>Parcelas que vencem de hoje em diante são canceladas. Parcelas pagas continuam no histórico.</li>
          </ul>
          {resumo?.vencidas > 0 && (
            <label className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={manterVencidas} onChange={(e) => setManterVencidas(e.target.checked)} className="mt-0.5" />
              <span>
                Manter em aberto <strong>{resumo.vencidas} parcela(s) vencida(s)</strong> ({brl(resumo.valorVencido)}). O valor continua na inadimplência para cobrança.
                <span className="block text-xs text-amber-700 mt-0.5">Desmarque só se a dívida foi negociada ou perdoada.</span>
              </span>
            </label>
          )}
          <div className="flex flex-col">
            <label htmlFor="cancel-motivo" className="text-sm font-bold text-slate-600 mb-1">Motivo</label>
            <select id="cancel-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required
              className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white">
              <option value="">Selecione o motivo</option>
              {MOTIVOS_CANCELAMENTO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="cancel-obs" className="text-sm font-bold text-slate-600 mb-1">Observação (opcional)</label>
            <textarea id="cancel-obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          {erro && <p role="alert" className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Voltar</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Cancelando...</> : 'Cancelar matrícula'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
