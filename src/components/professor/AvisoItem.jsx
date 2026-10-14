import React from 'react';
import { AlertCircle, FileText, Clock, Cake, Bell, X, Trash2, ArrowRight } from 'lucide-react';

// Avisos do painel do professor — um componente só para o painel do Início e
// para a aba Avisos (antes eram dois visuais diferentes, e a aba Avisos usava
// borda lateral grossa, com "Conteúdo não preenchido" saindo verde por engano).
// Cartão tingido pela cor do aviso; título e texto em tons da mesma cor, não
// cinza (cinza sobre fundo colorido fica lavado e perde contraste).
const CORES = {
  red:    { card: 'bg-red-50 border-red-200',       icon: 'text-red-600',    title: 'text-red-900',    text: 'text-red-800' },
  amber:  { card: 'bg-amber-50 border-amber-200',   icon: 'text-amber-600',  title: 'text-amber-900',  text: 'text-amber-800' },
  orange: { card: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', title: 'text-orange-900', text: 'text-orange-800' },
  blue:   { card: 'bg-blue-50 border-blue-200',     icon: 'text-blue-600',   title: 'text-blue-900',   text: 'text-blue-800' },
};

const ICONES = { frequencia: AlertCircle, conteudo: FileText, pendente: Clock, aniversario: Cake };

export function AvisoItem({ aviso, onDispensar, onRegistrar, compact = false }) {
  const c = CORES[aviso.cor] || CORES.blue;
  const Icone = ICONES[aviso.tipo] || Bell;
  const tam = compact ? 'text-xs' : 'text-sm';
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${compact ? 'p-3' : 'p-4'} ${c.card}`}>
      <Icone size={16} className={`${c.icon} flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`${tam} font-semibold ${c.title}`}>{aviso.titulo}</p>
        <p className={`${tam} mt-0.5 ${c.text}`}>{aviso.texto}</p>
        {aviso.turmaObj && onRegistrar && (
          <button
            type="button"
            onClick={() => onRegistrar(aviso)}
            className={`mt-1.5 inline-flex items-center gap-1 ${tam} font-semibold text-accent hover:underline`}
          >
            Registrar agora <ArrowRight size={12} aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDispensar(aviso.id)}
        aria-label="Dispensar aviso"
        title="Dispensar"
        className={`flex-shrink-0 p-1 rounded-md ${c.icon} hover:bg-white/70 transition-colors`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function LembreteItem({ lembrete, onExcluir, compact = false }) {
  const c = CORES.blue;
  const tam = compact ? 'text-xs' : 'text-sm';
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${compact ? 'p-3' : 'p-4'} ${c.card}`}>
      <Bell size={16} className={`${c.icon} flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`${tam} ${c.title}`}>{lembrete.texto}</p>
        {!compact && lembrete.data && <p className={`text-xs mt-1 ${c.text}`}>{lembrete.data}</p>}
      </div>
      <button
        type="button"
        onClick={() => onExcluir(lembrete.id)}
        aria-label="Excluir lembrete"
        title="Excluir"
        className={`flex-shrink-0 p-1 rounded-md ${c.icon} hover:bg-white/70 hover:text-red-600 transition-colors`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
