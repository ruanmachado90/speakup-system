import { useMemo } from 'react';
import { paraData } from '../utils/reportKPIs';
import { ehOperacional } from '../utils/despesasAnalise';

/**
 * Data da despesa em horário LOCAL. `new Date(x.date)` lê o ISO como UTC e,
 * em UTC-3, joga a despesa do dia 1º para o mês anterior. `paraData` é a mesma
 * leitura que o relatório mensal usa, então as duas telas batem.
 */
const dataDespesa = (x) => paraData(x.date);

const despesaNoPeriodo = (x, range, mes, ano) => {
  const d = dataDespesa(x);
  if (!d || d.getFullYear() !== ano) return false;
  return range === 'year' || d.getMonth() === mes;
};

/**
 * Hook otimizado de estatísticas com loops consolidados
 * Reduz múltiplos filter().reduce() para um único loop
 */
export const useStats = (students = [], payments = [], expenses = [], dashboardRange) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // ============================================
    // PROCESSAMENTO DE PAGAMENTOS (1 ÚNICO LOOP)
    // ============================================
    const paymentStats = {
      planned: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalCount: 0,
      overdueCount: 0,
      overduePayments: [],
    };

    payments.forEach(payment => {
      if (!payment.dueDate) return;
      if (payment.status === 'cancelada') return; // parcela cancelada não é cobrança

      const dueDate = new Date(payment.dueDate);
      const isInPeriod = dashboardRange === 'month'
        ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
        : dueDate.getFullYear() === currentYear;

      if (!isInPeriod) return;

      const plannedValue = Number(payment.valuePlanned || 0);
      const isPaid = payment.status === "Pago";
      // "Pago" liquida a parcela inteira mesmo em registros legados sem valuePaid.
      const paidValue = isPaid
        ? Number(payment.valuePaid || payment.valuePlanned || 0)
        : Number(payment.valuePaid || 0);

      paymentStats.totalCount++;
      paymentStats.planned += plannedValue;
      paymentStats.paid += paidValue;

      // Inadimplência/pendência em R$: saldo devedor da parcela (previsto − pago),
      // nunca contagem de parcelas. Pagamentos parciais reduzem o saldo.
      const saldo = isPaid ? 0 : plannedValue - paidValue;
      if (saldo > 0.005) {
        const isOverdue = dueDate < now;
        if (isOverdue) {
          paymentStats.overdue += saldo;
          paymentStats.overdueCount++;
          paymentStats.overduePayments.push(payment);
        } else {
          paymentStats.pending += saldo;
        }
      }
    });

    // ============================================
    // PROCESSAMENTO DE DESPESAS (1 ÚNICO LOOP)
    // ============================================
    // `totalExpenses` é toda saída de caixa do período (é o que a tela de
    // Despesas chama de "Saídas"). `custoOperacional` exclui retirada de sócio
    // e investimento, que não são custo do negócio — mesma regra de
    // lucroOperacionalDoMes no relatório mensal. Misturar os dois fazia o lucro
    // do dashboard divergir do lucro do relatório no mesmo mês.
    let totalExpenses = 0;
    let custoOperacional = 0;

    expenses.forEach(expense => {
      if (!despesaNoPeriodo(expense, dashboardRange, currentMonth, currentYear)) return;
      const valor = Number(expense.value || 0);
      totalExpenses += valor;
      if (ehOperacional(expense)) custoOperacional += valor;
    });

    // ============================================
    // PROCESSAMENTO DE ALUNOS (1 ÚNICO LOOP)
    // ============================================
    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      return dashboardRange === 'month'
        ? d.getFullYear() === currentYear && d.getMonth() === currentMonth
        : d.getFullYear() === currentYear;
    };

    const studentStats = {
      active: 0,
      registrations: 0,
      cancellations: 0,
    };

    students.forEach(student => {
      const status = student.status || 'ativo';
      
      if (status === 'ativo') {
        studentStats.active++;
      }
      
      // Contar matrículas: criados no período
      if (inPeriod(student.createdAt)) {
        studentStats.registrations++;
      }
      
      // Contar cancelamentos: cancelados no período
      if (status === 'cancelado' && inPeriod(student.canceledAt)) {
        studentStats.cancellations++;
      }
    });

    // Inadimplência = % do valor previsto (R$) que está vencido e não recebido —
    // não o percentual de parcelas em atraso.
    const inadimplenciaPercent = paymentStats.planned > 0
      ? Math.round((paymentStats.overdue / paymentStats.planned) * 100)
      : 0;

    return {
      planned: paymentStats.planned,
      paid: paymentStats.paid,
      pending: paymentStats.pending,
      overdue: paymentStats.overdue,
      overdueCount: paymentStats.overdueCount,
      overduePayments: paymentStats.overduePayments,
      expenses: totalExpenses,
      custoOperacional,
      profit: paymentStats.paid - custoOperacional,
      students: studentStats.active,
      registrations: studentStats.registrations,
      cancellations: studentStats.cancellations,
      inadimplenciaPercent
    };
  }, [students, payments, expenses, dashboardRange]);
};

