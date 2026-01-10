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
        .kpi-accent.blue { background: #005DE4; }
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
          color: #005DE4;
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
          border-bottom: 2px solid #005DE4;
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
          background: #005DE4;
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
    const due = p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-';
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

/**
 * Generate and print contract document
 * @param {Object} student - Student data
 * @param {Array} payments - All payments
 */
export const generateContract = (student, payments) => {
  if (!student) return;

  const contratanteName = student.responsibleName || student.name;
  const contratanteCpf = student.responsibleCpf || student.cpf || '-';
  const contratanteContact = student.responsibleContact || student.contact || '-';

  const studentPayments = payments.filter(p => p.studentId === student.id).sort((a,b)=> (a.year - b.year) || (a.installmentNum - b.installmentNum));
  const firstPayment = studentPayments[0];
  const vencimento = firstPayment && firstPayment.dueDate ? new Date(firstPayment.dueDate).getDate() : (student.startDate ? new Date(student.startDate).getDate() : '-');

  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR');

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Contrato - ${student.name}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:28px;color:#0f172a}
        .header{display:flex;justify-content:space-between;align-items:center}
        .logo{width:180px;filter:brightness(0);}
        .box{border:1px solid #e5e7eb;padding:12px;border-radius:6px;margin-bottom:12px}
        h1,h2{margin:0}
        p{margin:6px 0}
        .clause{margin-top:12px}
        .signature{margin-top:36px;display:flex;justify-content:space-between}
        .sigline{width:45%;text-align:center}
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
          <p class="text-xs text-slate-400">Emitido em: ${todayStr}</p>
        </div>
        <div><img class="logo" src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo"></div>
      </div>

      <div class="box">
        <h2 class="font-bold">Quadro Resumo</h2>
        <p><strong>CONTRATANTE:</strong> ${contratanteName} • CPF: ${contratanteCpf} • Contato: ${contratanteContact}</p>
        <p><strong>ALUNO:</strong> ${student.name}</p>
        <p><strong>CURSO / PROFESSOR:</strong> ${student.course || '-'} / ${student.teacher || '-'}</p>
        <p><strong>Mensalidade:</strong> R$ ${Number(student.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} • <strong>Parcelas:</strong> ${student.installments || 12} • <strong>Vencimento:</strong> dia ${vencimento}</p>
        <p><strong>CONTRATADA:</strong> SpeakUp English Language Academy, pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 28.649.636/0001-88, sediada na Praça Governador Valadares, 119, Centro - Cataguases, MG.</p>
      </div>

      <div class="clause">
        <h3>CLÁUSULA 1 – DO OBJETO</h3>
        <p>1.1. O presente contrato tem por objeto a prestação de serviços educacionais de ensino de língua inglesa, pela CONTRATADA, em favor do(a) aluno(a) indicado no Quadro Resumo, conforme o plano pedagógico da escola, calendário letivo e modalidade contratada.</p>
        <p>1.2. As informações específicas do curso (nível, carga horária, modalidade, plano, valor, vencimento e material didático) constam no Quadro Resumo, que é parte integrante deste contrato.</p>

        <h3>CLÁUSULA 2 – DA VIGÊNCIA</h3>
        <p>2.1. O contrato entra em vigor na data de sua assinatura.</p>
        <p>2.2. A vigência será: Por prazo indeterminado, nos planos mensais; ou Até o término do período letivo contratado, nos planos anuais.</p>

        <h3>CLÁUSULA 3 – DA CARGA HORÁRIA E MODALIDADE</h3>
        <p>3.1. A carga horária padrão será definida pela escola de acordo com o plano escolhido pelo aluno.</p>
        <p>3.2. As aulas serão ministradas de acordo com o calendário letivo da escola da CONTRATADA.</p>

        <h3>CLÁUSULA 4 – DO MATERIAL DIDÁTICO</h3>
        <p>4.1. O material didático indicado pela CONTRATADA é obrigatório e não está incluso no valor da mensalidade.</p>
        <p>4.2. O material atualmente adotado é SpeakOut – 3ª Edição, no valor informado no Quadro Resumo, podendo ser parcelado conforme política vigente da escola.</p>

        <h3>CLÁUSULA 5 – DO VALOR E FORMA DE PAGAMENTO</h3>
        <p>5.1. A CONTRATANTE pagará à CONTRATADA o valor da mensalidade ou anuidade descrito no Quadro Resumo.</p>
        <p>5.2. O vencimento ocorrerá no dia informado no Quadro Resumo.</p>
        <p>5.3. Os boletos ou cobranças serão enviados por e-mail e/ou WhatsApp, com antecedência mínima de 5 (cinco) dias.</p>
        <p>5.4. A ausência do(a) aluno(a) às aulas não isenta o pagamento, tendo em vista a disponibilização do serviço.</p>

        <h3>CLÁUSULA 6 – DO ATRASO E INADIMPLÊNCIA</h3>
        <p>6.1. O atraso no pagamento implicará: Multa fixa de R$ 3,00 (três reais); Juros moratórios de 2% (dois por cento) ao mês.</p>
        <p>6.2. O inadimplemento por período igual ou superior a 30 (trinta) dias, após notificação, poderá resultar: Em cobrança judicial; e/ou No registro do débito nos órgãos de proteção ao crédito, nos termos do art. 43 do CDC.</p>

        <h3>CLÁUSULA 7 – DAS OBRIGAÇÕES DA CONTRATADA</h3>
        <p>7.1. São obrigações da CONTRATADA: a) Prestar os serviços educacionais conforme seu planejamento pedagógico; b) Definir, com autonomia, calendário, professores, critérios de avaliação, metodologia e carga horária; c) Emitir certificado ao final do curso, quando aplicável.</p>
        <p>7.2. Reposição de aulas ocorrerá exclusivamente quando o cancelamento for feito pela CONTRATADA.</p>
        <p>7.3. Aulas perdidas pelo(a) aluno(a), por qualquer motivo, inclusive atrasos ou saídas antecipadas, não serão repostas.</p>

        <h3>CLÁUSULA 8 – DAS OBRIGAÇÕES DA CONTRATANTE</h3>
        <p>8.1. São obrigações da CONTRATANTE: a) Efetuar os pagamentos pontualmente; b) Adquirir o material didático indicado; c) Garantir a frequência e o cumprimento das normas internas da escola.</p>

        <h3>CLÁUSULA 9 – DA RESCISÃO CONTRATUAL</h3>
        <p>9.1. Pela CONTRATANTE: a) O contrato poderá ser rescindido mediante aviso prévio de 30 (trinta) dias, por escrito; b) Planos mensais: – Não haverá multa se respeitado o aviso prévio; – Não há reembolso de valores já pagos. c) Planos anuais: – A desistência após o início do curso sujeita a CONTRATANTE à multa de 20% (vinte por cento) sobre o valor das parcelas restantes.</p>
        <p>9.2. Pela CONTRATADA: 9.2.1. A CONTRATADA poderá rescindir o contrato por justa causa, em caso de: Descumprimento contratual; Prática de atos contrários à lei ou ao regimento escolar. 9.2.2. A rescisão não exime a CONTRATANTE do pagamento das parcelas vencidas, incluindo o mês do desligamento.</p>

        <h3>CLÁUSULA 10 – DO DIREITO DE USO DE IMAGEM</h3>
        <p>10.1. A CONTRATANTE autoriza, de forma gratuita, o uso da imagem, voz e trabalhos escolares do(a) aluno(a) para fins institucionais e promocionais da CONTRATADA, em redes sociais, site e materiais informativos, sempre respeitando a legislação vigente e os bons costumes.</p>

        <h3>CLÁUSULA 11 – DAS DISPOSIÇÕES GERAIS</h3>
        <p>11.1. Este contrato é regido pelas leis da República Federativa do Brasil, especialmente o Código de Defesa do Consumidor.</p>
        <p>11.2. Fica eleito o foro da Comarca de Cataguases/MG para dirimir quaisquer controvérsias.</p>

      </div>

      <div class="signature">
        <div class="sigline">
          <p>CONTRATANTE</p>
          <p style="margin-top:56px">_______________________________________</p>
          <p>${contratanteName}</p>
          <p>CPF: ${contratanteCpf}</p>
        </div>

        <div class="sigline">
          <p>CONTRATADA</p>
          <p style="margin-top:56px">_______________________________________</p>
          <p>SpeakUp English Language Academy</p>
          <p>CNPJ: 28.649.636/0001-88</p>
        </div>
      </div>

      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(),200); };</script>
    </body>
  </html>`;

  const w = window.open('', '_blank', 'width=900,height=900');
  w.document.write(html);
  w.document.close();
};
