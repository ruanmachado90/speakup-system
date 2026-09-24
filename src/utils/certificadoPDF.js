import QRCode from 'qrcode';
import logoUrl from '../assets/logo-speakup-azul.png';
import montserratRegularUrl from '../assets/fonts/Montserrat-Regular.ttf';
import montserratExtraBoldUrl from '../assets/fonts/Montserrat-ExtraBold.ttf';
import cinzelUrl from '../assets/fonts/Cinzel-SemiBold.ttf';
import playfairItalicUrl from '../assets/fonts/PlayfairDisplay-MediumItalic.ttf';
import cormorantItalicUrl from '../assets/fonts/CormorantGaramond-MediumItalic.ttf';
import { urlVerificacao, CERTIFICADO_SITE_VERIFICACAO, ASSINATURA_CERTIFICADO } from './certificado';
import { nomeArquivo } from './timbre';

/*
 * Certificado SpeakUp — A4 paisagem.
 *
 * Linguagem visual de documento oficial, não de página web: papel marfim,
 * moldura com faixa guilhochê (padrão de segurança de diploma/cédula),
 * cantos ornamentados, roseta guilhochê de fundo, serifa clássica no título
 * (Cinzel) e no nome (Playfair Display itálico), selo dourado com o nível.
 * O azul da marca fica na moldura e no nome; o dourado é o metal do selo.
 */

const COR = {
  papel: '#FBF9F4',
  tinta: '#101214',
  mudo: '#5B6169',
  azul: '#0E48FE',
  azulEscuro: '#0A2FAB',
  azulFaixa: '#EEF2FF',
  azulLinha: '#B9C8FF',
  roseta: '#E9EEFD',
  ouro: '#B38A2E',
  ouroClaro: '#D4B062',
  ouroEscuro: '#8C6A1F',
};

const L = 297;
const A = 210;
const CX = L / 2;

// Moldura: faixa guilhochê entre FORA e DENTRO (mm a partir da borda do papel)
const FORA = 8;
const DENTRO = 17;

const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

// ───────────────── assets (fontes + logo), carregados uma vez ─────────────────

const FONTES = {
  montserrat: [['Montserrat-Regular.ttf', montserratRegularUrl, 'normal'], ['Montserrat-ExtraBold.ttf', montserratExtraBoldUrl, 'bold']],
  cinzel: [['Cinzel-SemiBold.ttf', cinzelUrl, 'normal']],
  playfair: [['PlayfairDisplay-MediumItalic.ttf', playfairItalicUrl, 'italic']],
  cormorant: [['CormorantGaramond-MediumItalic.ttf', cormorantItalicUrl, 'italic']],
};

