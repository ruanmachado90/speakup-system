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
