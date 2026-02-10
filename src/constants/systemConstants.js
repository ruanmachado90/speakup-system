// Constantes centralizadas para o sistema
export const BOOK_CATEGORIES = [
  { value: 'KIDS', label: 'KIDS', maxBooks: 4 },
  { value: 'Teens', label: 'Teens', maxBooks: 6 },
  { value: 'Adults', label: 'Adults', maxBooks: 6 },
  { value: 'Business', label: 'Business', maxBooks: 6 }
];

export const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Transferência Bancária'
];

export const SALE_TYPES = [
  'Material Didático',
  'Mensalidade',
  'Taxa de Matrícula',
  'Outros'
];

export const SALE_STATUS = {
  PENDING: 'pendente',
  PAID: 'pago',
  OVERDUE: 'vencido',
  CANCELED: 'cancelado'
};

export const BOOK_IMAGES = {
  // KIDS Books
  "KIDS Book 1": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-1.png.png",
  "KIDS Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-2.png.png",
  "KIDS Book 3": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-3.png.png",
  "KIDS Book 4": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-4.png.png",
  
  // Teens Books
  "Teens Book 1": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-STUDENTS-BOOK-1.png",
  "Teens Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-BOOK-2.png", 
  "Teens Book 3": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-STUDENTS-BOOK-3.png",
  "Teens Book 4": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/TEENS-STUDENTS-BOOK-4.png",
  "Teens Book 5": "https://via.placeholder.com/80x100?text=Teen+5",
  "Teens Book 6": "https://via.placeholder.com/80x100?text=Teen+6",
  
  // Adults Books
  "Adults Book 1": "https://via.placeholder.com/80x100?text=Adult+1",
  "Adults Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/adults-book-2.png.png",
  "Adults Book 3": "https://via.placeholder.com/80x100?text=Adult+3",
  "Adults Book 4": "https://via.placeholder.com/80x100?text=Adult+4",
  "Adults Book 5": "https://via.placeholder.com/80x100?text=Adult+5",
  "Adults Book 6": "https://via.placeholder.com/80x100?text=Adult+6",
  
  // Business Books
  "Business Book 1": "https://via.placeholder.com/80x100?text=Biz+1",
  "Business Book 2": "https://via.placeholder.com/80x100?text=Biz+2",
  "Business Book 3": "https://via.placeholder.com/80x100?text=Biz+3",
  "Business Book 4": "https://via.placeholder.com/80x100?text=Biz+4",
  "Business Book 5": "https://via.placeholder.com/80x100?text=Biz+5",
  "Business Book 6": "https://via.placeholder.com/80x100?text=Biz+6"
};

export const DEFAULT_VALUES = {
  MIN_STOCK: 5,
  CURRENCY: 'BRL',
  LOCALE: 'pt-BR',
  DEFAULT_INSTALLMENTS: '1/1'
};

export const VALIDATION_RULES = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 9999,
  MIN_STOCK: 1,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100
};

// Função utilitária para gerar lista de livros
export const generateBooksList = () => {
  return BOOK_CATEGORIES.flatMap(category => 
    Array.from({ length: category.maxBooks }, (_, i) => 
      `${category.value} Book ${i + 1}`
    )
  );
};

// Função para gerar números de livros por categoria
export const generateBookNumbers = (category) => {
  const categoryInfo = BOOK_CATEGORIES.find(c => c.value === category);
  if (!categoryInfo) return [];
  
  return Array.from({ length: categoryInfo.maxBooks }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Book ${i + 1}`
  }));
};