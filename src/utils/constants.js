export const BRAND_COLOR = "#0e48fe";
export const APP_ID = "speakup-manager";

/**
 * Categorias oferecidas numa despesa nova.
 *
 * 'Professores' e 'Equipe administrativa' substituem o antigo 'Salários': a
 * métrica que mais importa numa escola de idiomas é a folha DOCENTE sobre a
 * receita (30–40%), e ela não existia enquanto professor e secretaria caíam na
 * mesma categoria.
 */
export const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Professores',
  'Equipe administrativa',
  'Materiais',
  'Serviços',
  'Marketing',
  'Transporte',
  'Tecnologia'
];

/**
 * Categorias de lançamentos antigos. Continuam válidas em edição, filtro e
 * relatório — só não são oferecidas em despesa nova, para a folha ir sendo
 * reclassificada. Ver o aviso em components/despesas/EstruturaCustos.jsx.
 */
export const EXPENSE_CATEGORIES_LEGADO = ['Salários'];

export const EXPENSE_CATEGORIES_TODAS = [...EXPENSE_CATEGORIES, ...EXPENSE_CATEGORIES_LEGADO];

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const PAYMENT_STATUSES = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Atrasado'
};

export const STUDENT_STATUSES = {
  ACTIVE: 'ativo',
  CANCELLED: 'cancelado'
};
