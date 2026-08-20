export const PROFESSORES = [
  'Ruan Machado',
  'Bárbara Dias',
  'Fernando Machado',
  'Vera Machado',
  'Bruna Amorim'
];

export const NIVEIS = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1'];

// Catálogo de cursos/livros didáticos — usado para padronizar o nome da turma
// automaticamente (curso + book + dia), em vez de digitar o nome livremente.
export const CURSOS = ['KIDS', 'TEENS', 'GENERAL ENGLISH', 'BUSINESS', 'VIP 1', 'VIP 2', 'REFORÇO ESCOLAR'];
export const BOOKS_POR_CURSO = {
  'KIDS': [1, 2, 3, 4],
  'TEENS': [1, 2, 3, 4, 5, 6],
  'GENERAL ENGLISH': [1, 2, 3, 4, 5, 6],
  'BUSINESS': [1, 2, 3, 4, 5, 6],
  'VIP 1': [1, 2, 3, 4, 5, 6],
  'VIP 2': [1, 2, 3, 4, 5, 6],
  // Reforço não tem progressão de "book" — só uma opção fixa, pra manter o
  // mesmo esquema curso+book usado na geração automática do nome da turma.
  'REFORÇO ESCOLAR': [1],
};

// Nível CEFR correspondente a cada book — usado pra preencher o campo Nível
// automaticamente. KIDS não tem correspondência CEFR definida, então fica de
// fora (o campo continua manual pra esse curso).
export const NIVEL_POR_CURSO_BOOK = {
  'TEENS':           { 1: 'A1', 2: 'A2', 3: 'A2+', 4: 'B1', 5: 'B1+', 6: 'B2' },
  'GENERAL ENGLISH': { 1: 'A1', 2: 'A2', 3: 'A2+', 4: 'B1', 5: 'B2',  6: 'C1' },
  'BUSINESS':        { 1: 'A1', 2: 'A2', 3: 'A2+', 4: 'B1', 5: 'B1+', 6: 'B2' },
};

export const DIAS_DISPONIVEIS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado'
];

export const DEFAULT_MAX_ALUNOS = 15;
export const DEFAULT_TOTAL_AULAS = 40;
