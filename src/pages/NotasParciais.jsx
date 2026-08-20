import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronDown, Check, AlertCircle, School, Loader2, FileStack } from 'lucide-react';
import { db } from '../firebase';
import { PONTOS, TIPOS, salvarAvaliacao } from '../utils/notasStorage';
import { useAvaliacoesParciais, etapaToSemestre } from '../hooks/useAvaliacoesParciais';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';
import { useTurmaAlunos } from '../hooks/useTurmaAlunos';
import { CATEGORIAS, calcularMediaCategoria } from '../hooks/useNotas';
import { buildBoletimHTML, buildBoletimLoteHTML } from '../utils/boletim';
import { PageLoading, SemTurmas, ProfessorPageHeader } from '../components/professor/PageLoading';

const ETAPAS = ['1º Semestre', '2º Semestre'];
const etapaAtual = () => new Date().getMonth() <= 5 ? ETAPAS[0] : ETAPAS[1];

// Dias da semana em que uma turma tem aula (a partir de horarios[] ou do campo legado "dias").
function diasDaTurma(t) {
  if (t?.horarios?.length) return t.horarios.map(h => h.dia).filter(Boolean);
  if (t?.dias) return t.dias.split(',').map(d => d.trim()).filter(Boolean);
  return [];
}

const ORDEM_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function notaColor(val, max) {
  if (val === '' || val == null) return 'text-slate-400';
  const n = parseFloat(val);
  if (isNaN(n)) return 'text-red-500';
  if (n >= max * 0.7) return 'text-emerald-600';
  if (n >= max * 0.5) return 'text-amber-500';
  return 'text-red-500';
}

function isInvalido(val, max) {
  if (val === '' || val == null) return false;
  const n = parseFloat(val);
  return isNaN(n) || n < 0 || n > max;
}

