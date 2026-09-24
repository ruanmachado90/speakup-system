/**
 * Gera o certificado de ponta a ponta com a Montserrat e a logo reais.
 * Com CERT_PDF_OUT=<caminho.pdf> grava o arquivo pra conferir o visual.
 */
jest.mock('../assets/fonts/Montserrat-Regular.ttf', () => 'Montserrat-Regular.ttf', { virtual: true });
jest.mock('../assets/fonts/Montserrat-ExtraBold.ttf', () => 'Montserrat-ExtraBold.ttf', { virtual: true });
jest.mock('../assets/logo-speakup-azul.png', () => 'logo-speakup-azul.png', { virtual: true });

const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

const arquivoReal = (nome) => {
  const dir = nome.endsWith('.png') ? 'src/assets' : 'src/assets/fonts';
  return fs.readFileSync(path.join(process.cwd(), dir, nome));
};

beforeAll(() => {
  global.fetch = jest.fn(async (nome) => {
    const buf = arquivoReal(nome);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return { arrayBuffer: async () => ab, blob: async () => new Blob([buf], { type: 'image/png' }) };
  });
});

const { montarCertificadoPDF } = require('../utils/certificadoPDF');

const cert = {
  codigo: 'SU-2026-K7QX4M',
  nome: 'Maria Eduarda Fernandes de Souza',
  titulo: 'B1 Intermediate English',
  dataEmissao: '2026-09-24',
};

describe('certificado em PDF', () => {
  it('gera uma página A4 paisagem com nome de arquivo seguro', async () => {
    const { pdf, arquivo } = await montarCertificadoPDF(cert);
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(arquivo).toBe('certificado-Maria-Eduarda-Fernandes-de-Souza-SU-2026-K7QX4M.pdf');
    if (process.env.CERT_PDF_OUT) fs.writeFileSync(process.env.CERT_PDF_OUT, Buffer.from(pdf.output('arraybuffer')));
  });

  it('nome muito longo e com acentos não quebra', async () => {
    const { pdf } = await montarCertificadoPDF({ ...cert, nome: 'José Antônio Ribeiro Gonçalves Albuquerque de Vasconcelos Júnior Neto' });
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});

describe('layout: textos cabem nas suas áreas (fonte real)', () => {
  it('código, data, título e site cabem no selo, na caixa e na página', async () => {
    const { pdf } = await montarCertificadoPDF(cert);
    const largura = (peso, tamanho, texto) => {
      pdf.setFont('Montserrat', peso);
      pdf.setFontSize(tamanho);
      return pdf.getTextWidth(texto);
    };
    // caixa do ID: 76 mm de largura, painel do QR ocupa 30 → texto tem ~42 mm
    expect(largura('bold', 10, cert.codigo)).toBeLessThan(40);
    expect(largura('normal', 5, 'gestao.speakupcataguases.com/verificar')).toBeLessThan(40);
    // data dentro do círculo interno do selo (diâmetro 28,4 mm)
    expect(largura('bold', 8.6, '24/09/2026')).toBeLessThan(24);
    // título do certificado cabe na página com margem
    expect(largura('bold', 36, 'Certificate of Achievement')).toBeLessThan(260);
    // "CERTIFICATE OF ACHIEVEMENT" sob o selo não invade a caixa do ID (x=198) nem a assinatura
    expect(largura('normal', 5.5, 'CERTIFICATE OF ACHIEVEMENT') / 2 + 168).toBeLessThan(198);
  });
});