const paraBase64 = (buf) => {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

let _assets = null;
function carregarAssets() {
  if (!_assets) {
    _assets = (async () => {
      const lista = Object.values(FONTES).flat();
      const buffers = await Promise.all(lista.map(([, url]) => fetch(url).then((r) => r.arrayBuffer())));
      const fontes = lista.map(([arquivo, , estilo], i) => ({ arquivo, estilo, base64: paraBase64(buffers[i]) }));
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const logo = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
      return { fontes, logo };
    })().catch((err) => {
      console.error('[certificado] Falha ao carregar fontes/logo:', err);
      _assets = null; // deixa tentar de novo na próxima emissão
      return null;
    });
  }
  return _assets;
}

// ───────────────── primitivas de desenho ─────────────────

class Pena {
  constructor(pdf, temFontes) {
    this.pdf = pdf;
    // Sem as fontes (falha de rede), cai nas equivalentes embutidas do PDF.
    this.fam = temFontes
      ? { sans: 'Montserrat', titulo: 'Cinzel', nome: 'PlayfairDisplay', corpo: 'CormorantGaramond' }
      : { sans: 'helvetica', titulo: 'times', nome: 'times', corpo: 'times' };
    this.estiloItalico = temFontes ? 'italic' : 'italic';
    this.temFontes = temFontes;
  }

  fonte(tipo, tamanho, peso) {
    const fam = this.fam[tipo];
    let estilo = 'normal';
    if (tipo === 'sans') estilo = peso === 'bold' ? 'bold' : 'normal';
    else if (tipo === 'nome' || tipo === 'corpo') estilo = 'italic';
    else if (!this.temFontes) estilo = 'bold';
    this.pdf.setFont(fam, estilo);
    this.pdf.setFontSize(tamanho);
    return this;
  }

  cor(c) { this.pdf.setTextColor(...hex(c)); return this; }
  preencher(c) { this.pdf.setFillColor(...hex(c)); return this; }
  tracar(c, espessura) { this.pdf.setDrawColor(...hex(c)); if (espessura) this.pdf.setLineWidth(espessura); return this; }

  largura(t) { return this.pdf.getTextWidth(String(t)); }

  centro(t, y, x = CX) { this.pdf.text(String(t), x, y, { align: 'center' }); }

  /** Diminui a fonte até o texto caber em maxW. */
  caber(t, maxW, base, min) {
    let s = base;
    while (s > min) {
      this.pdf.setFontSize(s);
      if (this.largura(t) <= maxW) break;
      s -= 0.5;
    }
    this.pdf.setFontSize(s);
    return s;
  }

  /** Texto centrado com espaçamento entre letras (tracking), letra a letra. */
  espacado(t, y, espaco, x = CX) {
    const chars = [...String(t)];
    const total = chars.reduce((s, c) => s + this.largura(c), 0) + espaco * (chars.length - 1);
    let cx = x - total / 2;
    chars.forEach((c) => {
      this.pdf.text(c, cx, y);
      cx += this.largura(c) + espaco;
    });
    return total;
  }

  /** Polilinha por pontos absolutos. */
  polilinha(pts, estilo = 'S', fechar = false) {
    if (pts.length < 2) return;
    const deltas = [];
    for (let i = 1; i < pts.length; i += 1) deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    this.pdf.lines(deltas, pts[0][0], pts[0][1], [1, 1], estilo, fechar);
  }

  /** Texto curvado num círculo (topo: lê em sentido horário; base: da esquerda pra direita). */
  textoCircular(t, cx, cy, r, { base = false, espaco = 0.35 } = {}) {
    const chars = [...String(t)];
    const larguras = chars.map((c) => this.largura(c));
    const arco = (larguras.reduce((s, w) => s + w, 0) + espaco * (chars.length - 1)) / r;
    let acum = 0;
    chars.forEach((c, i) => {
      const meio = (acum + larguras[i] / 2) / r; // ângulo do centro da letra dentro do arco
      acum += larguras[i] + espaco;
      // topo: θ cresce no sentido horário a partir de 0 (12h); base: decresce a partir de 180°
      const theta = base ? Math.PI + arco / 2 - meio : -arco / 2 + meio;
      const graus = base ? 180 - (theta * 180) / Math.PI : -(theta * 180) / Math.PI;
      const dir = base ? [-Math.cos(theta), -Math.sin(theta)] : [Math.cos(theta), Math.sin(theta)];
      const px = cx + r * Math.sin(theta) - dir[0] * (larguras[i] / 2);
      const py = cy - r * Math.cos(theta) - dir[1] * (larguras[i] / 2);
      this.pdf.text(c, px, py, { angle: graus });
    });
  }
}

// ───────────────── elementos ─────────────────

/** Faixa guilhochê: senoides entrelaçadas numa faixa, como em diploma e cédula. */
function faixaGuilloche(p) {
  const { pdf } = p;
  const meio = (FORA + DENTRO) / 2;
  const amp = (DENTRO - FORA) / 2 - 1.1;

  p.preencher(COR.azulFaixa);
  pdf.rect(FORA, FORA, L - 2 * FORA, A - 2 * FORA, 'F');
  p.preencher(COR.papel);
  pdf.rect(DENTRO, DENTRO, L - 2 * DENTRO, A - 2 * DENTRO, 'F');

  // Cada lado: 4 senoides defasadas; o comprimento de onda se ajusta pra
  // fechar um número inteiro de ciclos (sem "degrau" no canto).
  const lado = (x0, y0, x1, y1) => {
    const comp = Math.hypot(x1 - x0, y1 - y0);
    const ciclos = Math.round(comp / 7);
    const ux = (x1 - x0) / comp;
    const uy = (y1 - y0) / comp;
    const nx = -uy;
    const ny = ux;
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((fase) => {
      const pts = [];
      for (let s = 0; s <= comp + 0.001; s += 0.45) {
        const off = amp * Math.sin((2 * Math.PI * ciclos * s) / comp + fase);
        pts.push([x0 + ux * s + nx * off, y0 + uy * s + ny * off]);
      }
      p.polilinha(pts);
    });
  };
  p.tracar(COR.azulLinha, 0.16);
  lado(DENTRO, meio, L - DENTRO, meio); // topo
  lado(DENTRO, A - meio, L - DENTRO, A - meio); // base
  lado(meio, DENTRO, meio, A - DENTRO); // esquerda
  lado(L - meio, DENTRO, L - meio, A - DENTRO); // direita

  // Fios: azul forte por fora, dourado por dentro, azul fino logo depois.
  p.tracar(COR.azul, 0.9);
  pdf.rect(FORA, FORA, L - 2 * FORA, A - 2 * FORA);
  p.tracar(COR.ouro, 0.45);
  pdf.rect(DENTRO, DENTRO, L - 2 * DENTRO, A - 2 * DENTRO);
  p.tracar(COR.azul, 0.2);
  pdf.rect(DENTRO + 1.4, DENTRO + 1.4, L - 2 * DENTRO - 2.8, A - 2 * DENTRO - 2.8);
}

/** Canto: quadrado azul sobre a junção da faixa + losango dourado + cantoneira. */
function cantos(p) {
  const { pdf } = p;
  const lado = DENTRO - FORA;
  const pontos = [
    [FORA, FORA, 1, 1],
    [L - FORA, FORA, -1, 1],
    [FORA, A - FORA, 1, -1],
    [L - FORA, A - FORA, -1, -1],
  ];
  pontos.forEach(([x, y, sx, sy]) => {
    const qx = sx > 0 ? x : x - lado;
    const qy = sy > 0 ? y : y - lado;
    p.preencher(COR.azul);
    pdf.rect(qx, qy, lado, lado, 'F');
    // losango dourado no centro do quadrado
    const cx = qx + lado / 2;
    const cy = qy + lado / 2;
    const r = 2.6;
    p.preencher(COR.ouroClaro);
    p.polilinha([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], 'F', true);
    p.preencher(COR.papel);
    p.polilinha([[cx, cy - 0.9], [cx + 0.9, cy], [cx, cy + 0.9], [cx - 0.9, cy]], 'F', true);
    // Cantoneira dourada só nos cantos de cima: embaixo ficam o ID (esq.) e o QR (dir.).
    if (sy < 0) return;
    const ix = sx > 0 ? DENTRO + 3.2 : L - DENTRO - 3.2;
    const iy = sy > 0 ? DENTRO + 3.2 : A - DENTRO - 3.2;
    p.tracar(COR.ouro, 0.35);
    pdf.line(ix, iy, ix + sx * 13, iy);
    pdf.line(ix, iy, ix, iy + sy * 13);
    p.preencher(COR.ouro);
    pdf.circle(ix + sx * 13, iy, 0.45, 'F');
    pdf.circle(ix, iy + sy * 13, 0.45, 'F');
  });
}

/** Roseta guilhochê bem clara atrás do nome (fundo de "papel de segurança"). */
function roseta(p, cx, cy) {
  p.tracar(COR.roseta, 0.14);
  const k = 18;
  for (let copia = 0; copia < 7; copia += 1) {
    const fase = (copia * Math.PI) / (7 * k) * 2;
    const pts = [];
    for (let t = 0; t <= 2 * Math.PI + 0.001; t += 0.012) {
      const r = 38 + 7 * Math.sin(k * t + fase * k);
      pts.push([cx + r * 1.55 * Math.cos(t), cy + r * 0.62 * Math.sin(t)]);
    }
    p.polilinha(pts);
  }
}

/** Fio dourado com losango no meio (separador clássico). */
function separador(p, y, meiaLargura) {
  const { pdf } = p;
  p.tracar(COR.ouro, 0.3);
  pdf.line(CX - meiaLargura, y, CX - 3.2, y);
  pdf.line(CX + 3.2, y, CX + meiaLargura, y);
  p.preencher(COR.ouro);
  p.polilinha([[CX, y - 1.4], [CX + 1.4, y], [CX, y + 1.4], [CX - 1.4, y]], 'F', true);
}

/** Selo dourado com fitas: nível no centro, nome da escola em volta. */
function selo(p, cx, cy, { centro, sub }) {
  const { pdf } = p;
  // fitas atrás do selo
  p.preencher(COR.ouroEscuro);
  [-1, 1].forEach((s) => {
    const topoX = cx + s * 4;
    p.polilinha([
      [topoX - 3.6, cy + 6],
      [topoX + 3.6, cy + 6],
      [topoX + s * 7 + 3.6, cy + 25],
      [topoX + s * 7, cy + 21.5],
      [topoX + s * 7 - 3.6, cy + 25],
    ], 'F', true);
  });

  // borda serrilhada
  const pts = [];
  const dentes = 40;
  for (let i = 0; i < dentes * 2; i += 1) {
    const r = i % 2 === 0 ? 17.2 : 16.1;
    const a = (Math.PI * i) / dentes;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  p.preencher(COR.ouro);
  p.polilinha(pts, 'F', true);
  p.preencher(COR.ouroClaro);
  pdf.circle(cx, cy, 15.4, 'F');
  p.preencher(COR.ouro);
  pdf.circle(cx, cy, 14.7, 'F');

  // anéis
  p.tracar(COR.papel, 0.25);
  pdf.circle(cx, cy, 13.9);
  pdf.circle(cx, cy, 9.4);

  // Texto circular no anel entre r 9.4 e 13.9: no topo a letra cresce pra
  // fora (base em 10.5), embaixo pra dentro (base em 12.9) — as duas ocupam a
  // mesma faixa. Cada arco fica abaixo de ~150° pra não encostar no outro.
  p.fonte('sans', 4.2, 'bold').cor(COR.papel);
  p.textoCircular('SPEAKUP ENGLISH SCHOOL', cx, cy, 10.5, { espaco: 0.22 });
  p.textoCircular('CATAGUASES · BRAZIL', cx, cy, 12.9, { base: true, espaco: 0.22 });

  // pontos de divisão nas laterais do anel
  p.preencher(COR.papel);
  pdf.circle(cx - 11.65, cy + 0.2, 0.38, 'F');
  pdf.circle(cx + 11.65, cy + 0.2, 0.38, 'F');

  // centro
  p.fonte('titulo', centro.length > 3 ? 11 : 17).cor(COR.papel);
  p.centro(centro, cy + (sub ? 1.6 : 2.2), cx);
  if (sub) {
    p.fonte('sans', 3.9, 'bold').cor(COR.papel);
    p.espacado(sub, cy + 5.2, 0.5, cx);
  }
}

/** QR vetorial (nítido em qualquer impressão). */
function qr(p, texto, x, y, tamanho) {
  const { size, data } = QRCode.create(texto, { errorCorrectionLevel: 'M' }).modules;
  const lado = tamanho / size;
  p.preencher(COR.tinta);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (data[r * size + c]) p.pdf.rect(x + c * lado, y + r * lado, lado + 0.04, lado + 0.04, 'F');
    }
  }
}

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2026-09-24" → "24 September 2026" (dia antes do mês, como no Brasil). */
export function dataPorExtenso(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}` : '';
}

// ───────────────── página ─────────────────

/**
 * Monta o PDF do certificado e devolve { pdf, arquivo }.
 * `certificado` = { codigo, nome, titulo, nivel?, dataEmissao }.
 */
export async function montarCertificadoPDF(certificado) {
  const { jsPDF } = await import('jspdf');
  const assets = await carregarAssets();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  if (assets) {
    const familia = { Montserrat: 'Montserrat', Cinzel: 'Cinzel', PlayfairDisplay: 'PlayfairDisplay', CormorantGaramond: 'CormorantGaramond' };
    assets.fontes.forEach(({ arquivo, estilo, base64 }) => {
      pdf.addFileToVFS(arquivo, base64);
      pdf.addFont(arquivo, familia[arquivo.split('-')[0]], estilo);
    });
  }
  const p = new Pena(pdf, Boolean(assets));

  // Papel + moldura
  p.preencher(COR.papel);
  pdf.rect(0, 0, L, A, 'F');
  faixaGuilloche(p);
  roseta(p, CX, 93);
  cantos(p);

  // Logo
  if (assets?.logo) {
    const w = 44;
    try { pdf.addImage(assets.logo, 'PNG', CX - w / 2, 25, w, w * (204 / 943)); } catch { /* segue sem logo */ }
  }

  // Título
  p.fonte('titulo', 40).cor(COR.tinta);
  p.espacado('CERTIFICATE', 58, 2.2);
  p.fonte('sans', 9, 'bold').cor(COR.ouro);
  const larguraSub = p.espacado('OF ACHIEVEMENT', 66, 1.5);
  p.tracar(COR.ouro, 0.3);
  pdf.line(CX - larguraSub / 2 - 22, 64.8, CX - larguraSub / 2 - 5, 64.8);
  pdf.line(CX + larguraSub / 2 + 5, 64.8, CX + larguraSub / 2 + 22, 64.8);

  // Nome
  p.fonte('corpo', 15).cor(COR.mudo);
  p.centro('This is to certify that', 80);

  p.fonte('nome', 38).cor(COR.azulEscuro);
  p.caber(certificado.nome, 215, 38, 20);
  p.centro(certificado.nome, 98);
  separador(p, 104.5, 78);

  // Curso
  p.fonte('corpo', 15).cor(COR.mudo);
  p.centro('has successfully completed the course', 115);

  p.fonte('sans', 15, 'bold').cor(COR.tinta);
  const titulo = String(certificado.titulo || '').toUpperCase();
  p.caber(titulo, 200, 15, 9);
  const tamanhoTitulo = pdf.getFontSize();
  p.espacado(titulo, 125.5, tamanhoTitulo * 0.09);

  if (certificado.nivel) {
    p.fonte('sans', 7.5).cor(COR.mudo);
    p.centro('Aligned with the Common European Framework of Reference for Languages (CEFR)', 132);
  }

  // Rodapé: data · selo · assinatura (mesma linha de base)
  const linhaY = 166;
  const colEsq = 78;
  const colDir = L - 78;
  const meiaLinha = 29;

  p.fonte('corpo', 14).cor(COR.tinta);
  p.centro(dataPorExtenso(certificado.dataEmissao), linhaY - 2.2, colEsq);
  p.tracar(COR.tinta, 0.25);
  pdf.line(colEsq - meiaLinha, linhaY, colEsq + meiaLinha, linhaY);
  p.fonte('sans', 6.6, 'bold').cor(COR.mudo);
  p.espacado('DATE OF ISSUE', linhaY + 4.6, 0.9, colEsq);

  pdf.line(colDir - meiaLinha, linhaY, colDir + meiaLinha, linhaY);
  if (ASSINATURA_CERTIFICADO.nome) {
    p.fonte('sans', 7.4, 'bold').cor(COR.tinta);
    p.centro(ASSINATURA_CERTIFICADO.nome, linhaY + 4.6, colDir);
    p.fonte('sans', 6.2).cor(COR.mudo);
    p.centro(ASSINATURA_CERTIFICADO.cargo, linhaY + 8.4, colDir);
  } else {
    p.fonte('sans', 6.6, 'bold').cor(COR.mudo);
    p.espacado(ASSINATURA_CERTIFICADO.cargo.toUpperCase(), linhaY + 4.6, 0.9, colDir);
  }

  selo(p, CX, 157, certificado.nivel
    ? { centro: certificado.nivel, sub: 'CEFR LEVEL' }
    : { centro: String(certificado.dataEmissao || '').slice(0, 4), sub: 'CERTIFIED' });

  // Verificação, nos cantos de baixo: ID + endereço à esquerda, QR à direita.
  // Discretos de propósito — é informação de conferência, não de destaque.
  const margemInterna = DENTRO + 5.5;
  const qrLado = 16;
  const qrX = L - margemInterna - qrLado;
  const qrY = A - margemInterna - qrLado;
  p.preencher('#FFFFFF');
  pdf.rect(qrX - 1.2, qrY - 1.2, qrLado + 2.4, qrLado + 2.4, 'F');
  qr(p, urlVerificacao(certificado.codigo), qrX, qrY, qrLado);

  const idY = A - margemInterna;
  p.fonte('sans', 5.6, 'bold').cor(COR.mudo);
  pdf.text('CERTIFICATE ID', margemInterna, idY - 8.2, { charSpace: 0.35 });
  p.fonte('sans', 9, 'bold').cor(COR.tinta);
  pdf.text(certificado.codigo, margemInterna, idY - 3.6);
  p.fonte('sans', 5.8).cor(COR.mudo);
  pdf.text(`Verify at ${CERTIFICADO_SITE_VERIFICACAO}`, margemInterna, idY);

  return { pdf, arquivo: `certificado-${nomeArquivo(certificado.nome)}-${certificado.codigo}.pdf` };
}

/** Gera e baixa o PDF. */
export async function baixarCertificadoPDF(certificado) {
  const { pdf, arquivo } = await montarCertificadoPDF(certificado);
  pdf.save(arquivo);
  return arquivo;
}
