import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { APP_ID } from '../utils/constants';
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

// ── Modal: adicionar avaliacao ────────────────────────────────────────────────
function ModalAddAvaliacao({ tipo, onSave, onClose }) {
  const cat = CATEGORIAS.find(c => c.tipo === tipo) || CATEGORIAS[0];
  const [pontos, setPontos] = useState(String(cat.max));
  const [err, setErr] = useState('');

  const handleSave = () => {
    const p = parseFloat(pontos);
    if (isNaN(p) || p <= 0) { setErr('Informe uma pontuacao valida.'); return; }
    onSave({ tipo, pontos: p });
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ ...modalHeader, background: `linear-gradient(135deg, ${cat.bg}, ${cat.bgMedia})` }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
            Nova Prova — {cat.label} ({cat.labelPt})
          </span>
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0369a1' }}>
            Categoria <strong>{cat.label}</strong> vale ate <strong>{cat.max} pontos</strong> na nota final.
            A media das provas desta categoria sera usada como resultado.
          </div>
          <div>
            <label style={lbl}>Pontuacao desta prova</label>
            <input
              type="number" min="0.5" step="0.5" autoFocus
              value={pontos}
              onChange={e => setPontos(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              style={inp}
            />
          </div>
          {err && <div style={{ color: '#dc2626', fontSize: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnSec}>Cancelar</button>
            <button onClick={handleSave} style={btnPri}>Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────
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
  const [selectedTurma, setSelectedTurma] = useState('');
  const [semestre, setSemestre] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`;
  });
  // addAvTipo: qual categoria esta sendo adicionada, ou null
  const [addAvTipo, setAddAvTipo] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [aulas, setAulas] = useState([]);
  const inputRef = useRef(null);

  const {
    avaliacoes, gradesMap, loading: loadingGrades,
    addAvaliacao, deleteAvaliacao, setScore, setFaltas,
  } = useGrades({ professorSlug, turmaId: selectedTurma || null, semestre });

  // Auth antes de qualquer fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setAuthReady(true); unsub(); }
    });
    signInAnonymously(auth).catch(() => { setAuthReady(true); });
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

        const alunosSnap = await getDocs(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'students')
        );
        const todos = alunosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const mapa = {};
        for (const t of minhas) {
          const ids = t.alunosIds || [];
          mapa[t.id] = ids.length > 0
            ? todos.filter(a => ids.includes(a.id))
            : todos.filter(a => (a.turma || a.turmaId) === t.id);
        }
        setAlunosPorTurma(mapa);
        if (minhas.length === 1) setSelectedTurma(minhas[0].id);
      } catch (e) {
        console.error('Notas fetchData error:', e);
        setFetchError(e.message || 'Erro ao carregar dados.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [professorPrimeiroNome, authReady]);

  // Busca aulas da turma selecionada para calcular faltas reais
  useEffect(() => {
    if (!selectedTurma || !authReady) return;
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
  }, [selectedTurma, authReady]);

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
      const val = editVal === '' ? null : parseFloat(editVal);
      if (val === null || (!isNaN(val) && val >= 0)) {
        await setScore(studentId, key, val);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
      }
    } finally {
      setSavingCell(null);
    }
  }, [editingCell, editVal, setScore, setFaltas]);

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
          style={{ width: '100%', border: '2px solid #005DE4', borderRadius: 4, padding: '2px 4px', fontSize: 12, textAlign: 'center', outline: 'none', fontWeight: 700, boxSizing: 'border-box', color: '#0f172a', background: '#eff6ff' }}
        />
      );
    }
    if (isSaving) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 26 }}>
          <div style={{ width: 12, height: 12, border: '2px solid #e2e8f0', borderTopColor: '#005DE4', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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
  const totalCols = 2 + CATEGORIAS.reduce((s, cat) => s + (avsByTipo[cat.tipo]?.length || 0) + 1, 0) + 2;

  if (loadingData || !authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#005DE4', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
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
          <button onClick={() => window.location.reload()} style={{ background: '#005DE4', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#005DE4,#0041a8)', padding: '14px 20px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(`/professor/${professorSlug}`)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
            >
              <ArrowLeft size={15} /> Voltar
            </button>
            <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>Lançamento de Notas</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{professorNome}</div>
              </div>
              {savedIndicator && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'white', marginTop: 2 }}>
                  ✓ Salvo
                </div>
              )}
            </div>
            <img
              src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png"
              alt="SpeakUp"
              style={{ height: 40, objectFit: 'contain' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label style={selLabel}>TURMA</label>
              <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)} style={selStyle}>
                <option value="" style={{ background: '#0041a8' }}>— Selecione a turma —</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id} style={{ background: '#0041a8' }}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={selLabel}>SEMESTRE</label>
              <select value={semestre} onChange={e => setSemestre(e.target.value)} style={selStyle}>
                {semestres.map(s => (
                  <option key={s} value={s} style={{ background: '#0041a8' }}>{semestreLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda das categorias */}
      {selectedTurma && (
        <div style={{ maxWidth: 1440, margin: '16px auto 0', padding: '0 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CATEGORIAS.map(cat => (
            <div key={cat.tipo} style={{ background: 'white', borderRadius: 8, padding: '8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.bg }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{cat.label}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{cat.labelPt}</span>
              <span style={{ background: '#f1f5f9', borderRadius: 5, padding: '1px 7px', fontSize: 12, fontWeight: 700, color: '#334155' }}>{cat.max} pts</span>
              <button
                onClick={() => setAddAvTipo(cat.tipo)}
                style={{ background: cat.bg, color: 'white', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4 }}
              >
                <Plus size={11} /> Add
              </button>
            </div>
          ))}
          <div style={{ background: 'white', borderRadius: 8, padding: '8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
            <span style={{ background: '#005DE4', color: 'white', borderRadius: 5, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>100 pts</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1440, margin: '16px auto', padding: '0 16px 60px' }}>
        {!selectedTurma ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F4CA;</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>Selecione uma turma para lancar as notas</div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>

                {/* Linha 1: categorias com colSpan */}
                <tr>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 36, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>N</th>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', textAlign: 'left', minWidth: 160, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Aluno</th>
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
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 80, textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total<div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>/100</div></th>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 90, textAlign: 'center' }}>Faltas<div style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>de chamadas</div></th>
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
                  const totalFinal = hasAnyScore
                    ? parseFloat(medias.reduce((s, m) => s + (m ?? 0), 0).toFixed(2))
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

// ── Styles ────────────────────────────────────────────────────────────────────
const thBase  = { padding: '8px 10px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' };
const tdBase  = { padding: '5px 8px', borderBottom: '1px solid #f1f5f9' };
const lbl     = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };
const inp     = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const btnPri  = { background: '#005DE4', color: 'white', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };
const btnSec  = { background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const selLabel = { color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'block', marginBottom: 4, fontWeight: 600 };
const selStyle = { width: '100%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 10px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none' };
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modal   = { background: 'white', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' };
const modalHeader = { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const iconBtn = { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' };
