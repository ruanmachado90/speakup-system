import { CheckCircle2, AlertCircle, CalendarClock, Ban, RotateCcw } from 'lucide-react';

// Cor por situação da aula na agenda — a mesma da legenda embaixo da grade.
// Compromisso usa o magenta da marca (categoria), para não confundir com aula.
export const ESTILO_STATUS = {
  registrada: { caixa: 'bg-success-bg border-success text-success-fg', icone: CheckCircle2 },
  avulsa: { caixa: 'bg-success-bg border-success text-success-fg border-dashed', icone: RotateCcw },
  pendente: { caixa: 'bg-warning-bg border-warning text-warning-fg', icone: AlertCircle },
  hoje: { caixa: 'bg-info-bg border-accent text-info-fg ring-1 ring-accent', icone: null },
  prevista: { caixa: 'bg-info-bg border-blues-300 text-info-fg', icone: null },
  carregando: { caixa: 'bg-surface-sunken border-gr-200 text-content-muted animate-pulse', icone: null },
  cancelada: { caixa: 'bg-surface-sunken border-gr-300 text-content-muted', icone: Ban },
  'nao-letivo': { caixa: 'bg-surface-sunken border-gr-300 text-content-muted', icone: Ban },
  evento: { caixa: 'bg-[var(--su-pink-100)] border-brand-pink text-[var(--su-pink-700)]', icone: CalendarClock },
};

// Formulários e botões da agenda (diálogos de compromisso e de aula avulsa).
export const campo = 'w-full border border-strong rounded-su-sm px-3 py-2 text-su-sm bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent';
export const rotulo = 'block text-su-xs font-semibold text-content-body mb-1';
export const botaoPrimario = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors duration-fast';
export const botaoSecundario = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-su-sm border border-strong text-content-body text-su-sm font-semibold hover:bg-surface-sunken disabled:opacity-50 transition-colors duration-fast';
