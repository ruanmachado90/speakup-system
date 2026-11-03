import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Mail, Phone, RotateCcw } from 'lucide-react';
import { useProfessores } from '../hooks/useProfessores';
import { useCalendarioLetivo } from '../hooks/useCalendarioLetivo';
import { useHojeISO } from '../hooks/useHojeISO';
import {
  useAgendaSemana, useEventosAgenda, useTurmasDaEscola, useAgoraMin, registrarAulaAvulsa, excluirAulaAvulsa,
} from '../hooks/useAgendaSemana';
import { useAuthContext } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  inicioDaSemana, diasDaSemana, somarDiasISO, rotuloSemana, turmasDoProfessor, resumoDoProfessor,
  criarDiaNaoLetivo, ocorrenciasDaSemana, placarDeRegistro, eventosDoProfessor, itensDeEventos,
  resumoHorario, horasSemanaisDaTurma, alunosAtivosDaTurma, formatarHoras,
} from '../utils/agendaProfessor';
import { avulsasDoProfessor, itensDeAvulsas, montarAulaAvulsa } from '../utils/aulasAvulsas';
import { idsDosMembros } from '../utils/buscarAlunos';
import SemanaGrid, { LegendaAgenda } from '../components/agenda/SemanaGrid';
import AvatarProfessor from '../components/agenda/AvatarProfessor';
import RelatorioMensal from '../components/agenda/RelatorioMensal';
import NumeroResumo from '../components/agenda/NumeroResumo';
import { EventoDialog, OcorrenciaDialog } from '../components/agenda/AgendaDialogs';
import { AulaAvulsaDialog, AvulsaDetalheDialog } from '../components/agenda/AulaAvulsaDialog';
import { botaoPrimario, botaoSecundario } from '../components/agenda/estiloAgenda';

const ABAS = [['semana', 'Semana'], ['relatorio', 'Relatório do mês']];

/**
 * Página do professor: números (turmas, alunos, horas), a semana dele numa
 * grade estilo Google Agenda — verde quando a aula foi registrada, âmbar
 * quando já passou sem registro — e compromissos avulsos que a secretaria
 * marca clicando num horário vago (o professor recebe um recado).
 */
