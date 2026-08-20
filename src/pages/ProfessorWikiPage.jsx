import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Compass, GraduationCap, PlayCircle, ExternalLink, FileText, Video } from 'lucide-react';
import { ProfessorPageHeader } from '../components/professor/PageLoading';

// Conteúdo da Central do Professor. Para adicionar um item, inclua um objeto
// { titulo, descricao, url, tipo: 'documento' | 'video' | 'link' } no array
// "itens" da seção correspondente.
const SECOES = [
  {
    id: 'metodologia',
    titulo: 'Metodologia SpeakUp',
    descricao: 'Como conduzir as aulas seguindo o método da escola',
    Icon: Compass,
    itens: [],
  },
  {
    id: 'treinamentos',
    titulo: 'Treinamentos',
    descricao: 'Materiais de capacitação para professores',
    Icon: GraduationCap,
    itens: [],
  },
  {
    id: 'videos',
    titulo: 'Vídeos',
    descricao: 'Aulas modelo e conteúdos em vídeo',
    Icon: PlayCircle,
    itens: [],
  },
];

const TIPO_ICON = { documento: FileText, video: Video, link: ExternalLink };

function ItemLink({ item }) {
  const Icon = TIPO_ICON[item.tipo] ?? ExternalLink;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-[#005DE4]/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-[#005DE4]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{item.titulo}</p>
        {item.descricao && <p className="text-xs text-slate-400 truncate">{item.descricao}</p>}
      </div>
      <ExternalLink size={14} className="text-slate-300 flex-shrink-0" />
    </a>
  );
}

function SecaoCard({ secao }) {
  const { titulo, descricao, Icon, itens } = secao;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-[#FFC738]/30 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-slate-900" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{titulo}</p>
          <p className="text-xs text-slate-400">{descricao}</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400 italic">Conteúdo em breve</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {itens.map((item, idx) => <ItemLink key={idx} item={item} />)}
        </div>
      )}
    </div>
  );
}

export default function ProfessorWikiPage() {
  const navigate = useNavigate();
  const { professorSlug } = useParams();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <ProfessorPageHeader
        onBack={() => navigate(`/professor/${professorSlug}/home`)}
        title="Central do Professor"
        subtitle="Metodologia, treinamentos e vídeos"
        accent="#FFC738"
      />

      <div className="px-3 py-4 space-y-3">
        {SECOES.map(secao => <SecaoCard key={secao.id} secao={secao} />)}
      </div>
    </div>
  );
}
