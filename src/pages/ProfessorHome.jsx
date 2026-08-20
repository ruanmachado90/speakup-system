import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, GraduationCap, Users, BookOpen, Library, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '../components/professor/PageLoading';
import { useProfessorTurmas } from '../hooks/useProfessorTurmas';

const LOGO_URL =
  'https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Dias da semana em que uma turma tem aula (a partir de horarios[] ou do campo legado "dias").
function diasDaTurma(t) {
  if (t?.horarios?.length) return t.horarios.map(h => h.dia).filter(Boolean);
  if (t?.dias) return t.dias.split(',').map(d => d.trim()).filter(Boolean);
  return [];
}

function dataHojeBR() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// Paleta Bauhaus: azul da marca + amarelo mostarda + vermelho + preto, sobre creme.
const CARDS = [
  {
    id: 'frequencia',
    label: 'Conteúdo e Frequência',
    Icon: Users,
    cardBg: 'bg-[#005DE4]',
    textColor: 'text-white',
    subtextColor: 'text-blue-100',
    subtitle: 'Registrar aula de hoje',
    chipBg: 'bg-[#FFC738]',
    chipIcon: 'text-slate-900',
    chipShape: 'circle',
    span: 'col-span-2',
  },
  {
    id: 'notas',
    label: 'Notas',
    Icon: GraduationCap,
    cardBg: 'bg-white',
    textColor: 'text-slate-900',
    chipBg: 'bg-[#0e48fe]',
    chipIcon: 'text-white',
    chipShape: 'circle',
  },
  {
    id: 'tarefas',
    label: 'Tarefas',
    Icon: BookOpen,
    cardBg: 'bg-white',
    textColor: 'text-slate-900',
    chipBg: 'bg-[#fc6e1f]',
    chipIcon: 'text-white',
    chipShape: 'circle',
  },
  {
    id: 'historico',
    label: 'Histórico de Aulas',
    Icon: CalendarDays,
    cardBg: 'bg-white',
    textColor: 'text-slate-900',
    chipBg: 'bg-[#10b981]',
    chipIcon: 'text-white',
    chipShape: 'circle',
  },
  {
    id: 'avisos',
    label: 'Avisos',
    Icon: Bell,
    cardBg: 'bg-white',
    textColor: 'text-slate-900',
    chipBg: 'bg-[#D7263D]',
    chipIcon: 'text-white',
    chipShape: 'circle',
  },
  {
    id: 'wiki',
    label: 'Central do Professor',
    Icon: Library,
    cardBg: 'bg-[#FFC738]',
    textColor: 'text-slate-900',
    subtextColor: 'text-slate-700',
    subtitle: 'Metodologia, treinamentos e vídeos',
    chipBg: 'bg-slate-900',
    chipIcon: 'text-white',
    chipShape: 'circle',
    span: 'col-span-2',
  },
];

const CHIP_SHAPE_CLASS = {
  circle: 'rounded-full',
};

