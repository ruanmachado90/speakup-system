import React from 'react';
import { ChevronLeft } from 'lucide-react';

const LOGO_URL =
  'https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png';

// ── Header padrão das páginas do professor ────────────────────────────────────
// Bloco de cor sólido + círculo decorativo (cor do atalho correspondente na Home)
// + logo, mantendo a mesma linguagem visual da Home em todas as telas internas.
export function ProfessorPageHeader({ onBack, title, subtitle, accent = '#FFC738', rightSlot, children }) {
  return (
    <div className="relative overflow-hidden bg-[#005DE4] px-4 pt-5 pb-4 flex-shrink-0 border-b-[3px] border-slate-900">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none" style={{ backgroundColor: accent }} />

      <div className="relative flex items-center gap-2">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0">
          <ChevronLeft size={24} className="text-white" />
        </button>
        <div className="flex-1 flex justify-center">
          <img src={LOGO_URL} alt="SpeakUp" className="h-6 object-contain" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">{rightSlot}</div>
      </div>

      <div className="relative mt-2">
        <h1 className="text-white text-lg font-black uppercase tracking-wide leading-tight">{title}</h1>
        {subtitle && <p className="text-blue-100 text-xs mt-0.5 font-semibold">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}

// ── Primitivo de skeleton ─────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-slate-200 animate-pulse rounded-xl ${className}`} />
  );
}

// ── Skeleton de card de aula (HistoricoPage) ──────────────────────────────────
export function SkeletonCardAula() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24 rounded-lg" />
          <Skeleton className="h-3 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton de linha de aluno (NotasParciais / TarefasPage / Frequência) ─────
export function SkeletonAluno() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <Skeleton className="w-5 h-3 flex-shrink-0 rounded" />
      <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
      <Skeleton className="flex-1 h-3 rounded-lg" />
      <Skeleton className="w-14 h-7 rounded-xl flex-shrink-0" />
    </div>
  );
}

// ── Skeleton de linha de tabela (RelatorioNotas) ──────────────────────────────
export function SkeletonLinhaNota({ cols = 6 }) {
  return (
    <tr>
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-2 py-3 border-b border-slate-100">
          <Skeleton className="h-3 mx-auto rounded" style={{ width: i === 1 ? '80%' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Página de loading (carregando turmas) ─────────────────────────────────────
export function PageLoading({ titulo }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-gradient-to-r from-[#005DE4] to-[#0041a8] px-4 pt-5 pb-4 flex items-start gap-3">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 bg-white/20 mt-0.5" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-5 bg-white/30 rounded-lg w-40" />
          <Skeleton className="h-3 bg-white/20 rounded-lg w-28" />
        </div>
      </div>
      <div className="px-3 pt-3 space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 bg-white" />
        ))}
        <Skeleton className="h-36 bg-white" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#005DE4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">{titulo || 'Carregando…'}</p>
        </div>
      </div>
    </div>
  );
}

export function SemTurmas({ onVoltar }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
        <div className="text-5xl mb-4">🏫</div>
        <p className="text-slate-700 font-bold text-lg">Nenhuma turma encontrada</p>
        <p className="text-slate-400 text-sm mt-2 leading-snug">
          Você não está cadastrado em nenhuma turma ativa no momento.
        </p>
        {onVoltar && (
          <button
            onClick={onVoltar}
            className="mt-5 px-5 py-2.5 bg-[#005DE4] text-white rounded-xl text-sm font-semibold"
          >
            Voltar ao início
          </button>
        )}
      </div>
    </div>
  );
}
