/**
 * Geração de recibos em PDF com papel timbrado SpeakUp.
 *
 * Substitui os antigos recibos em .doc (Word). Papel timbrado e identidade
 * da marca vêm de timbre.js. jsPDF é carregado sob demanda (import dinâmico).
 */

import { formatDate } from './formatters';
import {
  BRAND, EMPRESA, MARGIN, PAGE_W, CONTENT_W,
  hex, ajustarFonte, nomeArquivo, carregarLogo, desenharCabecalho,
} from './timbre';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCPF = (raw) => {
  if (!raw) return '—';
  const d = String(raw).replace(/\D/g, '');
  if (d.length !== 11) return String(raw);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/** Converte um valor numérico em reais por extenso. */
export function valorPorExtenso(numero) {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const converterCentena = (num) => {
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
        if (resultado) resultado += ' e ';
        resultado += unidades[u];
      }
    }
    return resultado;
  };

  const n = Number(numero || 0);
  if (n === 0) return 'zero reais';

  const [reaisStr, centavosStr] = n.toFixed(2).split('.');
  const reais = parseInt(reaisStr, 10);
  const centavos = parseInt(centavosStr, 10);

  let extenso = '';
  if (reais >= 1000) {
    const mil = Math.floor(reais / 1000);
    extenso += mil === 1 ? 'mil' : `${converterCentena(mil)} mil`;
    const resto = reais % 1000;
    if (resto > 0) extenso += (resto < 100 || resto % 100 === 0 ? ' e ' : ' ') + converterCentena(resto);
  } else {
    extenso = converterCentena(reais);
  }
  if (reais > 0) extenso += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    if (reais > 0) extenso += ' e ';
    extenso += `${converterCentena(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }
  return extenso;
}

// --- Desenho do recibo --------------------------------------------------

/**
 * Desenha um recibo completo em uma página A4 do documento jsPDF.
 * @param {import('jspdf').jsPDF} doc
 * @param {string|null} logoData
 * @param {object} cfg
 */
function desenharRecibo(doc, logoData, cfg) {
  const setFill = (c) => doc.setFillColor(...hex(c));
  const setText = (c) => doc.setTextColor(...hex(c));
  const setDraw = (c) => doc.setDrawColor(...hex(c));
  const rightX = PAGE_W - MARGIN;

  desenharCabecalho(doc, logoData);

  // ---- Título ----
  let y = 47;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setText(BRAND.ink);
  doc.text(cfg.titulo, MARGIN, y);

  // selo PAGO
  if (cfg.selo) {
    const selo = cfg.selo.toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const sw = doc.getTextWidth(selo) + 8;
    setFill(BRAND.positive);
    doc.roundedRect(rightX - sw, y - 5.2, sw, 7, 1.4, 1.4, 'F');
    setText('#ffffff');
    doc.text(selo, rightX - sw / 2, y - 0.6, { align: 'center' });
  }

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(BRAND.faint);
  doc.text(cfg.subtitulo, MARGIN, y);

  // ---- Faixa de valor ----
  y += 6;
  const bandH = 27;
  setFill(BRAND.panel);
  doc.rect(MARGIN, y, CONTENT_W, bandH, 'F');
  setFill(BRAND.accent);
  doc.rect(MARGIN, y, 1.5, bandH, 'F');

  const bx = MARGIN + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(BRAND.faint);
  doc.text('VALOR RECEBIDO', bx, y + 7, { charSpace: 0.6 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  setText(BRAND.ink);
  doc.text(`R$ ${brl(cfg.valor)}`, bx, y + 17);

  doc.setFont('helvetica', 'italic');
  setText(BRAND.muted);
  ajustarFonte(doc, `(${cfg.valorExtenso})`, CONTENT_W - 18, 9, 7);
  doc.text(`(${cfg.valorExtenso})`, bx, y + 23.5);

  y += bandH + 11;

  // ---- Referência ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(BRAND.faint);
  doc.text(cfg.referenciaLabel.toUpperCase(), MARGIN, y, { charSpace: 0.6 });
  doc.setFont('helvetica', 'normal');
  setText(BRAND.ink);
  ajustarFonte(doc, cfg.referenciaValor, CONTENT_W, 10.5, 8);
  doc.text(cfg.referenciaValor, MARGIN, y + 5.5);

  y += 13;

  // ---- Grade de dados ----
  const colW = CONTENT_W / 2;
  const rowH = 14.5;
  const pares = cfg.grade;

  setDraw(BRAND.hair);
  doc.setLineWidth(0.2);

  pares.forEach((par, i) => {
    const rowY = y + i * rowH;
    doc.line(MARGIN, rowY - 3, PAGE_W - MARGIN, rowY - 3);
    par.forEach(([label, value], col) => {
      if (!label) return;
      const cx = MARGIN + col * colW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setText(BRAND.faint);
      doc.text(label.toUpperCase(), cx, rowY + 1.5, { charSpace: 0.5 });
      doc.setFont('helvetica', 'normal');
      setText(BRAND.ink);
      const txt = String(value ?? '—');
      ajustarFonte(doc, txt, colW - 6, 10, 7.5);
      doc.text(txt, cx, rowY + 7);
    });
  });

  y += pares.length * rowH;
  doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);

  // ---- Declaração ----
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(BRAND.muted);
  const decl = doc.splitTextToSize(cfg.declaracao, CONTENT_W);
  doc.text(decl, MARGIN, y, { lineHeightFactor: 1.55, align: 'justify', maxWidth: CONTENT_W });

  y += decl.length * 4.9 + 12;

  // ---- Cidade / data + assinatura ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(BRAND.ink);
  doc.text(cfg.cidadeData, MARGIN, y);

  const sigCX = PAGE_W / 2;
  const sigY = Math.min(Math.max(y + 26, 210), 262);
  setDraw(BRAND.ink);
  doc.setLineWidth(0.3);
  doc.line(sigCX - 34, sigY, sigCX + 34, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(BRAND.ink);
  doc.text(EMPRESA.nome, sigCX, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(BRAND.faint);
  doc.text(`CNPJ ${EMPRESA.cnpj}`, sigCX, sigY + 8.5, { align: 'center' });

  // ---- Rodapé ----
  setDraw(BRAND.hair);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 283, PAGE_W - MARGIN, 283);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(BRAND.faint);
  const emitido = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  doc.text(
    `Documento gerado eletronicamente pelo sistema SpeakUp em ${emitido}. A autenticidade pode ser confirmada na secretaria da escola.`,
    sigCX, 288, { align: 'center', maxWidth: CONTENT_W },
  );
}

// --- API pública -------------------------------------------------------

/**
 * Gera e baixa o recibo de pagamento de uma mensalidade em PDF.
 * @param {object} payment  parcela (valuePlanned, valuePaid, paymentDate, paymentMethod, bank, dueDate, installmentNum, month, year, status, id, studentName)
 * @param {object} student  aluno (name, cpf, responsibleName, responsibleCpf, course, installments)
 */
export async function gerarReciboMensalidadePDF(payment, student) {
  if (!payment) return;

  const { jsPDF } = await import('jspdf');
  const logoData = await carregarLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const s = student || {};
  const alunoNome = payment.studentName || s.name || '—';
  const valorPago = Number(payment.valuePaid ?? payment.valuePlanned ?? 0);

  const mes = payment.month || (payment.dueDate ? new Date(payment.dueDate).getMonth() + 1 : new Date().getMonth() + 1);
  const ano = payment.year || (payment.dueDate ? new Date(payment.dueDate).getFullYear() : new Date().getFullYear());
  const periodo = `${MESES[mes - 1]} de ${ano}`;

  const numero = `${ano}${String(mes).padStart(2, '0')}-${String(payment.installmentNum || 0).padStart(2, '0')}`;
  const parcela = payment.installmentNum
    ? `${payment.installmentNum}${s.installments ? ` de ${s.installments}` : ''}`
    : '—';

  desenharRecibo(doc, logoData, {
    titulo: 'RECIBO DE PAGAMENTO',
    subtitulo: `Nº ${numero}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`,
    selo: payment.status === 'Pago' ? 'Pago' : null,
    valor: valorPago,
    valorExtenso: valorPorExtenso(valorPago),
    referenciaLabel: 'Referente a',
    referenciaValor: `Mensalidade do curso de inglês · ${periodo}`,
    grade: [
      [['Aluno(a)', alunoNome], ['CPF do aluno', formatCPF(s.cpf)]],
      [['Responsável', s.responsibleName || '—'], ['CPF do responsável', formatCPF(s.responsibleCpf || s.cpf)]],
      [['Curso', s.course || '—'], ['Parcela', parcela]],
      [['Vencimento', formatDate(payment.dueDate)], ['Data do pagamento', payment.paymentDate ? formatDate(payment.paymentDate) : new Date().toLocaleDateString('pt-BR')]],
      [['Forma de pagamento', payment.paymentMethod || '—'], ['Banco', payment.bank || '—']],
    ],
    declaracao: `Declaramos, para os devidos fins, ter recebido de ${s.responsibleName || alunoNome} a importância de R$ ${brl(valorPago)} (${valorPorExtenso(valorPago)}), referente à mensalidade do curso de inglês do(a) aluno(a) ${alunoNome}, relativa ao período de ${periodo}. Para maior clareza, firmamos o presente recibo.`,
    cidadeData: `Cataguases/MG, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`,
  });

  doc.save(`Recibo-${nomeArquivo(alunoNome)}-${MESES[mes - 1]}-${ano}.pdf`);
}

/**
 * Gera e baixa o recibo de uma venda (material / avulso) em PDF.
 * @param {object} cobranca  documento da coleção "vendas"
 */
export async function gerarReciboVendaPDF(cobranca) {
  if (!cobranca) return;

  const { jsPDF } = await import('jspdf');
  const logoData = await carregarLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const valor = Number(cobranca.valor || 0);
  const valorPago = Number(cobranca.valorPago ?? cobranca.valor ?? 0);
  const aluno = cobranca.aluno || '—';
  const material = cobranca.material || cobranca.referencia || cobranca.livro || cobranca.tipo || 'Venda de material didático';
  const dataVenda = cobranca.createdAt ? new Date(cobranca.createdAt).toLocaleDateString('pt-BR') : '—';
  const numero = cobranca.id ? String(cobranca.id).slice(-6).toUpperCase() : String(Date.now()).slice(-6);
  const pago = cobranca.status === 'pago' || cobranca.status === 'Pago' || cobranca.dataPagamento;

  desenharRecibo(doc, logoData, {
    titulo: 'RECIBO DE VENDA',
    subtitulo: `Nº ${numero}  ·  Emitido em ${new Date().toLocaleDateString('pt-BR')}`,
    selo: pago ? 'Pago' : null,
    valor: valorPago || valor,
    valorExtenso: valorPorExtenso(valorPago || valor),
    referenciaLabel: 'Referente a',
    referenciaValor: material,
    grade: [
      [['Aluno(a)', aluno], ['Data da venda', dataVenda]],
      [['Vencimento', cobranca.vencimento ? new Date(cobranca.vencimento).toLocaleDateString('pt-BR') : '—'], ['Data do pagamento', cobranca.dataPagamento ? new Date(cobranca.dataPagamento).toLocaleDateString('pt-BR') : '—']],
      [['Forma de pagamento', cobranca.pagamento || '—'], ['Parcelas', cobranca.parcelas || '—']],
    ],
    declaracao: `Declaramos, para os devidos fins, ter recebido de ${aluno} a importância de R$ ${brl(valorPago || valor)} (${valorPorExtenso(valorPago || valor)}), referente a ${material}. Para maior clareza, firmamos o presente recibo.`,
    cidadeData: `Cataguases/MG, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`,
  });

  doc.save(`Recibo-Venda-${nomeArquivo(aluno)}-${numero}.pdf`);
}
