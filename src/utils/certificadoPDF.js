import QRCode from 'qrcode';
import { criarDocumento, COR, PAGINA } from './relatorioMensal/documento';
import { urlVerificacao, dataBR, CERTIFICADO_SITE_VERIFICACAO } from './certificado';
import { nomeArquivo } from './timbre';

const DOURADO = COR.amarelo;
const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

/** QR como quadradinhos vetoriais (nítido em qualquer impressão, sem imagem). */
function desenharQR(pdf, texto, x, y, tamanho) {
  const { size, data } = QRCode.create(texto, { errorCorrectionLevel: 'M' }).modules;
  const lado = tamanho / size;
  pdf.setFillColor(...hex('#101214'));
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      // +0.05 evita fresta branca entre módulos vizinhos na rasterização
      if (data[r * size + c]) pdf.rect(x + c * lado, y + r * lado, lado + 0.05, lado + 0.05, 'F');
    }
  }
}

/** Estrela de pontas arredondadas do selo "VERIFIED". */
function desenharSelo(pdf, cx, cy, rExterno, rInterno, pontas = 18) {
  const pts = [];
  for (let i = 0; i < pontas * 2; i += 1) {
    const r = i % 2 === 0 ? rExterno : rInterno;
    const a = (Math.PI * i) / pontas - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const deltas = pts.map((p, i) => {
    const prox = pts[(i + 1) % pts.length];
    return [prox[0] - p[0], prox[1] - p[1]];
  });
  pdf.setFillColor(...hex(DOURADO));
  pdf.lines(deltas.slice(0, -1), pts[0][0], pts[0][1], [1, 1], 'F', true);
}

/**
 * Monta o PDF do certificado (A4 paisagem) e devolve { pdf, arquivo }.
 * `certificado` = { codigo, nome, titulo, dataEmissao }.
 */
export async function montarCertificadoPDF(certificado) {
  const d = await criarDocumento();
  const { pdf } = d;
  const { L, A } = PAGINA;
  const cx = L / 2;

  // Moldura azul
  d.traco(COR.azul);
  pdf.setLineWidth(2.4);
  pdf.rect(5, 5, L - 10, A - 10);

  // Logo
  if (d.logo) {
    const w = 62;
    try { pdf.addImage(d.logo, 'PNG', cx - w / 2, 17, w, w * (204 / 943)); } catch { /* segue sem logo */ }
  }

  // Título e texto
  d.fonte('bold', 36).cor(COR.tinta);
  pdf.text('Certificate of Achievement', cx, 60, { align: 'center' });

  d.fonte('normal', 11).cor(COR.tinta);
  pdf.text('This certifies that', cx, 74, { align: 'center' });

  d.fonte('bold', 34).cor(COR.azul);
  d.ajustar(certificado.nome, L - 70, 34, 16);
  pdf.text(certificado.nome, cx, 91, { align: 'center' });

  d.fonte('normal', 11).cor(COR.tinta);
  pdf.text('has successfully completed the course', cx, 103, { align: 'center' });
  pdf.text('and was awarded a certificate in', cx, 109.5, { align: 'center' });

  d.fonte('bold', 18).cor(COR.tinta);
  d.ajustar(certificado.titulo, L - 70, 18, 11);
  pdf.text(certificado.titulo, cx, 124, { align: 'center' });

  // ── Linha inferior ────────────────────────────────────────────────────
  const baseY = 168;

  // Selo com a data de emissão
  const sx = 42;
  d.traco(COR.azul);
  pdf.setLineWidth(0.7);
  pdf.circle(sx, baseY, 16);
  pdf.setLineWidth(0.3);
  pdf.circle(sx, baseY, 14.2);
  d.fonte('normal', 6).cor(COR.tinta);
  pdf.text('Issue Date:', sx, baseY - 4.5, { align: 'center' });
  d.fonte('bold', 8.6).cor(COR.tinta);
  pdf.text(dataBR(certificado.dataEmissao), sx, baseY + 0.5, { align: 'center' });
  d.fonte('bold', 5.5).cor(COR.cinza);
  pdf.text('SEAL', sx, baseY + 6, { align: 'center' });

  // Assinatura
  d.traco(COR.tinta);
  pdf.setLineWidth(0.3);
  pdf.line(72, baseY + 10, 132, baseY + 10);
  d.fonte('bold', 7.5).cor(COR.tinta);
  pdf.text('Pedagogical Director', 102, baseY + 15, { align: 'center' });

  // Selo VERIFIED
  const vx = 168;
  desenharSelo(pdf, vx, baseY - 2, 9.2, 7.6);
  d.fonte('bold', 8.5).cor(COR.azul);
  pdf.text('VERIFIED', vx, baseY + 13.5, { align: 'center' });
  d.fonte('normal', 5.5).cor(COR.cinza);
  pdf.text('CERTIFICATE OF ACHIEVEMENT', vx, baseY + 17.5, { align: 'center' });

  // Caixa: ID + QR
  const bx = 198, by = baseY - 17, bw = 76, bh = 36, painelW = 30;
  d.traco('#C9D3FF');
  pdf.setLineWidth(0.3);
  pdf.roundedRect(bx, by, bw, bh, 2, 2);
  d.preenche(COR.painel);
  pdf.rect(bx + bw - painelW, by + 0.15, painelW - 0.15, bh - 0.3, 'F');

  d.preenche(COR.azul);
  pdf.roundedRect(bx + 4, by + 4, 30, 5.2, 1, 1, 'F');
  d.fonte('bold', 5.6).cor(COR.branco);
  pdf.text('CERTIFICATE ID', bx + 19, by + 7.7, { align: 'center' });

  d.fonte('bold', 10).cor(COR.tinta);
  pdf.text(certificado.codigo, bx + 4, by + 16.5);
  d.fonte('bold', 5.8).cor(COR.azul);
  pdf.text('VERIFY CERTIFICATE', bx + 4, by + 22);
  d.fonte('normal', 5).cor(COR.cinza);
  pdf.text('Scan the QR code or visit', bx + 4, by + 26);
  pdf.text(CERTIFICADO_SITE_VERIFICACAO, bx + 4, by + 29.5);

  const qrLado = 22;
  desenharQR(pdf, urlVerificacao(certificado.codigo), bx + bw - painelW + (painelW - qrLado) / 2, by + (bh - qrLado) / 2, qrLado);

  return { pdf, arquivo: `certificado-${nomeArquivo(certificado.nome)}-${certificado.codigo}.pdf` };
}

/** Gera e baixa o PDF. */
export async function baixarCertificadoPDF(certificado) {
  const { pdf, arquivo } = await montarCertificadoPDF(certificado);
  pdf.save(arquivo);
  return arquivo;
}
