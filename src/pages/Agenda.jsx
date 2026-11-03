import { lazy, Suspense, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, CalendarDays } from 'lucide-react';
import { useProfessores } from '../hooks/useProfessores';
import { useCalendarioLetivo } from '../hooks/useCalendarioLetivo';
import { useHojeISO } from '../hooks/useHojeISO';
import { useAgendaSemana, useTurmasDaEscola, useAgoraMin } from '../hooks/useAgendaSemana';
import {
  inicioDaSemana, diasDaSemana, rotuloSemana, turmasDoProfessor, resumoDoProfessor, criarDiaNaoLetivo,
  ocorrenciasDaSemana, placarDeRegistro, eventosDoProfessor, minutosParaHora, formatarHoras,
} from '../utils/agendaProfessor';
import ProfessorAgenda from './ProfessorAgenda';
import AvatarProfessor from '../components/agenda/AvatarProfessor';

const GoogleAgendas = lazy(() => import('../components/agenda/GoogleAgendas'));


function CartaoProfessor({ linha, onAbrir }) {
  const { professor, resumo, placar, hoje, eventos } = linha;
  const pct = placar.devidas ? Math.round((placar.registradas / placar.devidas) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group w-full text-left bg-surface-card rounded-su-md border border-subtle p-4 hover:border-strong hover:shadow-card transition-shadow duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center gap-3">
        <AvatarProfessor nome={professor.nome} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-su-base text-content-strong truncate">{professor.nome}</p>
          <p className="text-su-xs text-content-muted tabular-nums">
            {resumo.turmas} {resumo.turmas === 1 ? 'turma' : 'turmas'} · {resumo.alunos} alunos · {formatarHoras(resumo.horasSemana)}/semana
          </p>
        </div>
        <ChevronRight size={18} className="text-content-faint group-hover:text-accent flex-shrink-0" />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-su-xs">
          <span className="font-semibold text-content-body">Registro da semana</span>
          <span className="tabular-nums text-content-muted">{placar.devidas ? `${placar.registradas} de ${placar.devidas}` : 'nenhuma aula dada ainda'}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-pill bg-surface-sunken overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-pill ${placar.pendentes ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-1.5 text-su-xs ${placar.pendentes ? 'text-warning-fg font-semibold' : 'text-content-faint'}`}>
          {placar.pendentes
            ? `${placar.pendentes} ${placar.pendentes === 1 ? 'aula já passou sem registro' : 'aulas já passaram sem registro'}`
            : placar.devidas ? 'Tudo registrado até agora' : ' '}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-subtle text-su-xs text-content-muted space-y-0.5">
        <p>
          <span className="font-semibold text-content-body">Hoje: </span>
          {hoje.length === 0 ? 'sem aulas' : hoje.map((o) => minutosParaHora(o.inicio)).join(', ')}
        </p>
        {eventos > 0 && <p>{eventos} {eventos === 1 ? 'compromisso agendado' : 'compromissos agendados'} na semana</p>}
      </div>
    </button>
  );
}

/**
 * /agenda — visão da equipe (um cartão por professor com turmas, alunos,
 * horas e o registro de aulas da semana). /agenda/:professorId abre a página
 * do professor com a grade semanal.
 */
export default function Agenda({ students = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const professorId = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/')[2] || '');

  if (professorId) {
    return <ProfessorAgenda professorId={professorId} students={students} onVoltar={() => navigate('/agenda')} />;
  }
  return <AgendaEquipe students={students} onAbrir={(id) => navigate(`/agenda/${id}`)} />;
}

function AgendaEquipe({ students, onAbrir }) {
  const { professores, loading } = useProfessores();
  const { turmas, loading: carregandoTurmas } = useTurmasDaEscola(professores);
  const hojeISO = useHojeISO();
  const agoraMin = useAgoraMin();
  const semana = inicioDaSemana(hojeISO);
  const dias = useMemo(() => diasDaSemana(semana), [semana]);
  const { aulas, eventos, loading: carregandoSemana } = useAgendaSemana(dias[0], dias[6]);
  const { dados: calendarioAno } = useCalendarioLetivo(Number(semana.slice(0, 4)));
  const [verGoogle, setVerGoogle] = useState(false);

  const linhas = useMemo(() => {
    const diaNaoLetivo = criarDiaNaoLetivo(calendarioAno, [...new Set(dias.map((d) => Number(d.slice(0, 4))))]);
    return professores
      .filter((p) => p.status !== 'inativo')
      .map((professor) => {
        const turmasProf = turmasDoProfessor(turmas, professor);
        const ocorrencias = ocorrenciasDaSemana(turmasProf, dias, aulas, { diaNaoLetivo, hojeISO, agoraMin, carregando: carregandoSemana });
        return {
          professor,
          resumo: resumoDoProfessor(turmasProf, students),
          placar: placarDeRegistro(ocorrencias),
          hoje: ocorrencias.filter((o) => o.iso === hojeISO && o.status !== 'nao-letivo' && o.status !== 'cancelada'),
          eventos: eventosDoProfessor(eventos, professor).length,
        };
      });
  }, [professores, turmas, dias, aulas, eventos, calendarioAno, hojeISO, agoraMin, students, carregandoSemana]);

  const totais = linhas.reduce((t, l) => ({
    horas: t.horas + l.resumo.horasSemana,
    pendentes: t.pendentes + l.placar.pendentes,
  }), { horas: 0, pendentes: 0 });

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-su-h3 text-content-strong leading-su-tight">Agenda da equipe</h1>
          <p className="mt-0.5 text-su-sm text-content-muted tabular-nums">
            Semana de {rotuloSemana(semana)} · {formatarHoras(Math.round(totais.horas * 10) / 10)} de aula por semana
            {totais.pendentes > 0 && <span className="text-warning-fg font-semibold"> · {totais.pendentes} {totais.pendentes === 1 ? 'aula sem registro' : 'aulas sem registro'}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVerGoogle((v) => !v)}
          aria-expanded={verGoogle}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-su-sm border border-strong text-su-sm font-semibold text-content-body hover:bg-surface-sunken"
        >
          <CalendarDays size={16} /> {verGoogle ? 'Esconder agendas do Google' : 'Agendas do Google'}
        </button>
      </div>

      {loading || carregandoTurmas ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-su-md bg-surface-sunken animate-pulse" />)}
        </div>
      ) : linhas.length === 0 ? (
        <p className="py-12 text-center text-su-sm text-content-muted">Nenhum professor ativo no diretório (Professores → Diretório).</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {linhas.map((l) => <CartaoProfessor key={l.professor.id} linha={l} onAbrir={() => onAbrir(l.professor.id)} />)}
        </div>
      )}

      {verGoogle && (
        <Suspense fallback={<div className="h-40 rounded-su-md bg-surface-sunken animate-pulse" />}>
          <GoogleAgendas />
        </Suspense>
      )}
    </div>
  );
}
