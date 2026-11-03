import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, RotateCcw } from 'lucide-react';
import { useAgendaSemana, useAgoraMin } from '../../hooks/useAgendaSemana';
import { useCalendarioLetivo } from '../../hooks/useCalendarioLetivo';
import { useHojeISO } from '../../hooks/useHojeISO';
import {
  criarDiaNaoLetivo, ocorrenciasDoMes, minutosParaHora, formatarDuracao, NOMES_DIAS_CURTOS,
} from '../../utils/agendaProfessor';
import {
  avulsasDoProfessor, aulasDeTurmasApagadas, linhasDoRelatorio, totaisDoRelatorio, rotuloMes, ultimoDiaDoMes,
  somarMeses, TIPOS_AVULSA,
} from '../../utils/aulasAvulsas';
import { botaoSecundario } from './estiloAgenda';
import NumeroResumo from './NumeroResumo';

const dataCurta = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${NOMES_DIAS_CURTOS[(d.getDay() + 6) % 7]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

const SITUACAO = {
  dada: { texto: 'Dada', classe: 'bg-success-bg text-success-fg' },
  'sem-aula': { texto: 'Sem aula', classe: 'bg-surface-sunken text-content-muted' },
  'nao-registrada': { texto: 'Não registrada', classe: 'bg-warning-bg text-warning-fg' },
};

/**
 * Relatório de aulas do professor no mês: aulas da grade (dadas, sem aula,
 * não registradas) + reposições e aulas extras, com horas somadas. Imprime
 * só o relatório (a barra lateral e os controles somem na impressão).
 * `todasTurmas`/`professores` servem para achar aulas de turmas já apagadas.
 */
export default function RelatorioMensal({ professor, turmasProf, todasTurmas = [], professores = [], onAbrirAvulsa }) {
  const hojeISO = useHojeISO();
  const agoraMin = useAgoraMin();
  const [mes, setMes] = useState(() => hojeISO.slice(0, 7));
  const primeiro = `${mes}-01`;
  const ultimo = ultimoDiaDoMes(mes);
  const { aulas, avulsas, loading, error } = useAgendaSemana(primeiro, ultimo);
  const { dados: calendarioAno } = useCalendarioLetivo(Number(mes.slice(0, 4)));

  const linhas = useMemo(() => {
    const diaNaoLetivo = criarDiaNaoLetivo(calendarioAno, [Number(mes.slice(0, 4))]);
    const ocorrencias = ocorrenciasDoMes(turmasProf, mes, aulas, { diaNaoLetivo, hojeISO, agoraMin, carregando: loading });
    return linhasDoRelatorio(
      ocorrencias,
      avulsasDoProfessor(avulsas, professor, turmasProf),
      aulasDeTurmasApagadas(aulas, todasTurmas, professor, professores)
    );
  }, [turmasProf, todasTurmas, professores, mes, aulas, avulsas, professor, calendarioAno, hojeISO, agoraMin, loading]);
  const totais = totaisDoRelatorio(linhas);
  const mesFuturo = mes > hojeISO.slice(0, 7);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMes(somarMeses(mes, -1))} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => setMes(somarMeses(mes, 1))} className="p-1.5 rounded-su-sm text-content-muted hover:bg-surface-sunken" aria-label="Próximo mês"><ChevronRight size={20} /></button>
          <h2 className="ml-1 font-display font-bold text-su-lg text-content-strong">{rotuloMes(mes)}</h2>
        </div>
        <button type="button" onClick={() => window.print()} className={botaoSecundario}><Printer size={15} /> Imprimir</button>
      </div>
      <h2 className="hidden print:block font-display font-bold text-su-h4 text-content-strong">
        Relatório de aulas · {professor.nome} · {rotuloMes(mes)}
      </h2>

      {error && <p className="px-4 py-2 rounded-su-sm text-su-sm text-danger-fg bg-danger-bg" role="alert">Não foi possível carregar as aulas do mês ({error}).</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <NumeroResumo rotulo="Aulas dadas" carregando={loading} valor={totais.aulasDadas} sub="da grade das turmas" />
        <NumeroResumo rotulo="Reposições e extras" carregando={loading} valor={totais.avulsasDadas} sub="aulas avulsas" />
        <NumeroResumo
          rotulo="Horas dadas"
          carregando={loading}
          valor={formatarDuracao(totais.minutosDados)}
          sub={totais.horarioEstimado ? 'alguma aula sem horário de término (conta 1h)' : 'grade + avulsas'}
        />
        <NumeroResumo
          rotulo="Não registradas"
          carregando={loading}
          valor={totais.naoRegistradas}
          sub={totais.semAula ? `${totais.semAula} sem aula (feriado, recesso, cancelada)` : 'aulas que já passaram'}
          alerta={totais.naoRegistradas > 0}
        />
      </div>

      <div className="bg-surface-card rounded-su-md border border-subtle overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="px-4 py-10 text-center text-su-sm text-content-muted">
            {loading ? 'Carregando…' : mesFuturo ? 'Mês ainda não começou.' : 'Nenhuma aula neste mês.'}
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-su-sm">
            <thead>
              <tr className="text-left text-su-2xs font-semibold uppercase tracking-caps text-content-muted border-b border-subtle">
                <th className="px-4 py-2.5 font-semibold">Data</th>
                <th className="px-3 py-2.5 font-semibold">Horário</th>
                <th className="px-3 py-2.5 font-semibold">Turma</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
                <th className="px-3 py-2.5 font-semibold text-right">Presença</th>
                <th className="px-4 py-2.5 font-semibold">Conteúdo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const sit = SITUACAO[l.situacao];
                const avulsa = l.tipo !== 'regular';
                return (
                  <tr
                    key={l.id}
                    onClick={avulsa && onAbrirAvulsa ? () => onAbrirAvulsa(l.avulsa) : undefined}
                    className={`border-b border-subtle last:border-b-0 align-top ${avulsa && onAbrirAvulsa ? 'cursor-pointer hover:bg-surface-sunken' : ''}`}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-content-body">{dataCurta(l.iso)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-content-body">
                      {minutosParaHora(l.inicio)}–{minutosParaHora(l.fim)}
                      <span className="block text-su-xs text-content-faint">{formatarDuracao(l.minutos)}{l.estimado ? ' (estimado)' : ''}</span>
                    </td>
                    <td className="px-3 py-2.5 text-content-strong">
                      <span className="font-semibold">{l.turmaNome}</span>
                      {avulsa && (
                        <span className="mt-0.5 flex items-center gap-1 text-su-xs text-success-fg font-semibold">
                          <RotateCcw size={12} aria-hidden="true" /> {TIPOS_AVULSA[l.tipo]}
                        </span>
                      )}
                      {l.foraDaGrade && <span className="block text-su-xs text-content-faint">registrada fora do dia da turma</span>}
                      {l.turmaApagada && <span className="block text-su-xs text-content-faint">turma não existe mais</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-pill text-su-xs font-semibold ${sit.classe}`}>{sit.texto}</span>
                      {l.situacao === 'sem-aula' && l.detalhe && <span className="block mt-0.5 text-su-xs text-content-muted">{l.detalhe}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-content-body whitespace-nowrap">
                      {l.situacao === 'dada' && l.total ? (avulsa ? `${l.total} ${l.total === 1 ? 'aluno' : 'alunos'}` : `${l.presentes}/${l.total}`) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-content-body max-w-xs">
                      <span className="line-clamp-2 print:line-clamp-none">{l.conteudo || (avulsa ? '' : '—')}</span>
                      {avulsa && l.detalhe && <span className="block text-su-xs text-content-muted">{l.detalhe}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
