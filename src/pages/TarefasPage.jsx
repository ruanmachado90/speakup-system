import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Check, X, AlertTriangle, BookOpen } from 'lucide-react';
import { salvarTarefas } from '../utils/chamadaStorage';
import { useAulasDiario } from '../hooks/useAulasDiario';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';
import { useTurmaAlunos } from '../hooks/useTurmaAlunos';
import { PageLoading, SemTurmas, SkeletonAluno, ProfessorPageHeader } from '../components/professor/PageLoading';

const ETAPAS = ['1º Semestre', '2º Semestre'];
const etapaAtual = () => new Date().getMonth() <= 5 ? ETAPAS[0] : ETAPAS[1];

// ciclo: feita → nao_feita → incompleta → feita
const CICLO = { feita: 'nao_feita', nao_feita: 'incompleta', incompleta: 'feita' };

const STATUS_CONFIG = {
  feita:      { bg: 'bg-emerald-500', icon: <Check size={18} strokeWidth={3} className="text-white" />,        label: 'Feita' },
  nao_feita:  { bg: 'bg-red-500',     icon: <X size={18} strokeWidth={3} className="text-white" />,           label: 'Não feita' },
  incompleta: { bg: 'bg-amber-400',   icon: <AlertTriangle size={16} strokeWidth={2.5} className="text-white" />, label: 'Incompleta' },
};

// ── Sub-componentes ───────────────────────────────────────────────────────────
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

