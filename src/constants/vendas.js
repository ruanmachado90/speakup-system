/**
 * Constantes para o módulo de Vendas
 * Extraído do Vendas.jsx para melhor organização
 */

export const livros = [
  "KIDS Book 1", "KIDS Book 2", "KIDS Book 3", "KIDS Book 4",
  "Teens Book 1", "Teens Book 2", "Teens Book 3", "Teens Book 4", "Teens Book 5", "Teens Book 6",
  "Adults Book 1", "Adults Book 2", "Adults Book 3", "Adults Book 4", "Adults Book 5", "Adults Book 6",
  "Business Book 1", "Business Book 2", "Business Book 3", "Business Book 4", "Business Book 5", "Business Book 6"
];

export const categoriasLivros = [
  { valor: 'KIDS', label: 'KIDS', maxBooks: 4 },
  { valor: 'Teens', label: 'Teens', maxBooks: 6 },
  { valor: 'Adults', label: 'Adults', maxBooks: 6 },
  { valor: 'Business', label: 'Business', maxBooks: 6 }
];

export const gerarNumerosLivros = (categoria) => {
  const categoriaInfo = categoriasLivros.find(c => c.valor === categoria);
  if (!categoriaInfo) return [];
  
  const numeros = [];
  for (let i = 1; i <= categoriaInfo.maxBooks; i++) {
    numeros.push({ valor: i.toString(), label: `Book ${i}` });
  }
  return numeros;
};

export const livroImages = {
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
