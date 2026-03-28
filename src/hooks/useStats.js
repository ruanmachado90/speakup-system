import { useMemo } from 'react';

/**
 * Hook otimizado de estatísticas com loops consolidados
 * Reduz múltiplos filter().reduce() para um único loop
 */
export const useStats = (students, payments, expenses, dashboardRange) => {
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
    };

    payments.forEach(payment => {
      if (!payment.dueDate) return;
      
      const dueDate = new Date(payment.dueDate);
      const isInPeriod = dashboardRange === 'month'
        ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
        : dueDate.getFullYear() === currentYear;
      
      if (!isInPeriod) return;
      
      // Incrementa contadores
      paymentStats.totalCount++;
      paymentStats.planned += Number(payment.valuePlanned || 0);
      
      const isPaid = payment.status === "Pago";
      const isOverdue = new Date(payment.dueDate) < now;
      
      if (isPaid) {
        paymentStats.paid += Number(payment.valuePaid || payment.valuePlanned || 0);
      } else if (isOverdue) {
        paymentStats.overdue += Number(payment.valuePlanned || 0);
        paymentStats.overdueCount++;
      } else {
        paymentStats.pending += Number(payment.valuePlanned || 0);
      }
    });

    // ============================================
    // PROCESSAMENTO DE DESPESAS (1 ÚNICO LOOP)
    // ============================================
    let totalExpenses = 0;
    
    expenses.forEach(expense => {
      if (!expense.date) return;
      
      const expDate = new Date(expense.date);
      const isInPeriod = dashboardRange === 'month'
        ? expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth
        : expDate.getFullYear() === currentYear;
      
      if (isInPeriod) {
        totalExpenses += Number(expense.value || 0);
      }
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

    const inadimplenciaPercent = paymentStats.totalCount 
      ? Math.round((paymentStats.overdueCount / paymentStats.totalCount) * 100) 
      : 0;

    return {
      planned: paymentStats.planned,
      paid: paymentStats.paid,
      pending: paymentStats.pending,
      overdue: paymentStats.overdue,
      profit: paymentStats.paid - totalExpenses,
      students: studentStats.active,
      registrations: studentStats.registrations,
      cancellations: studentStats.cancellations,
      inadimplenciaPercent
    };
  }, [students, payments, expenses, dashboardRange]);
};

export const useTeacherStats = (students) => {
  return useMemo(() => {
    const grouped = {};
    students.forEach(s => {
      // Contar apenas alunos ativos
      const status = s.status || 'ativo';
      if (status !== 'ativo') return;
      
      const teacher = s.teacher || 'Sem professor';
      if (!grouped[teacher]) {
        grouped[teacher] = { count: 0, revenue: 0 };
      }
      grouped[teacher].count++;
      grouped[teacher].revenue += Number(s.fee || 0);
    });
    return Object.entries(grouped)
      .map(([teacher, data]) => ({ teacher, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count);
  }, [students]);
};

export const useFilteredExpenses = (expenses, dashboardRange) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    let filtered = [];
    if (dashboardRange === 'month') {
      // Filtrar por date (campo correto das despesas)
      filtered = expenses.filter(x => {
        if (!x.date) return false;
        const expenseDate = new Date(x.date);
        return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === currentMonth;
      });
    } else {
      // Filtrar apenas por ano
      filtered = expenses.filter(x => {
        if (!x.date) return false;
        return new Date(x.date).getFullYear() === currentYear;
      });
    }

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
        if (!x.dueDate) return false;
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

    const expensesByMonth = months.map(m => expenses
      .filter(x => {
        if (!x.date) return false;
        const d = new Date(x.date);
        return d.getFullYear() === currentYear && d.getMonth() === m;
      })
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
      if (!x.dueDate) return false;
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
      if (!x.dueDate) return false;
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
    if (expenseView === 'month') {
      return expenses.filter(x => {
        if (!x.date) return false;
        const d = new Date(x.date);
        return d.getFullYear() === expenseYear && d.getMonth() === expenseMonth;
      });
    }
    return expenses.filter(x => {
      if (!x.date) return false;
      return new Date(x.date).getFullYear() === expenseYear;
    });
  }, [expenses, expenseView, expenseMonth, expenseYear]);
};

export const useExpenseEvolutionData = (expenses, expenseYear) => {
  return useMemo(() => {
    const months = Array.from({length: 12}, (_, i) => i);
    const labels = months.map(i => new Date(0, i).toLocaleString('pt-BR', {month: 'short'}));
    
    const values = months.map(m => {
      return expenses
        .filter(x => {
          if (!x.date) return false;
          const d = new Date(x.date);
          return d.getFullYear() === expenseYear && d.getMonth() === m;
        })
        .reduce((sum, x) => sum + Number(x.value || 0), 0);
    });

    return { labels, values };
  }, [expenses, expenseYear]);
};
