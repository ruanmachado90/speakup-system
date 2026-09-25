import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ModalAddAvaliacao from '../components/notas/ModalAddAvaliacao';
import BoletimModal from '../components/notas/BoletimNotasModal';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { buscarAlunosDasTurmas } from '../utils/buscarAlunos';
import { useGrades, CATEGORIAS, calcularConceito, conceitoCor, calcularMediaCategoria } from '../hooks/useNotas';

// ── Helpers ───────────────────────────────────────────────────────────────────
function gerarSemestres() {
  const ano = new Date().getFullYear();
  const list = [];
  for (let y = ano - 1; y <= ano + 1; y++) list.push(`${y}-1`, `${y}-2`);
  return list;
}
function semestreLabel(s) {
  const [ano, sem] = s.split('-');
  return `${sem}o Sem / ${ano}`;
}


// ── View embeddable: recebe dados já carregados, sem auth/fetch próprio ────────

export function NotasView({ professorSlug, professorNome, turmas, alunosPorTurma, onVoltar }) {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [semestre, setSemestre] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`;
  });
  const [addAvTipo, setAddAvTipo] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [aulas, setAulas] = useState([]);
  const inputRef = useRef(null);
  const [cardAluno, setCardAluno] = useState(null);

  const {
    avaliacoes, gradesMap, loading: loadingGrades,
    addAvaliacao, deleteAvaliacao, setScore,
  } = useGrades({ professorSlug, turmaId: selectedTurma || null, semestre });

  // Auto-seleciona turma quando há apenas uma
  useEffect(() => {
    if (turmas.length === 1) setSelectedTurma(turmas[0].id);
  }, [turmas]);

  // Busca aulas da turma selecionada para calcular faltas reais
  useEffect(() => {
    if (!selectedTurma) return;
    const fetchAulas = async () => {
      try {
        const q = query(collection(db, 'aulas'), where('turmaId', '==', selectedTurma));
        const snap = await getDocs(q);
        setAulas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Notas fetchAulas error:', e);
      }
    };
    fetchAulas();
  }, [selectedTurma]);

  // Mapa de faltas reais: { [alunoId]: { faltas, total, pct } }
  const faltasMap = useMemo(() => {
    const map = {};
    for (const aula of aulas) {
      for (const chamada of (aula.chamadas || [])) {
        if (!chamada.alunoId) continue;
        if (!map[chamada.alunoId]) map[chamada.alunoId] = { faltas: 0, total: 0 };
        map[chamada.alunoId].total++;
        if (chamada.status === 'falta') map[chamada.alunoId].faltas++;
      }
    }
    for (const id of Object.keys(map)) {
      const { faltas, total } = map[id];
      map[id].pct = total > 0 ? Math.round(((total - faltas) / total) * 100) : 100;
    }
    return map;
  }, [aulas]);

  const alunos = useMemo(() => {
    if (!selectedTurma) return [];
    return [...(alunosPorTurma[selectedTurma] || [])].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
  }, [selectedTurma, alunosPorTurma]);

  const turmaObj = useMemo(() => turmas.find(t => t.id === selectedTurma) || null, [turmas, selectedTurma]);

  // Provas agrupadas por categoria
  const avsByTipo = useMemo(() => {
    const map = {};
    for (const cat of CATEGORIAS) {
      map[cat.tipo] = avaliacoes.filter(av => av.tipo === cat.tipo);
    }
    return map;
  }, [avaliacoes]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  const startEdit = (studentId, key, currentVal) => {
    setEditingCell({ studentId, key });
    setEditVal(currentVal != null ? String(currentVal) : '');
  };

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { studentId, key } = editingCell;
    setEditingCell(null);
    setSavingCell({ studentId, key });
    try {
      // Aceita vírgula ("7,5") e recusa nota acima do máximo da prova.
      const val = editVal.trim() === '' ? null : parseFloat(editVal.replace(',', '.'));
      const maxProva = Number(avaliacoes.find(av => av.id === key)?.pontos);
      if (val !== null && maxProva > 0 && val > maxProva) {
        alert(`Nota ${val} acima do máximo desta prova (${maxProva}). Não foi salva.`);
        return;
      }
      if (val === null || (!isNaN(val) && val >= 0)) {
        await setScore(studentId, key, val);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
      }
    } finally {
      setSavingCell(null);
    }
  }, [editingCell, editVal, setScore, avaliacoes]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleAddAv = async (data) => {
    await addAvaliacao(data);
    setAddAvTipo(null);
  };

  // Celula de score / faltas
  const renderCell = (studentId, key, val, max) => {
    const isEditing = editingCell?.studentId === studentId && editingCell?.key === key;
    const isSaving  = savingCell?.studentId  === studentId && savingCell?.key  === key;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="number" min="0" max={max} step="0.5"
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', border: '2px solid #0e48fe', borderRadius: 4, padding: '2px 4px', fontSize: 12, textAlign: 'center', outline: 'none', fontWeight: 700, boxSizing: 'border-box', color: '#0f172a', background: '#eff6ff' }}
        />
      );
    }
    if (isSaving) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 26 }}>
          <div style={{ width: 12, height: 12, border: '2px solid #e2e8f0', borderTopColor: '#0e48fe', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
      );
    }
    const hasVal = val !== null && val !== undefined;
    return (
      <div
        onClick={() => startEdit(studentId, key, val)}
        title="Clique para editar"
        style={{ cursor: 'pointer', minHeight: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: hasVal ? 600 : 400, color: hasVal ? '#0f172a' : '#cbd5e1', background: hasVal ? 'white' : 'transparent', border: hasVal ? '1px solid #e2e8f0' : '1px dashed #e2e8f0' }}
      >
        {hasVal ? val : '—'}
      </div>
    );
  };

  const semestres = useMemo(() => gerarSemestres(), []);

  // Total de colunas da tabela
  const totalCols = 2 + CATEGORIAS.reduce((s, cat) => s + (avsByTipo[cat.tipo]?.length || 0) + 1, 0) + 3;

  return (
    <div className="space-y-5">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-accent to-accent-hover px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onVoltar}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all border border-white/20"
              >
                <ArrowLeft size={15} /> Voltar ao Painel
              </button>
              <div>
                <h1 className="text-white font-bold text-xl">Lançamento de Notas</h1>
                <p className="text-white/70 text-xs">{professorNome}</p>
              </div>
              {savedIndicator && (
                <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs rounded-full px-3 py-1 font-medium">
                  ✓ Salvo automaticamente
                </span>
              )}
            </div>
            <img
              src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png"
              alt="SpeakUp"
              className="h-10 object-contain hidden sm:block"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-[2] min-w-[180px]">
              <label className="text-white/80 text-xs font-semibold block mb-1.5 uppercase tracking-wide">Turma</label>
              <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none cursor-pointer focus:border-white/60 transition-all">
                <option value="" className="bg-accent-hover">— Selecione a turma —</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id} className="bg-accent-hover">{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-white/80 text-xs font-semibold block mb-1.5 uppercase tracking-wide">Semestre</label>
              <select value={semestre} onChange={e => setSemestre(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none cursor-pointer focus:border-white/60 transition-all">
                {semestres.map(s => (
                  <option key={s} value={s} className="bg-accent-hover">{semestreLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda das categorias */}
      {selectedTurma && (
        <div className="flex gap-3 flex-wrap">
          {CATEGORIAS.map(cat => (
            <div key={cat.tipo} className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-slate-100 flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.bg }} />
              <span className="font-bold text-slate-800 text-sm">{cat.label}</span>
              <span className="text-slate-500 text-xs">{cat.labelPt}</span>
              <span className="bg-slate-100 rounded px-2 py-0.5 text-xs font-bold text-slate-600">{cat.max} pts</span>
              <button
                onClick={() => setAddAvTipo(cat.tipo)}
                className="ml-1 flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition-opacity hover:opacity-80"
                style={{ background: cat.bg }}
              >
                <Plus size={11} /> Add
              </button>
            </div>
          ))}
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-slate-100 flex items-center gap-2">
            <span className="text-slate-500 text-xs">Total</span>
            <span className="bg-accent text-white rounded px-2 py-0.5 text-xs font-bold">100 pts</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {!selectedTurma ? (
          <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center border border-slate-100">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg font-semibold text-slate-600">Selecione uma turma para lançar as notas</p>
            <p className="text-slate-400 text-sm mt-1">As notas são salvas automaticamente</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>

                {/* Linha 1: categorias com colSpan */}
                <tr>
                  <th rowSpan={3} style={{ ...thBase, background: '#0a2540', color: 'white', width: 36, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>N</th>
                  <th rowSpan={3} style={{ ...thBase, background: '#0a2540', color: 'white', textAlign: 'left', minWidth: 160, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Aluno</th>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <th
                        key={cat.tipo}
                        colSpan={avs.length + 1}
                        style={{ ...thBase, background: cat.bg, color: 'white', textAlign: 'center', borderRight: '2px solid rgba(255,255,255,0.2)', padding: '6px 10px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800 }}>{cat.label}</span>
                          <span style={{ fontSize: 11, opacity: 0.8 }}>({cat.labelPt})</span>
                          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{cat.max} pts</span>
                        </div>
                      </th>
                    );
                  })}
                  <th rowSpan={3} style={{ ...thBase, background: '#0a2540', color: 'white', width: 80, textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total<div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>/100</div></th>
                  <th rowSpan={3} style={{ ...thBase, background: '#0a2540', color: 'white', width: 90, textAlign: 'center' }}>Faltas<div style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>de chamadas</div></th>
                  <th rowSpan={3} style={{ ...thBase, background: '#0a2540', color: 'white', width: 70, textAlign: 'center' }}>Boletim</th>
                </tr>

                {/* Linha 2: labels das provas + "Media" */}
                <tr>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <React.Fragment key={cat.tipo}>
                        {avs.map(av => (
                          <th key={av.id} style={{ ...thBase, background: cat.bgMedia, color: 'white', fontSize: 11, textAlign: 'center', minWidth: 70, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              {av.label}
                              <button
                                onClick={() => deleteAvaliacao(av.id)}
                                title="Remover"
                                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, padding: '1px 3px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
                              >
                                <X size={8} />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th style={{ ...thBase, background: cat.bgMedia, color: 'rgba(255,255,255,0.9)', fontSize: 10, textAlign: 'center', fontStyle: 'italic', borderRight: '2px solid rgba(255,255,255,0.2)' }}>
                          Media
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Linha 3: pontos das provas + max categoria */}
                <tr>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <React.Fragment key={cat.tipo}>
                        {avs.map(av => (
                          <td key={av.id} style={{ ...tdBase, background: '#002d6b', color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '3px 8px' }}>
                            /{av.pontos}
                          </td>
                        ))}
                        <td style={{ ...tdBase, background: '#243d5c', color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center', fontStyle: 'italic', borderRight: '2px solid rgba(255,255,255,0.15)', padding: '3px 8px' }}>
                          /{cat.max}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {alunos.length === 0 && (
                  <tr>
                    <td colSpan={totalCols} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
                      {loadingGrades ? 'Carregando...' : 'Nenhum aluno encontrado nesta turma.'}
                    </td>
                  </tr>
                )}

                {alunos.map((aluno, idx) => {
                  const grade = gradesMap[aluno.id] || { scores: {}, faltas: 0 };
                  const medias = CATEGORIAS.map(cat =>
                    calcularMediaCategoria(avsByTipo[cat.tipo] || [], grade.scores, cat.max)
                  );
                  const hasAnyScore = medias.some(m => m !== null);
                  const allScored = medias.every(m => m !== null);
                  const totalFinal = allScored
                    ? parseFloat(medias.reduce((s, m) => s + m, 0).toFixed(2))
                    : null;
                  const conceito = totalFinal !== null ? calcularConceito(totalFinal) : null;
                  const rowBg = idx % 2 === 0 ? 'white' : '#f8fafc';

                  return (
                    <tr key={aluno.id} style={{ background: rowBg }}>
                      {/* N */}
                      <td style={{ ...tdBase, textAlign: 'center', color: '#94a3b8', fontSize: 12, width: 36, borderRight: '1px solid #f1f5f9', padding: '6px 8px' }}>
                        {idx + 1}
                      </td>
                      {/* Nome */}
                      <td style={{ ...tdBase, fontWeight: 500, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', borderRight: '2px solid #e2e8f0', padding: '6px 10px' }}>
                        {aluno.name}
                      </td>

                      {/* Scores por categoria */}
                      {CATEGORIAS.map((cat, ci) => {
                        const avs = avsByTipo[cat.tipo] || [];
                        const media = medias[ci];
                        return (
                          <React.Fragment key={cat.tipo}>
                            {avs.map(av => (
                              <td key={av.id} style={{ ...tdBase, textAlign: 'center', borderRight: '1px solid #f1f5f9', padding: '4px 6px', minWidth: 70 }}>
                                {renderCell(aluno.id, av.id, grade.scores[av.id] ?? null, av.pontos)}
                              </td>
                            ))}
                            {/* Media da categoria */}
                            <td style={{ ...tdBase, textAlign: 'center', padding: '4px 8px', borderRight: '2px solid #e2e8f0', background: media !== null ? '#f0f9ff' : rowBg }}>
                              {media !== null ? (
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0369a1' }}>{media.toFixed(1)}</div>
                                  <div style={{ fontSize: 9, color: '#94a3b8' }}>/{cat.max}</div>
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Total final */}
                      <td style={{ ...tdBase, textAlign: 'center', borderLeft: '2px solid #e2e8f0', padding: '4px 8px', background: totalFinal !== null ? '#f0f4ff' : rowBg }}>
                        {totalFinal !== null ? (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{totalFinal.toFixed(1)}</div>
                            {conceito && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: conceitoCor(conceito) }}>{conceito}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Faltas reais das aulas */}
                      <td style={{ ...tdBase, textAlign: 'center', padding: '4px 6px' }}>
                        {(() => {
                          const f = faltasMap[aluno.id];
                          if (!f || f.total === 0) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
                          const baixaFreq = f.pct < 75;
                          return (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: baixaFreq ? '#dc2626' : '#0f172a' }}>
                                {f.faltas}
                              </div>
                              <div style={{ fontSize: 10, color: baixaFreq ? '#dc2626' : '#94a3b8', fontWeight: baixaFreq ? 700 : 400 }}>
                                {f.pct}%
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Boletim */}
                      <td style={{ ...tdBase, textAlign: 'center', padding: '4px 6px' }}>
                        {hasAnyScore && (
                          <button
                            onClick={() => setCardAluno({ aluno, totalFinal, conceito, medias })}
                            title="Gerar boletim semestral"
                            style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                          >
                            📤
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Boletim */}
      {cardAluno && (
        <BoletimModal
          aluno={cardAluno.aluno}
          totalFinal={cardAluno.totalFinal}
          conceito={cardAluno.conceito}
          medias={cardAluno.medias}
          turma={turmaObj}
          semestre={semestre}
          professorNome={professorNome}
          onClose={() => setCardAluno(null)}
        />
      )}

      {/* Modal add avaliacao */}
      {addAvTipo && (
        <ModalAddAvaliacao
          tipo={addAvTipo}
          onSave={handleAddAv}
          onClose={() => setAddAvTipo(null)}
        />
      )}
    </div>
  );
}

// ── Página completa (wrapper para rota standalone) ────────────────────────────
export default function Notas() {
  const { professorSlug } = useParams();
  const navigate = useNavigate();

  const professorNome = useMemo(() => {
    if (!professorSlug) return '';
    return professorSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [professorSlug]);

  const professorPrimeiroNome = useMemo(() => {
    const p = professorSlug?.split('-')[0] || '';
    return p.charAt(0).toUpperCase() + p.slice(1);
  }, [professorSlug]);

  const [turmas, setTurmas] = useState([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setAuthReady(true); }
      else { signInAnonymously(auth).catch(() => { setAuthReady(true); }); }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!professorPrimeiroNome || !authReady) return;
    const fetchData = async () => {
      setLoadingData(true);
      setFetchError(null);
      try {
        const snap = await getDocs(collection(db, 'turmas'));
        const minhas = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => (t.professor || '').toLowerCase().includes(professorPrimeiroNome.toLowerCase()));
        setTurmas(minhas);
        // Só os alunos das turmas do professor, por id (antes: coleção inteira).
        setAlunosPorTurma(await buscarAlunosDasTurmas(minhas));
      } catch (e) {
        setFetchError(e.message || 'Erro ao carregar dados.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [professorPrimeiroNome, authReady]);

  if (!authReady || loadingData) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0e48fe', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {!authReady ? 'Autenticando...' : 'Carregando turmas...'}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#dc2626', maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>x</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Erro ao carregar dados</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{fetchError}</div>
          <button onClick={() => window.location.reload()} style={{ background: '#0e48fe', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <NotasView
      professorSlug={professorSlug}
      professorNome={professorNome}
      turmas={turmas}
      alunosPorTurma={alunosPorTurma}
      onVoltar={() => navigate(`/professor/${professorSlug}`)}
    />
  );
}

// ── Styles (apenas para elementos da tabela com cores dinâmicas) ─────────────
const thBase  = { padding: '8px 10px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' };
const tdBase  = { padding: '5px 8px', borderBottom: '1px solid #f1f5f9' };