export const useTeacherStats = (students, payments, dashboardRange, professores = []) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Criar Map de alunos ativos para lookup rápido
    const activeStudentsMap = new Map();
    students.forEach(s => {
      const status = s.status || 'ativo';
      if (status === 'ativo') {
        activeStudentsMap.set(s.id, s);
      }
    });

    // Nome canônico por professorId — evita que grafias antigas do texto
    // livre (ex: "VERA" vs "Vera Machado") sejam contadas como professores
    // diferentes na receita/estatísticas.
    const nomePorProfessorId = new Map(professores.map(p => [p.id, p.nome]));

    // Agrupar pagamentos por professor (por professorId quando disponível,
    // com fallback pro texto livre pra alunos ainda não migrados).
    const grouped = {};

    payments.forEach(payment => {
      if (!payment.dueDate || !payment.studentId) return;
      if (payment.status === 'cancelada') return;

      const dueDate = new Date(payment.dueDate);
      const isInPeriod = dashboardRange === 'month'
        ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
        : dueDate.getFullYear() === currentYear;

      if (!isInPeriod) return;

      // Buscar aluno e verificar se está ativo
      const student = activeStudentsMap.get(payment.studentId);
      if (!student) return; // Ignorar pagamentos de alunos inativos

      const chave = student.professorId || student.teacher || 'Sem professor';
      const nomeExibido = (student.professorId && nomePorProfessorId.get(student.professorId))
        || student.teacher || 'Sem professor';
      if (!grouped[chave]) {
        grouped[chave] = { nome: nomeExibido, students: new Set(), revenue: 0 };
      }

      grouped[chave].students.add(payment.studentId);
      grouped[chave].revenue += Number(payment.valuePlanned || 0);
    });

    return Object.values(grouped)
      .map(data => ({
        teacher: data.nome,
        count: data.students.size,
        revenue: data.revenue
      }))
      .sort((a, b) => b.count - a.count);
  }, [students, payments, dashboardRange, professores]);
};

export const useFilteredExpenses = (expenses, dashboardRange) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    const filtered = expenses.filter(x => despesaNoPeriodo(x, dashboardRange, currentMonth, currentYear));

    return filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Mais recente primeiro
    });
  }, [expenses, dashboardRange]);
};