export default function ProfessorAgenda({ professorId, students = [], onVoltar }) {
  const { professores, loading: carregandoProfessores } = useProfessores();
  const professor = professores.find((p) => p.id === professorId) || null;
  const { turmas, loading: carregandoTurmas } = useTurmasDaEscola(professores);
  const { user } = useAuthContext();
  const { toastMsg } = useUI();

  const hojeISO = useHojeISO();
  const agoraMin = useAgoraMin();
  const [semana, setSemana] = useState(() => inicioDaSemana(hojeISO));
  const dias = useMemo(() => diasDaSemana(semana), [semana]);

  const { aulas, avulsas, eventos, loading: carregandoSemana, error } = useAgendaSemana(dias[0], dias[6]);
  const anoSemana = Number(semana.slice(0, 4));
  const { dados: calendarioAno } = useCalendarioLetivo(anoSemana);
  const { salvarEvento, excluirEvento, lembrarRegistro } = useEventosAgenda(professor, user);

  const turmasProf = useMemo(() => turmasDoProfessor(turmas, professor), [turmas, professor]);
  const resumo = useMemo(() => resumoDoProfessor(turmasProf, students), [turmasProf, students]);

  const ocorrencias = useMemo(() => {
    const diaNaoLetivo = criarDiaNaoLetivo(calendarioAno, [...new Set(dias.map((d) => Number(d.slice(0, 4))))]);
    return ocorrenciasDaSemana(turmasProf, dias, aulas, { diaNaoLetivo, hojeISO, agoraMin, carregando: carregandoSemana });
  }, [turmasProf, dias, aulas, calendarioAno, hojeISO, agoraMin, carregandoSemana]);
  const eventosProf = useMemo(() => eventosDoProfessor(eventos, professor), [eventos, professor]);
  const avulsasProf = useMemo(() => avulsasDoProfessor(avulsas, professor, turmasProf), [avulsas, professor, turmasProf]);
  const itens = useMemo(
    () => [...ocorrencias, ...itensDeEventos(eventosProf, dias), ...itensDeAvulsas(avulsasProf, dias)],
    [ocorrencias, eventosProf, avulsasProf, dias]
  );
  const placar = placarDeRegistro(ocorrencias);

  const [aba, setAba] = useState('semana');
  // { tipo: 'evento', inicial } | { tipo: 'aula', item } | { tipo: 'nova-avulsa' } | { tipo: 'avulsa', avulsa }
  const [dialogo, setDialogo] = useState(null);

  if (carregandoProfessores) {
    return <div className="py-16 text-center text-su-sm text-content-muted">Carregando…</div>;
  }
  if (!professor) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-su-base text-content-body">Professor não encontrado.</p>
        <button type="button" onClick={onVoltar} className={botaoSecundario}><ArrowLeft size={15} /> Voltar para a agenda da equipe</button>
      </div>
    );
  }

  const novoEvento = (data = hojeISO >= dias[0] && hojeISO <= dias[6] ? hojeISO : dias[0], inicio = '09:00') =>
    setDialogo({ tipo: 'evento', inicial: { data, inicio } });

  const aoSalvar = async (form, opcoes) => {
    const { avisoFalhou } = await salvarEvento(form, opcoes);
    setDialogo(null);
    toastMsg(avisoFalhou
      ? 'Compromisso salvo, mas o recado para o professor falhou.'
      : opcoes.avisar ? 'Compromisso salvo e professor avisado.' : 'Compromisso salvo.');
  };
  const aoExcluir = async (evento, opcoes) => {
    const { avisoFalhou } = await excluirEvento(evento, opcoes);
    setDialogo(null);
    toastMsg(avisoFalhou ? 'Compromisso excluído, mas o recado para o professor falhou.' : 'Compromisso excluído.');
  };
  const abrirItem = (item) => {
    if (item.tipo === 'evento') setDialogo({ tipo: 'evento', inicial: item.evento });
    else if (item.tipo === 'avulsa') setDialogo({ tipo: 'avulsa', avulsa: item.avulsa });
    else setDialogo({ tipo: 'aula', item });
  };
  const salvarAvulsa = async (form, turma, alunos) => {
    await registrarAulaAvulsa(montarAulaAvulsa(form, {
      turma, alunos, professorNome: professor.nome, professorId: professor.id, origem: 'gestao', criadoPor: user?.email || null,
    }));
    setDialogo(null);
    toastMsg('Aula avulsa registrada.');
  };
  const apagarAvulsa = async (avulsa) => {
    await excluirAulaAvulsa(avulsa.id);
    setDialogo(null);
    toastMsg('Aula avulsa excluída.');
  };

  const ehSemanaAtual = semana === inicioDaSemana(hojeISO);
  const turmasOrdenadas = [...turmasProf].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  return (
    <div className="space-y-5 pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onVoltar} className="p-2 -ml-2 rounded-su-sm text-content-muted hover:bg-surface-sunken hover:text-content-strong" aria-label="Voltar para a agenda da equipe">
            <ArrowLeft size={20} />
          </button>
          <AvatarProfessor nome={professor.nome} tamanho="lg" />
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-su-h3 text-content-strong leading-su-tight truncate">{professor.nome}</h1>
            <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-su-sm text-content-muted">
              {professor.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {professor.email}</span>}
              {professor.telefone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {professor.telefone}</span>}
              {professor.status === 'inativo' && <span className="text-warning-fg font-semibold">Inativo</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => setDialogo({ tipo: 'nova-avulsa' })} className={botaoSecundario}>
            <RotateCcw size={15} /> Aula avulsa
          </button>
          <button type="button" onClick={() => novoEvento()} className={botaoPrimario}>
            <Plus size={16} /> Novo compromisso
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Visão" className="flex gap-1 border-b border-subtle print:hidden">
        {ABAS.map(([chave, texto]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={aba === chave}
            onClick={() => setAba(chave)}
            className={`-mb-px px-4 py-2 text-su-sm font-semibold border-b-2 transition-colors duration-fast ${aba === chave ? 'border-accent text-accent' : 'border-transparent text-content-muted hover:text-content-strong'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {aba === 'relatorio' ? (
        <RelatorioMensal professor={professor} turmasProf={turmasProf} todasTurmas={turmas} professores={professores} onAbrirAvulsa={(avulsa) => setDialogo({ tipo: 'avulsa', avulsa })} />
      ) : (
      <>

      {/* Números */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <NumeroResumo rotulo="Turmas" carregando={carregandoTurmas} valor={resumo.turmas} sub={resumo.turmas === 1 ? 'turma ativa' : 'turmas ativas'} />
        <NumeroResumo rotulo="Alunos" carregando={carregandoTurmas} valor={resumo.alunos} sub={resumo.turmas ? `${(resumo.alunos / resumo.turmas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por turma` : 'sem turmas'} />
        <NumeroResumo
          rotulo="Horas por semana"
          carregando={carregandoTurmas}
          valor={formatarHoras(resumo.horasSemana)}
          sub={resumo.horarioEstimado ? 'alguma turma sem horário de término (conta 1h)' : `cerca de ${formatarHoras(Math.round(resumo.horasSemana * 4.3))} por mês`}
        />
        <NumeroResumo
          rotulo={ehSemanaAtual ? 'Registro desta semana' : 'Registro da semana'}
          carregando={carregandoSemana}
          valor={placar.devidas ? `${placar.registradas} de ${placar.devidas}` : '—'}
          sub={placar.pendentes ? `${placar.pendentes} ${placar.pendentes === 1 ? 'aula não registrada' : 'aulas não registradas'}` : placar.devidas ? 'tudo registrado' : 'nenhuma aula dada ainda'}
          alerta={placar.pendentes > 0}
        />
      </div>

      {/* Agenda */}
      <section className="bg-surface-card rounded-su-md border border-subtle">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSemana(inicioDaSemana(hojeISO))} disabled={ehSemanaAtual} className={`${botaoSecundario} px-3 py-1.5`}>Hoje</button>
            <button type="button" onClick={() => setSemana(somarDiasISO(semana, -7))} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Semana anterior"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => setSemana(somarDiasISO(semana, 7))} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Próxima semana"><ChevronRight size={20} /></button>
            <h2 className="ml-1 font-display font-bold text-su-lg text-content-strong tabular-nums">{rotuloSemana(semana)}</h2>
          </div>
          <p className="text-su-xs text-content-faint">Clique num horário vago para agendar</p>
        </div>
        {error && <p className="px-4 py-2 text-su-sm text-danger-fg bg-danger-bg" role="alert">Não foi possível carregar as aulas desta semana ({error}).</p>}
        <SemanaGrid
          dias={dias}
          itens={itens}
          hojeISO={hojeISO}
          agoraMin={agoraMin}
          onSlotClick={(iso, hora) => novoEvento(iso, hora)}
          onItemClick={abrirItem}
        />
        <div className="px-4 py-3 border-t border-subtle"><LegendaAgenda /></div>
      </section>

      {/* Turmas */}
      <section className="bg-surface-card rounded-su-md border border-subtle">
        <h2 className="px-4 py-3 border-b border-subtle font-display font-bold text-su-lg text-content-strong">Turmas</h2>
        {turmasOrdenadas.length === 0 ? (
          <p className="px-4 py-8 text-center text-su-sm text-content-muted">{carregandoTurmas ? 'Carregando…' : 'Nenhuma turma com este professor.'}</p>
        ) : (
          <ul>
            {turmasOrdenadas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 border-b border-subtle last:border-b-0">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="font-semibold text-su-sm text-content-strong truncate">{t.nome || 'Turma sem nome'}</p>
                  <p className="text-su-xs text-content-muted">{resumoHorario(t)}{t.nivel ? ` · Nível ${t.nivel}` : ''}</p>
                </div>
                <span className="text-su-sm text-content-body tabular-nums w-24">{idsDosMembros(t.alunosIds).length ? alunosAtivosDaTurma(t, students).length : t.alunosCount || 0} alunos</span>
                <span className="text-su-sm text-content-body tabular-nums w-24">{formatarHoras(horasSemanaisDaTurma(t))}/semana</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
      )}

      {dialogo?.tipo === 'nova-avulsa' && (
        <AulaAvulsaDialog
          turmas={turmasOrdenadas}
          alunosDaTurma={(t) => alunosAtivosDaTurma(t, students)}
          onSalvar={salvarAvulsa}
          onClose={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === 'avulsa' && (
        <AvulsaDetalheDialog avulsa={dialogo.avulsa} onExcluir={apagarAvulsa} onClose={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === 'evento' && (
        <EventoDialog
          inicial={dialogo.inicial}
          professorNome={professor.nome}
          onSalvar={aoSalvar}
          onExcluir={aoExcluir}
          onClose={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === 'aula' && (
        <OcorrenciaDialog
          item={dialogo.item}
          students={students}
          professorNome={professor.nome}
          onLembrar={lembrarRegistro}
          onClose={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
