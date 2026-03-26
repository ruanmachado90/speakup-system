import { formatCurrency, formatDate } from './formatters';

/**
 * Export expenses to CSV
 * @param {Array} expenses - Array of expense objects
 * @param {string} filename - Filename for the export
 */
export const exportToCSV = (expenses, filename = 'despesas') => {
  if (!expenses || expenses.length === 0) {
    alert('Nenhuma despesa para exportar');
    return;
  }

  // CSV Headers
  const headers = ['Descrição', 'Categoria', 'Data', 'Valor', 'Forma de Pagamento'];
  
  // CSV Rows
  const rows = expenses.map(expense => [
    expense.description || '',
    expense.category || '',
    formatDate(expense.date),
    expense.value || 0,
    expense.paymentMethod || 'Não especificado'
  ]);

  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export expenses to Excel-compatible HTML format
 * @param {Array} expenses - Array of expense objects
 * @param {string} filename - Filename for the export
 */
export const exportToExcel = (expenses, filename = 'despesas') => {
  if (!expenses || expenses.length === 0) {
    alert('Nenhuma despesa para exportar');
    return;
  }

  // Calculate total
  const total = expenses.reduce((sum, exp) => sum + Number(exp.value || 0), 0);

  // Create HTML table
  let html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #005DE4; color: white; font-weight: bold; }
          .total { background-color: #f0f0f0; font-weight: bold; }
          .currency { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Relatório de Despesas</h2>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Forma de Pagamento</th>
            </tr>
          </thead>
          <tbody>
  `;

  expenses.forEach(expense => {
    html += `
      <tr>
        <td>${expense.description || ''}</td>
        <td>${expense.category || ''}</td>
        <td>${formatDate(expense.date)}</td>
        <td class="currency">${formatCurrency(expense.value)}</td>
        <td>${expense.paymentMethod || 'Não especificado'}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">TOTAL</td>
              <td class="currency">${formatCurrency(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Print expenses report
 * @param {Array} expenses - Array of expense objects
 * @param {string} period - Period description
 */
export const printExpenses = (expenses, period = '') => {
  if (!expenses || expenses.length === 0) {
    alert('Nenhuma despesa para imprimir');
    return;
  }

  // Calculate total
  const total = expenses.reduce((sum, exp) => sum + Number(exp.value || 0), 0);

  // Create print window
  const printWindow = window.open('', '_blank');
  
  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório de Despesas</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            font-size: 12px;
          }
          h2 { color: #005DE4; margin-bottom: 5px; }
          .period { color: #666; margin-bottom: 20px; }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background-color: #005DE4; 
            color: white; 
            font-weight: bold; 
          }
          .total { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            font-size: 14px;
          }
          .currency { text-align: right; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>Relatório de Despesas</h2>
        <p class="period">${period ? period : ''} - Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Forma de Pagamento</th>
            </tr>
          </thead>
          <tbody>
  `;

  expenses.forEach(expense => {
    html += `
      <tr>
        <td>${expense.description || ''}</td>
        <td>${expense.category || ''}</td>
        <td>${formatDate(expense.date)}</td>
        <td class="currency">${formatCurrency(expense.value)}</td>
        <td>${expense.paymentMethod || 'Não especificado'}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">TOTAL</td>
              <td class="currency">${formatCurrency(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <button onclick="window.print()">Imprimir</button>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Export payments to CSV
 * @param {Array} payments - Array of payment objects
 * @param {Array} students - Array of student objects (for name lookup)
 * @param {string} filename - Filename for the export
 */
export const exportPaymentsToCSV = (payments, students, filename = 'financeiro') => {
  if (!payments || payments.length === 0) {
    alert('Nenhuma cobrança para exportar');
    return;
  }

  // CSV Headers
  const headers = ['Aluno', 'Responsável', 'Valor Planejado', 'Valor Pago', 'Data Vencimento', 'Data Pagamento', 'Status', 'Forma de Pagamento', 'Banco'];
  
  // Helper to get student info
  const getStudentInfo = (payment) => {
    const student = students.find(s => s.id === payment.studentId);
    return {
      name: payment.studentName || student?.name || '-',
      responsible: student?.responsibleName || '-'
    };
  };

  // CSV Rows
  const rows = payments.map(payment => {
    const { name, responsible } = getStudentInfo(payment);
    return [
      name,
      responsible,
      payment.valuePlanned || 0,
      payment.valuePaid || '',
      formatDate(payment.dueDate),
      payment.paymentDate ? formatDate(payment.paymentDate) : '',
      payment.status || 'Pendente',
      payment.paymentMethod || '',
      payment.bank || ''
    ];
  });

  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export payments to Excel-compatible HTML format
 * @param {Array} payments - Array of payment objects
 * @param {Array} students - Array of student objects (for name lookup)
 * @param {string} filename - Filename for the export
 */
export const exportPaymentsToExcel = (payments, students, filename = 'financeiro') => {
  if (!payments || payments.length === 0) {
    alert('Nenhuma cobrança para exportar');
    return;
  }

  // Helper to get student info
  const getStudentInfo = (payment) => {
    const student = students.find(s => s.id === payment.studentId);
    return {
      name: payment.studentName || student?.name || '-',
      responsible: student?.responsibleName || '-'
    };
  };

  // Calculate totals
  const totalPlanned = payments.reduce((sum, p) => sum + Number(p.valuePlanned || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'Pago').reduce((sum, p) => sum + Number(p.valuePaid || p.valuePlanned || 0), 0);
  const paidCount = payments.filter(p => p.status === 'Pago').length;
  const pendingCount = payments.filter(p => p.status !== 'Pago').length;

  // Create HTML table
  let html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #005DE4; color: white; font-weight: bold; }
          .summary { background-color: #e8f4fd; font-weight: bold; margin-bottom: 20px; }
          .total { background-color: #f0f0f0; font-weight: bold; }
          .currency { text-align: right; }
          .status-pago { background-color: #d4edda; }
          .status-pendente { background-color: #fff3cd; }
          .status-vencido { background-color: #f8d7da; }
        </style>
      </head>
      <body>
        <h2>Relatório Financeiro - SpeakUp</h2>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <table class="summary">
          <tr>
            <th>Total Previsto</th>
            <th>Total Recebido</th>
            <th>Cobranças Pagas</th>
            <th>Cobranças Pendentes</th>
          </tr>
          <tr>
            <td class="currency">${formatCurrency(totalPlanned)}</td>
            <td class="currency">${formatCurrency(totalPaid)}</td>
            <td>${paidCount}</td>
            <td>${pendingCount}</td>
          </tr>
        </table>
        
        <br>
        
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Responsável</th>
              <th>Valor Planejado</th>
              <th>Valor Pago</th>
              <th>Data Vencimento</th>
              <th>Data Pagamento</th>
              <th>Status</th>
              <th>Forma de Pagamento</th>
              <th>Banco</th>
            </tr>
          </thead>
          <tbody>
  `;

  const today = new Date().setHours(0, 0, 0, 0);
  
  payments.forEach(payment => {
    const { name, responsible } = getStudentInfo(payment);
    const isOverdue = payment.status !== 'Pago' && payment.dueDate && 
      new Date(payment.dueDate).setHours(0, 0, 0, 0) < today;
    
    let statusClass = 'status-pendente';
    if (payment.status === 'Pago') {
      statusClass = 'status-pago';
    } else if (isOverdue) {
      statusClass = 'status-vencido';
    }
    
    html += `
      <tr class="${statusClass}">
        <td>${name}</td>
        <td>${responsible}</td>
        <td class="currency">${formatCurrency(Number(payment.valuePlanned || 0))}</td>
        <td class="currency">${payment.valuePaid ? formatCurrency(Number(payment.valuePaid)) : ''}</td>
        <td>${formatDate(payment.dueDate)}</td>
        <td>${payment.paymentDate ? formatDate(payment.paymentDate) : ''}</td>
        <td>${payment.status || 'Pendente'}</td>
        <td>${payment.paymentMethod || ''}</td>
        <td>${payment.bank || ''}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="2">TOTAL</td>
              <td class="currency">${formatCurrency(totalPlanned)}</td>
              <td class="currency">${formatCurrency(totalPaid)}</td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Print payments report
 * @param {Array} payments - Array of payment objects
 * @param {Array} students - Array of student objects (for name lookup)
 * @param {string} period - Period description
 */
export const printPayments = (payments, students, period = '') => {
  if (!payments || payments.length === 0) {
    alert('Nenhuma cobrança para imprimir');
    return;
  }

  // Helper to get student info
  const getStudentInfo = (payment) => {
    const student = students.find(s => s.id === payment.studentId);
    return {
      name: payment.studentName || student?.name || '-',
      responsible: student?.responsibleName || '-'
    };
  };

  // Calculate totals
  const totalPlanned = payments.reduce((sum, p) => sum + Number(p.valuePlanned || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'Pago').reduce((sum, p) => sum + Number(p.valuePaid || p.valuePlanned || 0), 0);
  const paidCount = payments.filter(p => p.status === 'Pago').length;
  const pendingCount = payments.filter(p => p.status !== 'Pago').length;

  // Create print window
  const printWindow = window.open('', '_blank');
  
  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório Financeiro - SpeakUp</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            font-size: 12px;
          }
          h2 { color: #005DE4; margin-bottom: 5px; }
          .period { color: #666; margin-bottom: 20px; }
          .summary {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .summary-item {
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-left: 4px solid #005DE4;
          }
          .summary-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
          }
          .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
            font-size: 11px;
          }
          th { 
            background-color: #005DE4; 
            color: white; 
            font-weight: bold; 
          }
          .total { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            font-size: 12px;
          }
          .currency { text-align: right; }
          .status-pago { background-color: #d4edda; }
          .status-pendente { background-color: #fff3cd; }
          .status-vencido { background-color: #f8d7da; }
          @media print {
            button { display: none; }
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        <h2>Relatório Financeiro - SpeakUp</h2>
        <p class="period">${period ? period : ''} - Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Previsto</div>
            <div class="summary-value">${formatCurrency(totalPlanned)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Recebido</div>
            <div class="summary-value">${formatCurrency(totalPaid)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Cobranças Pagas</div>
            <div class="summary-value">${paidCount}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Cobranças Pendentes</div>
            <div class="summary-value">${pendingCount}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Responsável</th>
              <th>Valor Planejado</th>
              <th>Valor Pago</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th>Status</th>
              <th>Forma Pgto</th>
              <th>Banco</th>
            </tr>
          </thead>
          <tbody>
  `;

  const today = new Date().setHours(0, 0, 0, 0);

  payments.forEach(payment => {
    const { name, responsible } = getStudentInfo(payment);
    const isOverdue = payment.status !== 'Pago' && payment.dueDate && 
      new Date(payment.dueDate).setHours(0, 0, 0, 0) < today;
    
    let statusClass = 'status-pendente';
    if (payment.status === 'Pago') {
      statusClass = 'status-pago';
    } else if (isOverdue) {
      statusClass = 'status-vencido';
    }
    
    html += `
      <tr class="${statusClass}">
        <td>${name}</td>
        <td>${responsible}</td>
        <td class="currency">${formatCurrency(Number(payment.valuePlanned || 0))}</td>
        <td class="currency">${payment.valuePaid ? formatCurrency(Number(payment.valuePaid)) : ''}</td>
        <td>${formatDate(payment.dueDate)}</td>
        <td>${payment.paymentDate ? formatDate(payment.paymentDate) : ''}</td>
        <td>${payment.status || 'Pendente'}</td>
        <td>${payment.paymentMethod || ''}</td>
        <td>${payment.bank || ''}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="2">TOTAL</td>
              <td class="currency">${formatCurrency(totalPlanned)}</td>
              <td class="currency">${formatCurrency(totalPaid)}</td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
        <button onclick="window.print()" style="padding: 10px 20px; background: #005DE4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Imprimir</button>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
