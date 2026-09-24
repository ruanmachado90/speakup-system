// Página do painel admin ↔ URL. A tela atual antes vivia só num useState:
// F5 voltava pro Dashboard, o "voltar" do navegador saía do sistema e não dava
// pra mandar o link de uma tela. Agora a URL é a fonte da verdade (ver
// UIContext) e `setPage` só navega.
export const ROTAS_ADMIN = {
  dashboard: '/',
  students: '/alunos',
  turmas: '/turmas',
  aulas: '/aulas',
  agenda: '/agenda',
  calendar: '/calendario',
  leads: '/leads',
  vendas: '/vendas',
  finance: '/financeiro',
  expenses: '/despesas',
  professores: '/professores',
  config: '/parametros',
  recados: '/recados',
  ia: '/ia',
};

/** Página correspondente à URL; desconhecida cai no Dashboard. */
export const paginaDaUrl = (pathname) => {
  const limpo = pathname.replace(/\/+$/, '') || '/';
  return Object.keys(ROTAS_ADMIN).find((p) => ROTAS_ADMIN[p] === limpo) || 'dashboard';
};
