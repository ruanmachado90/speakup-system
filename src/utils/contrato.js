/**
 * Contrato de prestação de serviços educacionais em PDF, com papel timbrado
 * SpeakUp. Substitui o download em .html da página de assinatura.
 *
 * O texto das cláusulas é jurídico e reproduzido literalmente — não alterar
 * sem revisão. jsPDF é carregado sob demanda.
 */

import {
  BRAND, EMPRESA, MARGIN, PAGE_W, PAGE_H, CONTENT_W,
  hex, nomeArquivo, carregarLogo, desenharCabecalho, desenharRodapePagina,
} from './timbre';

const MM_PER_PT = 0.352778;

const PREAMBULO =
  'As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Educacionais, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.';

const CLAUSULAS = [
  {
    titulo: 'CLÁUSULA PRIMEIRA — OBJETO DO CONTRATO E SUA VIGÊNCIA',
    itens: [
      '1.1. O presente contrato tem por objeto a prestação de serviços educacionais de ensino da Língua Inglesa pela CONTRATADA ao ALUNO, conforme o plano pedagógico e calendário da escola.',
      '1.2. A CONTRATADA reserva-se o direito de substituir professores ao longo do curso por razões pedagógicas, administrativas ou de força maior, visando sempre a continuidade do serviço e a manutenção da qualidade de ensino, não havendo vinculação obrigatória do ALUNO a um docente específico.',
      '1.3. O contrato entra em vigor na data de sua assinatura.',
      '1.4. A vigência será até o término do ano letivo contratado. Podendo ser renovado automaticamente.',
    ],
  },
  {
    titulo: 'CLÁUSULA SEGUNDA — OBRIGAÇÕES DA CONTRATADA',
    itens: [
      '2.1. São obrigações da CONTRATADA: a) Prestar os serviços educacionais conforme seu planejamento pedagógico; b) Definir, com autonomia, calendário, professores, critérios de avaliação, metodologia e carga horária; c) Emitir certificado ao final do curso, quando aplicável.',
    ],
  },
  {
    titulo: 'CLÁUSULA TERCEIRA — PAGAMENTO',
    itens: [
      '3.1. O CONTRATANTE realizará o pagamento das mensalidades via PIX, boleto ou cartão até a data de vencimento estipulada no item II.',
      '3.2. O não recebimento de notificações ou boletos via canais digitais não isenta o CONTRATANTE do pagamento pontual.',
      '3.3. Reajuste: Caso o contrato seja renovado ou se estenda por período superior a 12 (doze) meses, o valor da mensalidade será reajustado anualmente pela variação positiva do IPCA (IBGE), ou outro índice oficial que venha a substituí-lo.',
    ],
  },
  {
    titulo: 'CLÁUSULA QUARTA — MORA',
    itens: [
      '4.1. Em caso de atraso, incidirá sobre o valor da parcela multa moratória de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso (pro rata die).',
      '4.2. O atraso superior a 30 dias autoriza a CONTRATADA a realizar a cobrança via órgãos de proteção ao crédito (SPC/SERASA), após notificação prévia escrita.',
    ],
  },
  {
    titulo: 'CLÁUSULA QUINTA — MATERIAL DIDÁTICO',
    itens: [
      '5.1. O material didático é indispensável para o aproveitamento pedagógico e não está incluso no valor das mensalidades, devendo ser adquirido separadamente. Uma vez entregue ao ALUNO ou acessado em plataforma digital, não haverá reembolso dos valores pagos pelo material em caso de desistência do curso.',
      '5.2. É expressamente proibida a utilização de cópias reprográficas (xerox) ou materiais piratas nas dependências da escola ou ambientes virtuais, sob pena de violação de direitos autorais e desligamento imediato.',
    ],
  },
  {
    titulo: 'CLÁUSULA SEXTA — REPOSIÇÕES E FALTAS',
    itens: [
      '6.1. Faltas, atrasos ou saídas antecipadas por iniciativa do ALUNO não dão direito a desconto, reembolso ou reposição de aula.',
      '6.2. A reposição de aulas ocorrerá exclusivamente quando o cancelamento da aula for de iniciativa da CONTRATADA.',
      '6.3. No caso de aulas online, problemas técnicos decorrentes da conexão de internet do aluno não serão passíveis de reposição.',
    ],
  },
  {
    titulo: 'CLÁUSULA SÉTIMA — DA RESCISÃO',
    itens: [
      '7.1. No Plano Mensal: A rescisão pode ocorrer a qualquer tempo, mediante aviso prévio por escrito (ou canal oficial de atendimento) com antecedência mínima de 30 (trinta) dias.',
      '7.2. No Plano Anual: Por se tratar de um plano com reserva de vaga e custos operacionais provisionados para o período letivo, a rescisão antecipada pelo CONTRATANTE implicará no pagamento de multa de 10% (10 por cento) sobre o valor total das parcelas restantes do contrato.',
      '7.3. Em caso de rescisão, não haverá reembolso de parcelas já pagas ou de aulas já ministradas. O mês em curso será cobrado integralmente.',
    ],
  },
  {
    titulo: 'CLÁUSULA OITAVA — USO DE IMAGEM E DADOS PESSOAIS (LGPD)',
    itens: [
      '8.1. Autorização de uso de imagem e voz: O CONTRATANTE autoriza expressamente a CONTRATADA a utilizar, de forma gratuita, a imagem e a voz do ALUNO para fins exclusivamente pedagógicos e de divulgação institucional, incluindo redes sociais, site oficial e materiais impressos da escola.',
      '8.2. ALUNOS MENORES DE IDADE: Caso o ALUNO seja menor de 18 (dezoito) anos, a autorização prevista no item 8.1 é concedida, neste ato, por seu responsável legal (CONTRATANTE), em estrita observância ao Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), garantindo-se que o uso da imagem não seja vexatório nem exponha o menor a situações inadequadas.',
      '8.3. Proteção de Dados (LGPD): A CONTRATADA declara que realiza o tratamento de dados pessoais do CONTRATANTE e do ALUNO em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), limitando-se ao estritamente necessário para a execução deste contrato, emissão de notas fiscais e cumprimento de obrigações legais.',
      '8.4. Revogação: O consentimento para o uso de imagem poderá ser revogado a qualquer tempo pelo CONTRATANTE, mediante solicitação formal por escrito, sem que isso gere qualquer ônus ou rescisão das demais obrigações contratuais.',
      '8.5. A CONTRATADA compromete-se a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), para fins de execução deste contrato e obrigações fiscais.',
    ],
  },
  {
    titulo: 'CLÁUSULA NONA — FORO',
    itens: [
      '9.1. Fica eleito o foro da Comarca de Cataguases/MG para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro por mais privilegiado que seja.',
    ],
  },
];

