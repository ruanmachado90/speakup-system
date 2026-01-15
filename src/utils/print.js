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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding: 20px 32px; color: #0f172a; font-size: 9px; line-height: 1.3; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .logo { width: 120px; filter: brightness(0); }
        h1 { font-size: 14px; margin-bottom: 3px; }
        .emissao { font-size: 7px; color: #94a3b8; }
        .box { border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; margin-bottom: 10px; background: #f8fafc; }
        .box h2 { font-size: 11px; margin-bottom: 4px; }
        .box p { margin: 2px 0; font-size: 8.5px; }
        .box strong { font-weight: 600; }
        .clauses { margin-top: 8px; }
        .clauses p { margin: 3px 0 3px 0; text-align: justify; }
        h3 { font-size: 10px; margin-top: 8px; margin-bottom: 3px; font-weight: bold; }
        .signature { margin-top: 24px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sigline { width: 45%; text-align: center; font-size: 8px; }
        .sigline .line { border-top: 1px solid #000; margin-top: 32px; padding-top: 3px; }
        @media print {
          body { padding: 15px 25px; }
          .signature { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
          <p class="emissao">Emitido em: ${todayStr}</p>
        </div>
        <div><img class="logo" src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo"></div>
      </div>

      <div class="box">
        <h2>Quadro Resumo</h2>
        <p><strong>CONTRATANTE:</strong> ${contratanteName} • CPF: ${contratanteCpf} • Contato: ${contratanteContact}</p>
        <p><strong>ALUNO:</strong> ${student.name}</p>
        <p><strong>CURSO / PROFESSOR:</strong> ${student.course || '-'} / ${student.teacher || '-'}</p>
        <p><strong>Mensalidade:</strong> R$ ${Number(student.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} • <strong>Parcelas:</strong> ${student.installments || 12} • <strong>Vencimento:</strong> dia ${vencimento}</p>
        <p><strong>CONTRATADA:</strong> SpeakUp English Language Academy, pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 28.649.636/0001-88, sediada na Praça Governador Valadares, 119, Centro - Cataguases, MG.</p>
      </div>

      <div class="clauses">
        <p>As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Educacionais, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.</p>

        <h3>CLÁUSULA PRIMEIRA - OBJETO DO CONTRATO E SUA VIGÊNCIA</h3>
        <p>1.1. O presente contrato tem por objeto a prestação de serviços educacionais de ensino da Língua Inglesa pela CONTRATADA ao ALUNO, conforme o plano pedagógico e calendário da escola.</p>
        <p>1.2. A CONTRATADA reserva-se o direito de substituir professores ao longo do curso por razões pedagógicas, administrativas ou de força maior, visando sempre a continuidade do serviço e a manutenção da qualidade de ensino, não havendo vinculação obrigatória do ALUNO a um docente específico.</p>
        <p>1.3. O contrato entra em vigor na data de sua assinatura.</p>
        <p>1.4. A vigência será até o término do ano letivo contratado. Podendo ser renovado automaticamente.</p>

        <h3>CLÁUSULA SEGUNDA - OBRIGAÇÕES DA CONTRATADA</h3>
        <p>2.1. São obrigações da CONTRATADA: a) Prestar os serviços educacionais conforme seu planejamento pedagógico; b) Definir, com autonomia, calendário, professores, critérios de avaliação, metodologia e carga horária; c) Emitir certificado ao final do curso, quando aplicável.</p>

        <h3>CLÁUSULA TERCEIRA - PAGAMENTO</h3>
        <p>3.1. O CONTRATANTE realizará o pagamento das mensalidades via PIX, boleto ou cartão até a data de vencimento estipulada no item II.</p>
        <p>3.2. O não recebimento de notificações ou boletos via canais digitais não isenta o CONTRATANTE do pagamento pontual.</p>
        <p>3.3. Reajuste: Caso o contrato seja renovado ou se estenda por período superior a 12 (doze) meses, o valor da mensalidade será reajustado anualmente pela variação positiva do IPCA (IBGE), ou outro índice oficial que venha a substituí-lo.</p>

        <h3>CLÁUSULA QUARTA - MORA</h3>
        <p>4.1. Em caso de atraso, incidirá sobre o valor da parcela multa moratória de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso (pro rata die).</p>
        <p>4.2. O atraso superior a 30 dias autoriza a CONTRATADA a realizar a cobrança via órgãos de proteção ao crédito (SPC/SERASA), após notificação prévia escrita.</p>

        <h3>CLÁUSULA QUINTA - MATERIAL DIDÁTICO</h3>
        <p>5.1. O material didático é indispensável para o aproveitamento pedagógico e não está incluso no valor das mensalidades, devendo ser adquirido separadamente. Uma vez entregue ao ALUNO ou acessado em plataforma digital, não haverá reembolso dos valores pagos pelo material em caso de desistência do curso.</p>
        <p>5.2. É expressamente proibida a utilização de cópias reprográficas (xerox) ou materiais piratas nas dependências da escola ou ambientes virtuais, sob pena de violação de direitos autorais e desligamento imediato.</p>

        <h3>CLÁUSULA SEXTA - REPOSIÇÕES E FALTAS</h3>
        <p>6.1. Faltas, atrasos ou saídas antecipadas por iniciativa do ALUNO não dão direito a desconto, reembolso ou reposição de aula.</p>
        <p>6.2. A reposição de aulas ocorrerá exclusivamente quando o cancelamento da aula for de iniciativa da CONTRATADA.</p>
        <p>6.3. No caso de aulas online, problemas técnicos decorrentes da conexão de internet do aluno não serão passíveis de reposição.</p>

        <h3>CLÁUSULA SÉTIMA - DA RESCISÃO</h3>
        <p>7.1. No Plano Mensal: A rescisão pode ocorrer a qualquer tempo, mediante aviso prévio por escrito (ou canal oficial de atendimento) com antecedência mínima de 30 (trinta) dias.</p>
        <p>7.2. No Plano Anual: Por se tratar de um plano com reserva de vaga e custos operacionais provisionados para o período letivo, a rescisão antecipada pelo CONTRATANTE implicará no pagamento de multa de 10% (10 por cento) sobre o valor total das parcelas restantes do contrato.</p>
        <p>7.3. Em caso de rescisão, não haverá reembolso de parcelas já pagas ou de aulas já ministradas. O mês em curso será cobrado integralmente.</p>

        <h3>CLÁUSULA OITAVA - USO DE IMAGEM E DADOS PESSOAIS (LGPD)</h3>
        <p>8.1. Autorização de uso de imagem e voz: O CONTRATANTE autoriza expressamente a CONTRATADA a utilizar, de forma gratuita, a imagem e a voz do ALUNO para fins exclusivamente pedagógicos e de divulgação institucional, incluindo redes sociais, site oficial e materiais impressos da escola.</p>
        <p>8.2. ALUNOS MENORES DE IDADE: Caso o ALUNO seja menor de 18 (dezoito) anos, a autorização prevista no item 8.1 é concedida, neste ato, por seu responsável legal (CONTRATANTE), em estrita observância ao Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), garantindo-se que o uso da imagem não seja vexatório nem exponha o menor a situações inadequadas.</p>
        <p>8.3. Proteção de Dados (LGPD): A CONTRATADA declara que realiza o tratamento de dados pessoais do CONTRATANTE e do ALUNO em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), limitando-se ao estritamente necessário para a execução deste contrato, emissão de notas fiscais e cumprimento de obrigações legais.</p>
        <p>8.4. Revogação: O consentimento para o uso de imagem poderá ser revogado a qualquer tempo pelo CONTRATANTE, mediante solicitação formal por escrito, sem que isso gere qualquer ônus ou rescisão das demais obrigações contratuais.</p>
        <p>8.5. A CONTRATADA compromete-se a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), para fins de execução deste contrato e obrigações fiscais.</p>

        <h3>CLÁUSULA NONA – FORO</h3>
        <p>9.1. Fica eleito o foro da Comarca de Cataguases/MG para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro por mais privilegiado que seja.</p>
        
        <p style="margin-top:10px;">Cataguases/MG, ________ de ____________________ de 20________.</p>
      </div>

      <div class="signature">
        <div class="sigline">
          <p><strong>CONTRATANTE</strong></p>
          <div class="line">${contratanteName}<br>CPF: ${contratanteCpf}</div>
        </div>

        <div class="sigline">
          <p><strong>CONTRATADA</strong></p>
          <div class="line">SPEAKUP ENGLISH LANGUAGE ACADEMY<br>CNPJ: 28.649.636/0001-88</div>
        </div>
      </div>

      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(),200); };</script>
    </body>
  </html>`;

  const w = window.open('', '_blank', 'width=900,height=900');
  w.document.write(html);
  w.document.close();
};

/**
 * Print payment receipt
 * @param {Object} payment - Payment data
 * @param {Object} student - Student data
 */
export const printReceipt = (payment, student) => {
  if (!payment || !student) return;

  const today = new Date();
  const todayStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const valorPago = Number(payment.valuePaid || 0);
  const valorExtenso = numeroParaExtenso(valorPago);
  
  // Determinar período de referência (mês/ano da mensalidade)
  const mesReferencia = payment.month || (payment.dueDate ? new Date(payment.dueDate).getMonth() + 1 : new Date().getMonth() + 1);
  const anoReferencia = payment.year || (payment.dueDate ? new Date(payment.dueDate).getFullYear() : new Date().getFullYear());
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const periodoReferencia = `${meses[mesReferencia - 1]}/${anoReferencia}`;
  
  // Data do pagamento
  const dataPagamento = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : todayStr;
  
  // Método de pagamento
  const metodoPagamento = payment.paymentMethod || 'Não especificado';
  
  // Número do recibo (ID ou data)
  const numeroRecibo = payment.id || Date.now();

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Recibo - ${student.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #005DE4; padding-bottom: 20px; }
        .logo { width: 180px; margin-bottom: 15px; filter: brightness(0); }
        h1 { font-size: 28px; color: #005DE4; margin-bottom: 8px; }
        .numero-recibo { font-size: 12px; color: #64748b; margin-top: 5px; }
        .empresa-info { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 30px; line-height: 1.6; }
        .valor-box { background: linear-gradient(135deg, #005DE4 0%, #003d99 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 4px 6px rgba(0,93,228,0.2); }
        .valor-box .label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
        .valor-box .valor { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
        .valor-box .extenso { font-size: 13px; opacity: 0.95; font-style: italic; }
        .info-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #005DE4; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { font-weight: 600; color: #475569; }
        .info-value { color: #1e293b; }
        .periodo-destaque { background: #fff; padding: 15px; border-radius: 6px; border: 2px dashed #005DE4; margin: 20px 0; text-align: center; }
        .periodo-destaque .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .periodo-destaque .valor { font-size: 20px; font-weight: bold; color: #005DE4; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; }
        .assinatura { margin-top: 50px; text-align: center; }
        .assinatura .linha { border-top: 1px solid #000; width: 300px; margin: 0 auto 8px; padding-top: 5px; }
        @media print {
          body { padding: 20px; }
          .valor-box { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img class="logo" src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="SpeakUp Logo">
        <h1>RECIBO DE PAGAMENTO</h1>
        <div class="numero-recibo">Recibo Nº ${numeroRecibo}</div>
      </div>

      <div class="empresa-info">
        <strong>SPEAKUP ENGLISH LANGUAGE ACADEMY</strong><br>
        CNPJ: 28.649.636/0001-88<br>
        Praça Governador Valadares, 119 - Centro - Cataguases/MG
      </div>

      <div class="valor-box">
        <div class="label">VALOR RECEBIDO</div>
        <div class="valor">R$ ${valorPago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        <div class="extenso">(${valorExtenso})</div>
      </div>

      <div class="periodo-destaque">
        <div class="label">Período de Referência</div>
        <div class="valor">${periodoReferencia}</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Aluno(a):</span>
          <span class="info-value">${student.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Responsável:</span>
          <span class="info-value">${student.responsibleName || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">CPF:</span>
          <span class="info-value">${student.responsibleCpf || student.cpf || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Curso:</span>
          <span class="info-value">${student.course || '-'}</span>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Data do Pagamento:</span>
          <span class="info-value">${dataPagamento}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Forma de Pagamento:</span>
          <span class="info-value">${metodoPagamento}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Parcela:</span>
          <span class="info-value">${payment.installmentNum || '-'} de ${student.installments || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Referente a:</span>
          <span class="info-value">Mensalidade do curso de Inglês - ${periodoReferencia}</span>
        </div>
      </div>

      <div class="footer">
        Declaro ter recebido o valor acima especificado referente à mensalidade do curso de Inglês<br>
        do(a) aluno(a) mencionado, correspondente ao período de <strong>${periodoReferencia}</strong>.<br>
        Este documento é válido como comprovante de pagamento.
      </div>

      <div class="assinatura">
        <div class="linha">SpeakUp English Language Academy</div>
        <div style="font-size: 11px; color: #64748b;">Cataguases/MG, ${todayStr}</div>
      </div>

      <script>
        window.onload = function(){ window.print(); setTimeout(()=>window.close(), 200); };
      </script>
    </body>
  </html>`;

  const w = window.open('', '_blank', 'width=850,height=900');
  w.document.write(html);
  w.document.close();
};

