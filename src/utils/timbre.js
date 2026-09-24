/**
 * Papel timbrado SpeakUp para documentos em PDF (jsPDF).
 *
 * Identidade da marca segundo o design system: logo oficial, azul accent
 * #0e48fe (só em fios/detalhes, nunca preenchimento grande), tinta #101214.
 * Compartilhado por recibo.js e contrato.js.
 */

import logoUrl from '../assets/logo-speakup-azul.png';

export const BRAND = {
  accent: '#0e48fe',
  ink: '#101214',
  muted: '#5b6169',
  faint: '#8b9096',
  hair: '#e1e3e6',
  panel: '#f5f6f7',
  positive: '#0f8a4f',
};

export const EMPRESA = {
  nome: 'SpeakUp English Language Academy',
  cnpj: '28.649.636/0001-88',
  endereco: 'Praça Governador Valadares, 119 · Centro · Cataguases/MG',
  site: 'speakupcataguases.com',
  qualificacao:
    'SpeakUp English Language Academy, pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 28.649.636/0001-88, sediada na Praça Governador Valadares, 119, Centro — Cataguases, MG.',
};

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 18;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

export const setFill = (doc, c) => doc.setFillColor(...hex(c));
export const setText = (doc, c) => doc.setTextColor(...hex(c));
export const setDraw = (doc, c) => doc.setDrawColor(...hex(c));

/** Maior corpo de fonte (entre base e min) que faz o texto caber em maxW. */
export const ajustarFonte = (doc, texto, maxW, base, min) => {
  let size = base;
  while (size > min) {
    doc.setFontSize(size);
    if (doc.getTextWidth(String(texto)) <= maxW) break;
    size -= 0.5;
  }
  doc.setFontSize(size);
  return size;
};

export const nomeArquivo = (base) =>
  `${base}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Carrega a logo uma única vez e mantém como dataURL (mesmo domínio, sem CORS).
let _logoPromise = null;
export const carregarLogo = () => {
  if (!_logoPromise) {
    _logoPromise = fetch(logoUrl)
      .then((r) => r.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      }))
      .catch(() => null);
  }
  return _logoPromise;
};

/**
 * Desenha o cabeçalho timbrado (logo + dados da empresa + fio accent).
 * @returns {number} y logo abaixo do fio, onde o conteúdo pode começar.
 */
export function desenharCabecalho(doc, logoData, { compact = false } = {}) {
  const topY = compact ? 12 : 16;
  const logoW = compact ? 34 : 42;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', MARGIN, topY, logoW, logoW * (204 / 943));
    } catch { /* segue sem logo */ }
  }

  const rightX = PAGE_W - MARGIN;
  const base = topY + 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 8.5 : 9.5);
  setText(doc, BRAND.ink);
  doc.text(EMPRESA.nome, rightX, base, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(compact ? 7 : 8);
  setText(doc, BRAND.muted);
  doc.text(`CNPJ ${EMPRESA.cnpj}`, rightX, base + 4.5, { align: 'right' });
  doc.text(EMPRESA.endereco, rightX, base + 8.5, { align: 'right' });
  setText(doc, BRAND.accent);
  doc.text(EMPRESA.site, rightX, base + 12.5, { align: 'right' });

  const ruleY = compact ? topY + 18 : 36;
  setDraw(doc, BRAND.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, ruleY, PAGE_W - MARGIN, ruleY);
  return ruleY;
}

/** Rodapé de página: fio, texto opcional à esquerda e paginação à direita. */
export function desenharRodapePagina(doc, { pagina, total, texto } = {}) {
  const y = PAGE_H - 14;
  setDraw(doc, BRAND.hair);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(doc, BRAND.faint);
  if (texto) doc.text(texto, MARGIN, y + 5, { maxWidth: CONTENT_W - 28 });
  if (pagina) {
    doc.text(`Página ${pagina}${total ? ` de ${total}` : ''}`, PAGE_W - MARGIN, y + 5, { align: 'right' });
  }
}
