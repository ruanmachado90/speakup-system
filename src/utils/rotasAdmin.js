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
  renovacao: '/renovacao',
};

/** Título de cada página no topo do painel (antes uma lista de condicionais no App.jsx). */
export const TITULOS_ADMIN = {
  dashboard: 'Painel de controle',
  students: 'Gestão de alunos',
  leads: 'Leads',
  finance: 'Financeiro',
  expenses: 'Despesas',
  ia: 'IA Gerencial',
  calendar: 'Calendário',
  turmas: 'Turmas',
  agenda: 'Agenda',
  vendas: 'Vendas',
  recados: 'Recados',
  professores: 'Professores',
  config: 'Parâmetros de negócio',
  aulas: 'Registro de Aulas',
  renovacao: 'Renovação de matrícula',
};

// Páginas com sub-rota: /agenda/:professorId abre a página do professor.
const COM_SUBROTA = ['agenda'];

/** Página correspondente à URL; desconhecida cai no Dashboard. */
export const paginaDaUrl = (pathname) => {
  const limpo = pathname.replace(/\/+$/, '') || '/';
  return Object.keys(ROTAS_ADMIN).find((p) => ROTAS_ADMIN[p] === limpo)
    || COM_SUBROTA.find((p) => limpo.startsWith(`${ROTAS_ADMIN[p]}/`))
    || 'dashboard';
};