// Função auxiliar para converter número em extenso
function numeroParaExtenso(numero) {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (numero === 0) return 'zero reais';
  
  const partes = numero.toFixed(2).split('.');
  const reais = parseInt(partes[0]);
  const centavos = parseInt(partes[1]);

  let extenso = '';

  // Milhares
  if (reais >= 1000) {
    const mil = Math.floor(reais / 1000);
    if (mil === 1) extenso += 'mil';
    else extenso += converterCentena(mil) + ' mil';
    
    const resto = reais % 1000;
    if (resto > 0) {
      if (resto < 100) extenso += ' e ';
      else extenso += ' ';
      extenso += converterCentena(resto);
    }
  } else {
    extenso = converterCentena(reais);
  }

  extenso += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    extenso += ' e ' + converterCentena(centavos);
    extenso += centavos === 1 ? ' centavo' : ' centavos';
  }

  return extenso;

  function converterCentena(num) {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    
    let resultado = '';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (c > 0) resultado += centenas[c];
    
    if (d === 1) {
      if (resultado) resultado += ' e ';
      resultado += especiais[u];
    } else {
      if (d > 0) {
        if (resultado) resultado += ' e ';
        resultado += dezenas[d];
      }
      if (u > 0) {
        if (resultado && d > 0) resultado += ' e ';
        else if (resultado) resultado += ' e ';
        resultado += unidades[u];
      }
    }

    return resultado;
  }
}
