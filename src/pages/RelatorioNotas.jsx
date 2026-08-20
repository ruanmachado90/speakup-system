import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, Info } from 'lucide-react';
import { calcularResultado, CONCEITO_SCALE } from '../utils/notasStorage';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';
import { useTurmaAlunos } from '../hooks/useTurmaAlunos';
import { useAvaliacoesParciais } from '../hooks/useAvaliacoesParciais';
import { PageLoading, SemTurmas, SkeletonLinhaNota, ProfessorPageHeader } from '../components/professor/PageLoading';

const ETAPAS = ['1º Semestre', '2º Semestre'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNota(v) {
  if (v === '' || v == null || v === undefined) return null; // não lançado
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return n;
}

function conceitoBadge(c) {
  if (!c || c === '—') return 'bg-slate-100 text-slate-400';
  if (c === 'A+' || c === 'A')  return 'bg-emerald-100 text-emerald-700';
  if (c === 'B+' || c === 'B')  return 'bg-blue-100 text-blue-700';
  if (c === 'C+' || c === 'C')  return 'bg-yellow-100 text-yellow-700';
  if (c === 'C-' || c === 'D')  return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-600';
}

function totalColor(t) {
  if (t == null) return 'text-slate-400';
  if (t >= 70) return 'text-emerald-600';
  if (t >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-2 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return (
    <td className={`px-2 py-2.5 text-center text-xs border-b border-slate-100 ${className}`}>
      {children}
    </td>
  );
}

// Célula de nota individual: distinguish "not launched" vs real value (including 0)
function CelulaNota({ valor, colorClass }) {
  const n = fmtNota(valor);
  if (n === null) {
    return <span className="text-slate-300 text-[11px]">—</span>;
  }
  if (n === 0) {
    return <span className={`font-bold text-[11px] ${colorClass} opacity-70`}>0</span>;
  }
  return <span className={`font-semibold text-[11px] ${colorClass}`}>{n % 1 === 0 ? n : n.toFixed(1)}</span>;
}

// ── Legenda de conceitos ──────────────────────────────────────────────────────
function LegendaConceitos({ aberta, onToggle }) {
  return (
    <div className="mx-3 mb-3 bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[#005DE4]" />
          <span className="text-xs font-bold text-slate-600">Escala de Conceitos</span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">{aberta ? 'ocultar' : 'ver'}</span>
      </button>

      {aberta && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {CONCEITO_SCALE.map(({ min, label }, idx) => {
            const max = idx === 0 ? 100 : CONCEITO_SCALE[idx - 1].min - 1;
            return (
              <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${conceitoBadge(label)}`}>
                <span className="font-black text-sm w-5 text-center">{label}</span>
                <span className="text-[10px] font-medium opacity-80">
                  {min === 0 ? `< ${CONCEITO_SCALE[CONCEITO_SCALE.length - 2].min}` : `≥ ${min}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Print view ────────────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #relatorio-print-root { display: block !important; }
  #relatorio-print-root #relatorio-print-view { display: block !important; }
}
`;

const thP = { padding: '6px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ccc', whiteSpace: 'nowrap' };
const tdP = { padding: '6px 8px', textAlign: 'center', fontSize: '11px', border: '1px solid #ddd', verticalAlign: 'middle' };

function PrintView({ rows, qtdW, qtdL, qtdS, turma, etapa }) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  return (
    <div id="relatorio-print-view" style={{ display: 'none', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px' }}>Relatório de Notas</h2>
      <p style={{ fontSize: '12px', color: '#555', margin: '0 0 12px' }}>
        <b>Turma:</b> {turma} &nbsp;|&nbsp; <b>Etapa:</b> {etapa} &nbsp;|&nbsp; <b>Emitido em:</b> {hoje}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#005DE4', color: '#fff' }}>
            <th style={{ ...thP, textAlign: 'left', minWidth: '160px' }}>Aluno</th>
            {Array.from({ length: qtdW }, (_, i) => <th key={`w${i}`} style={{ ...thP, color: '#bfdbfe' }}>W{i+1}</th>)}
            <th style={{ ...thP, color: '#93c5fd' }}>⌀W</th>
            {Array.from({ length: qtdL }, (_, i) => <th key={`l${i}`} style={{ ...thP, color: '#e9d5ff' }}>L{i+1}</th>)}
            <th style={{ ...thP, color: '#d8b4fe' }}>⌀L</th>
            {Array.from({ length: qtdS }, (_, i) => <th key={`s${i}`} style={{ ...thP, color: '#a7f3d0' }}>S{i+1}</th>)}
            <th style={{ ...thP, color: '#6ee7b7' }}>⌀S</th>
            <th style={{ ...thP }}>Total</th>
            <th style={{ ...thP }}>Conceito</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ aluno, writtenAvals, listeningAvals, speakingAvals, resultado }, idx) => (
            <tr key={aluno.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8faff' }}>
              <td style={{ ...tdP, textAlign: 'left', fontWeight: 'bold' }}>{aluno.nome}</td>
              {writtenAvals.map((v, i) => <td key={`w${i}`} style={tdP}>{fmtNota(v) ?? '—'}</td>)}
              <td style={{ ...tdP, fontWeight: 'bold' }}>{resultado.written != null ? resultado.written.toFixed(1) : '—'}</td>
              {listeningAvals.map((v, i) => <td key={`l${i}`} style={tdP}>{fmtNota(v) ?? '—'}</td>)}
              <td style={{ ...tdP, fontWeight: 'bold' }}>{resultado.listening != null ? resultado.listening.toFixed(1) : '—'}</td>
              {speakingAvals.map((v, i) => <td key={`s${i}`} style={tdP}>{fmtNota(v) ?? '—'}</td>)}
              <td style={{ ...tdP, fontWeight: 'bold' }}>{resultado.speaking != null ? resultado.speaking.toFixed(1) : '—'}</td>
              <td style={{ ...tdP, fontWeight: 'bold' }}>{resultado.total != null ? resultado.total.toFixed(1) : '—'}</td>
              <td style={{ ...tdP, fontWeight: 'bold' }}>{resultado.conceito}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '16px', fontSize: '10px', color: '#aaa' }}>
        <b>Escala:</b> {CONCEITO_SCALE.map(({ min, label }) => `${label}≥${min}`).join(' · ')}
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function RelatorioNotas() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  const { turmas, loading: loadingTurmas } = useProfessorTurmas(professorSlug);
  const [turma,         setTurma]         = useState('');
  const [etapa,         setEtapa]         = useState(ETAPAS[0]);
  const [legendaAberta, setLegendaAberta] = useState(false);

  useEffect(() => {
    if (turmas.length > 0 && !turma) setTurma(turmas[0].nome);
  }, [turmas, turma]);

  const turmaObj = turmas.find(t => t.nome === turma) ?? turmas[0] ?? null;
  const { alunos, loading: loadingAlunos }       = useTurmaAlunos(turmaObj);
  const { avaliacoes, loading: loadingAvaliacoes } = useAvaliacoesParciais(turmaObj?.id, etapa);

  const qtdW = avaliacoes.Written.length;
  const qtdL = avaliacoes.Listening.length;
  const qtdS = avaliacoes.Speaking.length;

  const rows = useMemo(() => {
    return alunos.map(aluno => {
      const writtenAvals   = avaliacoes.Written.map(a => a.notas?.[aluno.id]);
      const listeningAvals = avaliacoes.Listening.map(a => a.notas?.[aluno.id]);
      const speakingAvals  = avaliacoes.Speaking.map(a => a.notas?.[aluno.id]);
      const resultado = calcularResultado(avaliacoes, aluno.id);
      return { aluno, writtenAvals, listeningAvals, speakingAvals, resultado };
    });
  }, [alunos, avaliacoes]);

  const semDados = qtdW === 0 && qtdL === 0 && qtdS === 0;

  // ── Guards (após todos os hooks) ──────────────────────────────────────────
  if (loadingTurmas) return <PageLoading titulo="Carregando turmas…" />;
  if (turmas.length === 0) return <SemTurmas onVoltar={() => navigate(`/professor/${professorSlug}/home`)} />;

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div id="relatorio-print-root">
        <PrintView rows={rows} qtdW={qtdW} qtdL={qtdL} qtdS={qtdS} turma={turma} etapa={etapa} />

        <div className="min-h-screen bg-slate-100 flex flex-col">

          <ProfessorPageHeader
            onBack={() => navigate(`/professor/${professorSlug}/notas`)}
            title="Relatório de Notas"
            subtitle="Consolidado por turma e etapa"
            accent="#0e48fe"
            rightSlot={
              <button
                onClick={() => window.print()}
                title="Imprimir relatório"
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <Printer size={20} className="text-white" />
              </button>
            }
          />

          {/* Seletores */}
          <div className="px-3 pt-3 grid grid-cols-2 gap-2 flex-shrink-0">
            <div className="relative bg-white border-2 border-[#005DE4] rounded-xl px-3 py-2.5 col-span-2">
              <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">Turma</label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#005DE4] truncate pr-2">{turma}</span>
                <svg className="w-4 h-4 text-[#005DE4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <select value={turma} onChange={e => setTurma(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                {turmas.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
            </div>

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

          {/* Pills de pontuação */}
          {!semDados && (
            <div className="px-3 pt-3 flex gap-2 flex-wrap flex-shrink-0">
              {qtdW > 0 && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">Written ×{qtdW} → /50</span>}
              {qtdL > 0 && <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-semibold">Listening ×{qtdL} → /30</span>}
              {qtdS > 0 && <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold">Speaking ×{qtdS} → /20</span>}
            </div>
          )}

          {/* Tabela */}
          <div className="px-3 pt-3 pb-3 flex-1 overflow-x-auto">
            {loadingAvaliacoes ? (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full min-w-[400px]">
                  <tbody>
                    {[1, 2, 3, 4, 5].map(i => <SkeletonLinhaNota key={i} cols={7} />)}
                  </tbody>
                </table>
              </div>
            ) : semDados ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-slate-500 font-semibold">Nenhuma nota lançada</p>
                <p className="text-slate-400 text-sm mt-1">Vá em Notas Parciais e registre as avaliações.</p>
                <button
                  onClick={() => navigate(`/professor/${professorSlug}/notas`)}
                  className="mt-4 px-5 py-2 bg-[#005DE4] text-white rounded-xl text-sm font-semibold"
                >
                  Lançar notas
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th className="text-left pl-3 w-8">#</Th>
                      <Th className="text-left min-w-[130px]">Aluno</Th>

                      {/* Written */}
                      {Array.from({ length: qtdW }, (_, i) => (
                        <Th key={`w${i}`} className="bg-blue-50 text-blue-600">W{i + 1}</Th>
                      ))}
                      {/* ⌀W sempre aparece se tem algum Written */}
                      {qtdW > 0 && <Th className="bg-blue-100 text-blue-700">⌀W</Th>}

                      {/* Listening */}
                      {Array.from({ length: qtdL }, (_, i) => (
                        <Th key={`l${i}`} className="bg-purple-50 text-purple-600">L{i + 1}</Th>
                      ))}
                      {qtdL > 0 && <Th className="bg-purple-100 text-purple-700">⌀L</Th>}

                      {/* Speaking */}
                      {Array.from({ length: qtdS }, (_, i) => (
                        <Th key={`s${i}`} className="bg-emerald-50 text-emerald-600">S{i + 1}</Th>
                      ))}
                      {qtdS > 0 && <Th className="bg-emerald-100 text-emerald-700">⌀S</Th>}

                      <Th className="bg-slate-800 text-white">Total</Th>
                      <Th className="bg-slate-700 text-white">Conceito</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ aluno, writtenAvals, listeningAvals, speakingAvals, resultado }, idx) => (
                      <tr key={aluno.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <Td className="text-slate-400 text-[11px] pl-3">{idx + 1}</Td>
                        <Td className="text-left font-semibold text-slate-700 text-[11px] leading-tight">
                          {aluno.nome}
                        </Td>

                        {/* Written individual */}
                        {writtenAvals.map((v, i) => (
                          <Td key={`w${i}`}>
                            <CelulaNota valor={v} colorClass="text-blue-600" />
                          </Td>
                        ))}
                        {/* ⌀W */}
                        {qtdW > 0 && (
                          <Td className="bg-blue-50">
                            {resultado.written != null
                              ? <span className="text-blue-700 font-bold">{resultado.written.toFixed(1)}</span>
                              : <span className="text-slate-300 text-[11px]">—</span>}
                          </Td>
                        )}

                        {/* Listening individual */}
                        {listeningAvals.map((v, i) => (
                          <Td key={`l${i}`}>
                            <CelulaNota valor={v} colorClass="text-purple-600" />
                          </Td>
                        ))}
                        {qtdL > 0 && (
                          <Td className="bg-purple-50">
                            {resultado.listening != null
                              ? <span className="text-purple-700 font-bold">{resultado.listening.toFixed(1)}</span>
                              : <span className="text-slate-300 text-[11px]">—</span>}
                          </Td>
                        )}

                        {/* Speaking individual */}
                        {speakingAvals.map((v, i) => (
                          <Td key={`s${i}`}>
                            <CelulaNota valor={v} colorClass="text-emerald-600" />
                          </Td>
                        ))}
                        {qtdS > 0 && (
                          <Td className="bg-emerald-50">
                            {resultado.speaking != null
                              ? <span className="text-emerald-700 font-bold">{resultado.speaking.toFixed(1)}</span>
                              : <span className="text-slate-300 text-[11px]">—</span>}
                          </Td>
                        )}

                        {/* Total */}
                        <Td className={`font-bold text-sm ${totalColor(resultado.total)}`}>
                          {resultado.total != null ? resultado.total.toFixed(1) : '—'}
                        </Td>

                        {/* Conceito */}
                        <Td>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${conceitoBadge(resultado.conceito)}`}>
                            {resultado.conceito}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legenda de conceitos (expansível) */}
          {!semDados && (
            <LegendaConceitos
              aberta={legendaAberta}
              onToggle={() => setLegendaAberta(v => !v)}
            />
          )}

        </div>
      </div>
    </>
  );
}
