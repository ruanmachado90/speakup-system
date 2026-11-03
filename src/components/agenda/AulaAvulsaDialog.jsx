import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialogo } from './AgendaDialogs';
import { campo, rotulo, botaoPrimario, botaoSecundario } from './estiloAgenda';
import { TIPOS_AVULSA, validarAulaAvulsa } from '../../utils/aulasAvulsas';
import { blocosDaTurma, minutosParaHora, dataPorExtenso } from '../../utils/agendaProfessor';
import { dataLocalISO } from '../../utils/aulas';

// Horário de costume da turma como sugestão (o professor ajusta).
function horarioSugerido(turma) {
  const [bloco] = turma ? blocosDaTurma(turma) : [];
  if (!bloco) return { inicio: '', fim: '' };
  return { inicio: minutosParaHora(bloco.inicio), fim: minutosParaHora(bloco.fim) };
}

/**
 * Registrar reposição ou aula extra — fora da grade da turma, sem contar no
 * andamento do curso. Usado no painel do professor e na agenda da gestão.
 * `alunosDaTurma(turma)` devolve [{ id, name }].
 */
export function AulaAvulsaDialog({ turmas, alunosDaTurma, onSalvar, onClose }) {
  const [form, setForm] = useState(() => {
    const turma = turmas.length === 1 ? turmas[0] : null;
    return {
      tipo: 'reposicao', turmaId: turma?.id || '', data: dataLocalISO(), ...horarioSugerido(turma),
      alunosIds: [], conteudo: '', observacoes: '',
    };
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const turma = turmas.find((t) => t.id === form.turmaId) || null;
  const alunos = turma ? alunosDaTurma(turma) : [];
  const mudar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Aula extra costuma ser para a turma toda; reposição, para um ou dois.
  const escolherTurma = (e) => {
    const nova = turmas.find((t) => t.id === e.target.value) || null;
    setForm((f) => ({
      ...f,
      turmaId: nova?.id || '',
      ...horarioSugerido(nova),
      alunosIds: nova && f.tipo === 'extra' ? alunosDaTurma(nova).map((a) => a.id) : [],
    }));
  };
  const alternarAluno = (id) => setForm((f) => ({
    ...f,
    alunosIds: f.alunosIds.includes(id) ? f.alunosIds.filter((x) => x !== id) : [...f.alunosIds, id],
  }));

  const salvar = async (e) => {
    e.preventDefault();
    const msg = validarAulaAvulsa(form);
    if (msg) { setErro(msg); return; }
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(form, turma, alunos);
    } catch (err) {
      console.error('[AulaAvulsa] Erro ao salvar:', err);
      setErro(err.code === 'permission-denied'
        ? 'Sem permissão para gravar aula avulsa. Avise a coordenação.'
        : 'Não foi possível salvar. Verifique a conexão e tente de novo.');
      setSalvando(false);
    }
  };

  return (
    <Dialogo
      titulo="Aula avulsa"
      subtitulo="Reposição ou aula extra, fora do horário da turma"
      onClose={onClose}
      rodape={(
        <>
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="submit" form="form-avulsa" disabled={salvando} className={botaoPrimario}>
            {salvando ? 'Salvando…' : 'Registrar aula'}
          </button>
        </>
      )}
    >
      <form id="form-avulsa" onSubmit={salvar} className="grid grid-cols-2 gap-3">
        <fieldset className="col-span-2">
          <legend className={rotulo}>Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TIPOS_AVULSA).map(([k, v]) => (
              <button
                key={k}
                type="button"
                aria-pressed={form.tipo === k}
                onClick={() => setForm((f) => ({ ...f, tipo: k }))}
                className={`px-3 py-2 rounded-su-sm border text-su-sm font-semibold transition-colors duration-fast ${form.tipo === k ? 'bg-accent border-accent text-white' : 'border-strong text-content-body hover:bg-surface-sunken'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="col-span-2">
          <label className={rotulo} htmlFor="av-turma">Turma</label>
          <select id="av-turma" value={form.turmaId} onChange={escolherTurma} className={campo}>
            <option value="">Escolha a turma…</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome || 'Turma sem nome'}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={rotulo} htmlFor="av-data">Data</label>
          <input id="av-data" type="date" value={form.data} onChange={mudar('data')} className={campo} />
        </div>
        <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
          <div>
            <label className={rotulo} htmlFor="av-inicio">Início</label>
            <input id="av-inicio" type="time" step="300" value={form.inicio} onChange={mudar('inicio')} className={campo} />
          </div>
          <div>
            <label className={rotulo} htmlFor="av-fim">Fim</label>
            <input id="av-fim" type="time" step="300" value={form.fim} onChange={mudar('fim')} className={campo} />
          </div>
        </div>

        {turma && (
          <fieldset className="col-span-2">
            <div className="flex items-baseline justify-between mb-1">
              <legend className="text-su-xs font-semibold text-content-body">Quem participou</legend>
              {alunos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, alunosIds: f.alunosIds.length === alunos.length ? [] : alunos.map((a) => a.id) }))}
                  className="text-su-xs font-semibold text-accent hover:underline"
                >
                  {form.alunosIds.length === alunos.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            {alunos.length === 0 ? (
              <p className="text-su-sm text-content-faint">Nenhum aluno ativo nesta turma.</p>
            ) : (
              <ul className="border border-subtle rounded-su-sm max-h-44 overflow-y-auto">
                {alunos.map((a) => (
                  <li key={a.id} className="border-b border-subtle last:border-b-0">
                    <label className="flex items-center gap-2 px-3 py-2 text-su-sm text-content-body cursor-pointer hover:bg-surface-sunken">
                      <input type="checkbox" checked={form.alunosIds.includes(a.id)} onChange={() => alternarAluno(a.id)} className="w-4 h-4 accent-[var(--color-accent)]" />
                      {a.name || a.nome}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        <div className="col-span-2">
          <label className={rotulo} htmlFor="av-conteudo">Conteúdo</label>
          <textarea id="av-conteudo" rows={2} value={form.conteudo} onChange={mudar('conteudo')} placeholder="Ex.: reposição da Unit 4 (Past Perfect), páginas 42–45" className={campo} />
        </div>
        <div className="col-span-2">
          <label className={rotulo} htmlFor="av-obs">Observações para a coordenação <span className="font-normal text-content-faint">(opcional)</span></label>
          <input id="av-obs" value={form.observacoes} onChange={mudar('observacoes')} placeholder="Ex.: reposição da falta de 28/10" className={campo} />
        </div>
        {erro && <p className="col-span-2 text-su-sm text-danger-fg" role="alert">{erro}</p>}
      </form>
    </Dialogo>
  );
}

/** Detalhe de uma aula avulsa já registrada (agenda e relatório da gestão). */
export function AvulsaDetalheDialog({ avulsa, onExcluir, onClose }) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');
  const excluir = async () => {
    if (!window.confirm('Excluir esta aula avulsa? Ela sai da agenda e do relatório.')) return;
    setExcluindo(true);
    try {
      await onExcluir(avulsa);
    } catch (err) {
      console.error('[AulaAvulsa] Erro ao excluir:', err);
      setErro('Não foi possível excluir. Tente de novo.');
      setExcluindo(false);
    }
  };
  return (
    <Dialogo
      titulo={`${TIPOS_AVULSA[avulsa.tipo] || 'Aula avulsa'} · ${avulsa.turmaNome || 'Turma'}`}
      subtitulo={`${dataPorExtenso(avulsa.data)} · ${avulsa.inicio}–${avulsa.fim}`}
      onClose={onClose}
      rodape={onExcluir ? (
        <button type="button" onClick={excluir} disabled={excluindo} className={`${botaoSecundario} text-danger-fg border-danger`}>
          <Trash2 size={15} /> {excluindo ? 'Excluindo…' : 'Excluir'}
        </button>
      ) : null}
    >
      <dl className="space-y-3 text-su-sm">
        <div>
          <dt className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">Participantes</dt>
          <dd className="mt-0.5 text-content-body">{(avulsa.alunos || []).map((a) => a.nome).filter(Boolean).join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">Conteúdo</dt>
          <dd className="mt-0.5 text-content-body whitespace-pre-line">{avulsa.conteudo || '—'}</dd>
        </div>
        {avulsa.observacoes && (
          <div>
            <dt className="text-su-2xs font-semibold uppercase tracking-caps text-content-muted">Observações</dt>
            <dd className="mt-0.5 text-content-body">{avulsa.observacoes}</dd>
          </div>
        )}
        <p className="text-su-xs text-content-faint">
          Registrada {avulsa.origem === 'gestao' ? 'pela gestão' : `por ${avulsa.professor}`}
          {avulsa.createdAt ? ` em ${new Date(avulsa.createdAt).toLocaleDateString('pt-BR')}` : ''}.
        </p>
        {erro && <p className="text-su-sm text-danger-fg" role="alert">{erro}</p>}
      </dl>
    </Dialogo>
  );
}
