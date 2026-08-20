import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, BookOpen, Printer } from 'lucide-react';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';
import { useAulasDiario } from '../hooks/useAulasDiario';
import { useAulasDiarioTurmas } from '../hooks/useAulasDiarioTurmas';
import { useAulasLegadoTurmas } from '../hooks/useAulasLegado';
import { useAlunosPorTurmas } from '../hooks/useAlunosPorTurmas';
import { useTurmaAlunos } from '../hooks/useTurmaAlunos';
import { PageLoading, SemTurmas, SkeletonCardAula, ProfessorPageHeader } from '../components/professor/PageLoading';

const ETAPAS = ['1º Semestre', '2º Semestre'];
const etapaAtual = () => new Date().getMonth() <= 5 ? ETAPAS[0] : ETAPAS[1];

// Gera as opções de mês/ano (do mês atual para trás) para o filtro do diário mensal.
function gerarOpcoesMes(quantidade = 12) {
  const hoje = new Date();
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mes = d.getMonth() + 1;
    const ano = d.getFullYear();
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const labelCurto = d.toLocaleDateString('pt-BR', { month: 'long' });
    return {
      value: `${mes}/${ano}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      labelImpressao: `${labelCurto.charAt(0).toUpperCase()}${labelCurto.slice(1)}/${ano}`,
    };
  });
}

// Extrai "mês/ano" de uma data no formato DD/MM/YYYY para comparar com o filtro.
function mesAnoDaData(dataStr) {
  const partes = String(dataStr || '').split('/');
  if (partes.length !== 3) return null;
  return `${Number(partes[1])}/${partes[2]}`;
}

// Converte DD/MM/YYYY em Date para ordenação cronológica.
function parseData(dataStr) {
  const [d, m, y] = String(dataStr || '').split('/').map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

// Dias da semana em que uma turma tem aula (a partir de horarios[] ou do campo legado "dias").
function diasDaTurma(t) {
  if (t?.horarios?.length) return t.horarios.map(h => h.dia).filter(Boolean);
  if (t?.dias) return t.dias.split(',').map(d => d.trim()).filter(Boolean);
  return [];
}

const ORDEM_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Normaliza um doc da coleção antiga 'aulas' (data ISO, chamada em array) para
// o mesmo formato usado pelo 'diario' novo (data DD/MM/YYYY, presença em mapa),
// para que possam ser exibidos juntos no Histórico do professor.
function normalizarAulaLegado(doc) {
  const [ano, mes, dia] = String(doc.data || '').split('-');
  if (!ano || !mes || !dia) return null;
  if (doc.status && doc.status !== 'realizada') return null;

  const presenca = {};
  (doc.chamadas || []).forEach(c => {
    const alunoId = c.alunoId || c.alunoNome;
    if (alunoId) presenca[alunoId] = c.status;
  });

  return {
    id: `legado_${doc.id}`,
    turmaId: doc.turmaId,
    data: `${dia}/${mes}/${ano}`,
    conteudo: doc.conteudo || '',
    devercasa: doc.observacoes || doc.homework || '',
    presenca,
    etapa: Number(mes) <= 6 ? ETAPAS[0] : ETAPAS[1],
  };
}

// Mescla aulas do 'diario' novo com as da coleção antiga 'aulas', evitando
// duplicar quando a mesma turma+data existe nas duas fontes.
function mesclarComLegado(aulasDiario, aulasLegadoRaw) {
  const legadoNormalizado = aulasLegadoRaw.map(normalizarAulaLegado).filter(Boolean);
  const chavesDiario = new Set(aulasDiario.map(a => `${a.turmaId}__${a.data}`));
  const legadoSemDuplicata = legadoNormalizado.filter(a => !chavesDiario.has(`${a.turmaId}__${a.data}`));
  return [...aulasDiario, ...legadoSemDuplicata];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function DropSelect({ label, value, options, onChange }) {
  return (
    <div className="relative bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
      <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">{label}</label>
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-[#005DE4] truncate pr-2">{value}</span>
        <ChevronDown size={20} className="text-[#005DE4] flex-shrink-0" />
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Diário de classe — visão em tela + impressão (usado nos dois modos) ────────
// Classes utilitárias (Tailwind) convivem com classes simples ("info-cell", "p",
// "f", "fj" etc.) que só existem para dar estilo ao HTML copiado para a janela
// de impressão (que não carrega o Tailwind) — ver PRINT_STYLE_DIARIO abaixo.
function DiarioTurmaCard({ grupo, periodoTitulo, periodoValor }) {
  const datas = grupo.aulas.map(a => a.data);
  const totalCols = datas.length + 3;

  return (
    <div className="diario-mes-card bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
      <div className="grid grid-cols-2 text-xs info-grid">
        <div className="info-cell px-4 py-2.5 border-b border-r border-slate-200 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">Turma:</span>
          <span className="text-slate-800 font-bold">{grupo.turma}</span>
        </div>
        <div className="info-cell px-4 py-2.5 border-b border-slate-200 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">{periodoTitulo}:</span>
          <span className="text-slate-800">{periodoValor}</span>
        </div>
        <div className="info-cell px-4 py-2.5 border-b border-r border-slate-200 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">Nível:</span>
          <span className="text-slate-800">{grupo.nivel || '—'}</span>
        </div>
        <div className="info-cell px-4 py-2.5 border-b border-slate-200 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">Dia:</span>
          <span className="text-slate-800">{grupo.dia || '—'}</span>
        </div>
        <div className="info-cell px-4 py-2.5 border-r border-slate-200 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">Professor:</span>
          <span className="text-[#005DE4] font-semibold">{grupo.professor || '—'}</span>
        </div>
        <div className="info-cell px-4 py-2.5 flex gap-1.5">
          <span className="info-label font-semibold text-slate-500">Horário:</span>
          <span className="text-slate-800">{grupo.horario || '—'}</span>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="nome text-left px-3 py-2 font-semibold text-slate-600 border-r border-slate-200 min-w-[140px]">Aluno</th>
              {datas.map(d => (
                <th key={d} className="px-2 py-2 font-semibold text-slate-600 border-r border-slate-100 text-center min-w-[34px]">
                  {d.split('/')[0]}
                </th>
              ))}
              <th className="total px-2 py-2 font-semibold text-slate-500 text-center min-w-[44px] bg-slate-100">Faltas</th>
              <th className="total px-2 py-2 font-semibold text-slate-500 text-center min-w-[44px] bg-slate-100">Freq.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grupo.alunos.map(aluno => {
              const totalAulas = grupo.aulas.length;
              const presencas = grupo.aulas.filter(a => a.presenca?.[aluno.id] === 'presente').length;
              const faltas = grupo.aulas.filter(a => a.presenca?.[aluno.id] === 'falta').length;
              const freq = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 0;
              return (
                <tr key={aluno.id}>
                  <td className="nome px-3 py-1.5 text-slate-800 border-r border-slate-100 whitespace-nowrap">{aluno.nome}</td>
                  {grupo.aulas.map(aula => {
                    const status = aula.presenca?.[aluno.id];
                    return (
                      <td key={aula.id} className="px-2 py-1.5 text-center border-r border-slate-50">
                        {status === 'presente' && <span className="p font-bold text-emerald-600">P</span>}
                        {status === 'falta' && <span className="f font-bold text-red-600">F</span>}
                        {status === 'justificada' && <span className="fj font-bold text-amber-500">FJ</span>}
                        {!status && <span className="text-slate-200">—</span>}
                      </td>
                    );
                  })}
                  <td className="total px-2 py-1.5 text-center font-semibold bg-slate-50">{faltas}</td>
                  <td className={`total px-2 py-1.5 text-center font-semibold bg-slate-50 ${freq < 75 ? 'freq-baixa text-red-600' : 'text-emerald-600'}`}>{freq}%</td>
                </tr>
              );
            })}
            {grupo.alunos.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="px-3 py-4 text-center text-slate-400 italic">
                  Nenhum aluno vinculado a esta turma
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 px-3 py-2 border-t border-slate-100">
        <span><span className="font-bold text-emerald-600">P</span> = Presente</span>
        <span><span className="font-bold text-red-600">F</span> = Falta</span>
        <span><span className="font-bold text-amber-500">FJ</span> = Falta Justificada</span>
        <span className="ml-auto text-red-500 font-medium">Freq. &lt; 75% em vermelho</span>
      </div>

      <div className="border-t border-slate-200">
        <div className="sec-title bg-slate-50 px-4 py-2 border-b border-slate-200">
          <span className="font-semibold text-slate-700 text-xs">Conteúdo Lecionado</span>
        </div>
        <table className="w-full text-xs border-collapse">
          <tbody className="divide-y divide-slate-100">
            {grupo.aulas.map(aula => (
              <tr key={aula.id} className="content-row">
                <td className="px-4 py-2 text-slate-500 font-semibold whitespace-nowrap align-top w-20">{aula.data}</td>
                <td className="px-4 py-2 text-slate-700 align-top">{aula.conteudo || '—'}</td>
                <td className="px-4 py-2 text-slate-500 align-top hidden sm:table-cell">{aula.devercasa || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// CSS "puro" para a janela de impressão do diário (não depende do Tailwind).
const PRINT_STYLE_DIARIO = `
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#0f172a;padding:16px;margin:0}
  .diario-mes-card{border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;margin-bottom:24px;page-break-inside:avoid}
  .info-grid{display:grid;grid-template-columns:1fr 1fr}
  .info-cell{padding:6px 10px;border:1px solid #cbd5e1}
  .info-label{font-weight:700;margin-right:4px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:center}
  th{background:#f1f5f9;font-weight:700;font-size:10px}
  td.nome,th.nome{text-align:left}
  .p{color:#16a34a}
  .f{color:#dc2626}
  .fj{color:#d97706}
  .freq-baixa{color:#dc2626}
  .sec-title{font-weight:700;background:#f1f5f9}
  .content-row td{text-align:left;padding:5px 8px}
  .total{background:#f8fafc;font-weight:600}
`;

// ── Página ────────────────────────────────────────────────────────────────────
const MESES_OPCOES = gerarOpcoesMes();

export default function HistoricoPage() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  const { turmas, loading: loadingTurmas } = useProfessorTurmas(professorSlug);
  const [modo, setModo] = useState('turma'); // 'turma' | 'mes'
  const [filtroDia, setFiltroDia] = useState('Todos os dias');
  const [turma, setTurma] = useState('');
  const [etapa, setEtapa] = useState(etapaAtual());
  const [mesSelecionado, setMesSelecionado] = useState(MESES_OPCOES[0].value);

  const diasDisponiveis = useMemo(() => {
    const set = new Set();
    turmas.forEach(t => diasDaTurma(t).forEach(d => set.add(d)));
    return ['Todos os dias', ...[...set].sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b))];
  }, [turmas]);

  const turmasFiltradas = useMemo(() => (
    filtroDia === 'Todos os dias' ? turmas : turmas.filter(t => diasDaTurma(t).includes(filtroDia))
  ), [turmas, filtroDia]);

  useEffect(() => {
    if (turmasFiltradas.length > 0 && !turmasFiltradas.some(t => t.nome === turma)) {
      setTurma(turmasFiltradas[0].nome);
    }
  }, [turmasFiltradas, turma]);

  const turmaObj = turmasFiltradas.find(t => t.nome === turma) ?? turmasFiltradas[0] ?? null;
  const { aulas: aulasFirestore, loading: loadingAulas } = useAulasDiario(turmaObj?.id, etapa);
  const { aulas: aulasLegadoTurma, loading: loadingLegadoTurma } = useAulasLegadoTurmas(turmaObj ? [turmaObj.id] : []);
  const { alunos: alunosTurma, loading: loadingAlunosTurma } = useTurmaAlunos(turmaObj);

  const aulas = useMemo(
    () => mesclarComLegado(aulasFirestore, aulasLegadoTurma).filter(a => a.etapa === etapa),
    [aulasFirestore, aulasLegadoTurma, etapa]
  );

  const grupoTurma = useMemo(() => {
    if (!turmaObj) return null;
    const horarios = turmaObj.horarios || [];
    const dia = horarios.length ? horarios.map(h => h.dia).join(' / ') : (turmaObj.dias || '');
    const horario = horarios.length
      ? horarios.map(h => `${h.horario}${h.horarioFim ? ' - ' + h.horarioFim : ''}`).join(' / ')
      : (turmaObj.horario || '');
    return {
      turmaId: turmaObj.id,
      turma: turmaObj.nome,
      nivel: turmaObj.nivel,
      professor: turmaObj.professor,
      dia,
      horario,
      alunos: alunosTurma,
      aulas: [...aulas].sort((a, b) => parseData(a.data) - parseData(b.data)),
    };
  }, [turmaObj, alunosTurma, aulas]);

  // ── Modo "diário do mês" — todas as turmas do professor juntas ─────────────
  const turmaIds = useMemo(() => turmas.map(t => t.id), [turmas]);
  const { aulas: aulasTodasTurmas, loading: loadingAulasTodas } = useAulasDiarioTurmas(
    modo === 'mes' ? turmaIds : []
  );
  const { aulas: aulasLegadoTodas, loading: loadingLegadoTodas } = useAulasLegadoTurmas(
    modo === 'mes' ? turmaIds : []
  );
  const { alunosPorTurma, loading: loadingAlunos } = useAlunosPorTurmas(modo === 'mes' ? turmas : []);

  const gruposMes = useMemo(() => {
    if (modo !== 'mes') return [];
    const todasAsAulas = mesclarComLegado(aulasTodasTurmas, aulasLegadoTodas);
    const doMes = todasAsAulas.filter(a => mesAnoDaData(a.data) === mesSelecionado);
    const porTurma = new Map();
    doMes.forEach(aula => {
      if (!porTurma.has(aula.turmaId)) porTurma.set(aula.turmaId, []);
      porTurma.get(aula.turmaId).push(aula);
    });
    return turmas
      .filter(t => porTurma.has(t.id))
      .map(t => {
        const horarios = t.horarios || [];
        const dia = horarios.length ? horarios.map(h => h.dia).join(' / ') : (t.dias || '');
        const horario = horarios.length
          ? horarios.map(h => `${h.horario}${h.horarioFim ? ' - ' + h.horarioFim : ''}`).join(' / ')
          : (t.horario || '');
        return {
          turmaId: t.id,
          turma: t.nome,
          nivel: t.nivel,
          professor: t.professor,
          dia,
          horario,
          alunos: alunosPorTurma[t.id] || [],
          aulas: porTurma.get(t.id).sort((a, b) => parseData(a.data) - parseData(b.data)),
        };
      });
  }, [modo, aulasTodasTurmas, aulasLegadoTodas, mesSelecionado, turmas, alunosPorTurma]);

  const mesOpcao = MESES_OPCOES.find(m => m.value === mesSelecionado);
  const mesLabel = mesOpcao?.label ?? '';
  const totalAulasMes = gruposMes.reduce((acc, g) => acc + g.aulas.length, 0);

  const diarioRef = useRef(null);

  // Guards após todos os hooks
  if (loadingTurmas) return <PageLoading titulo="Carregando turmas…" />;
  if (turmas.length === 0) return <SemTurmas onVoltar={() => navigate(`/professor/${professorSlug}/home`)} />;

  const handlePrint = () => {
    if (!diarioRef.current) return;
    const titulo = modo === 'mes'
      ? `Diário do Mês — ${mesOpcao?.labelImpressao ?? mesLabel}`
      : `Diário de Classe — ${turma} — ${etapa}`;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${titulo}</title>
      <style>${PRINT_STYLE_DIARIO}</style>
    </head><body>${diarioRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <>
        {/* Interface normal */}
        <div className="min-h-screen bg-slate-100 flex flex-col">

          <ProfessorPageHeader
            onBack={() => navigate(`/professor/${professorSlug}/home`)}
            title="Histórico de Aulas"
            subtitle={modo === 'turma' ? 'Visão geral por turma' : 'Diário do mês — todas as turmas'}
            accent="#10b981"
            rightSlot={
              <button
                onClick={handlePrint}
                title="Imprimir histórico"
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <Printer size={22} className="text-white" />
              </button>
            }
          />

          {/* Alternância de modo */}
          <div className="px-3 pt-3 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setModo('turma')}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${
                  modo === 'turma' ? 'bg-white text-[#005DE4] shadow-sm' : 'text-slate-500'
                }`}
              >
                Por turma
              </button>
              <button
                onClick={() => setModo('mes')}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${
                  modo === 'mes' ? 'bg-white text-[#005DE4] shadow-sm' : 'text-slate-500'
                }`}
              >
                Diário do mês
              </button>
            </div>
          </div>

          {modo === 'turma' ? (
            <>
              {/* Filtros */}
              <div className="px-3 pt-3 space-y-2 flex-shrink-0">
                <DropSelect label="Dia da semana" value={filtroDia} options={diasDisponiveis} onChange={setFiltroDia} />
                {turmasFiltradas.length > 0 ? (
                  <DropSelect label="Turma" value={turma} options={turmasFiltradas.map(t => t.nome)} onChange={setTurma} />
                ) : (
                  <div className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">
                    Nenhuma turma neste dia
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {ETAPAS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEtapa(e)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                        etapa === e
                          ? 'bg-[#005DE4] border-[#005DE4] text-white'
                          : 'bg-white border-[#005DE4] text-[#005DE4]'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              <div className="px-4 pt-3 pb-1 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {loadingAulas || loadingLegadoTurma ? 'Carregando…' : `${aulas.length} aula${aulas.length !== 1 ? 's' : ''} registrada${aulas.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Diário da turma */}
              <div className="px-3 pb-6 mt-1">
                {loadingAulas || loadingLegadoTurma || loadingAlunosTurma ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <SkeletonCardAula key={i} />)}
                  </div>
                ) : aulas.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                    <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">Nenhuma aula registrada</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Registre aulas em Conteúdo e Frequência.
                    </p>
                    <button
                      onClick={() => navigate(`/professor/${professorSlug}/frequencia`)}
                      className="mt-4 px-5 py-2 bg-[#005DE4] text-white rounded-xl text-sm font-semibold"
                    >
                      Registrar aula
                    </button>
                  </div>
                ) : (
                  <div ref={diarioRef}>
                    <DiarioTurmaCard grupo={grupoTurma} periodoTitulo="Etapa" periodoValor={etapa} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Filtro de mês */}
              <div className="px-3 pt-3 flex-shrink-0">
                <DropSelect
                  label="Mês"
                  value={mesLabel}
                  options={MESES_OPCOES.map(m => m.label)}
                  onChange={label => {
                    const opcao = MESES_OPCOES.find(m => m.label === label);
                    if (opcao) setMesSelecionado(opcao.value);
                  }}
                />
              </div>

              {/* Resumo */}
              <div className="px-4 pt-3 pb-1 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {loadingAulasTodas || loadingLegadoTodas || loadingAlunos
                    ? 'Carregando…'
                    : `${gruposMes.length} turma${gruposMes.length !== 1 ? 's' : ''} · ${totalAulasMes} aula${totalAulasMes !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Lista por turma */}
              <div className="px-3 pb-6 space-y-4 mt-1">
                {loadingAulasTodas || loadingLegadoTodas || loadingAlunos ? (
                  [1, 2, 3].map(i => <SkeletonCardAula key={i} />)
                ) : gruposMes.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                    <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">Nenhuma aula registrada em {mesLabel}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Escolha outro mês ou registre aulas em Conteúdo e Frequência.
                    </p>
                  </div>
                ) : (
                  <div ref={diarioRef} className="space-y-4">
                    {gruposMes.map(grupo => (
                      <DiarioTurmaCard key={grupo.turmaId} grupo={grupo} periodoTitulo="Mês" periodoValor={mesOpcao?.labelImpressao ?? mesLabel} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
    </>
  );
}
