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
  const paidPayments = payments.filter(p => p.status === 'Pago');
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.valuePaid || p.valuePlanned || 0), 0);
  const paidCount = paidPayments.length;
  const pendingCount = payments.filter(p => p.status !== 'Pago').length;

  // Calculate totals by payment method
  const paymentMethodTotals = {};
  paidPayments.forEach(payment => {
    const method = payment.paymentMethod || 'Não especificado';
    const value = Number(payment.valuePaid || payment.valuePlanned || 0);
    paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + value;
  });

  // Calculate totals by bank
  const bankTotals = {};
  paidPayments.forEach(payment => {
    if (payment.bank) {
      const value = Number(payment.valuePaid || payment.valuePlanned || 0);
      bankTotals[payment.bank] = (bankTotals[payment.bank] || 0) + value;
    }
  });

  // Create print window
  const printWindow = window.open('', '_blank');
  
  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório Financeiro - SpeakUp</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 8px;
            line-height: 1.2;
            color: #333;
          }
          
          .container {
            max-width: 100%;
            padding: 8px;
          }
          
          .header {
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #005DE4;
          }
          
          h2 { 
            color: #005DE4; 
            font-size: 14px;
            margin-bottom: 2px;
          }
          
          .period { 
            color: #666; 
            font-size: 7px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 8px;
          }
          
          .summary-box {
            background: #f8f9fa;
            padding: 4px 6px;
            border-left: 2px solid #005DE4;
          }
          
          .summary-label {
            font-size: 7px;
            color: #666;
            text-transform: uppercase;
          }
          
          .summary-value {
            font-size: 10px;
            font-weight: 700;
            color: #005DE4;
            margin-top: 2px;
          }
          
          .analytics-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
          }
          
          .analytics-box {
            background: #fff;
            border: 1px solid #ddd;
            padding: 6px;
          }
          
          .analytics-title {
            font-size: 8px;
            font-weight: 700;
            color: #005DE4;
            margin-bottom: 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid #eee;
          }
          
          .analytics-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 7px;
            border-bottom: 1px dotted #eee;
          }
          
          .analytics-item:last-child {
            border-bottom: none;
            font-weight: 700;
            background: #f8f9fa;
            padding: 3px 4px;
            margin-top: 2px;
          }
          
          table { 
            border-collapse: collapse; 
            width: 100%;
            font-size: 7px;
            margin-bottom: 8px;
          }
          
          th, td { 
            border: 1px solid #ddd; 
            padding: 2px 4px;
            text-align: left;
          }
          
          th { 
            background-color: #005DE4; 
            color: white; 
            font-weight: 600;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          td {
            font-size: 7px;
          }
          
          .total-row { 
            background-color: #f0f0f0; 
            font-weight: 700;
          }
          
          .currency { 
            text-align: right;
            font-family: 'Courier New', monospace;
          }
          
          .status-pago { background-color: #d4edda; }
          .status-pendente { background-color: #fff3cd; }
          .status-vencido { background-color: #f8d7da; }
          
          .col-aluno { max-width: 80px; }
          .col-resp { max-width: 80px; }
          .col-valor { width: 50px; }
          .col-data { width: 50px; }
          .col-status { width: 40px; }
          .col-forma { width: 45px; }
          .col-banco { width: 40px; }
          
          button {
            padding: 8px 16px;
            background: #005DE4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 600;
          }
          
          @media print {
            button { display: none; }
            body { padding: 0; }
            .container { padding: 4px; }
            
            @page {
              margin: 0.5cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Relatório Financeiro - SpeakUp English School</h2>
            <p class="period">${period ? period : ''} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="summary-grid">
            <div class="summary-box">
              <div class="summary-label">Total Previsto</div>
              <div class="summary-value">${formatCurrency(totalPlanned)}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Total Recebido</div>
              <div class="summary-value">${formatCurrency(totalPaid)}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Cobranças Pagas</div>
              <div class="summary-value">${paidCount}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Cobranças Pendentes</div>
              <div class="summary-value">${pendingCount}</div>
            </div>
          </div>
          
          <div class="analytics-section">
            <div class="analytics-box">
              <div class="analytics-title">Recebimentos por Forma de Pagamento</div>
  `;

  // Add payment method breakdown
  Object.entries(paymentMethodTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, total]) => {
      html += `
              <div class="analytics-item">
                <span>${method}</span>
                <span class="currency">${formatCurrency(total)}</span>
              </div>
      `;
    });

  html += `
              <div class="analytics-item">
                <span>TOTAL</span>
                <span class="currency">${formatCurrency(totalPaid)}</span>
              </div>
            </div>
            
            <div class="analytics-box">
              <div class="analytics-title">Recebimentos por Banco</div>
  `;

  // Add bank breakdown
  if (Object.keys(bankTotals).length > 0) {
    Object.entries(bankTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([bank, total]) => {
        html += `
              <div class="analytics-item">
                <span>${bank}</span>
                <span class="currency">${formatCurrency(total)}</span>
              </div>
        `;
      });
    
    html += `
              <div class="analytics-item">
                <span>TOTAL</span>
                <span class="currency">${formatCurrency(totalPaid)}</span>
              </div>
    `;
  } else {
    html += `
              <div class="analytics-item">
                <span style="color: #999;">Sem dados de banco</span>
                <span></span>
              </div>
    `;
  }

  html += `
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="col-aluno">Aluno</th>
                <th class="col-resp">Responsável</th>
                <th class="col-valor">Previsto</th>
                <th class="col-valor">Pago</th>
                <th class="col-data">Venc.</th>
                <th class="col-data">Pgto</th>
                <th class="col-status">Status</th>
                <th class="col-forma">Forma</th>
                <th class="col-banco">Banco</th>
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
    let statusText = payment.status || 'Pendente';
    
    if (payment.status === 'Pago') {
      statusClass = 'status-pago';
    } else if (isOverdue) {
      statusClass = 'status-vencido';
      statusText = 'VENCIDO';
    }
    
    html += `
      <tr class="${statusClass}">
        <td class="col-aluno">${name}</td>
        <td class="col-resp">${responsible}</td>
        <td class="col-valor currency">${formatCurrency(Number(payment.valuePlanned || 0))}</td>
        <td class="col-valor currency">${payment.valuePaid ? formatCurrency(Number(payment.valuePaid)) : '-'}</td>
        <td class="col-data">${formatDate(payment.dueDate)}</td>
        <td class="col-data">${payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</td>
        <td class="col-status">${statusText}</td>
        <td class="col-forma">${payment.paymentMethod || '-'}</td>
        <td class="col-banco">${payment.bank || '-'}</td>
      </tr>
    `;
  });

  html += `
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2">TOTAL</td>
                <td class="currency">${formatCurrency(totalPlanned)}</td>
                <td class="currency">${formatCurrency(totalPaid)}</td>
                <td colspan="5"></td>
              </tr>
            </tfoot>
          </table>
          
          <button onclick="window.print()">🖨️ Imprimir Relatório</button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