// Skeleton dos cards enquanto a página inicializa
function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] flex flex-col">
      <div className="bg-[#005DE4] px-5 pt-6 pb-5 flex flex-col items-center gap-3 border-b-[3px] border-slate-900">
        <Skeleton className="h-10 w-36 bg-white/20" />
        <Skeleton className="h-4 w-28 bg-white/15 rounded-lg" />
        <Skeleton className="h-3 w-20 bg-white/10 rounded-lg" />
      </div>
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          <Skeleton className="col-span-2 h-28 bg-white shadow-sm" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-square bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfessorHome() {
  const { professorSlug } = useParams();
  const navigate = useNavigate();
  const [avisosNaoLidos, setAvisosNaoLidos] = useState(0);
  const [ready, setReady] = useState(false);

  const { turmas } = useProfessorTurmas(professorSlug);

  const nomeCompleto = useMemo(() => {
    if (turmas[0]?.professor) return turmas[0].professor;
    if (!professorSlug) return '';
    // Fallback enquanto as turmas carregam (sem acentos, só pra não piscar vazio)
    return professorSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [professorSlug, turmas]);

  const primeiroNome = nomeCompleto.split(' ')[0];

  const hoje = useMemo(() => {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${DIAS_SEMANA[d.getDay()]}, ${dia}/${mes}`;
  }, []);

  // Badge de avisos não lidos (coleção real é 'recados' — mesma usada em AvisosPage.jsx)
  useEffect(() => {
    if (!professorSlug) return;
    const q = query(
      collection(db, 'recados'),
      where('professorSlug', '==', professorSlug),
      where('lido', '==', false),
      where('origem', '==', 'admin'),
    );
    const unsub = onSnapshot(q, snap => {
      setAvisosNaoLidos(snap.size);
      setReady(true);
    }, () => setReady(true));
    return unsub;
  }, [professorSlug]);

  // Badge de aulas de hoje ainda sem lançamento no Diário
  const [aulasPendentesHoje, setAulasPendentesHoje] = useState(0);
  useEffect(() => {
    if (!turmas.length) { setAulasPendentesHoje(0); return; }

    const diaHojeNome = DIAS_SEMANA[new Date().getDay()];
    const turmasHoje = turmas.filter(t => diasDaTurma(t).includes(diaHojeNome));
    if (!turmasHoje.length) { setAulasPendentesHoje(0); return; }

    const hojeStr = dataHojeBR();
    const q = query(collection(db, 'diario'), where('turmaId', 'in', turmasHoje.slice(0, 30).map(t => t.id)));
    const unsub = onSnapshot(q, snap => {
      const lancadasHoje = new Set(
        snap.docs.map(d => d.data()).filter(a => a.data === hojeStr).map(a => a.turmaId)
      );
      setAulasPendentesHoje(turmasHoje.filter(t => !lancadasHoje.has(t.id)).length);
    }, () => setAulasPendentesHoje(0));
    return unsub;
  }, [turmas]);

  // Mostra skeleton brevemente enquanto o listener não responde
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleCard = (id) => {
    const base = `/professor/${professorSlug}`;
    const routes = {
      avisos:     `${base}/avisos`,
      historico:  `${base}/historico`,
      notas:      `${base}/notas`,
      frequencia: `${base}/frequencia`,
      tarefas:    `${base}/tarefas`,
      wiki:       `${base}/wiki`,
    };
    navigate(routes[id]);
  };

  if (!ready) return <HomeSkeleton />;

  return (
    <div className="min-h-screen bg-[#F7F3EB] flex flex-col">

      {/* Header — bloco de cor sólido com círculos decorativos, ecoando os chips dos cards */}
      <div className="relative overflow-hidden bg-[#005DE4] px-5 pt-6 pb-7 flex flex-col items-center gap-2 border-b-[3px] border-slate-900">
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[#FFC738]" />
        <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-[#fc6e1f]" />
        <img src={LOGO_URL} alt="SpeakUp" className="relative h-10 object-contain" />
        <p className="relative text-white/90 text-sm font-semibold tracking-wide mt-1 uppercase">
          Olá, <span className="font-black text-white">{primeiroNome}</span> 👋
        </p>
        <span className="relative text-blue-100 text-xs font-bold tracking-wider uppercase">{hoje}</span>
      </div>

      {/* Grid de cards */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {CARDS.map((card) => {
            const { id, label, Icon, cardBg, textColor, subtextColor, subtitle, chipBg, chipIcon, chipShape, span } = card;
            const badge =
              id === 'avisos' && avisosNaoLidos > 0 ? avisosNaoLidos :
              id === 'frequencia' && aulasPendentesHoje > 0 ? aulasPendentesHoje :
              null;

            return (
              <button
                key={id}
                onClick={() => handleCard(id)}
                className={`
                  relative ${cardBg} rounded-xl border-[3px] border-slate-900
                  shadow-[5px_5px_0_0_#111827] active:shadow-[2px_2px_0_0_#111827]
                  ${span ?? ''}
                  ${span ? 'flex items-center gap-4 px-6 py-5' : 'flex flex-col items-center justify-center aspect-square p-5 gap-3'}
                  active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150
                `}
              >
                {/* Badge */}
                {badge && (
                  <span className="absolute -top-2 -right-2 min-w-[22px] h-6 bg-[#D7263D] text-white text-[11px] font-black rounded-full flex items-center justify-center px-1.5 border-2 border-slate-900">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}

                {/* Ícone — chip circular, cor exclusiva por atalho */}
                <div className={`w-14 h-14 flex items-center justify-center flex-shrink-0 border-2 border-slate-900 ${chipBg} ${CHIP_SHAPE_CLASS[chipShape]}`}>
                  <Icon size={26} className={chipIcon} strokeWidth={2.5} />
                </div>

                {/* Texto */}
                {span ? (
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-black uppercase tracking-wide leading-tight ${textColor}`}>
                      {label}
                    </p>
                    <p className={`text-xs mt-0.5 font-semibold ${subtextColor ?? textColor}`}>
                      {id === 'frequencia' && aulasPendentesHoje > 0
                        ? `${aulasPendentesHoje} turma${aulasPendentesHoje !== 1 ? 's' : ''} sem lançamento hoje`
                        : subtitle}
                    </p>
                  </div>
                ) : (
                  <span className={`text-[11px] font-black uppercase tracking-wide text-center leading-tight ${textColor}`}>
                    {label}
                  </span>
                )}

                {span && (
                  <ChevronRight size={20} strokeWidth={3} className={textColor} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Link painel completo */}
      <div className="flex justify-center pb-6 px-4">
        <button
          onClick={() => navigate(`/professor/${professorSlug}`)}
          className="text-xs font-black uppercase tracking-wide text-slate-900 bg-white border-[3px] border-slate-900 rounded-full px-4 py-2 shadow-[3px_3px_0_0_#111827] active:shadow-[1px_1px_0_0_#111827] active:translate-x-[2px] active:translate-y-[2px] hover:bg-[#FFC738] transition-all"
        >
          Ir para o painel completo
        </button>
      </div>
    </div>
  );
}
