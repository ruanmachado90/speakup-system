import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Plus,
  FileText,
  Search,
  Bell,
  X,
  AlertTriangle,
  Trash2,
  Send,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { APP_ID } from '../utils/constants';
import { useAulas } from '../hooks/useAulas';
import { Card } from '../components';
import ChamadaForm from '../components/forms/ChamadaForm';
import HistoricoAulas from '../components/HistoricoAulas';

export default function ProfessorDashboard() {
  const { professorSlug } = useParams();
  const navigate = useNavigate();
  
  // Converter slug para primeiro nome (ex: ruan-machado -> Ruan)
  const professorPrimeiroNome = useMemo(() => {
    if (!professorSlug) return '';
    const parts = professorSlug.split('-');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }, [professorSlug]);

  // Nome completo para exibição
  const professorNome = useMemo(() => {
    if (!professorSlug) return '';
    return professorSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [professorSlug]);

  // Estados
  const [turmas, setTurmas] = useState([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState({}); // { turmaId: [aluno, ...] }
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [showRegistroAula, setShowRegistroAula] = useState(false);
  const [showDetalheTurma, setShowDetalheTurma] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);
  const [turmaFiltro, setTurmaFiltro] = useState({ busca: '', nivel: '', dia: '', ordenar: 'nome' });

  // Lembretes manuais persistidos por professor
  const [lembretes, setLembretes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lembretes-${professorSlug}`) || '[]'); } catch { return []; }
  });
  const [novoLembrete, setNovoLembrete] = useState('');
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    localStorage.setItem(`lembretes-${professorSlug}`, JSON.stringify(lembretes));
  }, [lembretes, professorSlug]);

  // Hook de aulas - usa o nome completo para salvar corretamente
  const { aulas, registrarAula, atualizarAula, excluirAula, calcularFrequencia } = useAulas(professorNome);

  // Garantir autenticação anônima para satisfazer as regras do Firestore
  // O professor acessa a página sem login, mas o Firestore exige auth != null
  useEffect(() => {
    signInAnonymously(auth).catch(() => {
      // Já autenticado ou erro não crítico — ignora silenciosamente
    });
  }, []);

  const handleSalvarAula = async (aulaData) => {
    setSaving(true);
    const result = await registrarAula(aulaData);
    setSaving(false);
    if (result.success) {
      setShowRegistroAula(false);
      setSelectedTurma(null);
      setSuccessMsg('Aula registrada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // Buscar turmas e alunos do professor
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar turmas do professor (compara por primeiro nome para compatibilidade com dados existentes)
        const turmasRef = collection(db, 'turmas');
        const turmasSnapshot = await getDocs(turmasRef);
        const turmasData = turmasSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => {
            const prof = (t.professor || '').toLowerCase();
            return prof.includes(professorPrimeiroNome.toLowerCase());
          });
        
        setTurmas(turmasData);

        // Buscar alunos UMA VEZ para todas as turmas, montar mapa turmaId → alunos
        const alunosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'students');
        const alunosSnapshot = await getDocs(alunosRef);
        const todosAlunos = alunosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const mapaAlunos = {};
        for (const turma of turmasData) {
          const ids = turma.alunosIds || [];
          mapaAlunos[turma.id] = ids.length > 0
            ? todosAlunos.filter(a => ids.includes(a.id))
            : [];
        }
        setAlunosPorTurma(mapaAlunos);
        
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (professorPrimeiroNome) {
      fetchData();
    }
  }, [professorPrimeiroNome]);

  // Estatísticas do professor
  const stats = useMemo(() => {
    const totalTurmas = turmas.length;
    const totalAlunos = turmas.reduce((acc, turma) => acc + (turma.alunosIds?.length || turma.alunosCount || 0), 0);
    const totalAulas = aulas.length;
    
    // Aulas do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    const aulasMesAtual = aulas.filter(aula => {
      if (!aula.data || typeof aula.data !== 'string') return false;
      const [ano, mes] = aula.data.split('-').map(Number);
      return ano === anoAtual && (mes - 1) === mesAtual;
    }).length;

    return {
      totalTurmas,
      totalAlunos,
      totalAulas,
      aulasMesAtual
    };
  }, [turmas, aulas]);

  // Aulas de hoje
  const aulasHoje = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return aulas.filter(aula => aula.data === hoje);
  }, [aulas]);

  // Próximas aulas (baseado em horário das turmas)
  const proximasAulas = useMemo(() => {
    const diaHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
    const diaMap = {
      'segunda-feira': 'Segunda',
      'terça-feira': 'Terça',
      'quarta-feira': 'Quarta',
      'quinta-feira': 'Quinta',
      'sexta-feira': 'Sexta',
      'sábado': 'Sábado',
      'domingo': 'Domingo'
    };
    
    return turmas.filter(turma => 
      turma.dias?.includes(diaMap[diaHoje])
    ).sort((a, b) => {
      const horaA = a.horario?.split(':')[0] || '00';
      const horaB = b.horario?.split(':')[0] || '00';
      return horaA.localeCompare(horaB);
    });
  }, [turmas]);

  // Turmas com filtro + ordenação
  const turmasFiltradas = useMemo(() => {
    const { busca, nivel, dia, ordenar } = turmaFiltro;
    let lista = [...turmas];

    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(t => t.nome?.toLowerCase().includes(q));
    }
    if (nivel) lista = lista.filter(t => t.nivel === nivel);
    if (dia) lista = lista.filter(t => t.dias?.includes(dia));

    lista.sort((a, b) => {
      if (ordenar === 'nome') return (a.nome || '').localeCompare(b.nome || '');
      if (ordenar === 'nivel') return (a.nivel || '').localeCompare(b.nivel || '');
      if (ordenar === 'horario') return (a.horario || '').localeCompare(b.horario || '');
      if (ordenar === 'alunos') return ((b.alunosIds?.length || b.alunosCount || 0) - (a.alunosIds?.length || a.alunosCount || 0));
      if (ordenar === 'dia') return (a.dias || '').localeCompare(b.dias || '');
      return 0;
    });

    return lista;
  }, [turmas, turmaFiltro]);

  // Valores únicos para os selects de filtro
  const niveisUnicos = useMemo(() => [...new Set(turmas.map(t => t.nivel).filter(Boolean))].sort(), [turmas]);
  const diasUnicos = useMemo(() => {
    const todos = turmas.flatMap(t => (t.dias || '').split(',').map(d => d.trim()).filter(Boolean));
    return [...new Set(todos)].sort();
  }, [turmas]);

  // Notificações automáticas
  const notificacoesAuto = useMemo(() => {
    const avisos = [];
    const diasPT = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6, 'Domingo': 0 };
    const hojeDate = new Date(); hojeDate.setHours(0, 0, 0, 0);

    turmas.forEach(turma => {
      const aulasT = aulas.filter(a => a.turmaId === turma.id);
      const alunos = alunosPorTurma[turma.id] || [];

      // 1. Alunos com frequência < 75%
      if (aulasT.length >= 2) {
        const comBaixaFreq = alunos.filter(aluno => {
          const presencas = aulasT.filter(a =>
            (a.chamadas || []).find(c => c.alunoId === aluno.id && c.status === 'presente')
          ).length;
          return Math.round((presencas / aulasT.length) * 100) < 75;
        });
        if (comBaixaFreq.length > 0) {
          avisos.push({
            id: `freq-${turma.id}`,
            tipo: 'frequencia',
            cor: 'red',
            titulo: `Faltas excessivas — ${turma.nome}`,
            texto: `${comBaixaFreq.length} aluno${comBaixaFreq.length > 1 ? 's estão' : ' está'} com frequência abaixo de 75%: ${comBaixaFreq.map(a => (a.nome || a.name || '').split(' ')[0]).join(', ')}.`,
          });
        }
      }

      // 2. Aulas sem conteúdo
      const semConteudo = aulasT.filter(a => !a.conteudo || !a.conteudo.trim());
      if (semConteudo.length > 0) {
        const datas = semConteudo.slice(0, 3).map(a => a.data ? a.data.split('-').reverse().join('/') : '—').join(', ');
        avisos.push({
          id: `conteudo-${turma.id}`,
          tipo: 'conteudo',
          cor: 'amber',
          titulo: `Conteúdo não preenchido — ${turma.nome}`,
          texto: `${semConteudo.length} aula${semConteudo.length > 1 ? 's' : ''} sem conteúdo registrado. Datas: ${datas}.`,
        });
      }

      // 3. Aulas pendentes (últimos 14 dias)
      const datasRegistradas = new Set(aulasT.map(a => a.data));
      const diasTurmaList = (turma.dias || '').split(',').map(d => d.trim()).filter(Boolean);
      const numDias = diasTurmaList.map(d => diasPT[d]).filter(n => n !== undefined);
      const pendentes = [];
      for (let i = 1; i <= 14; i++) {
        const d = new Date(hojeDate);
        d.setDate(d.getDate() - i);
        if (numDias.includes(d.getDay())) {
          const dateStr = d.toISOString().split('T')[0];
          if (!datasRegistradas.has(dateStr)) {
            const dataFmt = dateStr.split('-').reverse().join('/');
            const diaNome = diasTurmaList[numDias.indexOf(d.getDay())];
            pendentes.push(`${dataFmt} (${diaNome})`);
          }
          if (pendentes.length >= 2) break;
        }
      }
      if (pendentes.length > 0) {
        avisos.push({
          id: `pendente-${turma.id}`,
          tipo: 'pendente',
          cor: 'orange',
          titulo: `Aula pendente — ${turma.nome}`,
          texto: `Aula${pendentes.length > 1 ? 's' : ''} não registrada${pendentes.length > 1 ? 's' : ''}: ${pendentes.join(', ')}.`,
          turmaObj: turma,
        });
      }
    });

    return avisos;
  }, [turmas, aulas, alunosPorTurma]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005DE4] mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (turmas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md text-center">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhuma turma encontrada</h2>
          <p className="text-slate-600 mb-4">
            Não foram encontradas turmas para <strong>{professorNome}</strong>.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8]"
          >
            Voltar ao início
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Toast de sucesso */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Olá, {professorNome}! 👋
          </h1>
          <p className="text-slate-600">
            Painel de controle das suas turmas e aulas
          </p>
        </div>
        <button
          onClick={() => setShowHistorico(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-[#005DE4] transition-all shadow-sm text-sm font-medium"
        >
          <FileText size={18} className="text-[#005DE4]" />
          Histórico de Aulas
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Turmas Ativas</p>
              <p className="text-3xl font-bold">{stats.totalTurmas}</p>
            </div>
            <Users size={40} className="opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">Total de Alunos</p>
              <p className="text-3xl font-bold">{stats.totalAlunos}</p>
            </div>
            <TrendingUp size={40} className="opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Aulas Este Mês</p>
              <p className="text-3xl font-bold">{stats.aulasMesAtual}</p>
            </div>
            <Calendar size={40} className="opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm mb-1">Aulas Hoje</p>
              <p className="text-3xl font-bold">{proximasAulas.length}</p>
            </div>
            <Clock size={40} className="opacity-50" />
          </div>
        </Card>
      </div>

      {/* Painel de Notificações & Lembretes */}
      {(() => {
        const avisosVisiveis = notificacoesAuto.filter(a => !dismissedIds.has(a.id));
        const totalAvisos = avisosVisiveis.length + lembretes.length;
        const corMap = {
          red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-500',    dot: 'bg-red-500' },
          amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'text-amber-500',  dot: 'bg-amber-500' },
          orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', dot: 'bg-orange-500' },
          blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-500',   dot: 'bg-blue-500' },
        };
        return (
          <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-[#005DE4]" />
                <h2 className="text-base font-bold text-slate-800">Avisos &amp; Lembretes</h2>
                {totalAvisos > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {totalAvisos}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2">
              {/* Auto-alertas */}
              {avisosVisiveis.map(aviso => {
                const c = corMap[aviso.cor] || corMap.blue;
                const IconAviso = aviso.tipo === 'frequencia' ? AlertCircle : aviso.tipo === 'conteudo' ? FileText : Clock;
                return (
                  <div key={aviso.id} className={`flex items-start gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
                    <IconAviso size={16} className={`${c.icon} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{aviso.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{aviso.texto}</p>
                      {aviso.turmaObj && (
                        <button
                          onClick={() => { setSelectedTurma(aviso.turmaObj); setShowRegistroAula(true); }}
                          className="mt-1.5 text-xs text-[#005DE4] font-medium hover:underline"
                        >
                          Registrar agora →
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setDismissedIds(prev => new Set([...prev, aviso.id]))}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}

              {/* Lembretes manuais */}
              {lembretes.map(l => (
                <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border bg-blue-50 border-blue-200">
                  <Bell size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="flex-1 text-xs text-slate-700">{l.texto}</p>
                  <button
                    onClick={() => setLembretes(prev => prev.filter(x => x.id !== l.id))}
                    className="flex-shrink-0 text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {/* Estado vazio */}
              {totalAvisos === 0 && (
                <div className="text-center py-4">
                  <CheckCircle size={28} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm text-slate-400">Tudo em ordem! Nenhum aviso no momento.</p>
                </div>
              )}

              {/* Input lembrete manual */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!novoLembrete.trim()) return;
                  setLembretes(prev => [...prev, { id: Date.now().toString(), texto: novoLembrete.trim() }]);
                  setNovoLembrete('');
                }}
                className="flex gap-2 mt-3 pt-3 border-t border-slate-100"
              >
                <input
                  type="text"
                  value={novoLembrete}
                  onChange={e => setNovoLembrete(e.target.value)}
                  placeholder="Adicionar lembrete... ex: Feriado na sexta, avisar os pais"
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4]"
                />
                <button
                  type="submit"
                  disabled={!novoLembrete.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#005DE4] text-white rounded-lg text-sm font-medium hover:bg-[#0041a8] disabled:opacity-40 transition-colors"
                >
                  <Send size={14} /> Adicionar
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Próximas Aulas de Hoje */}
      {proximasAulas.length > 0 && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={24} className="text-[#005DE4]" />
              Aulas de Hoje
            </h2>
          </div>

          <div className="space-y-3">
            {proximasAulas.map(turma => {
              const aulaJaRegistrada = aulasHoje.some(a => a.turmaId === turma.id);
              
              return (
                <div
                  key={turma.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-[#005DE4] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#005DE4] text-white rounded-lg p-3">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{turma.nome}</h3>
                      <p className="text-sm text-slate-600">
                        {turma.horario} • {turma.nivel} • {turma.alunosIds?.length || turma.alunosCount || 0} alunos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {aulaJaRegistrada ? (
                      <span className="flex items-center gap-2 text-emerald-600 font-medium">
                        <CheckCircle size={20} />
                        Registrada
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTurma(turma);
                          setShowRegistroAula(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-all"
                      >
                        <Plus size={18} />
                        Registrar Aula
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Lista de Turmas */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-[#005DE4]" />
            Minhas Turmas
            <span className="text-sm font-normal text-slate-400">({turmasFiltradas.length}/{turmas.length})</span>
          </h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Busca por nome */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar turma..."
              value={turmaFiltro.busca}
              onChange={e => setTurmaFiltro(f => ({ ...f, busca: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4]"
            />
          </div>

          {/* Filtro nível */}
          <select
            value={turmaFiltro.nivel}
            onChange={e => setTurmaFiltro(f => ({ ...f, nivel: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] bg-white text-slate-700"
          >
            <option value="">Todos os níveis</option>
            {niveisUnicos.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Filtro dia */}
          <select
            value={turmaFiltro.dia}
            onChange={e => setTurmaFiltro(f => ({ ...f, dia: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] bg-white text-slate-700"
          >
            <option value="">Todos os dias</option>
            {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Ordenação */}
          <select
            value={turmaFiltro.ordenar}
            onChange={e => setTurmaFiltro(f => ({ ...f, ordenar: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] bg-white text-slate-700"
          >
            <option value="nome">Ordenar: Nome A-Z</option>
            <option value="nivel">Ordenar: Nível</option>
            <option value="dia">Ordenar: Dia</option>
            <option value="horario">Ordenar: Horário</option>
            <option value="alunos">Ordenar: Mais alunos</option>
          </select>

          {/* Limpar filtros */}
          {(turmaFiltro.busca || turmaFiltro.nivel || turmaFiltro.dia || turmaFiltro.ordenar !== 'nome') && (
            <button
              onClick={() => setTurmaFiltro({ busca: '', nivel: '', dia: '', ordenar: 'nome' })}
              className="text-xs px-3 py-2 text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="pb-3 pr-4 font-semibold">Turma</th>
                <th className="pb-3 pr-4 font-semibold">Nível</th>
                <th className="pb-3 pr-4 font-semibold">Dias</th>
                <th className="pb-3 pr-4 font-semibold">Horário</th>
                <th className="pb-3 pr-4 font-semibold text-center">Alunos</th>
                <th className="pb-3 pr-4 font-semibold text-center">Aulas</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turmasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                    Nenhuma turma encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : turmasFiltradas.map(turma => {
                const aulasCount = aulas.filter(a => a.turmaId === turma.id).length;
                const aulasPrevistas = turma.totalAulas || 40;
                const aulasProgress = Math.min(Math.round((aulasCount / aulasPrevistas) * 100), 100);
                const aulaHojeRegistrada = aulasHoje.some(a => a.turmaId === turma.id);
                // Detectar se a aula mais recente agendada não foi registrada (pendente)
                const aulaPendente = (() => {
                  if (aulaHojeRegistrada) return false;
                  const diasPT = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6, 'Domingo': 0 };
                  const aulasT = aulas.filter(a => a.turmaId === turma.id);
                  const datasReg = new Set(aulasT.map(a => a.data));
                  const numDias = (turma.dias || '').split(',').map(d => diasPT[d.trim()]).filter(n => n !== undefined);
                  const hojeD = new Date(); hojeD.setHours(0, 0, 0, 0);
                  for (let i = 1; i <= 14; i++) {
                    const d = new Date(hojeD); d.setDate(d.getDate() - i);
                    if (numDias.includes(d.getDay())) {
                      return !datasReg.has(d.toISOString().split('T')[0]);
                    }
                  }
                  return false;
                })();
                const qtdAlunos = turma.alunosIds?.length || turma.alunosCount || 0;

                return (
                  <tr key={turma.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-800">{turma.nome}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {turma.nivel}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{turma.dias}</td>
                    <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{turma.horario}</td>
                    <td className="py-3 pr-4 text-center text-slate-700 font-medium">{qtdAlunos}</td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {aulasCount}<span className="text-slate-400 font-normal">/{aulasPrevistas}</span>
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full ${aulasProgress >= 100 ? 'bg-emerald-500' : 'bg-[#005DE4]'}`}
                            style={{ width: `${aulasProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {aulaHojeRegistrada ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <CheckCircle size={11} />
                          Hoje ✓
                        </span>
                      ) : aulaPendente ? (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <AlertTriangle size={11} />
                          Pendente
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedTurma(turma); setShowDetalheTurma(true); }}
                          className="text-xs px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:border-[#005DE4] hover:text-[#005DE4] transition-all"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => { setSelectedTurma(turma); setShowRegistroAula(true); }}
                          className="text-xs px-3 py-1.5 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-all flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Registrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalhe da Turma */}
      {showDetalheTurma && selectedTurma && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedTurma.nome}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {selectedTurma.nivel} • {selectedTurma.dias} • {selectedTurma.horario}
                </p>
              </div>
              <button
                onClick={() => { setShowDetalheTurma(false); setSelectedTurma(null); }}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#005DE4]">
                  {selectedTurma.alunosIds?.length || selectedTurma.alunosCount || 0}
                </p>
                <p className="text-xs text-slate-500">Alunos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {aulas.filter(a => a.turmaId === selectedTurma.id).length}
                  <span className="text-sm text-slate-400 font-normal">/{selectedTurma.totalAulas || 40}</span>
                </p>
                <p className="text-xs text-slate-500">Aulas dadas / previstas</p>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full ${
                      Math.min(Math.round((aulas.filter(a => a.turmaId === selectedTurma.id).length / (selectedTurma.totalAulas || 40)) * 100), 100) >= 100
                        ? 'bg-emerald-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(Math.round((aulas.filter(a => a.turmaId === selectedTurma.id).length / (selectedTurma.totalAulas || 40)) * 100), 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {(() => {
                    const aulasT = aulas.filter(a => a.turmaId === selectedTurma.id);
                    if (!aulasT.length) return '—';
                    const totalPresencas = aulasT.reduce((acc, aula) => {
                      const presentes = (aula.chamadas || []).filter(c => c.status === 'presente').length;
                      const total = (aula.chamadas || []).length;
                      return total > 0 ? acc + (presentes / total) : acc;
                    }, 0);
                    return Math.round((totalPresencas / aulasT.length) * 100) + '%';
                  })()}
                </p>
                <p className="text-xs text-slate-500">Frequência média</p>
              </div>
            </div>

            {/* Lista de alunos */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} className="text-[#005DE4]" />
                Alunos da turma
              </h3>
              {(alunosPorTurma[selectedTurma.id] || []).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Nenhum aluno cadastrado nesta turma.</p>
              ) : (
                <div className="space-y-2">
                  {(alunosPorTurma[selectedTurma.id] || []).map((aluno, i) => {
                    // Calcular frequência do aluno nesta turma
                    const aulasT = aulas.filter(a => a.turmaId === selectedTurma.id);
                    const presencas = aulasT.filter(a =>
                      (a.chamadas || []).find(c => c.alunoId === aluno.id && c.status === 'presente')
                    ).length;
                    const pct = aulasT.length > 0 ? Math.round((presencas / aulasT.length) * 100) : null;
                    const lowFreq = pct !== null && pct < 75;
                    const pctColor = pct === null ? 'text-slate-400' : pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

                    return (
                      <div key={aluno.id} className={`flex items-center justify-between p-3 rounded-lg border ${lowFreq ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${lowFreq ? 'bg-red-500' : 'bg-[#005DE4]'}`}>
                            {(aluno.nome || aluno.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-800">{aluno.nome || aluno.name}</span>
                            {lowFreq && (
                              <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                                <AlertCircle size={11} /> Frequência abaixo de 75%
                              </p>
                            )}
                          </div>
                        </div>
                        {pct !== null && (
                          <span className={`text-sm font-semibold ${pctColor}`}>
                            {pct}% presença
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Aulas Registradas */}
              {aulas.filter(a => a.turmaId === selectedTurma.id).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BookOpen size={16} className="text-[#005DE4]" />
                    Aulas Registradas ({aulas.filter(a => a.turmaId === selectedTurma.id).length})
                  </h3>
                  <div className="space-y-2">
                    {aulas
                      .filter(a => a.turmaId === selectedTurma.id)
                      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
                      .map((aula, i) => {
                        const presentes = (aula.chamadas || []).filter(c => c.status === 'presente').length;
                        const faltas = (aula.chamadas || []).filter(c => c.status === 'falta').length;
                        const total = (aula.chamadas || []).length;
                        const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';
                        return (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 text-sm">{dataFmt}</span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-600">✓ {presentes}</span>
                                <span className="text-red-500">✗ {faltas}</span>
                                {total > 0 && <span className="text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{Math.round(presentes / total * 100)}%</span>}
                              </div>
                            </div>
                            {aula.conteudo && <p className="text-xs text-slate-600">{aula.conteudo}</p>}
                            {aula.homework && <p className="text-xs text-purple-600 mt-0.5">Homework: {aula.homework}</p>}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => {
                  setShowDetalheTurma(false);
                  setShowRegistroAula(true);
                }}
                className="flex-1 py-3 bg-[#005DE4] text-white rounded-xl hover:bg-[#0041a8] transition-all font-medium flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Registrar aula desta turma
              </button>
              <button
                onClick={() => { setShowDetalheTurma(false); setShowHistorico(true); }}
                className="py-3 px-5 border border-slate-300 text-slate-700 rounded-xl hover:border-[#005DE4] hover:text-[#005DE4] transition-all"
              >
                Ver histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Aula */}
      {showRegistroAula && selectedTurma && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <ChamadaForm
              turma={selectedTurma}
              alunosIniciais={alunosPorTurma[selectedTurma.id] || []}
              professorNome={professorNome}
              saving={saving}
              onSave={handleSalvarAula}
              onCancel={() => {
                setShowRegistroAula(false);
                setSelectedTurma(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Histórico de Aulas */}
      {showHistorico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <HistoricoAulas
              aulas={aulas}
              turmas={turmas}
              onClose={() => setShowHistorico(false)}
              onDeleteAula={excluirAula}
              onUpdateAula={atualizarAula}
            />
          </div>
        </div>
      )}
    </div>
  );
}
