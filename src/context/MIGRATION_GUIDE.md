# 🚀 Refatoração do Context - Guia de Migração

## 📋 O que foi feito

A refatoração dividiu o **AppContext** monolítico em **4 contexts especializados**:

### 1. **UIContext** - Interface do Usuário
- Modal state e helpers (openModal, closeModal)
- Toast notifications
- Navegação de páginas
- Termo de busca

### 2. **FilterContext** - Filtros e Preferências
- Filtros de mês/ano
- Filtros de status
- Filtros de relatórios
- Filtros de despesas
- Categorias de despesas

### 3. **DataContext** - Dados do Firebase
- Autenticação (user)
- Coleções (students, payments, expenses)
- Dados calculados (stats, filteredPayments, etc.)

### 4. **LoadingContext** - Estados de Loading
- Loading geral (saving)
- Loading de pagamentos (paymentSaving)
- Loading de despesas (expenseSaving)
- Helper: isAnyLoading

---

## 🎯 Benefícios da Refatoração

### ✅ Performance Melhorada
- **Menos re-renders**: Componentes só re-renderizam quando seus dados específicos mudam
- **Memoização**: useMemo em todos os values dos contexts
- **Seleção granular**: Hooks especializados evitam consumo de dados desnecessários

### ✅ Organização
- Separação clara de responsabilidades
- Código mais legível e manutenível
- Facilita testes unitários

### ✅ Escalabilidade
- Fácil adicionar novos estados sem afetar outros contexts
- Reduz complexidade de cada context individual

---

## 📖 Como Usar

### Opção 1: Manter código existente (compatibilidade)
```jsx
// Continua funcionando, mas não é otimizado
import { useAppContext } from '../context';

function MyComponent() {
  const { modal, students, saving } = useAppContext();
  // ...
}
```

### Opção 2: Usar contexts específicos (recomendado)
```jsx
import { useUI, useData, useLoading } from '../context';

function MyComponent() {
  const { modal } = useUI();
  const { students } = useData();
  const { saving } = useLoading();
  // Componente só re-renderiza quando esses valores mudam
}
```

### Opção 3: Hooks de seleção otimizados (melhor performance)
```jsx
import { useModal, useStudents, useGeneralLoading } from '../context';

function MyComponent() {
  const { modal, openModal, closeModal } = useModal();
  const students = useStudents();
  const [saving, setSaving] = useGeneralLoading();
  // Máxima otimização - apenas o necessário
}
```

### Opção 4: Hooks combinados (para features completas)
```jsx
import { useStudentManagement } from '../context';

function StudentPage() {
  const {
    students,
    openModal,
    closeModal,
    saving,
    setSaving,
    toastMsg
  } = useStudentManagement();
  // Um hook com tudo necessário para gerenciar estudantes
}
```

---

## 🔄 Guia de Migração por Componente

### Dashboard
```jsx
// Antes
const { stats, dashboardRange, setDashboardRange } = useAppContext();

// Depois (opção otimizada)
const stats = useDashboardStats();
const [dashboardRange, setDashboardRange] = useDashboardRange();
```

### Students Page
```jsx
// Antes
const { students, modal, setModal, saving, setSaving, toastMsg } = useAppContext();

// Depois (opção otimizada)
const {
  students,
  openModal,
  closeModal,
  saving,
  setSaving,
  toastMsg
} = useStudentManagement();
```

### Payments Page
```jsx
// Antes
const { 
  payments, 
  filteredPayments,
  filterMonth, 
  setFilterMonth,
  paymentSaving,
  setPaymentSaving 
} = useAppContext();

// Depois (opção otimizada)
const {
  payments,
  filteredPayments,
  openModal,
  paymentSaving,
  setPaymentSaving,
  toastMsg,
  filterMonth,
  filterYear,
  filterStatus
} = usePaymentManagement();
```

### Expenses Page
```jsx
// Antes
const {
  expenses,
  filteredExpensesData,
  expenseMonth,
  setExpenseMonth,
  expenseSaving
} = useAppContext();

// Depois (opção otimizada)
const {
  expenses,
  filteredExpensesData,
  expenseMonth,
  setExpenseMonth,
  expenseSaving,
  setExpenseSaving,
  toastMsg,
  ...expenseFilters
} = useExpenseManagement();
```

---

## 🛠️ Estrutura de Arquivos

```
src/context/
├── AppContext.jsx          # Context principal (composição)
├── UIContext.jsx           # Estado da UI
├── FilterContext.jsx       # Estados de filtros
├── DataContext.jsx         # Dados do Firebase
├── LoadingContext.jsx      # Estados de loading
├── selectors.js            # Hooks otimizados
└── index.js                # Exports centralizados
```

---

## ⚡ Dicas de Performance

1. **Sempre prefira hooks específicos** ao invés de useAppContext()
2. **Use React.memo** em componentes que consomem contexts
3. **Evite desestruturar muitos valores** se não for usar todos
4. **Use hooks combinados** quando precisar de múltiplos contexts

### Exemplo de otimização com React.memo
```jsx
import React, { memo } from 'react';
import { useStudents } from '../context';

const StudentList = memo(() => {
  const students = useStudents();
  
  return (
    <div>
      {students.map(s => <StudentCard key={s.id} student={s} />)}
    </div>
  );
});

export default StudentList;
```

---

## 🎓 Próximos Passos

1. **Testar a aplicação** para garantir que tudo funciona
2. **Migrar componentes gradualmente** para hooks otimizados
3. **Adicionar React.memo** onde necessário
4. **Monitorar performance** com React DevTools Profiler

---

## ❓ FAQ

**Q: Preciso migrar tudo de uma vez?**
A: Não! O código antigo continua funcionando. Migre gradualmente.

**Q: O que acontece com o useAppContext?**
A: Continua funcionando, mas é menos eficiente. Use para compatibilidade temporária.

**Q: Posso misturar os dois estilos?**
A: Sim! useAppContext e hooks específicos podem coexistir.

**Q: Como sei qual hook usar?**
A: Use hooks específicos (useModal, useStudents) para melhor performance. Use hooks combinados (useStudentManagement) para features completas.
