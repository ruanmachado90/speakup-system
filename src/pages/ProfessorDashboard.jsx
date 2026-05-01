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
  MessageSquare,
  Printer,
} from 'lucide-react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { APP_ID } from '../utils/constants';
import { useAulas } from '../hooks/useAulas';
import { Card } from '../components';
import ChamadaForm from '../components/forms/ChamadaForm';
import HistoricoAulas from '../components/HistoricoAulas';

// ─── Relatório mensal do professor ────────────────────────────────────────
function ProfessorRelatorio({ professor, turmas, aulas, alunosPorTurma, onClose }) {
  const printRef = React.useRef(null);
  const hoje = new Date();
  const mesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const mesAtual = mesNomes[hoje.getMonth()];
  const anoAtual = hoje.getFullYear();

  const aulasMes = aulas.filter(a => {
    if (!a.data) return false;
    const [ano, mes] = a.data.split('-').map(Number);
    return mes - 1 === hoje.getMonth() && ano === anoAtual;
  });

  const statsPorTurma = turmas.map(turma => {
    const aulasT = aulas.filter(a => a.turmaId === turma.id);
    const aulasTMes = aulasMes.filter(a => a.turmaId === turma.id);
    const alunos = alunosPorTurma[turma.id] || [];
    const previstas = turma.totalAulas || 40;

    let freqMedia = null;
    if (aulasT.length > 0) {
      const total = aulasT.reduce((acc, a) => {
        const presentes = (a.chamadas || []).filter(c => c.status === 'presente').length;
        const tot = (a.chamadas || []).length;
        return tot > 0 ? acc + (presentes / tot) : acc;
      }, 0);
      freqMedia = Math.round((total / aulasT.length) * 100);
    }

    const emRisco = alunos.filter(aluno => {
      const presencas = aulasT.filter(a =>
        (a.chamadas || []).find(c => c.alunoId === aluno.id && c.status === 'presente')
      ).length;
      return aulasT.length > 0 && Math.round((presencas / aulasT.length) * 100) < 75;
    });

    return { id: turma.id, nome: turma.nome, nivel: turma.nivel, dias: turma.dias, horario: turma.horario,
      totalAlunos: alunos.length, aulasDadas: aulasT.length, aulasMes: aulasTMes.length, previstas, freqMedia, emRisco };
  });

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Relatório — ${professor} — ${mesAtual}/${anoAtual}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 20px; }
        h1 { font-size: 18px; color: #005DE4; margin-bottom: 4px; }
        .section-title { font-weight: 700; font-size: 13px; border-bottom: 2px solid #005DE4; padding-bottom: 4px; margin: 16px 0 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; color: #64748b; }
        td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
        .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const totalAulasMes = statsPorTurma.reduce((s, t) => s + t.aulasMes, 0);
  const totalAlunosEmRisco = statsPorTurma.reduce((s, t) => s + t.emRisco.length, 0);
  const freqGeral = statsPorTurma.filter(t => t.freqMedia !== null);
  const freqMedia = freqGeral.length > 0
    ? Math.round(freqGeral.reduce((s, t) => s + t.freqMedia, 0) / freqGeral.length) : null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:860, boxShadow:'0 24px 64px rgba(0,0,0,0.2)', marginTop:20, marginBottom:20 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', background:'linear-gradient(135deg,#005DE4,#0041a8)', borderRadius:'16px 16px 0 0', color:'white' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:17 }}>📊 Relatório — {professor}</div>
            <div style={{ fontSize:13, opacity:0.85 }}>{mesAtual} de {anoAtual}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handlePrint} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', color:'white', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontWeight:600, fontSize:13 }}>
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'white', borderRadius:8, padding:'8px 10px', cursor:'pointer' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={printRef} style={{ padding:24 }}>
          <h1 style={{ display:'none' }}>Relatório Mensal — {professor} — {mesAtual}/{anoAtual}</h1>

          {/* Resumo */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Turmas', value: turmas.length, color:'#005DE4' },
              { label:'Aulas este mês', value: totalAulasMes, color:'#7c3aed' },
              { label:'Freq. média geral', value: freqMedia !== null ? `${freqMedia}%` : '—', color: freqMedia === null ? '#64748b' : freqMedia >= 75 ? '#16a34a' : '#dc2626' },
              { label:'Alunos em risco', value: totalAlunosEmRisco, color: totalAlunosEmRisco > 0 ? '#dc2626' : '#16a34a' },
            ].map(s => (
              <div key={s.label} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabela por turma */}
          <div className="section-title" style={{ fontWeight:700, fontSize:14, borderBottom:'2px solid #005DE4', paddingBottom:6, marginBottom:12, color:'#0f172a' }}>📋 Desempenho por Turma</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:20 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Turma','Nível','Dias / Horário','Alunos','Aulas Dadas','Previstas','Este Mês','Freq. Média','Em Risco'].map(h => (
                  <th key={h} style={{ padding:'8px', textAlign:'left', fontWeight:600, color:'#64748b', fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statsPorTurma.map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'8px', fontWeight:600 }}>{t.nome}</td>
                  <td style={{ padding:'8px' }}><span style={{ background:'#eff6ff', color:'#3b82f6', borderRadius:4, padding:'2px 6px', fontSize:11 }}>{t.nivel}</span></td>
                  <td style={{ padding:'8px', color:'#64748b', fontSize:11 }}>{t.dias}<br/>{t.horario}</td>
                  <td style={{ padding:'8px', textAlign:'center' }}>{t.totalAlunos}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600 }}>{t.aulasDadas}</td>
                  <td style={{ padding:'8px', textAlign:'center', color:'#64748b' }}>{t.previstas}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600, color:'#7c3aed' }}>{t.aulasMes}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600, color: t.freqMedia === null ? '#64748b' : t.freqMedia >= 75 ? '#16a34a' : '#dc2626' }}>
                    {t.freqMedia !== null ? `${t.freqMedia}%` : '—'}
                  </td>
                  <td style={{ padding:'8px', textAlign:'center' }}>
                    {t.emRisco.length > 0 ? <span style={{ color:'#dc2626', fontWeight:600 }}>{t.emRisco.length} ⚠️</span> : <span style={{ color:'#16a34a' }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Alunos em risco */}
          {totalAlunosEmRisco > 0 && (
            <>
              <div className="section-title" style={{ fontWeight:700, fontSize:14, borderBottom:'2px solid #ef4444', paddingBottom:6, marginBottom:12, color:'#0f172a' }}>⚠️ Alunos com Frequência &lt; 75%</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:20 }}>
                <thead>
                  <tr style={{ background:'#fef2f2' }}>
                    {['Aluno','Turma','Frequência'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, color:'#ef4444', fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsPorTurma.flatMap(t =>
                    t.emRisco.map(aluno => {
                      const aulasT = aulas.filter(a => a.turmaId === t.id);
                      const presencas = aulasT.filter(a => (a.chamadas||[]).find(c => c.alunoId === aluno.id && c.status === 'presente')).length;
                      const pct = aulasT.length > 0 ? Math.round(presencas / aulasT.length * 100) : 0;
                      return (
                        <tr key={`${t.id}-${aluno.id}`} style={{ borderBottom:'1px solid #fee2e2' }}>
                          <td style={{ padding:'8px 10px', fontWeight:600 }}>{aluno.nome || aluno.name}</td>
                          <td style={{ padding:'8px 10px', color:'#64748b' }}>{t.nome}</td>
                          <td style={{ padding:'8px 10px', color:'#dc2626', fontWeight:700 }}>{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </>
          )}

          <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:12, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
            Gerado em {hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})} — SpeakUp English Academy — Prof.: {professor}
          </div>
        </div>
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

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

  // Recado para coordenação
  const [showRecado, setShowRecado] = useState(false);
  const [recadoTexto, setRecadoTexto] = useState('');
  const [recadoTipo, setRecadoTipo] = useState('geral');
  const [savingRecado, setSavingRecado] = useState(false);
  const [recadoSent, setRecadoSent] = useState(false);

  // Relatório mensal do professor
  const [showRelatorio, setShowRelatorio] = useState(false);

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

  const handleEnviarRecado = async (e) => {
    e.preventDefault();
    if (!recadoTexto.trim()) return;
    setSavingRecado(true);
    try {
      await addDoc(
        collection(db, 'recados'),
        {
          professor: professorNome,
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
    } catch {
      // silencioso
    } finally {
      setSavingRecado(false);
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

  // Agenda semanal — turmas agrupadas por dia da semana
  const agendaSemanal = useMemo(() => {
    const DIAS_ORDEM = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hoje = new Date();
    // Início da semana (segunda-feira)
    const diaSemana = hoje.getDay(); // 0=Dom,...6=Sab
    const diffParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diffParaSegunda);
    segunda.setHours(0, 0, 0, 0);

    return DIAS_ORDEM.map((dia, i) => {
      const dataRef = new Date(segunda);
      dataRef.setDate(segunda.getDate() + i);
      const dateStr = dataRef.toISOString().split('T')[0];
      const isHoje = dateStr === hoje.toISOString().split('T')[0];

      const turmasDia = turmas
        .filter(t => (t.dias || '').split(',').map(d => d.trim()).includes(dia))
        .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

      return { dia, dateStr, isHoje, turmasDia };
    });
  }, [turmas]);

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
    const hojeStr = hojeDate.toISOString().split('T')[0];
    const amanha = new Date(hojeDate); amanha.setDate(amanha.getDate() + 1);

    // 0. Aniversários de alunos (hoje e amanhã)
    const todosAlunos = Object.values(alunosPorTurma).flat();
    const vistos = new Set();
    const anivHoje = [], anivAmanha = [];
    todosAlunos.forEach(aluno => {
      if (vistos.has(aluno.id)) return;
      vistos.add(aluno.id);
      const dn = aluno.dataNascimento;
      if (!dn) return;
      const [, mes, dia] = dn.split('-');
      const mesDia = `${mes}-${dia}`;
      const hojeMMDD = hojeStr.slice(5);
      const amanhaMMDD = amanha.toISOString().split('T')[0].slice(5);
      if (mesDia === hojeMMDD) anivHoje.push(aluno.nome || aluno.name);
      if (mesDia === amanhaMMDD) anivAmanha.push(aluno.nome || aluno.name);
    });
    if (anivHoje.length > 0) {
      avisos.push({ id: 'aniv-hoje', tipo: 'aniversario', cor: 'blue',
        titulo: `🎂 Aniversário hoje!`,
        texto: `${anivHoje.join(', ')} faz${anivHoje.length > 1 ? 'em' : ''} aniversário hoje. Não se esqueça de parabenizar!`,
      });
    }
    if (anivAmanha.length > 0) {
      avisos.push({ id: 'aniv-amanha', tipo: 'aniversario', cor: 'blue',
        titulo: `🎂 Aniversário amanhã`,
        texto: `${anivAmanha.join(', ')} faz${anivAmanha.length > 1 ? 'em' : ''} aniversário amanhã.`,
      });
    }

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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRelatorio(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-[#005DE4] transition-all shadow-sm text-sm font-medium"
          >
            <Printer size={16} className="text-[#005DE4]" />
            Relatório
          </button>
          <button
            onClick={() => setShowRecado(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-amber-400 transition-all shadow-sm text-sm font-medium"
          >
            <MessageSquare size={16} className="text-amber-500" />
            Recado
          </button>
          <button
            onClick={() => setShowHistorico(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-[#005DE4] transition-all shadow-sm text-sm font-medium"
          >
            <FileText size={18} className="text-[#005DE4]" />
            Histórico de Aulas
          </button>
        </div>
      </div>

      {/* Banner de urgência — aulas sem registro */}
      {(() => {
        const pendencias = notificacoesAuto.filter(a => a.tipo === 'pendente' && !dismissedIds.has(a.id));
        if (pendencias.length === 0) return null;
        return (
          <div className="mb-6 rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex items-start gap-3 shadow-sm animate-pulse-slow">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-700 text-sm mb-1">
                ⚠️ {pendencias.length === 1 ? '1 turma com aula sem registro!' : `${pendencias.length} turmas com aulas sem registro!`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pendencias.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedTurma(p.turmaObj); setShowRegistroAula(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow"
                  >
                    <BookOpen size={12} />
                    Registrar: {p.turmaObj?.nome}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => pendencias.forEach(p => setDismissedIds(prev => new Set([...prev, p.id])))}
              className="flex-shrink-0 text-red-400 hover:text-red-600 p-1"
              title="Dispensar"
            >
              <X size={16} />
            </button>
          </div>
        );
      })()}

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

      {/* Agenda Semanal */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Calendar size={22} className="text-[#005DE4]" />
          Agenda da Semana
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {agendaSemanal.map(({ dia, dateStr, isHoje, turmasDia }) => {
            const [ano, mes, d] = dateStr.split('-');
            const label = `${d}/${mes}`;
            return (
              <div
                key={dia}
                className={`rounded-2xl border p-3 flex flex-col gap-2 min-h-[100px] ${
                  isHoje
                    ? 'border-[#005DE4] bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isHoje ? 'text-[#005DE4]' : 'text-slate-500'}`}>{dia}</span>
                  <span className={`text-xs ${isHoje ? 'text-[#005DE4] font-semibold' : 'text-slate-400'}`}>{label}</span>
                </div>
                {turmasDia.length === 0 ? (
                  <p className="text-xs text-slate-300 text-center mt-2">—</p>
                ) : (
                  turmasDia.map(turma => {
                    const registrada = aulas.some(a => a.turmaId === turma.id && a.data === dateStr);
                    return (
                      <button
                        key={turma.id}
                        onClick={() => { setSelectedTurma(turma); setShowRegistroAula(true); }}
                        className={`w-full text-left rounded-xl px-2 py-1.5 text-xs transition-all border ${
                          registrada
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#005DE4] hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{turma.nome}</span>
                          {registrada && <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />}
                        </div>
                        <div className="text-xs opacity-70 mt-0.5">{turma.horario}</div>
                      </button>
                    );
                  })
                )}
                {isHoje && turmasDia.length > 0 && (
                  <div className="mt-auto pt-1">
                    <div className="h-0.5 w-6 bg-[#005DE4] rounded-full mx-auto opacity-60" />
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
                className="text-slate-400 hover:text-slate-600">
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
                    <option value="geral">📋 Geral</option>
                    <option value="aluno">🎓 Sobre um aluno</option>
                    <option value="material">📦 Material / Recurso</option>
                    <option value="falta">📅 Falta / Ausência</option>
                    <option value="urgente">🚨 Urgente</option>
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
                <div className="text-xs text-slate-400">De: <strong>{professorNome}</strong></div>
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

      {/* Modal de Relatório Mensal do Professor */}
      {showRelatorio && (
        <ProfessorRelatorio
          professor={professorNome}
          turmas={turmas}
          aulas={aulas}
          alunosPorTurma={alunosPorTurma}
          onClose={() => setShowRelatorio(false)}
        />
      )}
    </div>
  );
}