function DropSelect({ label, value, options, onChange }) {
  return (
    <div className="relative bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
      <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">{label}</label>
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-[#005DE4] truncate pr-2">{value}</span>
        <ChevronDown size={20} className="text-[#005DE4] flex-shrink-0" />
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Avatar({ nome }) {
  return (
    <div className="w-11 h-11 rounded-full bg-[#005DE4]/10 border-2 border-[#005DE4]/20 flex items-center justify-center flex-shrink-0">
      <span className="text-[#005DE4] font-bold text-base">{nome?.[0] ?? '?'}</span>
    </div>
  );
}

function SeletorBoletimModal({ titulo, subtitulo, onEscolher, onCancelar }) {
  const opcoes = [
    { modo: 'ambos', label: 'Ambos os semestres', hint: 'Boletim completo, com a média final' },
    { modo: '1', label: '1º Semestre', hint: 'Só as notas do 1º semestre' },
    { modo: '2', label: '2º Semestre', hint: 'Só as notas do 2º semestre' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl px-5 pt-6 pb-10 space-y-3 shadow-2xl">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
        <div>
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>
        </div>
        <div className="space-y-2 pt-2">
          {opcoes.map(({ modo, label, hint }) => (
            <button
              key={modo}
              onClick={() => onEscolher(modo)}
              className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-2xl px-4 py-3 transition-colors"
            >
              <p className="font-bold text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
            </button>
          ))}
        </div>
        <button onClick={onCancelar} className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-all mt-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Toast({ msg, tipo }) {
  return (
    <div className={`fixed bottom-24 left-4 right-4 z-50 py-3 px-5 rounded-2xl text-white text-sm font-semibold text-center shadow-xl ${tipo === 'erro' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {msg}
    </div>
  );
}

export default function NotasParciais() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  // ── Dados reais do Firestore ──────────────────────────────────────────────
  const { turmas, loading: loadingTurmas } = useProfessorTurmas(professorSlug);
  const [filtroDia, setFiltroDia] = useState('Todos os dias');
  const [turma, setTurma] = useState('');

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
  const { alunos, loading: loadingAlunos } = useTurmaAlunos(turmaObj);

  // ── Estado da avaliação ───────────────────────────────────────────────────
  const [etapa,     setEtapa]     = useState(etapaAtual());
  const [tipo,      setTipo]      = useState(TIPOS[0]);
  const [testIndex, setTestIndex] = useState(0);
  const [notas,     setNotas]     = useState({});
  const [erros,     setErros]     = useState({});
  const [salvo,     setSalvo]     = useState(false);
  const [toast,     setToast]     = useState(null);

  const { avaliacoes, loading: loadingAvaliacoes } = useAvaliacoesParciais(turmaObj?.id, etapa);

  const pontos = PONTOS[tipo];

  // Carrega notas da avaliação selecionada quando muda tipo/index/dados do Firestore
  useEffect(() => {
    setNotas(avaliacoes[tipo]?.[testIndex]?.notas ?? {});
    setErros({});
    setSalvo(false);
  }, [avaliacoes, tipo, testIndex]);

  useEffect(() => { setTestIndex(0); }, [turma, etapa, tipo]);

  const listaExistente  = avaliacoes[tipo] ?? [];
  const totalExistentes = listaExistente.length;

  const opcoesAvaliacao = [
    ...Array.from({ length: totalExistentes }, (_, i) => `${tipo} #${i + 1}`),
    `+ Nova ${tipo}`,
  ];
  const opcaoAtual = testIndex < totalExistentes ? `${tipo} #${testIndex + 1}` : `+ Nova ${tipo}`;

  const preenchidos = Object.values(notas).filter(v => v !== '').length;
  const temErros    = Object.values(erros).some(Boolean);

  const showToast = (msg, tipo = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNotaChange = (alunoId, value) => {
    if (value !== '' && parseFloat(value) < 0) return;
    setNotas(n => ({ ...n, [alunoId]: value }));
    const invalido = isInvalido(value, pontos);
    setErros(e => {
      const c = { ...e };
      if (invalido) c[alunoId] = true; else delete c[alunoId];
      return c;
    });
  };

  const handleSalvar = async () => {
    if (temErros) { showToast(`Corrija as notas inválidas (máx ${pontos} pts)`, 'erro'); return; }
    try {
      const existingId = listaExistente[testIndex]?.id ?? null;
      await salvarAvaliacao(turmaObj.id, etapa, professorSlug, tipo, testIndex, notas, existingId);
      if (testIndex >= totalExistentes) setTestIndex(totalExistentes);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'erro');
    }
  };

  // ── Boletim (mesma lógica de Students.jsx, adaptada pro professor) ─────────
  const [generatingBoletimId, setGeneratingBoletimId] = useState(null);
  const [generatingLote, setGeneratingLote] = useState(false);
  // null | { tipo: 'aluno', aluno } | { tipo: 'lote' } — aguardando escolha de semestre
  const [boletimAlvo, setBoletimAlvo] = useState(null);

  // modo: 'ambos' | '1' | '2' — controla quais semestres entram no boletim gerado.
  const gerarBoletim = async (aluno, modo = 'ambos') => {
    if (!turmaObj) return;
    const anoAtual = new Date().getFullYear();
    setGeneratingBoletimId(aluno.id);
    try {
      const incluir1 = modo === 'ambos' || modo === '1';
      const incluir2 = modo === 'ambos' || modo === '2';
      const etapaLabel = modo === '1' ? '1º Semestre' : modo === '2' ? '2º Semestre' : '1º e 2º Semestre';

      const buscarSemestre = async (sem) => {
        const [avSnap, gSnap] = await Promise.all([
          getDocs(query(collection(db, 'avaliacoes'), where('turmaId', '==', turmaObj.id), where('semestre', '==', sem))),
          getDocs(query(collection(db, 'grades'), where('turmaId', '==', turmaObj.id), where('semestre', '==', sem))),
        ]);
        const avaliacoes = avSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        const gradeDoc = gSnap.docs.find(d => d.data().studentId === aluno.id);
        const scores = gradeDoc ? (gradeDoc.data().scores || {}) : {};
        return { avaliacoes, scores };
      };
      const vazio = { avaliacoes: [], scores: {} };

      const [dadosSem1, dadosSem2] = await Promise.all([
        incluir1 ? buscarSemestre(etapaToSemestre(ETAPAS[0])) : Promise.resolve(vazio),
        incluir2 ? buscarSemestre(etapaToSemestre(ETAPAS[1])) : Promise.resolve(vazio),
      ]);

      const notasPorSem = [dadosSem1, dadosSem2].map(({ avaliacoes, scores }) =>
        CATEGORIAS.map(cat => {
          const avsCat = avaliacoes.filter(a => a.tipo === cat.tipo);
          const nota = calcularMediaCategoria(avsCat, scores, cat.max);
          return { nota };
        })
      );

      const sum = (semIdx) => notasPorSem[semIdx].reduce((s, n) => s + (n.nota ?? 0), 0);
      const has = (semIdx) => notasPorSem[semIdx].some(n => n.nota != null);
      const total1 = incluir1 && has(0) ? sum(0) : null;
      const total2 = incluir2 && has(1) ? sum(1) : null;
      const totalFinal = total1 != null && total2 != null
        ? Math.round((total1 + total2) / 2)
        : total1 ?? total2 ?? null;

      const student = { name: aluno.nome, teacher: turmaObj.professor, course: turmaObj.nome };
      const turmaInfo = { nome: turmaObj.nome, nivel: turmaObj.nivel };
      const win = window.open('', '_blank');
      win.document.write(buildBoletimHTML({ student, turmaInfo, notas: notasPorSem, total1, total2, totalFinal, anoAtual, etapaLabel }));
      win.document.close();
    } catch {
      showToast('Erro ao gerar boletim. Tente novamente.', 'erro');
    } finally {
      setGeneratingBoletimId(null);
    }
  };

  // Gera o boletim de todos os alunos da turma num só documento (um PDF só ao imprimir).
  // Busca avaliações/notas uma única vez por semestre (não repete por aluno).
  const gerarBoletimLote = async (modo = 'ambos') => {
    if (!turmaObj || alunos.length === 0) return;
    const anoAtual = new Date().getFullYear();
    setGeneratingLote(true);
    try {
      const incluir1 = modo === 'ambos' || modo === '1';
      const incluir2 = modo === 'ambos' || modo === '2';
      const etapaLabel = modo === '1' ? '1º Semestre' : modo === '2' ? '2º Semestre' : '1º e 2º Semestre';

      const buscarSemestre = async (sem) => {
        const [avSnap, gSnap] = await Promise.all([
          getDocs(query(collection(db, 'avaliacoes'), where('turmaId', '==', turmaObj.id), where('semestre', '==', sem))),
          getDocs(query(collection(db, 'grades'), where('turmaId', '==', turmaObj.id), where('semestre', '==', sem))),
        ]);
        const avaliacoes = avSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        const scoresPorAluno = {};
        gSnap.docs.forEach(d => { scoresPorAluno[d.data().studentId] = d.data().scores || {}; });
        return { avaliacoes, scoresPorAluno };
      };
      const vazio = { avaliacoes: [], scoresPorAluno: {} };

      const [dadosSem1, dadosSem2] = await Promise.all([
        incluir1 ? buscarSemestre(etapaToSemestre(ETAPAS[0])) : Promise.resolve(vazio),
        incluir2 ? buscarSemestre(etapaToSemestre(ETAPAS[1])) : Promise.resolve(vazio),
      ]);

      const student = (aluno) => ({ name: aluno.nome, teacher: turmaObj.professor, course: turmaObj.nome });
      const turmaInfo = { nome: turmaObj.nome, nivel: turmaObj.nivel };

      const itemsParams = alunos.map(aluno => {
        const notasPorSem = [dadosSem1, dadosSem2].map(({ avaliacoes, scoresPorAluno }) => {
          const scores = scoresPorAluno[aluno.id] || {};
          return CATEGORIAS.map(cat => {
            const avsCat = avaliacoes.filter(a => a.tipo === cat.tipo);
            const nota = calcularMediaCategoria(avsCat, scores, cat.max);
            return { nota };
          });
        });
        const sum = (semIdx) => notasPorSem[semIdx].reduce((s, n) => s + (n.nota ?? 0), 0);
        const has = (semIdx) => notasPorSem[semIdx].some(n => n.nota != null);
        const total1 = incluir1 && has(0) ? sum(0) : null;
        const total2 = incluir2 && has(1) ? sum(1) : null;
        const totalFinal = total1 != null && total2 != null
          ? Math.round((total1 + total2) / 2)
          : total1 ?? total2 ?? null;
        return { student: student(aluno), turmaInfo, notas: notasPorSem, total1, total2, totalFinal, anoAtual, etapaLabel };
      });

      const win = window.open('', '_blank');
      win.document.write(buildBoletimLoteHTML(itemsParams, `Boletins — ${turmaObj.nome}`));
      win.document.close();
    } catch {
      showToast('Erro ao gerar os boletins. Tente novamente.', 'erro');
    } finally {
      setGeneratingLote(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loadingTurmas) return <PageLoading titulo="Carregando turmas…" />;
  if (turmas.length === 0) return <SemTurmas onVoltar={() => navigate(`/professor/${professorSlug}/home`)} />;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      <ProfessorPageHeader
        onBack={() => navigate(`/professor/${professorSlug}/home`)}
        title="Notas parciais"
        subtitle="Lançamento de notas"
        accent="#0e48fe"
        rightSlot={
          <>
            {totalExistentes > 0 && (
              <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                <span className="text-white text-xs font-bold">{totalExistentes}</span>
                <span className="text-blue-100 text-[10px]">{tipo.toLowerCase()}</span>
              </div>
            )}
            <button
              onClick={() => navigate(`/professor/${professorSlug}/relatorio-notas`)}
              className="px-3 py-1 bg-white/20 rounded-lg text-white text-xs font-semibold hover:bg-white/30 transition-colors"
            >
              Relatório
            </button>
          </>
        }
      />

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
        <DropSelect label="Etapa" value={etapa} options={ETAPAS} onChange={setEtapa} />

        <div className="grid grid-cols-2 gap-2">
          <DropSelect label="Tipo" value={tipo} options={TIPOS} onChange={setTipo} />
          <div className="bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
            <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">Pontos</label>
            <p className="text-base font-bold text-[#005DE4] text-right">{pontos.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>

        <div className="relative bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
          <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">Avaliação</label>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-[#005DE4] truncate pr-2">
              {loadingAvaliacoes ? 'Carregando…' : opcaoAtual}
            </span>
            <ChevronDown size={20} className="text-[#005DE4] flex-shrink-0" />
          </div>
          <select
            value={testIndex}
            onChange={e => setTestIndex(Number(e.target.value))}
            disabled={loadingAvaliacoes}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
          >
            {opcoesAvaliacao.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
        </div>
      </div>

      {/* Contador */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {loadingAlunos || loadingAvaliacoes ? 'Carregando…' : `${alunos.length} alunos`}
        </span>
        <div className="flex items-center gap-2">
          {temErros && (
            <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
              <AlertCircle size={11} /> notas inválidas
            </span>
          )}
          <span className="text-xs text-slate-400">{preenchidos}/{alunos.length} preenchidos</span>
        </div>
      </div>

      {/* Gerar todos os boletins da turma em um PDF só */}
      <div className="px-3 pb-1 flex-shrink-0">
        <button
          onClick={() => setBoletimAlvo({ tipo: 'lote' })}
          disabled={generatingLote || alunos.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#005DE4] text-[#005DE4] font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50"
        >
          {generatingLote ? <Loader2 size={16} className="animate-spin" /> : <FileStack size={16} />}
          Gerar boletins da turma (PDF)
        </button>
      </div>

      {/* Lista de alunos */}
      {loadingAlunos || loadingAvaliacoes ? (
        <div className="mx-3 mb-3 bg-white rounded-2xl p-6 text-center shadow-sm">
          <div className="w-6 h-6 border-2 border-[#005DE4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 mt-2">Carregando…</p>
        </div>
      ) : (
        <div className="bg-white mx-3 mb-3 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {alunos.map((aluno, idx) => {
            const val  = notas[aluno.id] ?? '';
            const erro = !!erros[aluno.id];
            return (
              <div key={aluno.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-slate-400 text-sm font-semibold w-5 text-center flex-shrink-0">{idx + 1}</span>
                <Avatar nome={aluno.nome} />
                <span className="flex-1 text-sm font-bold text-slate-800 uppercase leading-tight">{aluno.nome}</span>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {erro && <AlertCircle size={13} className="text-red-400" />}
                    <span className="text-[10px] text-slate-400">/{pontos}</span>
                  </div>
                  <input
                    type="number" min="0" max={pontos} step="0.1" value={val}
                    onChange={e => handleNotaChange(aluno.id, e.target.value)}
                    placeholder="—"
                    className={`w-16 text-right text-base font-bold border-b-2 focus:outline-none bg-transparent pb-0.5 transition-colors ${
                      erro ? 'border-red-400 text-red-500 focus:border-red-500' : `border-slate-300 focus:border-[#005DE4] ${notaColor(val, pontos)}`
                    }`}
                  />
                  {erro && <span className="text-[9px] text-red-400 mt-0.5">0 – {pontos}</span>}
                </div>
                <button
                  onClick={() => setBoletimAlvo({ tipo: 'aluno', aluno })}
                  disabled={generatingBoletimId === aluno.id}
                  aria-label={`Gerar boletim de ${aluno.nome}`}
                  title="Gerar boletim"
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-[#005DE4] flex-shrink-0 disabled:opacity-50"
                >
                  {generatingBoletimId === aluno.id ? <Loader2 size={17} className="animate-spin" /> : <School size={17} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botão salvar */}
      <div className="px-3 pb-6">
        <button onClick={handleSalvar} disabled={temErros}
          className={`w-full font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${salvo ? 'bg-emerald-500' : 'bg-[#005DE4]'} text-white`}>
          {salvo ? <><Check size={20} /> Salvo!</> : 'Salvar notas'}
        </button>
      </div>

      {boletimAlvo && (
        <SeletorBoletimModal
          titulo={boletimAlvo.tipo === 'lote' ? 'Gerar boletins da turma' : 'Gerar boletim'}
          subtitulo={boletimAlvo.tipo === 'lote' ? `${turmaObj?.nome} — ${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}` : boletimAlvo.aluno.nome}
          onEscolher={(modo) => {
            const alvo = boletimAlvo;
            setBoletimAlvo(null);
            if (alvo.tipo === 'lote') gerarBoletimLote(modo);
            else gerarBoletim(alvo.aluno, modo);
          }}
          onCancelar={() => setBoletimAlvo(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  );
}
