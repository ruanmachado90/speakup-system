import { useMemo } from 'react';

export const useStats = (students, payments, expenses, dashboardRange) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // Ajustar para 1-12
    const currentYear = now.getFullYear();

    let p = [];
    let e = [];

    if (dashboardRange === 'month') {
      p = payments.filter(x => Number(x.year) === currentYear && Number(x.month) === currentMonth);
      e = expenses.filter(x => Number(x.year) === currentYear && Number(x.month) === currentMonth);
    } else {
      p = payments.filter(x => Number(x.year) === currentYear);
      e = expenses.filter(x => Number(x.year) === currentYear);
    }

    const planned = p.reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
    const paid = p.filter(x => x.status === "Pago").reduce((a, x) => a + Number(x.valuePaid || x.valuePlanned || 0), 0);
    const exp = e.reduce((a, x) => a + Number(x.value || 0), 0);

    const activeStudents = students.filter(s => (s.status || 'ativo') === 'ativo').length;

    const inPeriod = (ts) => {
      if (!ts) return false;
      const d = new Date(Number(ts));
      if (dashboardRange === 'month') {
        // d.getMonth() retorna 0-11, mas currentMonth agora é 1-12
        return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
      }
      return d.getFullYear() === currentYear;
    };

    const registrations = students.filter(s => inPeriod(s.createdAt)).length;
    const cancellations = students.filter(s => (s.status === 'cancelado') && inPeriod(s.createdAt)).length;

    const totalPayments = p.length;
    const overdueCount = p.filter(x => x.status !== 'Pago' && x.dueDate && new Date(x.dueDate) < now).length;
    const inadimplenciaPercent = totalPayments ? Math.round((overdueCount / totalPayments) * 100) : 0;

    return {
      planned,
      paid,
      pending: planned - paid,
      profit: paid - exp,
      students: activeStudents,
      registrations,
      cancellations,
      inadimplenciaPercent
    };
  }, [students, payments, expenses, dashboardRange]);
};

export const useTeacherStats = (students) => {
  return useMemo(() => {
    const grouped = {};
    students.forEach(s => {
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
    const currentMonth = now.getMonth() + 1; // Ajustar para 1-12
    const currentYear = now.getFullYear();

    let filtered = [];
    if (dashboardRange === 'month') {
      filtered = expenses.filter(x => Number(x.year) === currentYear && Number(x.month) === currentMonth);
    } else {
      filtered = expenses.filter(x => Number(x.year) === currentYear);
    }

    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [expenses, dashboardRange]);
};

export const useMonthlyData = (payments, expenses) => {
  return useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({length: 12}, (_, i) => i);
    const labels = months.map(i => new Date(0, i).toLocaleString('pt-BR', {month: 'short'}));

    // Parcelas são salvas com month 1-12, então ajustamos com m + 1
    const planned = months.map(m => payments
      .filter(x => Number(x.year) === currentYear && Number(x.month) === (m + 1))
      .reduce((a, x) => a + Number(x.valuePlanned || 0), 0)
    );

    const paid = months.map(m => payments
      .filter(x => Number(x.year) === currentYear && Number(x.month) === (m + 1) && x.status === 'Pago')
      .reduce((a, x) => a + Number(x.valuePaid || x.valuePlanned || 0), 0)
    );

    const expensesByMonth = months.map(m => expenses
      .filter(x => Number(x.year) === currentYear && Number(x.month) === (m + 1))
      .reduce((a, x) => a + Number(x.value || 0), 0)
    );

    const profit = paid.map((p, i) => p - expensesByMonth[i]);

    return { labels, planned, paid, profit };
  }, [payments, expenses]);
};

export const useFinanceStats = (payments, filterMonth, filterYear) => {
  return useMemo(() => {
    // filterMonth vem como 0-11, mas parcelas são salvas como 1-12
    const filtered = payments.filter(x => Number(x.year) === filterYear && Number(x.month) === (filterMonth + 1));
    const planned = filtered.reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
    const paid = filtered.filter(x => x.status === 'Pago').reduce((a, x) => a + Number(x.valuePaid || x.valuePlanned || 0), 0);
    const pending = filtered.filter(x => x.status !== 'Pago').reduce((a, x) => a + Number(x.valuePlanned || 0), 0);
    const overdue = filtered.filter(x => x.status !== 'Pago' && x.dueDate && new Date(x.dueDate) < new Date()).reduce((a, x) => a + Number(x.valuePlanned || 0), 0);

    return { planned, paid, pending, overdue };
  }, [payments, filterMonth, filterYear]);
};

export const useFilteredPayments = (payments, filterMonth, filterYear, filterStatus) => {
  return useMemo(() => {
    // filterMonth vem como 0-11, mas parcelas são salvas como 1-12
    let filtered = payments.filter(x => Number(x.year) === filterYear && Number(x.month) === (filterMonth + 1));

    if (filterStatus === 'pagos') {
      filtered = filtered.filter(x => x.status === 'Pago');
    } else if (filterStatus === 'pendentes') {
      filtered = filtered.filter(x => x.status !== 'Pago');
    } else if (filterStatus === 'atrasados') {
      filtered = filtered.filter(x => x.status !== 'Pago' && x.dueDate && new Date(x.dueDate) < new Date());
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