const escapeVazio = (v, alt = '—') => (v == null || v === '' ? alt : String(v));

const formatCPF = (raw) => {
  if (!raw) return '—';
  const d = String(raw).replace(/\D/g, '');
  if (d.length !== 11) return String(raw);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * Gera (e baixa, salvo se `retornarBlob`) o contrato em PDF.
 *
 * @param {object} aluno  documento do aluno (name, cpf, course, teacher, fee, installments,
 *                         responsibleName, responsibleCpf, responsibleContact, contact, dueDate)
 * @param {object} [opts]
 * @param {{nome:string,cpf:string,timestamp:string,ip?:string}} [opts.assinatura]  assinatura digital registrada
 * @param {boolean} [opts.retornarBlob]  se true, resolve com um Blob em vez de baixar
 * @returns {Promise<Blob|void>}
 */
export async function gerarContratoPDF(aluno, opts = {}) {
  const { assinatura = null, retornarBlob = false } = opts;
  const { jsPDF } = await import('jspdf');
  const logoData = await carregarLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const a = aluno || {};
  const contratanteNome = escapeVazio(a.responsibleName || a.name);
  const contratanteCpf = formatCPF(a.responsibleCpf || a.cpf);
  const contratanteContato = escapeVazio(a.responsibleContact || a.contact);
  const alunoNome = escapeVazio(a.name);
  const curso = escapeVazio(a.course);
  const professor = escapeVazio(a.teacher);
  const mensalidade = `R$ ${Number(a.fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const parcelas = String(a.installments || 12);
  const diaVenc = a.dueDate ? new Date(a.dueDate).getDate() : (a.startDate ? new Date(a.startDate).getDate() : '—');
  const hoje = new Date().toLocaleDateString('pt-BR');

  const setFill = (c) => doc.setFillColor(...hex(c));
  const setText = (c) => doc.setTextColor(...hex(c));
  const setDraw = (c) => doc.setDrawColor(...hex(c));

  const bottom = PAGE_H - 22;
  let y = 0;

  const novaPagina = () => {
    doc.addPage();
    y = desenharCabecalho(doc, logoData, { compact: true }) + 9;
  };

  const garantir = (h) => { if (y + h > bottom) novaPagina(); };

  /** Escreve um bloco de texto, quebrando de página se não couber inteiro. */
  const bloco = (txt, { size = 9.3, font = 'normal', color = BRAND.ink, lh = 1.5, gap = 2.8, justify = true, indent = 0, espacoAntes = 0 } = {}) => {
    if (espacoAntes) { garantir(espacoAntes); y += espacoAntes; }
    const w = CONTENT_W - indent;
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
    const linhas = doc.splitTextToSize(String(txt), w);
    const alturaLinha = size * MM_PER_PT * lh;
    const alturaBloco = linhas.length * alturaLinha;
    const alturaUtil = bottom - 30; // altura aproveitável numa página de continuação

    if (y + alturaBloco > bottom && alturaBloco <= alturaUtil) novaPagina();

    // A cor tem que ser reaplicada aqui: novaPagina() redesenha o cabeçalho
    // e deixa a cor do texto no accent.
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
    setText(color);

    if (alturaBloco > alturaUtil) {
      // Parágrafo maior que a página inteira: joga linha a linha.
      linhas.forEach((ln) => {
        if (y + alturaLinha > bottom) {
          novaPagina();
          doc.setFont('helvetica', font);
          doc.setFontSize(size);
          setText(color);
        }
        doc.text(ln, MARGIN + indent, y);
        y += alturaLinha;
      });
      y += gap;
      return;
    }

    doc.text(linhas, MARGIN + indent, y, {
      lineHeightFactor: lh,
      maxWidth: w,
      align: justify && linhas.length > 1 ? 'justify' : 'left',
    });
    y += alturaBloco + gap;
  };

  // ===================== PÁGINA 1 =====================
  desenharCabecalho(doc, logoData);
  y = 46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setText(BRAND.ink);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS', MARGIN, y, { maxWidth: CONTENT_W });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(BRAND.faint);
  doc.text(`Emitido em ${hoje}`, MARGIN, y);
  y += 9;

  // ---- Quadro Resumo ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(BRAND.faint);
  doc.text('QUADRO RESUMO', MARGIN, y, { charSpace: 0.6 });
  y += 4;

  const quadro = [
    [['Contratante', contratanteNome], ['CPF do contratante', contratanteCpf]],
    [['Aluno(a)', alunoNome], ['Contato', contratanteContato]],
    [['Curso', curso], ['Professor(a)', professor]],
    [['Mensalidade', mensalidade], ['Parcelas', parcelas]],
    [['Vencimento', `dia ${diaVenc}`], ['', '']],
  ];
  const qRowH = 12.5;
  const qColW = CONTENT_W / 2;
  const qTop = y;
  setFill(BRAND.panel);
  doc.rect(MARGIN, qTop - 2, CONTENT_W, quadro.length * qRowH + 4, 'F');
  setFill(BRAND.accent);
  doc.rect(MARGIN, qTop - 2, 1.5, quadro.length * qRowH + 4, 'F');
  quadro.forEach((par, i) => {
    const rowY = qTop + i * qRowH + 3;
    par.forEach(([label, value], col) => {
      if (!label) return;
      const cx = MARGIN + 8 + col * (qColW - 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setText(BRAND.faint);
      doc.text(label.toUpperCase(), cx, rowY, { charSpace: 0.4 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setText(BRAND.ink);
      doc.text(doc.splitTextToSize(String(value), qColW - 12)[0], cx, rowY + 5);
    });
  });
  y = qTop + quadro.length * qRowH + 7;

  bloco(
    `CONTRATADA: ${EMPRESA.qualificacao}`,
    { size: 8.5, color: BRAND.muted, gap: 4 },
  );

  // ---- Preâmbulo + cláusulas ----
  bloco(PREAMBULO, { size: 9.3, gap: 3.5 });

  CLAUSULAS.forEach((cl) => {
    bloco(cl.titulo, { font: 'bold', size: 9.5, color: BRAND.ink, justify: false, gap: 1.8, espacoAntes: 3 });
    cl.itens.forEach((item) => bloco(item, { size: 9.3, gap: 2.4 }));
  });

  // ---- Fecho + assinaturas ----
  garantir(60);
  y += 4;
  const dataFecho = assinatura?.timestamp
    ? assinatura.timestamp.split(' ')[0]
    : hoje;
  bloco(`Cataguases/MG, ${dataFecho}.`, { size: 9.3, justify: false, gap: 8 });

  if (assinatura) {
    // Carimbo de assinatura digital
    garantir(34);
    const boxH = 30;
    setFill(BRAND.panel);
    doc.rect(MARGIN, y, CONTENT_W, boxH, 'F');
    setFill(BRAND.accent);
    doc.rect(MARGIN, y, 1.5, boxH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(BRAND.accent);
    doc.text('ASSINADO DIGITALMENTE', MARGIN + 8, y + 7, { charSpace: 0.6 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(BRAND.ink);
    doc.text(`${assinatura.nome}  ·  CPF ${formatCPF(assinatura.cpf)}`, MARGIN + 8, y + 14);
    doc.setFontSize(7.5);
    setText(BRAND.muted);
    doc.text(`Data e hora: ${assinatura.timestamp}`, MARGIN + 8, y + 20);
    if (assinatura.ip) doc.text(`Endereço IP: ${assinatura.ip}`, MARGIN + 8, y + 25);
    y += boxH + 10;
  }

  garantir(30);
  const linhaY = y + 16;
  setDraw(BRAND.ink);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 4, linhaY, MARGIN + 4 + 66, linhaY);
  doc.line(PAGE_W - MARGIN - 4 - 66, linhaY, PAGE_W - MARGIN - 4, linhaY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(BRAND.ink);
  doc.text('CONTRATANTE', MARGIN + 4, linhaY + 4.5);
  doc.text('CONTRATADA', PAGE_W - MARGIN - 4 - 66, linhaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(BRAND.muted);
  doc.text(`${contratanteNome} · CPF ${contratanteCpf}`, MARGIN + 4, linhaY + 8.5, { maxWidth: 70 });
  doc.text(`${EMPRESA.nome} · CNPJ ${EMPRESA.cnpj}`, PAGE_W - MARGIN - 4 - 66, linhaY + 8.5, { maxWidth: 70 });

  // ---- Rodapé em todas as páginas ----
  const total = doc.internal.getNumberOfPages();
  const emitido = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    desenharRodapePagina(doc, {
      pagina: p,
      total,
      texto: p === total
        ? `Documento gerado eletronicamente pelo sistema SpeakUp em ${emitido}.`
        : `Contrato — ${alunoNome}`,
    });
  }

  const nome = `Contrato-${nomeArquivo(alunoNome)}${assinatura ? '-assinado' : ''}.pdf`;
  if (retornarBlob) return doc.output('blob');
  doc.save(nome);
}