function Avatar({ nome }) {
  return (
    <div className="w-11 h-11 rounded-full bg-[#005DE4]/10 border-2 border-[#005DE4]/20 flex items-center justify-center flex-shrink-0">
      <span className="text-[#005DE4] font-bold text-base">{nome?.[0] ?? '?'}</span>
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

// ── Página ────────────────────────────────────────────────────────────────────
export default function TarefasPage() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  // ── Dados reais do Firestore ──────────────────────────────────────────────
  const { turmas, loading: loadingTurmas } = useProfessorTurmas(professorSlug);
  const [turma, setTurma] = useState('');

  useEffect(() => {
    if (turmas.length > 0 && !turma) setTurma(turmas[0].nome);
  }, [turmas, turma]);

  const turmaObj = turmas.find(t => t.nome === turma) ?? turmas[0] ?? null;
  const { alunos, loading: loadingAlunos } = useTurmaAlunos(turmaObj);

  // ── Estado ────────────────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState(etapaAtual());
  const { aulas, loading: loadingAulas }   = useAulasDiario(turmaObj?.id, etapa);
  const [aulaRef, setAulaRef] = useState(null);
  const [aulaIdx, setAulaIdx] = useState(0);
  const [tarefas, setTarefas] = useState({});
  const [salvo, setSalvo] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, tipo = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const aulasComDever = useMemo(
    () => aulas.filter(a => a.devercasa?.trim()),
    [aulas]
  );

  // Atualiza aulaRef quando as aulas do Firestore chegam ou aulaIdx muda
  useEffect(() => {
    const aula = aulasComDever[aulaIdx] ?? null;
    setAulaRef(aula);
    if (aula?.tarefas) {
      setTarefas(aula.tarefas);
    } else {
      setTarefas(Object.fromEntries(alunos.map(a => [a.id, 'feita'])));
    }
    setSalvo(false);
  }, [aulasComDever, aulaIdx]);

  // Re-inicializa tarefas quando os alunos chegam
  useEffect(() => {
    if (alunos.length > 0 && !aulaRef?.tarefas) {
      setTarefas(prev => Object.fromEntries(alunos.map(a => [a.id, prev[a.id] ?? 'feita'])));
    }
  }, [alunos]);

  // Reseta índice ao trocar turma/etapa
  useEffect(() => { setAulaIdx(0); }, [turma, etapa]);

  const avancar = (id) =>
    setTarefas(t => ({ ...t, [id]: CICLO[t[id]] }));

  const contagem = Object.values(tarefas).reduce(
    (acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {}
  );

  const handleSalvar = async () => {
    if (!aulaRef || !turmaObj) return;
    try {
      await salvarTarefas(turmaObj.id, etapa, aulaRef.id, tarefas);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'erro');
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loadingTurmas) return <PageLoading titulo="Carregando turmas…" />;
  if (turmas.length === 0) return <SemTurmas onVoltar={() => navigate(`/professor/${professorSlug}/home`)} />;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      <ProfessorPageHeader
        onBack={() => navigate(`/professor/${professorSlug}/home`)}
        title="Tarefas"
        subtitle="Verificação de dever de casa"
        accent="#fc6e1f"
      />

      {/* Filtros */}
      <div className="px-3 pt-3 space-y-2 flex-shrink-0">
        <DropSelect label="Turma" value={turma} options={turmas.map(t => t.nome)} onChange={setTurma} />

        <div className="grid grid-cols-2 gap-2">
          <DropSelect label="Etapa" value={etapa} options={ETAPAS} onChange={setEtapa} />

          {/* Seletor de qual aula verificar */}
          {aulasComDever.length > 0 ? (
            <div className="relative bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
              <label className="block text-xs font-semibold text-[#005DE4] mb-0.5">Aula</label>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#005DE4] truncate pr-2">
                  {aulaRef?.data ?? '—'}
                </span>
                <ChevronDown size={20} className="text-[#005DE4] flex-shrink-0" />
              </div>
              <select
                value={aulaIdx}
                onChange={e => setAulaIdx(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                {aulasComDever.map((a, i) => (
                  <option key={a.id} value={i}>{a.data}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 flex items-center">
              <span className="text-xs text-slate-400">Sem aulas registradas</span>
            </div>
          )}
        </div>
      </div>

      {/* Card do dever de casa (auto-carregado da aula anterior) */}
      {aulaRef ? (
        <div className="mx-3 mt-3 bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-[#005DE4]" />
            <span className="text-xs font-semibold text-[#005DE4]">
              Dever da aula de {aulaRef.data}
            </span>
          </div>
          <p className="text-sm text-slate-700 leading-snug">{aulaRef.devercasa}</p>
          {aulaRef.conteudo && (
            <p className="text-xs text-slate-400 mt-1">Conteúdo: {aulaRef.conteudo}</p>
          )}
        </div>
      ) : (
        <div className="mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex-shrink-0">
          <p className="text-sm text-amber-700 font-semibold">Nenhuma aula com dever encontrada</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Registre o dever de casa na página de Conteúdo e Frequência primeiro.
          </p>
          <button
            onClick={() => navigate(`/professor/${professorSlug}/frequencia`)}
            className="mt-2 text-xs text-[#005DE4] font-semibold underline underline-offset-2"
          >
            Ir para Conteúdo e Frequência →
          </button>
        </div>
      )}

      {/* Contador */}
      {aulaRef && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {loadingAlunos ? 'Carregando…' : `${alunos.length} alunos`}
          </span>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-600">✅ {contagem.feita ?? 0}</span>
            <span className="text-red-500">❌ {contagem.nao_feita ?? 0}</span>
            {(contagem.incompleta ?? 0) > 0 && (
              <span className="text-amber-500">⚠️ {contagem.incompleta}</span>
            )}
          </div>
        </div>
      )}

      {/* Legenda */}
      {aulaRef && (
        <div className="px-4 pb-1 flex-shrink-0">
          <p className="text-[10px] text-slate-400 text-right">
            Toque para alternar: ✅ feita → ❌ não feita → ⚠️ incompleta
          </p>
        </div>
      )}

      {/* Lista de alunos */}
      {aulaRef && (
        <div className="bg-white mx-3 mb-3 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {loadingAlunos
            ? [1, 2, 3, 4].map(i => <SkeletonAluno key={i} />)
            : alunos.map((aluno, idx) => {
            const status = tarefas[aluno.id] ?? 'feita';
            const { bg, icon } = STATUS_CONFIG[status];

            return (
              <div key={aluno.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-slate-400 text-sm font-semibold w-5 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                <Avatar nome={aluno.nome} />
                <span className={`flex-1 text-sm font-bold uppercase leading-tight ${
                  status === 'nao_feita'  ? 'text-red-400' :
                  status === 'incompleta' ? 'text-amber-500' :
                  'text-slate-800'
                }`}>
                  {aluno.nome}
                </span>
                <button
                  onClick={() => avancar(aluno.id)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all active:scale-90 ${bg}`}
                >
                  {icon}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botão salvar */}

      {aulaRef && (
        <div className="px-3 pb-6">
          <button
            onClick={handleSalvar}
            className={`w-full font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              salvo ? 'bg-emerald-500' : 'bg-[#005DE4]'
            } text-white`}
          >
            {salvo ? <><Check size={20} /> Salvo!</> : 'Salvar verificação'}
          </button>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  );
}
