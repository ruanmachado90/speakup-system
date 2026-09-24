/**
 * Gráficos do relatório via Chart.js renderizado num canvas fora da tela e
 * rasterizado para dentro do PDF (doc.pdf.addImage).
 *
 * Roda 100% no cliente (o app é estático no Firebase Hosting). Cada função
 * devolve um dataURL PNG em alta resolução; o index.js posiciona no PDF em mm.
 *
 * Sem canvas disponível (SSR / testes jsdom) as funções devolvem `null` e o
 * chamador simplesmente não desenha a imagem.
 */

import montserratRegularUrl from '../../assets/fonts/Montserrat-Regular.ttf';
import { COR } from './documento';

const MM_PARA_PX = 3.7795; // 96dpi
const ESCALA = 3; // super-amostragem → nitidez no PDF

let _chartMod = null;
let _fontePronta = false;

async function carregarChart() {
  if (!_chartMod) {
    const mod = await import('chart.js/auto');
    _chartMod = mod.default || mod.Chart || mod;
    _chartMod.defaults.font.family = 'Montserrat, Helvetica, Arial, sans-serif';
    _chartMod.defaults.font.size = 11;
    _chartMod.defaults.color = COR.tinta;
    _chartMod.defaults.animation = false;
    _chartMod.defaults.plugins.legend.display = false;
  }
  return _chartMod;
}

async function garantirFonte() {
  if (_fontePronta || typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return;
  _fontePronta = true;
  try {
    const face = new FontFace('Montserrat', `url(${montserratRegularUrl})`);
    await face.load();
    document.fonts.add(face);
  } catch { /* fallback helvetica/arial */ }
}

function novoCanvas(wMm, hMm) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  let ctx = null;
  try { ctx = cv.getContext && cv.getContext('2d'); } catch { ctx = null; }
  if (!ctx || typeof ctx.measureText !== 'function') return null;
  // tamanho "CSS" em px; a nitidez vem do devicePixelRatio no Chart.js
  cv.width = Math.round(wMm * MM_PARA_PX);
  cv.height = Math.round(hMm * MM_PARA_PX);
  return cv;
}

async function renderizar(wMm, hMm, config) {
  const cv = novoCanvas(wMm, hMm);
  if (!cv) return null;
  let Chart;
  try {
    Chart = await carregarChart();
  } catch {
    return null;
  }
  await garantirFonte();
  config.options = config.options || {};
  config.options.responsive = false;
  config.options.maintainAspectRatio = false;
  config.options.animation = false;
  config.options.devicePixelRatio = ESCALA; // Chart.js amplia o backing store → PNG nítido
  try {
    const chart = new Chart(cv.getContext('2d'), config);
    chart.update('none');
    const url = cv.toDataURL('image/png', 1);
    chart.destroy();
    return url;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[graficosCanvas] falha ao renderizar:', e);
    return null;
  }
}

// ─────────────── paleta / helpers de estilo ───────────────

const GRID = { color: '#EDEEF1', lineWidth: 1 };
const TICK = { color: COR.cinza, font: { size: 10 } };
const semGrade = { grid: { display: false }, ticks: TICK, border: { color: '#D8DADE' } };

const fmtMil = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
};

// ─────────────── tipos de gráfico ───────────────

/** Barras verticais agrupadas. series: [{ nome, valores, cor }] */
export function graficoBarras(wMm, hMm, { labels = [], series = [], formato = fmtMil, empilhado = false } = {}) {
  return renderizar(wMm, hMm, {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((s) => ({
        label: s.nome,
        data: s.valores,
        backgroundColor: s.cor,
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 46,
      })),
    },
    options: {
      layout: { padding: { top: 18, right: 6, left: 2, bottom: 2 } },
      plugins: {
        legend: { display: series.length > 1, position: 'top', align: 'end', labels: { boxWidth: 9, boxHeight: 9, font: { size: 10 }, color: COR.cinza } },
        tooltip: { enabled: false },
        datalabels: false,
      },
      scales: {
        x: { stacked: empilhado, ...semGrade },
        y: { stacked: empilhado, grid: GRID, ticks: { ...TICK, callback: (v) => formato(v) }, border: { display: false } },
      },
    },
  });
}

