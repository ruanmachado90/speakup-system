/**
 * Base do documento do relatório mensal: fontes, paleta, primitivas de layout.
 *
 * Identidade obrigatória:
 *  - Azul primário #0E48FE · amarelo #FFAE1E · rosa #F30961 · laranja #FC6E1F
 *  - Montserrat exclusivamente (ExtraBold nos títulos, Regular no corpo)
 *  - Texto corrido preto · estética minimalista
 *  - Nome: "SpeakUp English Language Academy" (documento institucional)
 */

import montserratRegularUrl from '../../assets/fonts/Montserrat-Regular.ttf';
import montserratExtraBoldUrl from '../../assets/fonts/Montserrat-ExtraBold.ttf';
import logoUrl from '../../assets/logo-speakup-azul.png';

export const COR = {
  azul: '#0E48FE',
  amarelo: '#FFAE1E',
  rosa: '#F30961',
  laranja: '#FC6E1F',
  preto: '#000000',
  tinta: '#111111',
  cinza: '#6B7178',
  cinzaClaro: '#9AA0A6',
  linha: '#E4E6E9',
  painel: '#F5F6F8',
  verde: '#0F8A4F',
  branco: '#FFFFFF',
};

// A4 paisagem (297 × 210 mm): imprime em papel comum E projeta em tela 16:9.
export const PAGINA = { L: 297, A: 210, margem: 16 };
export const LARGURA = PAGINA.L - PAGINA.margem * 2;

const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

// ───────────────── carregamento de assets (uma vez) ─────────────────

const bufferParaBase64 = (buf) => {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

let _assetsPromise = null;
async function carregarAssets() {
  if (!_assetsPromise) {
    _assetsPromise = (async () => {
      const [regular, extraBold, logoBlob] = await Promise.all([
        fetch(montserratRegularUrl).then((r) => r.arrayBuffer()),
        fetch(montserratExtraBoldUrl).then((r) => r.arrayBuffer()),
        fetch(logoUrl).then((r) => r.blob()),
      ]);
      const logoDataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(logoBlob);
      });
      return {
        regular: bufferParaBase64(regular),
        extraBold: bufferParaBase64(extraBold),
        logo: logoDataUrl,
      };
    })().catch((err) => {
      console.error('[relatorioMensal] Falha ao carregar fontes/logo:', err);
      return null;
    });
  }
  return _assetsPromise;
}

// ───────────────── criação do documento ─────────────────

/**
 * Cria um jsPDF A4 já com Montserrat registrada e helpers de desenho.
 * @returns {Promise<Doc>}
 */
export async function criarDocumento() {
  const { jsPDF } = await import('jspdf');
  const assets = await carregarAssets();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });

  let temMontserrat = false;
  if (assets) {
    doc.addFileToVFS('Montserrat-Regular.ttf', assets.regular);
    doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
    doc.addFileToVFS('Montserrat-ExtraBold.ttf', assets.extraBold);
    doc.addFont('Montserrat-ExtraBold.ttf', 'Montserrat', 'bold');
    temMontserrat = true;
  }

  const familia = temMontserrat ? 'Montserrat' : 'helvetica';

  return new Doc(doc, familia, assets?.logo || null);
}

/** Wrapper com as primitivas de layout do relatório. */
export class Doc {
  constructor(pdf, familia, logo) {
    this.pdf = pdf;
    this.familia = familia;
    this.logo = logo;
    this.y = 0;
    this.pagina = 1;
    this.rodapeTexto = '';
  }

  // — estado de fonte/cor —
  fonte(peso = 'normal', tamanho = 9) {
    this.pdf.setFont(this.familia, peso === 'bold' ? 'bold' : 'normal');
    this.pdf.setFontSize(tamanho);
    return this;
  }

  cor(c) { this.pdf.setTextColor(...hex(c)); return this; }
  preenche(c) { this.pdf.setFillColor(...hex(c)); return this; }
  traco(c) { this.pdf.setDrawColor(...hex(c)); return this; }

  larguraTexto(t) { return this.pdf.getTextWidth(String(t)); }