export const useMonthlyData = (payments, expenses) => {
  return useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({length: 12}, (_, i) => i);
    const labels = months.map(i => new Date(0, i).toLocaleString('pt-BR', {month: 'short'}));

    // Filtrar pagamentos por mês/ano usando a data de vencimento real (dueDate)
    const planned = months.map(m => payments
      .filter(x => {
        if (!x.dueDate || x.status === 'cancelada') return false;
        const dueDate = new Date(x.dueDate);
        return dueDate.getFullYear() === currentYear && dueDate.getMonth() === m;
      })
      .reduce((a, x) => a + Number(x.valuePlanned || 0), 0)
    );

    const paid = months.map(m => payments
      .filter(x => {
        if (!x.dueDate || x.status !== 'Pago') return false;
        const dueDate = new Date(x.dueDate);
        return dueDate.getFullYear() === currentYear && dueDate.getMonth() === m;
      })
      .reduce((a, x) => a + Number(x.valuePaid || x.valuePlanned || 0), 0)
    );

    // Lucro mensal segue a mesma regra do relatório: só operacional e imposto.
    const expensesByMonth = months.map(m => expenses
      .filter(x => despesaNoPeriodo(x, 'month', m, currentYear) && ehOperacional(x))
      .reduce((a, x) => a + Number(x.value || 0), 0)
    );

    const profit = paid.map((p, i) => p - expensesByMonth[i]);

    return { labels, planned, paid, profit };
  }, [payments, expenses]);
};

export const useFinanceStats = (payments, filterMonth, filterYear) => {
  return useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Comparar apenas a data, não o horário
    
    // Filtrar por mês/ano usando a data de vencimento real (dueDate)
    const filtered = payments.filter(x => {
      if (!x.dueDate || x.status === 'cancelada') return false;
      const dueDate = new Date(x.dueDate);
      return dueDate.getFullYear() === filterYear && dueDate.getMonth() === filterMonth;
    });

    const planned = filtered.reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
    
    // Cada cobrança só entra em um grupo, considerando pagamentos parciais:
    let paid = 0, pending = 0, overdue = 0;
    filtered.forEach(x => {
      const plannedValue = Number(x.valuePlanned || 0);
      const paidValue = Number(x.valuePaid || 0);
      paid += paidValue;
      const saldo = plannedValue - paidValue;
      if (saldo > 0 && x.dueDate) {
        const dueDate = new Date(x.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate >= now) {
          pending += saldo;
        } else {
          overdue += saldo;
        }
      }
      // Cobranças sem dueDate e não pagas não entram em nenhum grupo
    });
    return { planned, paid, pending, overdue };
  }, [payments, filterMonth, filterYear]);
};

export const useFilteredPayments = (payments, filterMonth, filterYear, filterStatus) => {
  return useMemo(() => {
    // Filtrar por mês/ano usando a data de vencimento real (dueDate)
    let filtered = payments.filter(x => {
      if (!x.dueDate || x.status === 'cancelada') return false;
      const dueDate = new Date(x.dueDate);
      return dueDate.getFullYear() === filterYear && dueDate.getMonth() === filterMonth;
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Comparar apenas a data, não o horário
    
    if (filterStatus === 'pagos') {
      filtered = filtered.filter(x => x.status === 'Pago');
    } else if (filterStatus === 'pendentes') {
      filtered = filtered.filter(x => {
        if (x.status === 'Pago') return false;
        if (!x.dueDate) return true;
        const dueDate = new Date(x.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= now;
      });
    } else if (filterStatus === 'atrasados') {
      filtered = filtered.filter(x => {
        if (x.status === 'Pago') return false;
        if (!x.dueDate) return false;
        const dueDate = new Date(x.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      });
    }

    return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [payments, filterMonth, filterYear, filterStatus]);
};

export const useFilteredExpensesData = (expenses, expenseView, expenseMonth, expenseYear) => {
  return useMemo(() => {
    return expenses.filter(x => despesaNoPeriodo(x, expenseView, expenseMonth, expenseYear));
  }, [expenses, expenseView, expenseMonth, expenseYear]);
};

export const useExpenseEvolutionData = (expenses, expenseYear) => {
  return useMemo(() => {
    const months = Array.from({length: 12}, (_, i) => i);
    const labels = months.map(i => new Date(0, i).toLocaleString('pt-BR', {month: 'short'}));
    
    const values = months.map(m => expenses
      .filter(x => despesaNoPeriodo(x, 'month', m, expenseYear))
      .reduce((sum, x) => sum + Number(x.value || 0), 0)
    );

    return { labels, values };
  }, [expenses, expenseYear]);
};
