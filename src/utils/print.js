import { formatDate } from './formatters';

/**
 * Print dashboard with all stats and charts
 * @param {Object} params - Dashboard data
 */
export const printDashboard = ({
  dashboardRange,
  stats,
  monthlyData,
  teacherStats,
  filteredExpenses
}) => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - SpeakUp</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 180px;
          height: auto;
          filter: brightness(0) saturate(100%);
        }
        .title {
          font-size: 18px;
          color: #333;
          margin-bottom: 10px;
        }
        .date {
          font-size: 12px;
          color: #999;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          display: flex;
          overflow: hidden;
        }
        .kpi-accent {
          width: 6px;
          flex-shrink: 0;
        }
        .kpi-accent.blue { background: #0e48fe; }
        .kpi-accent.green { background: #10b981; }
        .kpi-accent.yellow { background: #f59e0b; }
        .kpi-accent.red { background: #ef4444; }
        .kpi-content {
          padding: 20px;
          flex: 1;
        }
        .kpi-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: bold;
          color: #0e48fe;
        }
        .kpi-value.positive {
          color: #10b981;
        }
        .kpi-value.warn {
          color: #f59e0b;
        }
        .kpi-value.danger {
          color: #ef4444;
        }
        .kpi-unit {
          font-size: 12px;
          color: #999;
          margin-left: 4px;
        }
        .section {
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #0e48fe;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        thead {
          background-color: #f8fafc;
        }
        th {
          padding: 12px;
          text-align: left;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
        }
        td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        tbody tr:hover {
          background-color: #f8fafc;
        }
        .teacher-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #0e48fe;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 12px;
          font-weight: bold;
        }
        .chart-placeholder {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 20px;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
          .kpi-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .kpi-content {
            padding: 15px;
          }
          .kpi-value {
            font-size: 24px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo"><img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo SpeakUp"></div>
        <div class="title">Dashboard - Visão ${dashboardRange === 'month' ? 'Mensal' : 'Anual'}</div>
        <div class="date">${new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-accent blue"></div>
          <div class="kpi-content">
            <div class="kpi-label">Receita Prevista</div>
            <div class="kpi-value">R$ ${Number(stats.planned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-accent green"></div>
          <div class="kpi-content">
            <div class="kpi-label">Receita Recebida</div>
            <div class="kpi-value positive">R$ ${Number(stats.paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-accent yellow"></div>
          <div class="kpi-content">
            <div class="kpi-label">Pendências</div>
            <div class="kpi-value warn">R$ ${Number(stats.pending || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-label">Lucro</div>
            <div class="kpi-value positive">R$ ${Number(stats.profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-accent blue"></div>
          <div class="kpi-content">
            <div class="kpi-label">Alunos Ativos</div>
            <div class="kpi-value">${stats.students || 0}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-accent green"></div>
          <div class="kpi-content">
            <div class="kpi-label">Matrículas</div>
            <div class="kpi-value">${stats.registrations || 0}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-accent red"></div>
          <div class="kpi-content">
            <div class="kpi-label">Cancelamentos</div>
            <div class="kpi-value">${stats.cancellations || 0}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-label">Inadimplência</div>
            <div class="kpi-value warn">${stats.inadimplenciaPercent || 0}%</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Evolução Mensal</div>
        <div class="chart-placeholder">
          <strong>Receita Prevista vs Realizada (Últimos ${monthlyData.labels.length} meses)</strong>
          <table style="margin-top: 20px;">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Previsto</th>
                <th>Realizado</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.labels.map((label, i) => `
                <tr>
                  <td><strong>${label}</strong></td>
                  <td>R$ ${Number(monthlyData.planned[i] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>R$ ${Number(monthlyData.paid[i] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style="color: ${(monthlyData.paid[i] - monthlyData.planned[i]) >= 0 ? '#10b981' : '#ef4444'}">
                    R$ ${Number((monthlyData.paid[i] || 0) - (monthlyData.planned[i] || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Evolução do Lucro</div>
        <div class="chart-placeholder">
          <strong>Lucro Mensal (Últimos ${monthlyData.labels.length} meses)</strong>
          <table style="margin-top: 20px;">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.labels.map((label, i) => `
                <tr>
                  <td><strong>${label}</strong></td>
                  <td style="color: ${monthlyData.profit[i] >= 0 ? '#10b981' : '#ef4444'}">
                    R$ ${Number(monthlyData.profit[i] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Alunos por Professor</div>
        <table>
          <thead>
            <tr>
              <th>Professor</th>
              <th>Quantidade de Alunos</th>
              <th>Mensalidade Total</th>
            </tr>
          </thead>
          <tbody>
            ${teacherStats.map(item => `
              <tr>
                <td><strong>${item.teacher}</strong></td>
                <td><span class="teacher-count">${item.count}</span></td>
                <td><strong>R$ ${Number(item.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Despesas do ${dashboardRange === 'month' ? 'Mês' : 'Ano'}</div>
        ${filteredExpenses.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(x => `
                <tr>
                  <td><strong>${x.description}</strong></td>
                  <td>${x.category}</td>
                  <td>${x.date ? new Date(x.date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td><strong>R$ ${Number(x.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              `).join('')}
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="3" style="text-align: right;">TOTAL:</td>
                <td>R$ ${filteredExpenses.reduce((sum, x) => sum + Number(x.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        ` : '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhuma despesa registrada</p>'}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Print student registration card (ficha)
 * @param {Object} student - Student data
 * @param {Array} payments - All payments
 */
export const printFicha = (student, payments) => {
  if (!student) return;

  const studentPayments = payments
    .filter(p => p.studentId === student.id)
    .sort((a,b)=> (a.year - b.year) || (a.installmentNum - b.installmentNum));

  const rows = studentPayments.map(p => {
    const due = p.dueDate ? formatDate(p.dueDate) : '-';
    const val = `R$ ${Number(p.valuePlanned||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    const valPaid = p.valuePaid ? `R$ ${Number(p.valuePaid).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '-';
    return `
      <tr>
        <td style="padding:6px;border:1px solid #e5e7eb">${p.installmentNum}</td>
        <td style="padding:6px;border:1px solid #e5e7eb">${due}</td>
        <td style="padding:6px;border:1px solid #e5e7eb">${val}</td>
        <td style="padding:6px;border:1px solid #e5e7eb">${valPaid}</td>
        <td style="padding:6px;border:1px solid #e5e7eb">${p.status}</td>
        <td style="padding:6px;border:1px solid #e5e7eb">${p.month}/${p.year}</td>
      </tr>`;
  }).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ficha - ${student.name}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#0f172a}
          .box{border:1px solid #e5e7eb;padding:12px;border-radius:8px;margin-bottom:12px}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          th,td{padding:8px;border:1px solid #e5e7eb;text-align:left}
          .logo{width:160px;filter:brightness(0);}
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1;margin-right:16px">
            <h1 style="margin:0 0 8px 0">Ficha de Matrícula</h1>
            <div class="box">
              <p style="margin:4px 0"><strong>Nome:</strong> ${student.name}</p>
              <p style="margin:4px 0"><strong>CPF:</strong> ${student.cpf || '-'}</p>
              <p style="margin:4px 0"><strong>Contato:</strong> ${student.contact || '-'}</p>
              <p style="margin:4px 0"><strong>Curso:</strong> ${student.course || '-'}</p>
              <p style="margin:4px 0"><strong>Professor:</strong> ${student.teacher || '-'}</p>
              <p style="margin:4px 0"><strong>Mensalidade:</strong> R$ ${Number(student.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
              <p style="margin:4px 0"><strong>Parcelas:</strong> ${student.installments || 12}</p>
              <p style="margin:4px 0"><strong>Data de início:</strong> ${student.startDate || '-'}</p>
            </div>
          </div>
          <div style="width:200px;text-align:center">
            <img class="logo" src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo">
          </div>
        </div>

        <h2 style="margin-top:16px;margin-bottom:8px">Histórico de Pagamentos</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Vencimento</th>
              <th>Valor Previsto</th>
              <th>Valor Pago</th>
              <th>Status</th>
              <th>Mês/Ano</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <script>
          window.onload = function(){ window.print(); setTimeout(()=>window.close(), 200); };
        </script>
      </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
};