  /** Ajusta o tamanho da fonte pra caber `texto` em `maxW` (entre base e min). */
  ajustar(texto, maxW, base, min) {
    let t = base;
    while (t > min) {
      this.pdf.setFontSize(t);
      if (this.pdf.getTextWidth(String(texto)) <= maxW) break;
      t -= 0.5;
    }
    this.pdf.setFontSize(t);
    return t;
  }

  texto(t, x, y, opts = {}) {
    // Montserrat (subset latin) não tem alguns glifos: normaliza antes.
    const limpar = (s) => String(s)
      .replace(/\u00A0/g, ' ')
      .replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/→/g, '>').replace(/↔/g, '-')
      .replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/[—–]/g, '-')
      .replace(/[Δ▲▼∑]/g, '');
    const v = Array.isArray(t) ? t.map(limpar) : limpar(t);
    this.pdf.text(v, x, y, opts);
    return this;
  }

  // — controle de página —
  precisaEspaco(altura) {
    if (this.y + altura > PAGINA.A - 20) this.novaPagina();
  }

  novaPagina() {
    this.desenharRodape();
    this.pdf.addPage();
    this.pagina += 1;
    this.desenharCabecalhoContinuacao();
  }

  /** Cabeçalho completo (capa e primeira página de cada bloco grande). */
  cabecalho(periodoLabel) {
    const { margem } = PAGINA;
    if (this.logo) {
      try {
        this.pdf.addImage(this.logo, 'PNG', margem, 13, 38, 38 * (204 / 943));
      } catch { /* sem logo */ }
    }
    this.fonte('bold', 9).cor(COR.tinta);
    this.texto('SpeakUp English Language Academy', PAGINA.L - margem, 15, { align: 'right' });
    this.fonte('normal', 7.5).cor(COR.cinza);
    this.texto('Relatório gerencial mensal', PAGINA.L - margem, 19.5, { align: 'right' });
    this.texto(periodoLabel, PAGINA.L - margem, 23.5, { align: 'right' });

    this.traco(COR.azul).setLine(0.6);
    this.pdf.line(margem, 28, PAGINA.L - margem, 28);
    this.y = 36;
  }

  desenharCabecalhoContinuacao() {
    const { margem } = PAGINA;
    this.fonte('bold', 7.5).cor(COR.cinzaClaro);
    this.texto('SPEAKUP ENGLISH LANGUAGE ACADEMY', margem, 12, { charSpace: 0.4 });
    this.traco(COR.linha).setLine(0.3);
    this.pdf.line(margem, 15, PAGINA.L - margem, 15);
    this.y = 22;
  }

  desenharRodape() {
    const { margem } = PAGINA;
    const yy = PAGINA.A - 12;
    this.traco(COR.linha).setLine(0.3);
    this.pdf.line(margem, yy, PAGINA.L - margem, yy);
    this.fonte('normal', 7).cor(COR.cinzaClaro);
    if (this.rodapeTexto) this.texto(this.rodapeTexto, margem, yy + 4.5, { maxWidth: LARGURA - 25 });
    this.texto(`Página ${this.pagina}`, PAGINA.L - margem, yy + 4.5, { align: 'right' });
  }

  setLine(w) { this.pdf.setLineWidth(w); return this; }

  // — slides (1 assunto por página, formato paisagem) —

  /**
   * Inicia um novo slide com cabeçalho consistente.
   * O primeiro slide reaproveita a página inicial; os demais dão addPage.
   * @param {string} titulo
   * @param {object} [opts] { subtitulo, primeiro }
   */
  slide(titulo, opts = {}) {
    const { subtitulo = '', primeiro = false } = opts;
    const { margem } = PAGINA;
    if (!primeiro) {
      this.desenharRodape();
      this.pdf.addPage();
      this.pagina += 1;
    }
    // faixa de marca no topo
    if (this.logo) {
      try { this.pdf.addImage(this.logo, 'PNG', margem, 10, 26, 26 * (204 / 943)); } catch { /* sem logo */ }
    }
    this.fonte('bold', 7).cor(COR.cinzaClaro);
    this.texto('SPEAKUP ENGLISH LANGUAGE ACADEMY', PAGINA.L - margem, 13, { align: 'right', charSpace: 0.4 });
    this.fonte('normal', 6.5).cor(COR.cinzaClaro);
    this.texto(this.rodapeTexto ? this.rodapeTexto.split(' · ')[1] || '' : '', PAGINA.L - margem, 17.5, { align: 'right' });

    // título do slide
    this.fonte('bold', 17).cor(COR.tinta);
    this.texto(String(titulo).toUpperCase(), margem, 26, { charSpace: 0.3 });
    this.traco(COR.azul).setLine(0.8);
    this.pdf.line(margem, 29.5, margem + 26, 29.5);
    if (subtitulo) {
      this.fonte('normal', 8).cor(COR.cinza);
      this.texto(subtitulo, margem, 35);
      this.y = 41;
    } else {
      this.y = 37;
    }
    return this;
  }

  /** Faixa de rodapé de um slide (chamada só no fim do documento). */
  slideRodape() { this.desenharRodape(); }

  // — blocos reutilizáveis —

  /** Título de bloco. `reservar` = espaço mínimo (mm) que o bloco precisa logo abaixo. */
  tituloSecao(txt, reservar = 46) {
    this.precisaEspaco(12 + reservar);
    this.y += 2;
    this.fonte('bold', 12).cor(COR.tinta);
    this.texto(txt.toUpperCase(), PAGINA.margem, this.y);
    this.y += 2.5;
    this.traco(COR.azul).setLine(0.5);
    this.pdf.line(PAGINA.margem, this.y, PAGINA.margem + 22, this.y);
    this.y += 6;
  }

  /**
   * Card de KPI com valor + variação.
   * @param {object} k { label, valorFmt, disponivel, motivo, variacao: {pct, direcao, disponivel}, sufixo }
   */
  cardKPI(x, y, w, h, k) {
    this.preenche(COR.painel).pdf.rect(x, y, w, h, 'F');
    this.preenche(COR.azul).pdf.rect(x, y, 1.2, h, 'F');
    const px = x + 5;
    const maxW = w - 8;

    // rótulo: no máximo 2 linhas, encolhe pra caber
    this.fonte('normal', 6.4).cor(COR.cinza);
    let rot = this.pdf.splitTextToSize(k.label.toUpperCase(), maxW);
    if (rot.length > 2) rot = [rot[0], rot[1]];
    this.texto(rot, px, y + 4.6, { charSpace: 0.2, lineHeightFactor: 1.25 });
    const yBase = y + 4.6 + (rot.length - 1) * 2.6;

    if (k.disponivel) {
      this.fonte('bold', 14).cor(COR.tinta);
      this.ajustar(k.valorFmt, maxW, 14, 8.5);
      this.texto(k.valorFmt, px, yBase + 8);
      this.pdf.setFontSize(9);

      if (k.sufixo) {
        this.fonte('normal', 6).cor(COR.cinza);
        const suf = this.pdf.splitTextToSize(k.sufixo, maxW);
        this.texto(suf.slice(0, 2), px, yBase + 12.5, { lineHeightFactor: 1.2 });
      }
      // só desenha a linha de variação quando o card pediu comparação
      if ('variacao' in k && k.variacao !== undefined) {
        this.desenharVariacao(px, y + h - 3.2, k.variacao, k.menorEhMelhor);
      }
    } else {
      this.fonte('bold', 8.5).cor(COR.cinzaClaro);
      this.texto('dado indisponível', px, yBase + 7);
      if (k.motivo) {
        this.fonte('normal', 5.6).cor(COR.cinzaClaro);
        this.texto(this.pdf.splitTextToSize(k.motivo, maxW).slice(0, 2), px, yBase + 11, { lineHeightFactor: 1.2 });
      }
    }
  }

  /**
   * Card especial do índice de saúde do negócio (0-100) — cor do próprio card
   * muda com o nível (bom/atenção/crítico), não só o texto.
   * @param {object} indice { valor, disponivel, nivel, motivo }
   */
  cardIndiceSaude(x, y, w, h, indice) {
    const corNivel = indice.nivel === 'bom' ? COR.verde : indice.nivel === 'atencao' ? COR.laranja : COR.rosa;
    this.preenche(COR.painel).pdf.rect(x, y, w, h, 'F');
    this.preenche(indice.disponivel ? corNivel : COR.cinzaClaro).pdf.rect(x, y, w, 1.6, 'F');
    const px = x + 5;
    const maxW = w - 8;

    this.fonte('normal', 6.4).cor(COR.cinza);
    this.texto('ÍNDICE DE SAÚDE DO NEGÓCIO', px, y + 6, { charSpace: 0.2 });

    if (indice.disponivel) {
      this.fonte('bold', 20).cor(corNivel);
      this.texto(`${Math.round(indice.valor)}`, px, y + 20);
      this.fonte('normal', 9).cor(COR.cinzaClaro);
      this.texto('/100', px + this.larguraTexto(`${Math.round(indice.valor)}`) + 2, y + 20);
      this.fonte('bold', 7).cor(corNivel);
      const rotuloNivel = indice.nivel === 'bom' ? 'BOM' : indice.nivel === 'atencao' ? 'ATENÇÃO' : 'CRÍTICO';
      this.texto(rotuloNivel, x + w - 5, y + 8, { align: 'right', charSpace: 0.3 });
      if (indice.motivo) {
        this.fonte('normal', 6).cor(COR.cinza);
        this.texto(this.pdf.splitTextToSize(indice.motivo, maxW).slice(0, 2), px, y + 26, { lineHeightFactor: 1.2 });
      }
    } else {
      this.fonte('bold', 8.5).cor(COR.cinzaClaro);
      this.texto('dado indisponível', px, y + 18);
      if (indice.motivo) {
        this.fonte('normal', 5.6).cor(COR.cinzaClaro);
        this.texto(this.pdf.splitTextToSize(indice.motivo, maxW).slice(0, 2), px, y + 23, { lineHeightFactor: 1.2 });
      }
    }
  }

  /**
   * Insere uma imagem (dataURL PNG de um gráfico Chart.js) numa caixa em mm.
   * Sem imagem (ex.: canvas indisponível em teste) desenha um placeholder discreto.
   */
  imagem(dataUrl, x, y, w, h) {
    if (!dataUrl) {
      this.preenche(COR.painel).pdf.rect(x, y, w, h, 'F');
      this.fonte('normal', 7).cor(COR.cinzaClaro);
      this.texto('gráfico indisponível neste ambiente', x + w / 2, y + h / 2, { align: 'center' });
      return this;
    }
    try {
      this.pdf.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST');
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[relatorioMensal] addImage falhou:', e);
    }
    return this;
  }

  /**
   * Uma fileira de cards de KPI ocupando toda a largura. Avança this.y.
   * Um item com `{ indiceSaude: {...} }` desenha o card especial de saúde.
   */
  fileiraCards(cards, { h = 34, gap = 3 } = {}) {
    const n = cards.length || 1;
    const w = (LARGURA - gap * (n - 1)) / n;
    cards.forEach((k, i) => {
      const x = PAGINA.margem + i * (w + gap);
      if (k.indiceSaude) this.cardIndiceSaude(x, this.y, w, h, k.indiceSaude);
      else this.cardKPI(x, this.y, w, h, k);
    });
    this.y += h + 6;
    return this;
  }

  desenharVariacao(x, y, v, menorEhMelhor = false) {
    if (!v || !v.disponivel) {
      this.fonte('normal', 6).cor(COR.cinzaClaro).texto('sem comparação', x, y);
      return;
    }
    const sobe = v.direcao === 'up';
    const neutro = v.direcao === 'flat';
    const bom = menorEhMelhor ? v.direcao === 'down' : sobe;
    const c = neutro ? COR.cinza : bom ? COR.verde : COR.rosa;
    const pct = Math.abs(v.pct) >= 999 ? '> 999' : Math.abs(v.pct).toFixed(1);
    const sinal = neutro ? '' : sobe ? '+' : '-';
    // seta vetorial (triângulo pequeno) — a fonte subset não tem os glifos ▲▼
    if (!neutro) {
      this.preenche(c);
      const ax = x + 1.2;
      if (sobe) this.pdf.triangle(ax - 1.1, y - 0.6, ax + 1.1, y - 0.6, ax, y - 2.6, 'F');
      else this.pdf.triangle(ax - 1.1, y - 2.6, ax + 1.1, y - 2.6, ax, y - 0.6, 'F');
    }
    this.fonte('bold', 6.6).cor(c);
    this.texto(`${sinal}${pct}%  ${this.vsLabel || 'vs. mês ant.'}`, x + (neutro ? 0 : 4), y);
  }

  /**
   * Tabela simples. colunas: [{ titulo, chave, alinha?, largura? }]
   * linhas: array de objetos. Faz quebra de página sozinha.
   */
  tabela(colunas, linhas, { destaqueUltima = false } = {}) {
    const { margem } = PAGINA;
    const larguraLivre = LARGURA - colunas.reduce((s, c) => s + (c.largura || 0), 0);
    const nAuto = colunas.filter((c) => !c.largura).length;
    const larguraAuto = nAuto > 0 ? larguraLivre / nAuto : 0;
    const larguraCol = (c) => c.largura || larguraAuto;

    const desenharCabecalho = () => {
      this.precisaEspaco(12);
      this.preenche(COR.tinta).pdf.rect(margem, this.y, LARGURA, 7, 'F');
      this.fonte('bold', 6.8).cor(COR.branco);
      let cx = margem + 2.5;
      for (const c of colunas) {
        const cw = larguraCol(c);
        this.texto(c.titulo.toUpperCase(), c.alinha === 'right' ? cx + cw - 5 : cx, this.y + 4.7, {
          align: c.alinha === 'right' ? 'right' : 'left',
          charSpace: 0.2,
        });
        cx += cw;
      }
      this.y += 7;
    };

    desenharCabecalho();
    linhas.forEach((linha, i) => {
      const alturaLinha = 6.5;
      if (this.y + alturaLinha > PAGINA.A - 20) {
        this.novaPagina();
        desenharCabecalho();
      }
      const ultima = destaqueUltima && i === linhas.length - 1;
      if (ultima) this.preenche(COR.painel).pdf.rect(margem, this.y, LARGURA, alturaLinha, 'F');
      this.fonte(ultima ? 'bold' : 'normal', 7).cor(COR.tinta);
      let cx = margem + 2.5;
      for (const c of colunas) {
        const cw = larguraCol(c);
        const bruto = typeof c.render === 'function' ? c.render(linha) : linha[c.chave];
        const val = bruto == null || bruto === '' ? '—' : String(bruto);
        this.ajustar(val, cw - 5, 7, 5.5);
        this.texto(val, c.alinha === 'right' ? cx + cw - 5 : cx, this.y + 4.4, {
          align: c.alinha === 'right' ? 'right' : 'left',
        });
        this.pdf.setFontSize(7);
        cx += cw;
      }
      this.traco(COR.linha).setLine(0.2);
      this.pdf.line(margem, this.y + alturaLinha, PAGINA.L - margem, this.y + alturaLinha);
      this.y += alturaLinha;
    });
    this.y += 4;
  }

  /** Parágrafo de nota/indisponibilidade. */
  nota(txt, cor = COR.cinza) {
    this.fonte('normal', 7).cor(cor);
    const linhas = this.pdf.splitTextToSize(String(txt), LARGURA);
    const h = linhas.length * 3.4 + 3;
    this.precisaEspaco(h);
    this.fonte('normal', 7).cor(cor);
    linhas.forEach((ln, i) => this.texto(ln, PAGINA.margem, this.y + i * 3.4));
    this.y += h;
  }

  espaco(mm) { this.y += mm; }

  finalizar(nomeArquivo) {
    this.desenharRodape();
    this.pdf.save(nomeArquivo);
  }

  blob() {
    this.desenharRodape();
    return this.pdf.output('blob');
  }
}
