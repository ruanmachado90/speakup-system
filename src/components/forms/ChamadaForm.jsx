import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  Save,
  Loader,
  Users,
  FileText,
  BookMarked,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { APP_ID } from '../../utils/constants';

const STATUS_OPTIONS = [
  { key: 'presente', label: 'Presente', icon: CheckCircle, color: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'falta', label: 'Falta', icon: XCircle, color: 'bg-red-500 text-white border-red-500' },
  { key: 'justificada', label: 'Justificada', icon: AlertCircle, color: 'bg-amber-500 text-white border-amber-500' },
];

const STATUS_DEFAULT_COLOR = {
  presente: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  falta: 'border-red-200 bg-red-50 text-red-700',
  justificada: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function ChamadaForm({ turma, alunosIniciais, professorNome, onSave, onCancel, saving }) {
  const hoje = new Date().toISOString().split('T')[0];

  const [data, setData] = useState(hoje);
  const [conteudo, setConteudo] = useState('');
  const [homework, setHomework] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [chamadas, setChamadas] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);

  // Busca alunos da turma — usa alunosIniciais (do Dashboard) se disponíveis, evitando fetch redundante
  useEffect(() => {
    const fetchAlunos = async () => {
      if (!turma) return;
      setLoadingAlunos(true);

      try {
        // Se o Dashboard já passou os alunos pré-carregados, usa diretamente
        if (alunosIniciais && alunosIniciais.length > 0) {
          setAlunos(alunosIniciais);
          const initialChamadas = {};
          alunosIniciais.forEach((a) => { initialChamadas[a.id] = 'presente'; });
          setChamadas(initialChamadas);
          setLoadingAlunos(false);
          return;
        }

        // Turmas usam alunosIds (array de IDs de strings)
        const alunosIds = turma.alunosIds || turma.alunos || [];

        if (alunosIds.length === 0) {
          setAlunos([]);
          setChamadas({});
          setLoadingAlunos(false);
          return;
        }

        // Se são IDs string, busca no Firestore
        if (typeof alunosIds[0] === 'string') {
          const studentsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'students');
          const snapshot = await getDocs(studentsRef);
          const todos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          const filtrados = todos.filter((s) => alunosIds.includes(s.id));
          setAlunos(filtrados);
          const initialChamadas = {};
          filtrados.forEach((a) => { initialChamadas[a.id] = 'presente'; });
          setChamadas(initialChamadas);
          setLoadingAlunos(false);
          return;
        }

        // Se já são objetos com id
        if (typeof alunosIds[0] === 'object' && alunosIds[0].id) {
          const alunosData = alunosIds.map((a) => ({ id: a.id, nome: a.nome || a.name || a.id }));
          setAlunos(alunosData);
          const initialChamadas = {};
          alunosData.forEach((a) => { initialChamadas[a.id] = 'presente'; });
          setChamadas(initialChamadas);
          setLoadingAlunos(false);
          return;
        }

        setAlunos([]);
      } catch (err) {
        console.error('Erro ao buscar alunos:', err);
        setAlunos([]);
      } finally {
        setLoadingAlunos(false);
      }
    };

    fetchAlunos();
  }, [turma, alunosIniciais]);

  const setStatus = (alunoId, status) => {
    setChamadas((prev) => ({ ...prev, [alunoId]: status }));
  };

  const marcarTodos = (status) => {
    const novo = {};
    alunos.forEach((a) => { novo[a.id] = status; });
    setChamadas(novo);
  };

  const presentes = useMemo(() => Object.values(chamadas).filter((v) => v === 'presente').length, [chamadas]);
  const faltas = useMemo(() => Object.values(chamadas).filter((v) => v === 'falta').length, [chamadas]);
  const justificadas = useMemo(() => Object.values(chamadas).filter((v) => v === 'justificada').length, [chamadas]);

  const [saveError, setSaveError] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const handleSave = async () => {
    if (!conteudo.trim()) {
      setSaveError('Informe o conteúdo da aula antes de salvar.');
      return;
    }
    setSaveError('');

    // Verificar duplicação: mesma turma + mesmo dia
    try {
      setCheckingDuplicate(true);
      const q = query(
        collection(db, 'aulas'),
        where('turmaId', '==', turma.id),
        where('data', '==', data)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSaveError(`Já existe uma aula registrada para esta turma em ${data.split('-').reverse().join('/')}. Escolha outra data ou exclua a aula existente no histórico.`);
        setCheckingDuplicate(false);
        return;
      }
    } catch (e) {
      // Se falhar a verificação, continua salvando
    } finally {
      setCheckingDuplicate(false);
    }

    const chamadaList = alunos.map((aluno) => ({
      alunoId: aluno.id,
      alunoNome: aluno.nome || aluno.name || aluno.id,
      status: chamadas[aluno.id] || 'presente',
    }));

    onSave({
      turmaId: turma.id,
      turmaNome: turma.nome,
      professor: professorNome,
      data,
      horario: turma.horario || '',
      conteudo,
      homework,
      observacoes,
      status: 'realizada',
      chamadas: chamadaList,
    });
  };

  const nomeAluno = (aluno) => aluno.nome || aluno.name || aluno.id;

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Cabeçalho */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#005DE4] text-white p-2 rounded-lg">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Registrar Aula</h2>
            <p className="text-sm text-slate-500">{turma?.nome}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition-colors">
          <XCircle size={24} />
        </button>
      </div>

      {/* Corpo com scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">

        {/* Data e Conteúdo */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={18} className="text-[#005DE4]" />
            Dados da Aula
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Calendar size={14} className="inline mr-1" /> Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <Clock size={14} className="inline mr-1" /> Horário da Turma
              </label>
              <input
                type="text"
                value={turma?.horario || ''}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Conteúdo da Aula</label>
            <input
              type="text"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Ex: Unit 5 - Past Perfect, páginas 42-45..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <BookMarked size={14} className="inline mr-1 text-purple-500" />
              Homework / Tarefa de Casa
            </label>
            <input
              type="text"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Ex: Workbook pages 30-31, exercises A and B..."
              className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Observações gerais da aula..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] resize-none"
            />
          </div>
        </div>

        {/* Chamada */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Users size={18} className="text-[#005DE4]" />
              Chamada ({alunos.length} alunos)
            </h3>

            {/* Marcar todos */}
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => marcarTodos(s.key)}
                  className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                  title={`Marcar todos como ${s.label}`}
                >
                  Todos: {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div className="flex gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1 text-sm text-emerald-700 font-medium">
              <CheckCircle size={16} /> {presentes} presente{presentes !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1 text-sm text-red-700 font-medium">
              <XCircle size={16} /> {faltas} falta{faltas !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1 text-sm text-amber-700 font-medium">
              <AlertCircle size={16} /> {justificadas} justificada{justificadas !== 1 ? 's' : ''}
            </div>
          </div>

          {loadingAlunos ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader size={24} className="animate-spin mr-2" /> Carregando alunos...
            </div>
          ) : alunos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p>Nenhum aluno encontrado nesta turma.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alunos.map((aluno) => {
                const statusAtual = chamadas[aluno.id] || 'presente';
                return (
                  <div
                    key={aluno.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${STATUS_DEFAULT_COLOR[statusAtual]}`}
                  >
                    <span className="font-medium text-sm">{nomeAluno(aluno)}</span>

                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((s) => {
                        const Icon = s.icon;
                        const isActive = statusAtual === s.key;
                        return (
                          <button
                            key={s.key}
                            onClick={() => setStatus(aluno.id, s.key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              isActive
                                ? s.color
                                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Icon size={13} />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {saveError && (
          <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
            <AlertCircle size={13} /> {saveError}
          </p>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loadingAlunos || checkingDuplicate}
            className="flex items-center gap-2 px-6 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
          >
            {saving || checkingDuplicate ? (
              <><Loader size={18} className="animate-spin" /> {checkingDuplicate ? 'Verificando...' : 'Salvando...'}</>
            ) : (
              <><Save size={18} /> Salvar Aula</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