/** Linha de tendência (série única). */
export function graficoLinha(wMm, hMm, { labels = [], valores = [], cor = COR.azul, formato = fmtMil } = {}) {
  return renderizar(wMm, hMm, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: valores,
        borderColor: cor,
        backgroundColor: `${cor}1A`,
        borderWidth: 2.5,
        pointRadius: 3.5,
        pointBackgroundColor: cor,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      layout: { padding: { top: 16, right: 10, left: 2, bottom: 2 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: semGrade,
        y: { grid: GRID, ticks: { ...TICK, callback: (v) => formato(v) }, border: { display: false }, beginAtZero: true },
      },
    },
  });
}

/** Barras horizontais (ranking / aging / funil). itens: [{ label, valor, cor }] */
export function graficoBarrasH(wMm, hMm, { itens = [], formato = fmtMil } = {}) {
  return renderizar(wMm, hMm, {
    type: 'bar',
    data: {
      labels: itens.map((i) => i.label),
      datasets: [{
        data: itens.map((i) => Number(i.valor) || 0),
        backgroundColor: itens.map((i) => i.cor || COR.azul),
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 26,
      }],
    },
    options: {
      indexAxis: 'y',
      layout: { padding: { top: 4, right: 46, left: 2, bottom: 2 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { grid: GRID, ticks: { ...TICK, callback: (v) => formato(v) }, border: { display: false }, beginAtZero: true },
        y: { ...semGrade, ticks: { ...TICK, font: { size: 10.5 } } },
      },
    },
  });
}

/** Dispersão com bolhas. pontos: [{ x, y, r?, label?, cor? }] */
export function graficoDispersao(wMm, hMm, { pontos = [], xLabel = '', yLabel = '', xMax, formatoX = (v) => Math.round(v), formatoY = fmtMil } = {}) {
  return renderizar(wMm, hMm, {
    type: 'bubble',
    data: {
      datasets: [{
        data: pontos.map((p) => ({ x: p.x, y: p.y, r: Math.max(3, Math.min(16, (p.r || 2) * 2)) })),
        backgroundColor: pontos.map((p) => `${p.cor || COR.azul}CC`),
        borderColor: pontos.map((p) => p.cor || COR.azul),
        borderWidth: 1,
      }],
    },
    options: {
      layout: { padding: { top: 8, right: 12, left: 2, bottom: 2 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          title: { display: !!xLabel, text: xLabel, color: COR.cinza, font: { size: 10 } },
          grid: GRID, ticks: { ...TICK, callback: (v) => formatoX(v) }, border: { display: false },
          min: 0, max: xMax,
        },
        y: {
          title: { display: !!yLabel, text: yLabel, color: COR.cinza, font: { size: 10 } },
          grid: GRID, ticks: { ...TICK, callback: (v) => formatoY(v) }, border: { display: false },
        },
      },
    },
  });
}

/** Rosca. itens: [{ label, valor, cor }] */
export function graficoRosca(wMm, hMm, { itens = [], formato = fmtMil } = {}) {
  const total = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  return renderizar(wMm, hMm, {
    type: 'doughnut',
    data: {
      labels: itens.map((i) => i.label),
      datasets: [{
        data: itens.map((i) => Number(i.valor) || 0),
        backgroundColor: itens.map((i) => i.cor || COR.azul),
        borderColor: '#fff',
        borderWidth: 2,
      }],
    },
    options: {
      cutout: '58%',
      layout: { padding: 6 },
      plugins: {
        legend: {
          display: true, position: 'right',
          labels: {
            boxWidth: 10, boxHeight: 10, font: { size: 10 }, color: COR.tinta,
            generateLabels: (chart) => chart.data.labels.map((l, idx) => {
              const v = chart.data.datasets[0].data[idx];
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return {
                text: `${l}  ${formato(v)} (${pct}%)`,
                fillStyle: chart.data.datasets[0].backgroundColor[idx],
                strokeStyle: chart.data.datasets[0].backgroundColor[idx],
                index: idx,
              };
            }),
          },
        },
        tooltip: { enabled: false },
      },
    },
  });
}
