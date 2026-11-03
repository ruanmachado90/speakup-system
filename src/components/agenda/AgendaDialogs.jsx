import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Send, Trash2, Users } from 'lucide-react';
import {
  TIPOS_EVENTO, validarEvento, minutosParaHora, alunosAtivosDaTurma, STATUS_OCORRENCIA, dataPorExtenso,
} from '../../utils/agendaProfessor';
import { horaEmMinutos } from '../../utils/professorDashboard';
import { ESTILO_STATUS, campo, rotulo, botaoPrimario, botaoSecundario } from './estiloAgenda';

export function Dialogo({ titulo, subtitulo, onClose, children, rodape }) {
  useEffect(() => {
    const fechar = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [onClose]);

  // Portal no body: o diálogo também abre de dentro do botão flutuante do
  // painel do professor, que tem o próprio z-index.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-surface-card rounded-t-su-xl sm:rounded-su-xl shadow-drawer"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-subtle">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-su-h4 text-content-strong leading-su-snug">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-su-sm text-content-muted first-letter:uppercase">{subtitulo}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 -m-1 rounded-su-xs text-content-muted hover:text-content-strong" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {rodape && <div className="px-5 py-3 border-t border-subtle flex flex-wrap items-center justify-end gap-2">{rodape}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Criar ou editar compromisso. `inicial` traz data/horário do clique na grade
 * (ou o evento inteiro, para editar — aí aparece "Excluir").
 */
export function EventoDialog({ inicial, professorNome, onSalvar, onExcluir, onClose }) {
  const editando = !!inicial.id;
  const [form, setForm] = useState(() => ({
    tipo: 'experimental',
    titulo: TIPOS_EVENTO.experimental,
    aluno: '',
    link: '',
    observacoes: '',
    ...inicial,
    fim: inicial.fim || minutosParaHora(Math.min(horaEmMinutos(inicial.inicio) + 60, 23 * 60 + 30)),
  }));
  const [avisar, setAvisar] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Título acompanha o tipo enquanto ninguém o editou à mão.
  const mudarTipo = (e) => {
    const tipo = e.target.value;
    setForm((f) => ({ ...f, tipo, titulo: f.titulo === TIPOS_EVENTO[f.tipo] || !f.titulo ? TIPOS_EVENTO[tipo] : f.titulo }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    const msg = validarEvento(form);
    if (msg) { setErro(msg); return; }
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(form, { id: inicial.id || null, avisar });
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar. Tente de novo.');
      setSalvando(false);
    }
  };

  const excluir = async () => {
    setSalvando(true);
    try {
      await onExcluir(inicial, { avisar });
    } catch (err) {
      setErro(err.message || 'Não foi possível excluir. Tente de novo.');
      setSalvando(false);
    }
  };

  const primeiroNome = (professorNome || '').split(' ')[0];

  return (
    <Dialogo
      titulo={editando ? 'Editar compromisso' : 'Novo compromisso'}
      subtitulo={`Agenda de ${professorNome}`}
      onClose={onClose}
      rodape={(
        <>
          {editando && (
            <button type="button" onClick={excluir} disabled={salvando} className={`${botaoSecundario} mr-auto text-danger-fg border-danger`}>
              <Trash2 size={15} /> Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="submit" form="form-evento" disabled={salvando} className={botaoPrimario}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Agendar'}
          </button>
        </>
      )}
    >
      <form id="form-evento" onSubmit={salvar} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={rotulo} htmlFor="ev-tipo">Tipo</label>
          <select id="ev-tipo" value={form.tipo} onChange={mudarTipo} className={campo}>
            {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={rotulo} htmlFor="ev-titulo">Título</label>
          <input id="ev-titulo" value={form.titulo} onChange={mudar('titulo')} className={campo} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={rotulo} htmlFor="ev-data">Data</label>
          <input id="ev-data" type="date" value={form.data} onChange={mudar('data')} className={campo} />
        </div>
        <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
          <div>
            <label className={rotulo} htmlFor="ev-inicio">Início</label>
            <input id="ev-inicio" type="time" step="300" value={form.inicio} onChange={mudar('inicio')} className={campo} />
          </div>
          <div>
            <label className={rotulo} htmlFor="ev-fim">Fim</label>
            <input id="ev-fim" type="time" step="300" value={form.fim} onChange={mudar('fim')} className={campo} />
          </div>
        </div>
        <div className="col-span-2">
          <label className={rotulo} htmlFor="ev-aluno">Aluno ou interessado <span className="font-normal text-content-faint">(opcional)</span></label>
          <input id="ev-aluno" value={form.aluno} onChange={mudar('aluno')} placeholder="Ex.: Maria Souza (lead)" className={campo} />
        </div>
        <div className="col-span-2">
          <label className={rotulo} htmlFor="ev-link">Link da aula <span className="font-normal text-content-faint">(opcional)</span></label>
          <input id="ev-link" type="url" value={form.link} onChange={mudar('link')} placeholder="https://meet.google.com/…" className={campo} />
          {editando && <div className="mt-1"><LinkDoEvento link={inicial.link} /></div>}
        </div>
        <div className="col-span-2">
          <label className={rotulo} htmlFor="ev-obs">Observações <span className="font-normal text-content-faint">(o professor vê)</span></label>
          <textarea id="ev-obs" rows={2} value={form.observacoes} onChange={mudar('observacoes')} className={campo} />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-su-sm text-content-body">
          <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent)]" />
          Avisar {primeiroNome || 'o professor'} no painel (recado em Avisos)
        </label>
        {erro && <p className="col-span-2 text-su-sm text-danger-fg" role="alert">{erro}</p>}
      </form>
    </Dialogo>
  );
}

const STATUS_CHAMADA = { presente: 'Presente', falta: 'Falta', justificada: 'Falta justificada' };

/** Detalhe de uma aula da grade: turma, alunos e o que foi registrado. */
export function OcorrenciaDialog({ item, students, professorNome, onLembrar, onClose }) {
  const { turma, aula, status } = item;
  const [lembrete, setLembrete] = useState('');
  const alunos = alunosAtivosDaTurma(turma, students);
  const chamadas = aula?.chamadas || [];
  const presentes = chamadas.filter((c) => c.status === 'presente').length;
  const nomeDoAluno = (id) => students.find((s) => s.id === id)?.name;
  const estilo = ESTILO_STATUS[status];
  const primeiroNome = (professorNome || '').split(' ')[0];

  const lembrar = async () => {
    setLembrete('enviando');
    try {
      await onLembrar(turma, item.iso);
      setLembrete('enviado');
    } catch (err) {
      console.error('[Agenda] Erro ao enviar lembrete:', err);
      setLembrete('erro');
    }
  };

  return (
    <Dialogo
      titulo={turma.nome || 'Turma'}
      subtitulo={`${dataPorExtenso(item.iso)} · ${minutosParaHora(item.inicio)}–${minutosParaHora(item.fim)}${item.estimado ? ' (término não cadastrado)' : ''}`}
      onClose={onClose}
      rodape={status === 'pendente' ? (
        <button type="button" onClick={lembrar} disabled={lembrete === 'enviando' || lembrete === 'enviado'} className={botaoPrimario}>
          <Send size={15} />
          {lembrete === 'enviado' ? 'Lembrete enviado' : lembrete === 'enviando' ? 'Enviando…' : `Lembrar ${primeiroNome || 'o professor'} de registrar`}
        </button>
      ) : null}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-su-xs font-semibold border ${estilo.caixa}`}>
            {status === 'nao-letivo' ? `Sem aula · ${item.naoLetivo}` : status === 'cancelada' ? `Sem aula · ${aula.status}` : STATUS_OCORRENCIA[status]}
          </span>
          {turma.nivel && <span className="text-su-xs text-content-muted">Nível {turma.nivel}</span>}
        </div>
        {lembrete === 'erro' && <p className="text-su-sm text-danger-fg" role="alert">Não foi possível enviar o lembrete. Tente de novo.</p>}

        {aula && (status === 'registrada' || status === 'cancelada') && (
          <section className="space-y-2">
            <h3 className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">Registro</h3>
            {aula.conteudo ? <p className="text-su-sm text-content-body whitespace-pre-line">{aula.conteudo}</p> : <p className="text-su-sm text-content-faint">Sem conteúdo lançado.</p>}
            {aula.homework && <p className="text-su-sm text-content-body"><span className="font-semibold">Homework:</span> {aula.homework}</p>}
            {chamadas.length > 0 && (
              <div>
                <p className="text-su-sm font-semibold text-content-strong mb-1">Chamada: {presentes} de {chamadas.length} presentes</p>
                <ul className="text-su-sm border border-subtle rounded-su-sm">
                  {chamadas.map((c) => (
                    <li key={c.alunoId} className="flex justify-between gap-3 px-3 py-1.5 border-b border-subtle last:border-b-0">
                      <span className="truncate text-content-body">{nomeDoAluno(c.alunoId) || c.alunoNome || 'Aluno removido'}</span>
                      <span className={c.status === 'presente' ? 'text-success-fg' : 'text-content-muted'}>{STATUS_CHAMADA[c.status] || c.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {!aula && (
          <section>
            <h3 className="flex items-center gap-1.5 text-su-2xs font-semibold uppercase tracking-caps text-content-muted mb-2">
              <Users size={13} /> Alunos ({alunos.length})
            </h3>
            {alunos.length === 0 ? (
              <p className="text-su-sm text-content-faint">Nenhum aluno ativo nesta turma.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {alunos.map((a) => (
                  <li key={a.id} className="px-2 py-0.5 rounded-su-xs bg-surface-sunken text-su-xs text-content-body">{a.name}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Dialogo>
  );
}

function LinkDoEvento({ link }) {
  if (!link) return null;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-su-sm text-accent hover:underline break-all">
      <ExternalLink size={14} /> {link}
    </a>
  );
}
