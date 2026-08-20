import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Check, X, AlertTriangle, MessageSquare } from 'lucide-react';
import { salvarAula } from '../utils/chamadaStorage';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';
import { useTurmaAlunos } from '../hooks/useTurmaAlunos';
import { PageLoading, SemTurmas, ProfessorPageHeader } from '../components/professor/PageLoading';

const ETAPAS = ['1º Semestre', '2º Semestre'];
const etapaAtual = () => new Date().getMonth() <= 5 ? ETAPAS[0] : ETAPAS[1];

const DIA_PARA_JS = {
  'Segunda': 1, 'Terça': 2, 'Quarta': 3,
  'Quinta':  4, 'Sexta': 5, 'Sábado': 6,
};

// Intervalo de datas de cada etapa no ano corrente.
function limitesEtapa(etapa) {
  const ano = new Date().getFullYear();
  return etapa === ETAPAS[0]
    ? { inicio: new Date(ano, 0, 1), fim: new Date(ano, 5, 30) }
    : { inicio: new Date(ano, 6, 1), fim: new Date(ano, 11, 31) };
}

// Gera as datas de aula dentro da etapa selecionada, com base nos dias da
// semana da turma. Vai do fim da etapa (ou hoje, se a etapa ainda está em
// curso) até o início dela — assim o professor consegue lançar aulas
// atrasadas de uma etapa que já passou, não só as mais recentes.
// Suporta o formato novo (horarios: [{ dia }]) e o legado (dias: 'Segunda, Quarta').
function gerarDatasAulas(horarios, diasStr, etapa) {
  // 1. Tenta extrair dos horários (formato novo)
  let diasJs = (horarios ?? [])
    .map(h => DIA_PARA_JS[h.dia])
    .filter(d => d !== undefined);

  // 2. Fallback para a string legada (ex: 'Segunda, Quarta')
  if (!diasJs.length && diasStr) {
    diasJs = String(diasStr).split(',')
      .map(d => DIA_PARA_JS[d.trim()])
      .filter(d => d !== undefined);
  }

  if (!diasJs.length) return [];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const { inicio, fim } = limitesEtapa(etapa);
  const limiteFinal = fim < hoje ? fim : hoje;
  if (limiteFinal < inicio) return []; // etapa ainda não começou

  const datas = [];
  const cursor = new Date(limiteFinal);
  while (cursor >= inicio) {
    if (diasJs.includes(cursor.getDay())) {
      datas.push(fmtData(new Date(cursor)));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return datas;
}

function fmtData(d) {
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Dias da semana em que uma turma tem aula (a partir de horarios[] ou do campo legado "dias").
function diasDaTurma(t) {
  if (t?.horarios?.length) return t.horarios.map(h => h.dia).filter(Boolean);
  if (t?.dias) return t.dias.split(',').map(d => d.trim()).filter(Boolean);
  return [];
}

const ORDEM_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const PROXIMO_STATUS = { presente: 'falta', falta: 'justificada', justificada: 'presente' };

const STATUS_STYLE = {
  presente:    { bg: 'bg-emerald-500', icon: <Check size={18} strokeWidth={3} className="text-white" /> },
  falta:       { bg: 'bg-red-500',     icon: <X size={18} strokeWidth={3} className="text-white" /> },
  justificada: { bg: 'bg-amber-400',   icon: <AlertTriangle size={16} strokeWidth={2.5} className="text-white" /> },
};

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

function ModalConfirmacao({ contagem, turma, data, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl px-5 pt-6 pb-10 space-y-5 shadow-2xl">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-slate-800">Confirmar lançamento?</h3>
          <p className="text-sm text-slate-500 mt-0.5">{turma} · {data}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-600">{contagem.presente}</div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Presentes</div>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-2xl font-black text-red-500">{contagem.falta}</div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Faltas</div>
          </div>
          {contagem.justificada > 0 && (
            <>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-black text-amber-500">{contagem.justificada}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Justific.</div>
              </div>
            </>
          )}
        </div>
        <div className="space-y-2">
          <button onClick={onConfirmar} className="w-full bg-[#005DE4] text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-all">
            Confirmar e salvar
          </button>
          <button onClick={onCancelar} className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-all">
            Revisar
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, tipo }) {
  return (
    <div className={`fixed bottom-24 left-4 right-4 z-50 py-3 px-5 rounded-2xl text-white text-sm font-semibold text-center shadow-xl ${
      tipo === 'erro' ? 'bg-red-500' : 'bg-emerald-500'
    }`}>
      {msg}
    </div>
  );
}

export default function ConteudoFrequenciaPage() {
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

  // Seleciona a primeira turma do filtro ao carregar/trocar o dia
  useEffect(() => {
    if (turmasFiltradas.length > 0 && !turmasFiltradas.some(t => t.nome === turma)) {
      setTurma(turmasFiltradas[0].nome);
    }
  }, [turmasFiltradas, turma]);

  const turmaObj = turmasFiltradas.find(t => t.nome === turma) ?? turmasFiltradas[0] ?? null;
  const { alunos, loading: loadingAlunos } = useTurmaAlunos(turmaObj);

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [etapa, setEtapa]         = useState(etapaAtual());
  const [data, setData]           = useState('');
  const [conteudo, setConteudo]   = useState('');
  const [devercasa, setDevercasa] = useState('');

  // ── Datas geradas a partir do horário real da turma + etapa selecionada ───
  const datas = useMemo(
    () => gerarDatasAulas(turmaObj?.horarios, turmaObj?.dias, etapa),
    [turmaObj?.id, etapa]
  );

  // Reseta para a data mais recente quando muda de turma
  useEffect(() => {
    if (datas.length > 0) setData(datas[0]);
  }, [datas]);

  // Inicia presença quando os alunos da turma chegam
  const [presenca, setPresenca] = useState({});
  useEffect(() => {
    if (alunos.length > 0) {
      setPresenca(Object.fromEntries(alunos.map(a => [a.id, 'presente'])));
    }
  }, [alunos]);

  const [obs, setObs]             = useState({});
  const [obsAberta, setObsAberta] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [toast, setToast]         = useState(null);

  const avancarStatus = (id) =>
    setPresenca(p => ({ ...p, [id]: PROXIMO_STATUS[p[id]] }));

  const toggleObs = (id) =>
    setObsAberta(prev => prev === id ? null : id);

  const contagem = alunos.reduce((acc, a) => {
    const s = presenca[a.id] || 'presente';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { presente: 0, falta: 0, justificada: 0 });

  const showToast = (msg, tipo = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmar = async () => {
    try {
      const aulaId = `${turmaObj.id}__${etapa}__${data}`.replace(/[\s/\.#[\]]/g, '_');
      const aula = {
        id: aulaId,
        data, etapa, conteudo, devercasa, presenca, obs,
        registradoEm: new Date().toISOString(),
      };
      await salvarAula(turmaObj.id, etapa, aula);
      setConfirmando(false);
      showToast('Lançamento salvo com sucesso!', 'sucesso');
    } catch {
      setConfirmando(false);
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
        title="Conteúdo e frequência"
        subtitle="Lançamento de conteúdo e frequência"
        accent="#FFC738"
      />

      {/* Dropdowns */}
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
          <DropSelect label="Etapa" value={etapa} options={ETAPAS} onChange={setEtapa} />
          <DropSelect label="Data"  value={data}  options={datas}  onChange={setData}  />
        </div>

        <div className="bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
          <label className="block text-xs font-semibold text-[#005DE4] mb-1">Conteúdo Lecionado</label>
          <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} placeholder="Descreva o conteúdo dado na aula..." rows={3} className="w-full text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none" />
        </div>

        <div className="bg-white border-2 border-[#005DE4] rounded-xl px-4 py-3">
          <label className="block text-xs font-semibold text-[#005DE4] mb-1">Dever de Casa</label>
          <textarea value={devercasa} onChange={e => setDevercasa(e.target.value)} placeholder="Ex: Workbook p. 45, exercícios 1 a 5..." rows={2} className="w-full text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none" />
        </div>
      </div>

      {/* Contador de presença */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {loadingAlunos ? 'Carregando…' : `${alunos.length} alunos`}
          </span>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-600">✅ {contagem.presente}</span>
            <span className="text-red-500">❌ {contagem.falta}</span>
            {contagem.justificada > 0 && <span className="text-amber-500">⚠️ {contagem.justificada}</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pb-1 flex-shrink-0">
        <p className="text-[10px] text-slate-400 text-right">
          Toque para alternar: ✅ presente → ❌ falta → ⚠️ justificada
        </p>
      </div>

      {/* Lista de alunos */}
      {loadingAlunos ? (
        <div className="mx-3 mb-3 bg-white rounded-2xl p-6 text-center shadow-sm">
          <div className="w-6 h-6 border-2 border-[#005DE4] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 mt-2">Carregando alunos…</p>
        </div>
      ) : (
        <div className="bg-white mx-3 mb-3 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {alunos.map((aluno, idx) => {
            const status = presenca[aluno.id] || 'presente';
            const { bg, icon } = STATUS_STYLE[status];
            const obsAluno = obs[aluno.id] || '';
            const obsAtiva = obsAberta === aluno.id;

            return (
              <div key={aluno.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-slate-400 text-sm font-semibold w-5 text-center flex-shrink-0">{idx + 1}</span>
                  <Avatar nome={aluno.nome} />
                  <span className={`flex-1 text-sm font-bold uppercase leading-tight ${
                    status === 'falta' ? 'text-red-400' :
                    status === 'justificada' ? 'text-amber-500' : 'text-slate-800'
                  }`}>{aluno.nome}</span>
                  <button onClick={() => toggleObs(aluno.id)} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${obsAluno ? 'bg-[#005DE4]/10 text-[#005DE4]' : 'text-slate-300 hover:text-slate-400'}`} title="Observação">
                    <MessageSquare size={15} />
                  </button>
                  <button onClick={() => avancarStatus(aluno.id)} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all active:scale-90 ${bg}`}>
                    {icon}
                  </button>
                </div>
                {obsAtiva && (
                  <div className="px-4 pb-3 flex items-center gap-2">
                    <input autoFocus type="text" value={obsAluno} onChange={e => setObs(o => ({ ...o, [aluno.id]: e.target.value }))} placeholder="Ex: chegou atrasado, trouxe material..." className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] bg-slate-50" />
                    <button onClick={() => setObsAberta(null)} className="text-xs text-[#005DE4] font-semibold px-2">Ok</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botão salvar */}
      <div className="px-3 pb-6">
        <button onClick={() => setConfirmando(true)} className="w-full bg-[#005DE4] text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all">
          Salvar lançamento
        </button>
      </div>

      {confirmando && (
        <ModalConfirmacao contagem={contagem} turma={turma} data={data} onConfirmar={handleConfirmar} onCancelar={() => setConfirmando(false)} />
      )}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  );
}
