/**
 * Gera o certificado de ponta a ponta com as fontes e a logo reais.
 * Com CERT_PDF_OUT=<caminho.pdf> grava o arquivo pra conferir o visual.
 */
const FONTES_REAIS = [
  'Montserrat-Regular.ttf', 'Montserrat-ExtraBold.ttf', 'Cinzel-SemiBold.ttf',
  'PlayfairDisplay-MediumItalic.ttf', 'CormorantGaramond-MediumItalic.ttf',
];
jest.mock('../assets/fonts/Montserrat-Regular.ttf', () => 'Montserrat-Regular.ttf', { virtual: true });
jest.mock('../assets/fonts/Montserrat-ExtraBold.ttf', () => 'Montserrat-ExtraBold.ttf', { virtual: true });
jest.mock('../assets/fonts/Cinzel-SemiBold.ttf', () => 'Cinzel-SemiBold.ttf', { virtual: true });
jest.mock('../assets/fonts/PlayfairDisplay-MediumItalic.ttf', () => 'PlayfairDisplay-MediumItalic.ttf', { virtual: true });
jest.mock('../assets/fonts/CormorantGaramond-MediumItalic.ttf', () => 'CormorantGaramond-MediumItalic.ttf', { virtual: true });
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

const { montarCertificadoPDF, dataPorExtenso } = require('../utils/certificadoPDF');

const cert = {
  codigo: 'SU-2026-K7QX4M',
  nome: 'Maria Eduarda Fernandes de Souza',
  titulo: 'B1 Intermediate English',
  nivel: 'B1',
  dataEmissao: '2026-09-24',
};

describe('certificado em PDF', () => {
  it('fontes do certificado existem no repositório', () => {
    FONTES_REAIS.forEach((f) => expect(arquivoReal(f).length).toBeGreaterThan(10000));
  });

  it('gera uma página A4 paisagem com nome de arquivo seguro', async () => {
    const { pdf, arquivo } = await montarCertificadoPDF(cert);
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(arquivo).toBe('certificado-Maria-Eduarda-Fernandes-de-Souza-SU-2026-K7QX4M.pdf');
    expect(pdf.getFontList()).toEqual(expect.objectContaining({
      Cinzel: expect.anything(), PlayfairDisplay: expect.anything(), CormorantGaramond: expect.anything(),
    }));
    if (process.env.CERT_PDF_OUT) fs.writeFileSync(process.env.CERT_PDF_OUT, Buffer.from(pdf.output('arraybuffer')));
  });

  it('nome longo com acentos e título livre (sem nível) não quebram', async () => {
    const { pdf } = await montarCertificadoPDF({
      ...cert, nivel: null, titulo: 'Conversation Club – Advanced Speaking Skills',
      nome: 'José Antônio Ribeiro Gonçalves Albuquerque de Vasconcelos Júnior Neto',
    });
    expect(pdf.getNumberOfPages()).toBe(1);
    if (process.env.CERT_PDF_OUT) fs.writeFileSync(process.env.CERT_PDF_OUT.replace('.pdf', '-longo.pdf'), Buffer.from(pdf.output('arraybuffer')));
  });
});

describe('dataPorExtenso', () => {
  it('dia antes do mês, em inglês', () => expect(dataPorExtenso('2026-09-04')).toBe('4 September 2026'));
  it('entrada inválida vira vazio', () => expect(dataPorExtenso('')).toBe(''));
});
