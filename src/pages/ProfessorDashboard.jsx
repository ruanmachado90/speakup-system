import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  FileText,
  Library,
  Search,
  Bell,
  X,
  AlertTriangle,
  Trash2,
  Send,
  MessageSquare,
  Menu,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ListChecks,
  Check,
  TrendingUp,
  Pencil,
} from 'lucide-react';
import { collection, getDocs, addDoc, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { APP_ID } from '../utils/constants';
import { buscarAlunosDasTurmas } from '../utils/buscarAlunos';
import { normalizeNome } from '../utils/normalizeNome';
import { dataLocalISO, isAulaRealizada, aulasRealizadas, frequenciaMediaTurma, frequenciaAluno } from '../utils/aulas';
import { useAulas } from '../hooks/useAulas';
import { Card, KPI } from '../components';
import ChamadaForm from '../components/forms/ChamadaForm';
import EditarChamadaModal from '../components/forms/EditarChamadaModal';
import FrequenciaAlunoModal from '../components/FrequenciaAlunoModal';
import HistoricoAulas from '../components/HistoricoAulas';
import { NotasView } from './Notas';
import { SidebarNav } from '../components/professor/SidebarNav';
import { RankingTarefas } from '../components/professor/RankingTarefas';
import { AvisoItem, LembreteItem } from '../components/professor/AvisoItem';
import { HASH_PREFIX as RESOURCES_HASH } from '../utils/resourcesFilter';
import {
  carregarDismissed, carregarLembretes, mesDiaNascimento, getHorarioDia, nomeDiaSemana, dataDeISO,
  diasDaTurma, compararHorario, compararDiasTurma, ordemDia, datasPendentes, contarAlunos, totalAlunosUnicos,
} from '../utils/professorDashboard';
import { useHojeISO } from '../hooks/useHojeISO';

// Biblioteca Resources só carrega quando o professor abre a aba
const ResourcesView = React.lazy(() => import('../components/professor/resources/ResourcesView'));

export default function ProfessorDashboard() {
  const { professorSlug } = useParams();
  const navigate = useNavigate();
  
  // Converter slug para primeiro nome (ex: ruan-machado -> Ruan)
  const professorPrimeiroNome = useMemo(() => {
    if (!professorSlug) return '';
    const parts = professorSlug.split('-');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }, [professorSlug]);

  // Nome completo para exibição (sem acentos — reconstruído do slug)
  const professorNome = useMemo(() => {
    if (!professorSlug) return '';
    return professorSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [professorSlug]);

  // Estados de navegação sidebar
  const [sidebarMode, setSidebarMode] = useState(() => window.innerWidth < 1024 ? 'closed' : 'open'); // 'open' | 'mini' | 'closed'
  // 'dashboard' | 'turmas' | 'notas' | 'historico' | 'avisos' | 'resources'
  // Resources guarda os filtros no endereço (#resources?...): recarregar volta para a aba.
  const [activeView, setActiveView] = useState(() => import.meta.env.DEV && window.location.hash.startsWith(RESOURCES_HASH) ? 'resources' : 'dashboard');
  const navClick = (fn) => () => { fn(); if (window.innerWidth < 1024) setSidebarMode('closed'); };

  // Estados
  const [turmas, setTurmas] = useState([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState({}); // { turmaId: [aluno, ...] }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showRegistroAula, setShowRegistroAula] = useState(false);
  const abrirRegistroPendente = (aviso) => { setSelectedTurma(aviso.turmaObj); setSelectedDate(aviso.dataPendente || null); setShowRegistroAula(true); };
  const [semanaOffset, setSemanaOffset] = useState(0); // 0 = semana atual, -1 = semana passada, etc.
  const [historicoTurmaFiltro, setHistoricoTurmaFiltro] = useState(null);
  const [showFAB, setShowFAB] = useState(false);
  const [showRankingTarefas, setShowRankingTarefas] = useState(false);
  const [turmaRanking, setTurmaRanking] = useState(null);
  const [showDetalheTurma, setShowDetalheTurma] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Um timer só: antes cada mensagem criava o seu, e o timer de uma mensagem
  // antiga apagava a nova antes da hora.
  const toastTimer = useRef(null);
  const mostrarMensagem = (tipo, texto) => {
    clearTimeout(toastTimer.current);
    setSuccessMsg(tipo === 'sucesso' ? texto : '');
    setErrorMsg(tipo === 'erro' ? texto : '');
    toastTimer.current = setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, tipo === 'erro' ? 8000 : 4000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [turmaFiltro, setTurmaFiltro] = useState({ busca: '', nivel: '', dia: '', ordenar: 'nome' });

  // Lembretes e avisos dispensados, persistidos por professor.
  // O slug fica dentro do state para que uma troca de professor não grave os
  // dados do anterior na chave do novo antes do reload acontecer.
  const [store, setStore] = useState(() => ({
    slug: professorSlug,
    lembretes: carregarLembretes(professorSlug),
    dismissed: carregarDismissed(professorSlug),
  }));
  const lembretes = store.lembretes;
  const dismissedIds = store.dismissed;
  const setLembretes = (valor) =>
    setStore(s => ({ ...s, lembretes: typeof valor === 'function' ? valor(s.lembretes) : valor }));
  const dispensarAvisos = (...ids) =>
    setStore(s => {
      const dismissed = new Map(s.dismissed);
      const agora = Date.now();
      ids.flat().forEach(id => dismissed.set(id, agora));
      return { ...s, dismissed };
    });
  const excluirLembrete = (id) => setLembretes(prev => prev.filter(l => l.id !== id));
  const [novoLembrete, setNovoLembrete] = useState('');
  const [showAvisos, setShowAvisos] = useState(false);

  // Recado para coordenação
  const [showRecado, setShowRecado] = useState(false);
  const [recadoTexto, setRecadoTexto] = useState('');
  const [recadoTipo, setRecadoTipo] = useState('geral');
  const [savingRecado, setSavingRecado] = useState(false);
  const [recadoSent, setRecadoSent] = useState(false);

  // Frequência por aluno
  const [freqAluno, setFreqAluno] = useState(null); // { aluno, turma }

  // Editar chamada existente
  const [editAula, setEditAula] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Recados recebidos da coordenação
  const [recadosAdmin, setRecadosAdmin] = useState([]);
  const [respostasRecados, setRespostasRecados] = useState({});
  const [sendingResposta, setSendingResposta] = useState({});

  useEffect(() => {
    if (!professorSlug) return;
    const q = query(
      collection(db, 'recados'),
      where('professorSlug', '==', professorSlug),
      where('origem', '==', 'admin')
    );
    const unsub = onSnapshot(q, snap => {
      setRecadosAdmin(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      );
    });
    return unsub;
  }, [professorSlug]);

  const marcarRecadoLido = async (id) => {
    try {
      await updateDoc(doc(db, 'recados', id), { lido: true, lidoEm: Date.now() });
    } catch (err) {
      console.error('Erro ao marcar recado como lido:', err);
      mostrarMensagem('erro', 'Não foi possível marcar o recado como lido. Tente novamente.');
    }
  };

  const enviarRespostaRecado = async (id) => {
    const texto = (respostasRecados[id] || '').trim();
    if (!texto) return;
    setSendingResposta(s => ({ ...s, [id]: true }));
    try {
      await updateDoc(doc(db, 'recados', id), {
        resposta: texto,
        respondidoEm: Date.now(),
        lido: true,
        lidoEm: Date.now(),
      });
      setRespostasRecados(r => ({ ...r, [id]: '' }));
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
      mostrarMensagem('erro', 'Não foi possível enviar a resposta. Tente novamente.');
    } finally {
      setSendingResposta(s => ({ ...s, [id]: false }));
    }
  };

  // Troca de professor na mesma tela: recarrega o store antes de qualquer gravação
  useEffect(() => {
    setStore(s => s.slug === professorSlug ? s : {
      slug: professorSlug,
      lembretes: carregarLembretes(professorSlug),
      dismissed: carregarDismissed(professorSlug),
    });
  }, [professorSlug]);

  useEffect(() => {
    if (store.slug !== professorSlug) return; // ainda não recarregou para este professor
    localStorage.setItem(`lembretes-${professorSlug}`, JSON.stringify(store.lembretes));
    localStorage.setItem(`dismissed-avisos-${professorSlug}`, JSON.stringify(Object.fromEntries(store.dismissed)));
  }, [store, professorSlug]);

  // Nome canônico do professor com acentos corretos, extraído das turmas carregadas.
  // O slug perde acentos (Bárbara → barbara-dias → "Barbara Dias"), então usamos
  // o campo professor da turma para recuperar o nome original (ex: "Bárbara Dias").
  // Isso garante que a query de aulas e os dados salvos batem com o que o admin vê.
  const professorNomeReal = useMemo(() => {
    return turmas[0]?.professor || professorNome;
  }, [turmas, professorNome]);

  // Hook de aulas - lê pelas turmas do professor (robusto a acento/grafia);
  // só a gravação usa o nome canônico, exigido pelas regras do Firestore.
  const { aulas, loading: aulasLoading, error: aulasError, registrarAula, atualizarAula, excluirAula } = useAulas(professorNomeReal, turmas.map(t => t.id));
  // Pendência só se calcula com as aulas carregadas: antes, as turmas chegavam
  // primeiro e, com aulas = [], tudo aparecia "Pendente" (ou para sempre, se a
  // leitura falhasse).
  const aulasProntas = !aulasLoading && !aulasError;
  const hojeISO = useHojeISO();

  // Responsividade da sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarMode('closed');
      } else {
        setSidebarMode(prev => prev === 'closed' ? 'open' : prev);
      }
    };
    handleResize(); // Executar na montagem
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Professor já autenticado via email+senha pelo RequireProfessorAuth — auth anônimo não é mais necessário

  const handleSalvarAula = async (aulaData) => {
    setSaving(true);
    const result = await registrarAula(aulaData);
    setSaving(false);
    if (result.success) {
      setShowRegistroAula(false);
      setSelectedTurma(null);
      setSelectedDate(null);
      mostrarMensagem('sucesso', 'Aula registrada com sucesso!');
    } else {
      const code = result.error || '';
      const mensagem = code.includes('permission-denied') || code.includes('Missing or insufficient permissions')
        ? 'Seu cadastro não tem permissão para lançar aulas desta turma. Contate a coordenação para corrigir seu cadastro de professor.'
        : `Erro ao salvar aula: ${code || 'tente novamente.'}`;
      mostrarMensagem('erro', mensagem);
    }
  };

  const handleEnviarRecado = async (e) => {
    e.preventDefault();
    if (!recadoTexto.trim()) return;
    setSavingRecado(true);
    try {
      await addDoc(
        collection(db, 'recados'),
        {
          professor: professorNomeReal,
          professorKey: normalizeNome(professorNomeReal),
          professorSlug,
          texto: recadoTexto.trim(),
          tipo: recadoTipo,
          lido: false,
          createdAt: Date.now(),
        }
      );
      setRecadoTexto('');
      setRecadoSent(true);
      setTimeout(() => { setShowRecado(false); setRecadoSent(false); }, 2000);
    } catch (err) {
      // O texto continua no campo para o professor tentar de novo
      console.error('Erro ao enviar recado:', err);
      mostrarMensagem('erro', 'Não foi possível enviar o recado. Verifique a conexão e tente novamente.');
    } finally {
      setSavingRecado(false);
    }
  };

  // Buscar turmas e alunos do professor
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // Buscar turmas do professor
        // Normaliza acentos para comparar "Bárbara" == "barbara", "João" == "joao" etc.
        const norm = str => str.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

        const turmasRef = collection(db, 'turmas');
        const turmasSnapshot = await getDocs(turmasRef);
        const turmasData = turmasSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => {
            // Prioridade 1: campo professorSlug direto (mais confiável)
            if (t.professorSlug) return t.professorSlug === professorSlug;
            // Prioridade 2: nome completo sem acento
            const prof = norm(t.professor || '');
            if (!prof) return false;
            if (prof === norm(professorNome)) return true;
            // Prioridade 3: primeiro nome como palavra inteira.
            // `includes` casaria "Ana" com "Mariana" e entregaria turma de outro professor.
            return prof.split(/\s+/).includes(norm(professorPrimeiroNome));
          });

        setTurmas(turmasData);

        // Só os alunos das turmas do professor, numa busca por ids
        setAlunosPorTurma(await buscarAlunosDasTurmas(turmasData));

      } catch (error) {
        // Antes caía direto na tela "Nenhuma turma encontrada" (turmas = [])
        // mesmo quando o erro era de rede/permissão — o professor achava que
        // simplesmente não tinha turmas cadastradas. Agora distinguimos os casos.
        console.error('Erro ao buscar dados:', error);
        setLoadError(error.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (professorPrimeiroNome) {
      fetchData();
    }
  }, [professorPrimeiroNome, professorNome, professorSlug, reloadTick]);

  // Estatísticas do professor
  const stats = useMemo(() => {
    // Mesmo número da lista de alunos; aluno em duas turmas conta uma vez
    const totalAlunos = totalAlunosUnicos(turmas, alunosPorTurma);
    const mesAtual = hojeISO.slice(0, 7); // "AAAA-MM"
    const aulasMesAtual = aulasRealizadas(aulas)
      .filter(aula => typeof aula.data === 'string' && aula.data.startsWith(mesAtual)).length;
    return { totalTurmas: turmas.length, totalAlunos, aulasMesAtual };
  }, [turmas, aulas, alunosPorTurma, hojeISO]);

  // Aulas de hoje — data no fuso local (UTC quebraria a partir das 21h)
  const aulasHoje = useMemo(() => aulas.filter(aula => aula.data === hojeISO), [aulas, hojeISO]);

  // Agenda semanal — turmas agrupadas por dia da semana
  const agendaSemanal = useMemo(() => {
    // Domingo só entra na grade se alguma turma realmente tiver aula nesse dia
    const temDomingo = turmas.some(t => diasDaTurma(t).includes('Domingo'));
    const DIAS_ORDEM = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', ...(temDomingo ? ['Domingo'] : [])];
    const hoje = dataDeISO(hojeISO);
    // Início da semana (segunda-feira) + offset de semanas
    const diaSemana = hoje.getDay(); // 0=Dom,...6=Sab
    const diffParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diffParaSegunda + semanaOffset * 7);
    segunda.setHours(0, 0, 0, 0);

    return DIAS_ORDEM.map((dia, i) => {
      const dataRef = new Date(segunda);
      dataRef.setDate(segunda.getDate() + i);
      const dateStr = dataLocalISO(dataRef);
      const isHoje = dateStr === hojeISO;
      const isFuturo = dateStr > hojeISO;

      const turmasDia = turmas
        .filter(t => diasDaTurma(t).includes(dia))
        .sort((a, b) => compararHorario(getHorarioDia(a, dia), getHorarioDia(b, dia)));

      return { dia, dateStr, isHoje, isFuturo, turmasDia };
    });
  }, [turmas, semanaOffset, hojeISO]);

  // Turmas com aula hoje, em ordem de horário
  const proximasAulas = useMemo(() => {
    const diaHojeNome = nomeDiaSemana(dataDeISO(hojeISO));
    return turmas.filter(turma => diasDaTurma(turma).includes(diaHojeNome))
      .sort((a, b) => compararHorario(getHorarioDia(a, diaHojeNome), getHorarioDia(b, diaHojeNome)));
  }, [turmas, hojeISO]);
  // KPI "Aulas Hoje": aulas já registradas entre as agendadas (antes mostrava só as agendadas)
  const aulasDadasHoje = proximasAulas.filter(t => aulasHoje.some(a => a.turmaId === t.id)).length;

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
      if (ordenar === 'horario') return compararHorario(a.horario, b.horario);
      if (ordenar === 'alunos') return contarAlunos(b, alunosPorTurma) - contarAlunos(a, alunosPorTurma);
      if (ordenar === 'dia') return compararDiasTurma(a, b);
      return 0;
    });

    return lista;
  }, [turmas, turmaFiltro, alunosPorTurma]);

  // Valores únicos para os selects de filtro
  const niveisUnicos = useMemo(() => [...new Set(turmas.map(t => t.nivel).filter(Boolean))].sort(), [turmas]);
  const diasUnicos = useMemo(() => {
    const todos = turmas.flatMap(t => (t.dias || '').split(',').map(d => d.trim()).filter(Boolean));
    return [...new Set(todos)].sort((a, b) => ordemDia(a) - ordemDia(b));
  }, [turmas]);

  // Notificações automáticas
  const notificacoesAuto = useMemo(() => {
    const avisos = [];
    const hojeStr = hojeISO;
    const amanha = dataDeISO(hojeISO); amanha.setDate(amanha.getDate() + 1);

    // 0. Aniversários de alunos (hoje e amanhã)
    const todosAlunos = Object.values(alunosPorTurma).flat();
    const vistos = new Set();
    const anivHoje = [], anivAmanha = [];
    todosAlunos.forEach(aluno => {
      if (vistos.has(aluno.id)) return;
      vistos.add(aluno.id);
      const mesDia = mesDiaNascimento(aluno.dataNascimento);
      if (!mesDia) return;
      const hojeMMDD = hojeStr.slice(5);
      const amanhaMMDD = dataLocalISO(amanha).slice(5);
      if (mesDia === hojeMMDD) anivHoje.push(aluno.nome || aluno.name);
      if (mesDia === amanhaMMDD) anivAmanha.push(aluno.nome || aluno.name);
    });
    if (anivHoje.length > 0) {
      avisos.push({ id: `aniv-hoje-${hojeStr}`, tipo: 'aniversario', cor: 'blue',
        titulo: `Aniversário hoje`,
        texto: `${anivHoje.join(', ')} faz${anivHoje.length > 1 ? 'em' : ''} aniversário hoje. Não se esqueça de parabenizar!`,
      });
    }
    if (anivAmanha.length > 0) {
      avisos.push({ id: `aniv-amanha-${dataLocalISO(amanha)}`, tipo: 'aniversario', cor: 'blue',
        titulo: `Aniversário amanhã`,
        texto: `${anivAmanha.join(', ')} faz${anivAmanha.length > 1 ? 'em' : ''} aniversário amanhã.`,
      });
    }

    turmas.forEach(turma => {
      const aulasT = aulas.filter(a => a.turmaId === turma.id);
      const alunos = alunosPorTurma[turma.id] || [];

      // 1. Alunos com frequência < 75% (feriado/cancelada/recesso não contam)
      if (aulasRealizadas(aulasT).length >= 2) {
        const comBaixaFreq = alunos.filter(aluno => {
          const pct = frequenciaAluno(aulasT, aluno.id);
          return pct !== null && pct < 75;
        });
        if (comBaixaFreq.length > 0) {
          // O id inclui os alunos afetados: se a lista mudar, o aviso volta a
          // aparecer mesmo que o professor já tenha dispensado o anterior.
          avisos.push({
            id: `freq-${turma.id}-${comBaixaFreq.map(a => a.id).sort().join('_')}`,
            tipo: 'frequencia',
            cor: 'red',
            titulo: `Faltas excessivas — ${turma.nome}`,
            texto: `${comBaixaFreq.length} aluno${comBaixaFreq.length > 1 ? 's estão' : ' está'} com frequência abaixo de 75%: ${comBaixaFreq.map(a => (a.nome || a.name || '').split(' ')[0]).join(', ')}.`,
          });
        }
      }

      // 2. Aulas sem conteúdo — feriado/cancelada/recesso gravam conteúdo vazio de propósito
      const semConteudo = aulasRealizadas(aulasT).filter(a => !a.conteudo || !a.conteudo.trim());
      if (semConteudo.length > 0) {
        const datas = semConteudo.slice(0, 3).map(a => a.data ? a.data.split('-').reverse().join('/') : '—').join(', ');
        avisos.push({
          id: `conteudo-${turma.id}-${semConteudo.map(a => a.id).sort().join('_')}`,
          tipo: 'conteudo',
          cor: 'amber',
          titulo: `Conteúdo não preenchido — ${turma.nome}`,
          texto: `${semConteudo.length} aula${semConteudo.length > 1 ? 's' : ''} sem conteúdo registrado. Datas: ${datas}.`,
        });
      }

      // 3. Aulas pendentes (últimos 14 dias) — só com as aulas carregadas
      const pendentesRaw = aulasProntas ? datasPendentes(turma, aulasT, hojeISO) : [];
      const pendentes = pendentesRaw.map(iso => `${iso.split('-').reverse().join('/')} (${nomeDiaSemana(dataDeISO(iso))})`);
      if (pendentes.length > 0) {
        avisos.push({
          id: `pendente-${turma.id}-${pendentesRaw.join('_')}`,
          tipo: 'pendente',
          cor: 'orange',
          titulo: `Aula pendente — ${turma.nome}`,
          texto: `Aula${pendentes.length > 1 ? 's' : ''} não registrada${pendentes.length > 1 ? 's' : ''}: ${pendentes.join(', ')}.`,
          turmaObj: turma,
          dataPendente: pendentesRaw[0],
        });
      }
    });

    return avisos;
  }, [turmas, aulas, alunosPorTurma, hojeISO, aulasProntas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Não foi possível carregar seu painel</h2>
          <p className="text-slate-600 mb-4">
            Houve um erro ao buscar suas turmas. Pode ser uma falha de conexão ou de permissão no seu cadastro.
          </p>
          <p className="text-xs text-slate-500 mb-4 break-words">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setReloadTick(t => t + 1)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => { auth.signOut(); navigate('/professor-login'); }}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Sair da conta
            </button>
          </div>
        </Card>
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
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            Voltar ao início
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Print Styles */}
      <style>{`
        @media print {
          aside { display: none !important; }
          .sidebar-toggle { display: none !important; }
          .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 20px !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className={`bg-white border-r border-slate-200 fixed h-full flex flex-col transition-all duration-300 ease-in-out z-30 shadow-lg ${
        sidebarMode === 'open' ? 'w-64 translate-x-0' :
        sidebarMode === 'mini' ? 'w-16 translate-x-0' :
        'w-64 -translate-x-full'
      }`}>
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-slate-100 flex-shrink-0 transition-all ${
          sidebarMode === 'mini' ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          {sidebarMode === 'mini' ? (
            <img
              src="https://www.speakupcataguases.com/wp-content/uploads/2026/05/icone-2-azul.png"
              alt="SpeakUp"
              className="w-9 h-9 object-contain"
            />
          ) : (
            <img
              src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png"
              alt="SpeakUp"
              className="h-8 object-contain"
            />
          )}
          {sidebarMode === 'open' && (
            <button
              onClick={() => setSidebarMode('mini')}
              className="p-1.5 text-slate-500 hover:text-accent hover:bg-slate-50 rounded-lg transition-colors"
              title="Recolher sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${sidebarMode === 'mini' ? 'px-2' : 'px-3'}`}>
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<LayoutDashboard size={18} />}
            label="Início"
            active={activeView === 'dashboard'}
            onClick={navClick(() => setActiveView('dashboard'))}
          />
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<Users size={18} />}
            label="Minhas Turmas"
            active={activeView === 'turmas'}
            onClick={navClick(() => setActiveView('turmas'))}
          />
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<BookOpen size={18} />}
            label="Notas"
            active={activeView === 'notas'}
            onClick={navClick(() => setActiveView('notas'))}
          />
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<FileText size={18} />}
            label="Histórico de Aulas"
            active={activeView === 'historico'}
            onClick={navClick(() => { setHistoricoTurmaFiltro(null); setActiveView('historico'); })}
          />
          {/* Resources só em dev até provas e áudios irem para o LMS — em produção os botões não abririam nada */}
          {import.meta.env.DEV && (
            <SidebarNav collapsed={sidebarMode === 'mini'} icon={<Library size={18} />} label="Resources"
              active={activeView === 'resources'} onClick={navClick(() => setActiveView('resources'))} />
          )}
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<Bell size={18} />}
            label="Avisos"
            badge={notificacoesAuto.filter(a => !dismissedIds.has(a.id)).length + recadosAdmin.filter(r => !r.lido).length}
            active={activeView === 'avisos'}
            onClick={navClick(() => setActiveView('avisos'))}
          />
          <SidebarNav
            collapsed={sidebarMode === 'mini'}
            icon={<MessageSquare size={18} />}
            label="Enviar Recado"
            onClick={navClick(() => setShowRecado(true))}
          />
        </nav>

        {/* Perfil do professor */}
        <div className="flex-shrink-0 border-t border-slate-100 py-3">
          {sidebarMode === 'mini' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#0e48fe]/10 flex items-center justify-center text-sm font-bold text-accent" title={professorNomeReal}>
                {professorPrimeiroNome[0]?.toUpperCase()}
              </div>
              <button
                onClick={() => { auth.signOut(); navigate('/professor-login'); }}
                className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="px-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#0e48fe]/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                  {professorPrimeiroNome[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{professorNomeReal}</p>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Professor(a)</p>
                </div>
              </div>
              <button
                onClick={() => { auth.signOut(); navigate('/professor-login'); }}
                className="w-full text-[11px] text-slate-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-left flex items-center gap-2"
              >
                <LogOut size={14} />
                Sair da conta
              </button>
            </div>
          )}
        </div>

        {/* Toggle para mini mode */}
        {sidebarMode === 'mini' && (
          <button
            onClick={() => setSidebarMode('open')}
            className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 transition-colors"
            title="Expandir sidebar"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        )}
      </aside>

      {/* Overlay para mobile */}
      {sidebarMode === 'open' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarMode('closed')}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${
        sidebarMode === 'open' ? 'lg:ml-64' :
        sidebarMode === 'mini' ? 'lg:ml-16' :
        ''
      }`}>
        {/* Mobile menu toggle */}
        <button
          className="sidebar-toggle lg:hidden fixed top-4 left-4 z-40 bg-white p-2 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50"
          onClick={() => setSidebarMode(sidebarMode === 'closed' ? 'open' : 'closed')}
        >
          <Menu size={20} className="text-slate-700" />
        </button>

        <div className="p-4 pt-16 lg:p-6 lg:pt-6">
      {/* Painel de Notas inline */}
      {activeView === 'notas' && (
        <NotasView
          professorSlug={professorSlug}
          professorNome={professorNomeReal}
          turmas={turmas}
          alunosPorTurma={alunosPorTurma}
          onVoltar={() => setActiveView('dashboard')}
        />
      )}

      {/* Histórico de Aulas inline */}
      {activeView === 'historico' && (
        <div className="bg-white rounded-2xl max-w-full overflow-hidden shadow-sm">
          <HistoricoAulas
            professorNome={professorNomeReal}
            aulas={aulas}
            turmas={turmas}
            onClose={() => setActiveView('dashboard')}
            onDeleteAula={excluirAula}
            onUpdateAula={atualizarAula}
            initialTurmaFiltro={historicoTurmaFiltro}
          />
        </div>
      )}

      {/* Toasts — fora das views para aparecerem em qualquer tela */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[60] bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-[60] bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {errorMsg}
        </div>
      )}

      {/* Conteúdo principal (Dashboard, Turmas, Avisos) */}
      {activeView !== 'notas' && activeView !== 'historico' && (
      <React.Fragment>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-slate-800 mb-1">
              {activeView === 'dashboard' ? `Olá, ${professorNomeReal.split(' ')[0]}` :
               activeView === 'turmas' ? 'Minhas Turmas' :
               activeView === 'avisos' ? 'Avisos e Notificações' :
               activeView === 'resources' ? 'Resources' :
               'Painel do Professor'}
            </h1>
            <p className="text-slate-600">
              {activeView === 'dashboard' ? 'Painel de controle das suas turmas e aulas' :
               activeView === 'turmas' ? 'Gerencie suas turmas e alunos' :
               activeView === 'avisos' ? 'Acompanhe notificações e lembretes' :
               activeView === 'resources' ? 'Tests, worksheets and practice materials for every course.' :
               'Sistema de gestão acadêmica'}
            </p>
          </div>
        </div>
      </div>

      {/* Biblioteca Resources (interface em inglês, como o LMS) */}
      {activeView === 'resources' && (
        <React.Suspense fallback={<p className="text-slate-500 text-sm">Carregando…</p>}>
          <ResourcesView />
        </React.Suspense>
      )}

      {/* Estatísticas Rápidas e Dashboard Principal */}
      {activeView === 'dashboard' && (
      <React.Fragment>
      {aulasError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          Não foi possível carregar as aulas registradas. Os alertas de pendência ficam desligados até a conexão voltar — recarregue a página.
        </div>
      )}

      {/* Banner de recados da coordenação não lidos */}
      {recadosAdmin.filter(r => !r.lido).length > 0 && (
        <div className="mb-6 bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start gap-3">
          <MessageSquare size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">
              {recadosAdmin.filter(r => !r.lido).length === 1
                ? 'Você tem 1 recado novo da coordenação'
                : `Você tem ${recadosAdmin.filter(r => !r.lido).length} recados novos da coordenação`}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5 truncate">
              {recadosAdmin.filter(r => !r.lido)[0]?.texto}
            </p>
          </div>
          <button
            onClick={() => setActiveView('avisos')}
            className="flex-shrink-0 text-xs font-medium text-emerald-700 border border-emerald-300 bg-white px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Ver
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI label="Turmas Ativas" value={stats.totalTurmas} format="number" accent="blue" />
        <KPI label="Total de Alunos" value={stats.totalAlunos} format="number" accent="green" />
        <KPI label="Aulas Este Mês" value={stats.aulasMesAtual} format="number" accent="yellow" loading={aulasLoading} />
        <KPI label="Aulas Hoje" value={aulasDadasHoje} format="number" loading={aulasLoading}
          sub={proximasAulas.length ? `de ${proximasAulas.length} agendada${proximasAulas.length > 1 ? 's' : ''}` : 'Sem aulas hoje'}
          accent={!proximasAulas.length ? 'blue' : aulasDadasHoje >= proximasAulas.length ? 'green' : 'yellow'} />
      </div>

      {/* Próximas Aulas de Hoje */}
      {proximasAulas.length > 0 && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={24} className="text-accent" />
              Aulas de Hoje
            </h2>
          </div>

          <div className="space-y-3">
            {proximasAulas.map(turma => {
              const aulaJaRegistrada = aulasHoje.some(a => a.turmaId === turma.id);
              
              return (
                <div
                  key={turma.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-accent transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-accent text-white rounded-lg p-3">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{turma.nome}</h3>
                      <p className="text-sm text-slate-600">
                        {getHorarioDia(turma, nomeDiaSemana(dataDeISO(hojeISO)))} • {turma.nivel} • {contarAlunos(turma, alunosPorTurma)} alunos
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
                          setSelectedDate(null); // hoje
                          setShowRegistroAula(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all"
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

      {/* Agenda Semanal */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={22} className="text-accent" />
            {semanaOffset === 0 ? 'Agenda da Semana' : semanaOffset === -1 ? 'Semana Passada' : `${Math.abs(semanaOffset)} semanas atrás`}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSemanaOffset(o => o - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:border-accent hover:text-accent text-slate-500 transition-all"
              title="Semana anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            {semanaOffset !== 0 && (
              <button
                onClick={() => setSemanaOffset(0)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:border-accent hover:text-accent text-slate-500 transition-all"
              >
                Hoje
              </button>
            )}
            <button
              onClick={() => setSemanaOffset(o => o + 1)}
              disabled={semanaOffset >= 0}
              className="p-2 rounded-lg border border-slate-200 hover:border-accent hover:text-accent text-slate-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Próxima semana"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={`grid grid-cols-3 gap-3 ${agendaSemanal.length > 6 ? 'md:grid-cols-7' : 'md:grid-cols-6'}`}>
          {agendaSemanal.map(({ dia, dateStr, isHoje, isFuturo, turmasDia }) => {
            const [, mes, d] = dateStr.split('-');
            const label = `${d}/${mes}`;
            return (
              <div
                key={dia}
                className={`rounded-2xl border p-3 flex flex-col gap-2 min-h-[100px] ${
                  isHoje
                    ? 'border-accent bg-blue-50 shadow-md'
                    : aulasProntas && !isFuturo && turmasDia.length > 0 && turmasDia.some(t => !aulas.some(a => a.turmaId === t.id && a.data === dateStr))
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isHoje ? 'text-accent' : 'text-slate-500'}`}>{dia}</span>
                  <span className={`text-xs ${isHoje ? 'text-accent font-semibold' : 'text-slate-500'}`}>{label}</span>
                </div>
                {turmasDia.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center mt-2">—</p>
                ) : (
                  turmasDia.map(turma => {
                    const registrada = aulas.some(a => a.turmaId === turma.id && a.data === dateStr);
                    return (
                      <button
                        key={turma.id}
                        onClick={() => {
                          if (registrada) {
                            setHistoricoTurmaFiltro(turma.id);
                            setActiveView('historico');
                          } else {
                            setSelectedTurma(turma);
                            setSelectedDate(dateStr);
                            setShowRegistroAula(true);
                          }
                        }}
                        className={`w-full text-left rounded-xl px-2 py-1.5 text-xs transition-all border ${
                          registrada
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-accent hover:bg-blue-50 hover:text-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{turma.nome}</span>
                          {registrada && <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />}
                        </div>
                        <div className="text-xs opacity-70 mt-0.5">{getHorarioDia(turma, dia)}</div>
                      </button>
                    );
                  })
                )}
                {isHoje && turmasDia.length > 0 && (
                  <div className="mt-auto pt-1">
                    <div className="h-0.5 w-6 bg-accent rounded-full mx-auto opacity-60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel de Notificações & Lembretes */}
      {(() => {
        const avisosVisiveis = notificacoesAuto.filter(a => !dismissedIds.has(a.id));
        const totalAvisos = avisosVisiveis.length + lembretes.length;
        return (
          <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header clicavel — toggle sanfona */}
            <button
              onClick={() => setShowAvisos(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-accent" />
                <h2 className="text-base font-bold text-slate-800">Avisos &amp; Lembretes</h2>
                {totalAvisos > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {totalAvisos}
                  </span>
                )}
              </div>
              <ChevronDown size={16} aria-hidden="true"
                className={`text-slate-500 transition-transform duration-200 ${showAvisos ? 'rotate-180' : ''}`} />
            </button>

            {showAvisos && <div className="p-4 space-y-2 border-t border-slate-100">
              {avisosVisiveis.map(aviso => (
                <AvisoItem key={aviso.id} aviso={aviso} compact onDispensar={dispensarAvisos} onRegistrar={abrirRegistroPendente} />
              ))}
              {lembretes.map(l => <LembreteItem key={l.id} lembrete={l} compact onExcluir={excluirLembrete} />)}

              {/* Estado vazio */}
              {totalAvisos === 0 && (
                <div className="text-center py-4">
                  <CheckCircle size={28} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm text-slate-500">Tudo em ordem! Nenhum aviso no momento.</p>
                </div>
              )}

              {/* Input lembrete manual */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!novoLembrete.trim()) return;
                  setLembretes(prev => [...prev, {
                    id: Date.now().toString(),
                    texto: novoLembrete.trim(),
                    data: new Date().toLocaleDateString('pt-BR'),
                  }]);
                  setNovoLembrete('');
                }}
                className="flex gap-2 mt-3 pt-3 border-t border-slate-100"
              >
                <input
                  type="text"
                  value={novoLembrete}
                  onChange={e => setNovoLembrete(e.target.value)}
                  placeholder="Adicionar lembrete... ex: Feriado na sexta, avisar os pais"
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={!novoLembrete.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  <Send size={14} /> Adicionar
                </button>
                {lembretes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLembretes([])}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Limpar todos os lembretes"
                  >
                    <Trash2 size={14} /> Limpar
                  </button>
                )}
              </form>
            </div>}
          </div>
        );
      })()}
      </React.Fragment>
      )}

      {/* Avisos e Notificações */}
      {activeView === 'avisos' && (
        <div className="space-y-4">

          {/* Recados da coordenação */}
          {recadosAdmin.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <MessageSquare size={14} /> Recados da Coordenação
              </h2>
              <div className="space-y-3">
                {recadosAdmin.map(r => {
                  // Tipo vira etiqueta colorida (antes: borda lateral grossa no cartão)
                  const tipoTag =
                    r.tipo === 'urgente'  ? 'bg-red-100 text-red-800' :
                    r.tipo === 'material' ? 'bg-blue-100 text-blue-800' :
                    r.tipo === 'falta'    ? 'bg-amber-100 text-amber-900' :
                                           'bg-slate-100 text-slate-700';
                  return (
                    <div key={r.id} className={`bg-white border rounded-xl p-4 ${!r.lido ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {!r.lido && (
                              <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">Novo</span>
                            )}
                            {r.tipo && r.tipo !== 'geral' && (
                              <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${tipoTag}`}>{r.tipo}</span>
                            )}
                            <span className="text-xs text-slate-500 ml-auto">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed">{r.texto}</p>
                          {r.resposta && (
                            <div className="mt-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-slate-500 font-semibold mb-0.5">Sua resposta:</p>
                              <p className="text-xs text-slate-600">{r.resposta}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="mt-3 flex flex-col gap-2">
                        {!r.resposta && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Responder à coordenação..."
                              value={respostasRecados[r.id] || ''}
                              onChange={e => setRespostasRecados(prev => ({ ...prev, [r.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && enviarRespostaRecado(r.id)}
                              className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                            />
                            <button
                              onClick={() => enviarRespostaRecado(r.id)}
                              disabled={sendingResposta[r.id] || !respostasRecados[r.id]?.trim()}
                              className="flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors text-sm"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        )}
                        {!r.lido && (
                          <button
                            onClick={() => marcarRecadoLido(r.id)}
                            className="self-start flex items-center gap-1 text-xs text-emerald-700 font-medium hover:underline"
                          >
                            <CheckCircle size={12} /> Marcar como lido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Separador + botão limpar alertas */}
          {notificacoesAuto.filter(a => !dismissedIds.has(a.id)).length > 0 && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Bell size={14} /> Alertas Automáticos
              </h2>
              <button
                onClick={() => dispensarAvisos(notificacoesAuto.map(a => a.id))}
                className="text-xs text-slate-500 hover:text-red-500 transition-colors"
              >
                Dispensar todos
              </button>
            </div>
          )}

          {notificacoesAuto.filter(a => !dismissedIds.has(a.id)).map(aviso => (
            <AvisoItem key={aviso.id} aviso={aviso} onDispensar={dispensarAvisos} onRegistrar={abrirRegistroPendente} />
          ))}
          {lembretes.map(l => <LembreteItem key={l.id} lembrete={l} onExcluir={excluirLembrete} />)}

          {notificacoesAuto.filter(a => !dismissedIds.has(a.id)).length === 0 && lembretes.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Bell size={48} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum aviso no momento</p>
            </div>
          )}
        </div>
      )}

      {/* Lista de Turmas */}
      {(activeView === 'turmas' || activeView === 'dashboard') && (
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-accent" />
            Minhas Turmas
            <span className="text-sm font-normal text-slate-500">({turmasFiltradas.length}/{turmas.length})</span>
          </h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Busca por nome */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar turma..."
              value={turmaFiltro.busca}
              onChange={e => setTurmaFiltro(f => ({ ...f, busca: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Filtro nível */}
          <select
            value={turmaFiltro.nivel}
            onChange={e => setTurmaFiltro(f => ({ ...f, nivel: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white text-slate-700"
          >
            <option value="">Todos os níveis</option>
            {niveisUnicos.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Filtro dia */}
          <select
            value={turmaFiltro.dia}
            onChange={e => setTurmaFiltro(f => ({ ...f, dia: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white text-slate-700"
          >
            <option value="">Todos os dias</option>
            {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Ordenação */}
          <select
            value={turmaFiltro.ordenar}
            onChange={e => setTurmaFiltro(f => ({ ...f, ordenar: e.target.value }))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white text-slate-700"
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
                <th className="pb-3 pr-4 font-semibold text-center">Freq.</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turmasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 text-sm">
                    Nenhuma turma encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : turmasFiltradas.map(turma => {
                const aulasCount = aulasRealizadas(aulas.filter(a => a.turmaId === turma.id)).length;
                const aulasPrevistas = turma.totalAulas || 40;
                const aulasProgress = Math.min(Math.round((aulasCount / aulasPrevistas) * 100), 100);
                const aulaHojeRegistrada = aulasHoje.some(a => a.turmaId === turma.id);
                // Mesma regra do alerta "Aula pendente" (antes a tabela só olhava o último dia)
                const aulaPendente = aulasProntas && !aulaHojeRegistrada &&
                  datasPendentes(turma, aulas.filter(a => a.turmaId === turma.id), hojeISO).length > 0;
                const qtdAlunos = contarAlunos(turma, alunosPorTurma);
                const freqMedia = frequenciaMediaTurma(aulas.filter(a => a.turmaId === turma.id));

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
                          {aulasCount}<span className="text-slate-500 font-normal">/{aulasPrevistas}</span>
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full ${aulasProgress >= 100 ? 'bg-emerald-500' : 'bg-accent'}`}
                            style={{ width: `${aulasProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {freqMedia !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-semibold ${freqMedia < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {freqMedia}%
                          </span>
                          <div className="w-14 bg-slate-200 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${freqMedia < 75 ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${freqMedia}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {aulaHojeRegistrada ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <CheckCircle size={11} />
                          Hoje
                        </span>
                      ) : aulaPendente ? (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <AlertTriangle size={11} />
                          Pendente
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedTurma(turma); setShowDetalheTurma(true); }}
                          className="text-xs px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:border-accent hover:text-accent transition-all"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => { setTurmaRanking(turma); setShowRankingTarefas(true); }}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
                          title="Ranking de Tarefas"
                        >
                          <ListChecks size={12} aria-hidden="true" /> Tarefas
                        </button>
                        <button
                          onClick={() => { setSelectedTurma(turma); setSelectedDate(null); setShowRegistroAula(true); }}
                          className="text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all flex items-center gap-1"
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
      )}
      </React.Fragment>
      )}

      {/* Modais — fora do bloco das views: antes ficavam presos dentro dele e
          "Enviar Recado" não abria nada quando o professor estava em Notas ou
          Histórico (o modal só aparecia ao voltar para o Início). */}

      {/* Modal de Ranking de Tarefas */}
      {showRankingTarefas && turmaRanking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <RankingTarefas
              turma={turmaRanking}
              aulas={aulas}
              alunos={alunosPorTurma[turmaRanking.id] || []}
              onClose={() => { setShowRankingTarefas(false); setTurmaRanking(null); }}
            />
          </div>
        </div>
      )}

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
                aria-label="Fechar" className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats rápidas */}
            {(() => {
              const aulasT = aulas.filter(a => a.turmaId === selectedTurma.id);
              const dadas = aulasRealizadas(aulasT).length;
              const previstas = selectedTurma.totalAulas || 40;
              const progresso = Math.min(Math.round((dadas / previstas) * 100), 100);
              const freq = frequenciaMediaTurma(aulasT);
              return (
                <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">
                      {contarAlunos(selectedTurma, alunosPorTurma)}
                    </p>
                    <p className="text-xs text-slate-500">Alunos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {dadas}
                      <span className="text-sm text-slate-500 font-normal">/{previstas}</span>
                    </p>
                    <p className="text-xs text-slate-500">Aulas dadas / previstas</p>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full ${progresso >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {freq !== null ? `${freq}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">Frequência média</p>
                  </div>
                </div>
              );
            })()}

            {/* Lista de alunos */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                Alunos da turma
              </h3>
              {(alunosPorTurma[selectedTurma.id] || []).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Nenhum aluno cadastrado nesta turma.</p>
              ) : (
                <div className="space-y-2">
                  {(alunosPorTurma[selectedTurma.id] || []).map((aluno) => {
                    // Frequência do aluno nesta turma (ignora feriado/cancelada/recesso)
                    const pct = frequenciaAluno(aulas.filter(a => a.turmaId === selectedTurma.id), aluno.id);
                    const lowFreq = pct !== null && pct < 75;
                    const pctColor = pct === null ? 'text-slate-500' : pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

                    return (
                      <div key={aluno.id} className={`flex items-center justify-between p-3 rounded-lg border ${lowFreq ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${lowFreq ? 'bg-red-500' : 'bg-accent'}`}>
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
                        <div className="flex items-center gap-2">
                          {pct !== null && (
                            <span className={`text-sm font-semibold ${pctColor}`}>
                              {pct}%
                            </span>
                          )}
                          <button
                            onClick={() => setFreqAluno({ aluno, turma: selectedTurma })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-[#0e48fe]/20 bg-[#0e48fe]/5 text-accent hover:bg-[#0e48fe]/10 transition-all"
                            title="Ver relatório de frequência"
                          >
                            <TrendingUp size={11} /> Ver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Aulas Registradas */}
              {aulas.filter(a => a.turmaId === selectedTurma.id).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BookOpen size={16} className="text-accent" />
                    Aulas Registradas ({aulas.filter(a => a.turmaId === selectedTurma.id).length})
                  </h3>
                  <div className="space-y-2">
                    {aulas
                      .filter(a => a.turmaId === selectedTurma.id)
                      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
                      .map((aula) => {
                        const presentes = (aula.chamadas || []).filter(c => c.status === 'presente').length;
                        const faltas = (aula.chamadas || []).filter(c => c.status === 'falta').length;
                        const total = (aula.chamadas || []).length;
                        const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';
                        const realizada = isAulaRealizada(aula);
                        return (
                          <div key={aula.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 text-sm">{dataFmt}</span>
                              <div className="flex items-center gap-2 text-xs">
                                {realizada ? (
                                  <>
                                    <span className="inline-flex items-center gap-0.5 text-emerald-700" title="Presentes"><Check size={12} aria-hidden="true" />{presentes}</span>
                                    <span className="inline-flex items-center gap-0.5 text-red-600" title="Faltas"><X size={12} aria-hidden="true" />{faltas}</span>
                                    {total > 0 && <span className="text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">{Math.round(presentes / total * 100)}%</span>}
                                  </>
                                ) : (
                                  <span className="text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded capitalize">{aula.status}</span>
                                )}
                                <button
                                  onClick={() => setEditAula(aula)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:bg-white hover:border-accent hover:text-accent transition-all"
                                  title="Editar chamada"
                                >
                                  <Pencil size={10} /> Editar
                                </button>
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
                  setSelectedDate(null);
                  setShowRegistroAula(true);
                }}
                className="flex-1 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-all font-medium flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Registrar aula desta turma
              </button>
              <button
                onClick={() => { setHistoricoTurmaFiltro(selectedTurma.id); setShowDetalheTurma(false); setActiveView('historico'); }}
                className="py-3 px-5 border border-slate-300 text-slate-700 rounded-xl hover:border-accent hover:text-accent transition-all"
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
              professorNome={professorNomeReal}
              saving={saving}
              initialDate={selectedDate}
              aulasRecentes={aulas.filter(a => a.turmaId === selectedTurma.id).sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5)}
              onSave={handleSalvarAula}
              onCancel={() => {
                setShowRegistroAula(false);
                setSelectedTurma(null);
                setSelectedDate(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Recado para Coordenação */}
      {showRecado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">Recado para a Coordenação</h2>
              </div>
              <button onClick={() => { setShowRecado(false); setRecadoSent(false); setRecadoTexto(''); }}
                className="text-slate-500 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            {recadoSent ? (
              <div className="p-8 text-center">
                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-800">Recado enviado com sucesso!</p>
                <p className="text-sm text-slate-500 mt-1">A coordenação será notificada.</p>
              </div>
            ) : (
              <form onSubmit={handleEnviarRecado} className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo</label>
                  <select
                    value={recadoTipo}
                    onChange={e => setRecadoTipo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="geral">Geral</option>
                    <option value="aluno">Sobre um aluno</option>
                    <option value="material">Material / Recurso</option>
                    <option value="falta">Falta / Ausência</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Mensagem</label>
                  <textarea
                    value={recadoTexto}
                    onChange={e => setRecadoTexto(e.target.value)}
                    placeholder="Descreva o recado..."
                    rows={4}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    required
                  />
                </div>
                <div className="text-xs text-slate-500">De: <strong>{professorNomeReal}</strong></div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowRecado(false)}
                    className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingRecado || !recadoTexto.trim()}
                    className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={14} />
                    {savingRecado ? 'Enviando...' : 'Enviar Recado'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}


      {/* Modal: Relatório de Frequência do Aluno */}
      {freqAluno && (
        <FrequenciaAlunoModal
          aluno={freqAluno.aluno}
          aulas={aulas}
          turma={freqAluno.turma}
          onClose={() => setFreqAluno(null)}
        />
      )}

      {/* Modal: Editar Chamada */}
      {editAula && (
        <EditarChamadaModal
          aula={editAula}
          saving={savingEdit}
          onClose={() => setEditAula(null)}
          onSave={async (dados) => {
            setSavingEdit(true);
            const result = await atualizarAula(editAula.id, dados);
            setSavingEdit(false);
            if (result.success) {
              setEditAula(null);
              mostrarMensagem('sucesso', 'Chamada atualizada.');
            } else {
              // Mantém o modal aberto para o professor não perder a edição
              mostrarMensagem('erro', `Não foi possível salvar a chamada: ${result.error || 'tente novamente.'}`);
            }
          }}
        />
      )}

      {/* FAB — Nova Aula (só nas views que não têm tabela própria embaixo) */}
      {activeView !== 'notas' && activeView !== 'historico' && activeView !== 'resources' && (
      <div className="fixed bottom-6 right-6 z-40">
        {showFAB && (
          <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-64 max-h-72 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Selecionar turma</p>
            {turmas.map(turma => (
              <button
                key={turma.id}
                onClick={() => { setSelectedTurma(turma); setSelectedDate(null); setShowRegistroAula(true); setShowFAB(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 hover:text-accent text-sm text-slate-700 transition-colors"
              >
                <div className="font-medium">{turma.nome}</div>
                <div className="text-xs text-slate-500 mt-0.5">{turma.dias} • {turma.horario}</div>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowFAB(v => !v)} aria-expanded={showFAB} aria-label={showFAB ? "Fechar" : "Nova aula"}
          className="w-14 h-14 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center text-2xl font-light"
          title="Nova Aula"
        >
          {showFAB ? <X size={24} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
        </button>
      </div>
      )}
        </div>
      </main>
    </div>
  );
}
