import { CATEGORIAS, calcularConceito } from '../hooks/useNotas';

const LOGO_AZUL_URL = 'https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png';

// Raio/perímetro do círculo de resultado — fixo, não depende do aluno.
const CIRC = +(2 * Math.PI * 90).toFixed(2);

const conc = (n) => n != null ? calcularConceito(Math.round(n)) : '—';
const concColor = (c) => {
  if (!c || c === '—') return '#94a3b8';
  if (['A+', 'A'].includes(c)) return '#16a34a';
  if (['B+', 'B'].includes(c)) return '#2563eb';
  if (['C+', 'C'].includes(c)) return '#d97706';
  if (c === 'C-') return '#ea580c';
  if (c === 'D') return '#9d174d';
  return '#dc2626';
};

const CAT_ICONS = {
  written: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  listening: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  speaking: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};

const FAIXA_RANGES = { 'A+': '95–100', 'A': '90–94', 'B+': '85–89', 'B': '80–84', 'C+': '75–79', 'C': '70–74', 'C-': '60–69', 'D': '50–59', 'F': '< 50' };

const STYLE = `
:root{--blue:#0e48fe;--blue-06:rgba(14,72,254,.06);--blue-10:rgba(14,72,254,.10);--orange:#fc6e1f;--red:#f30961;--success:#16a34a;--muted:#525a68;--hint:#64748b;--title:'Plus Jakarta Sans',sans-serif;--body:'Montserrat',sans-serif;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:12mm 14mm}
html{background:#d6dde8}
body{font-family:var(--body);background:#d6dde8;-webkit-font-smoothing:antialiased}
.boletim-page{display:flex;align-items:flex-start;justify-content:center;padding:24px 16px 40px}
.boletim{width:794px;max-width:100%;background:#fff;border-radius:14px;padding:26px 30px 28px;box-shadow:0 8px 28px rgba(15,23,42,.12)}
.page-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:16px;border-bottom:3px solid var(--blue)}
.logo-area{display:flex;align-items:center;gap:10px;min-width:150px}
.logo-area img{height:34px;object-fit:contain}
.logo-tagline{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.title-area{text-align:center;flex:1;padding:0 16px}
.boletim-title{font-family:var(--title);font-size:17px;font-weight:800;color:#111827;letter-spacing:.04em;text-transform:uppercase}
.boletim-subtitle{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.header-right{text-align:right;min-width:90px}
.header-right .h-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint)}
.header-right .h-val{font-family:var(--title);font-size:15px;font-weight:800;color:#111827;margin-top:2px}
.student-card{background:#f4f7ff;border:1px solid rgba(14,72,254,.14);border-radius:10px;padding:12px 16px;display:grid;grid-template-columns:auto 1px 1fr 1px 1fr 1px 1fr;gap:0;align-items:center;margin-bottom:14px}
.avatar-wrap{display:flex;align-items:center;gap:10px;padding-right:14px}
.avatar{width:40px;height:40px;border-radius:50%;background:var(--blue-06);display:flex;align-items:center;justify-content:center;font-family:var(--title);font-size:13px;font-weight:800;color:var(--blue);border:2px solid var(--blue-10)}
.sname{font-family:var(--title);font-size:13px;font-weight:700;color:#111827;letter-spacing:-.02em}
.smeta{font-size:10px;color:var(--hint);margin-top:3px;font-weight:500}
.divider{width:1px;height:34px;background:rgba(14,72,254,.12);margin:0 14px}
.info-col{display:flex;align-items:center;gap:8px}
.info-icon{width:26px;height:26px;border-radius:7px;background:var(--blue-06);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.info-icon svg{width:13px;height:13px;color:var(--blue)}
.col-label{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--hint);margin-bottom:2px}
.col-value{font-family:var(--title);font-size:12px;font-weight:700;color:#111827}
.main-grid{display:grid;grid-template-columns:1fr 196px;gap:12px;margin-bottom:12px}
.table-card{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:10px;overflow:hidden}
.grades-table{width:100%;border-collapse:collapse}
.grades-table th{font-family:var(--body);font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:10px 11px;text-align:center;border-bottom:1px solid rgba(0,0,0,.07);white-space:nowrap}
.grades-table th.th-av{text-align:left;font-size:11px;color:var(--muted);font-weight:700}
.grades-table th.th-r{color:var(--blue);font-weight:700}
.grades-table tr.sub-head th{font-size:9.5px;color:var(--hint);padding:5px 11px 8px;font-weight:600;border-bottom:1px solid rgba(0,0,0,.07);background:#fafbff}
.grades-table td{padding:12px 11px;text-align:center;border-bottom:1px solid rgba(0,0,0,.07);vertical-align:middle}
.grades-table td.td-av{text-align:left;padding-left:12px}
.test-row{display:flex;align-items:center;gap:9px}
.test-icon{width:26px;height:26px;border-radius:7px;background:var(--blue-06);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.test-icon svg{width:12px;height:12px;color:var(--blue)}
.test-name{font-size:12px;font-weight:600;color:#111827}
.test-pts{font-size:10px;color:var(--hint);font-weight:400;margin-top:1px}
.conc{font-family:var(--title);font-size:14px;font-weight:800;letter-spacing:-.01em}
.conc-mini{font-family:var(--title);font-size:11px;font-weight:800;letter-spacing:-.01em;margin-left:6px;vertical-align:middle}
.total-row td{background:rgba(14,72,254,.03)!important;border-top:1px solid rgba(14,72,254,.1);border-bottom:none;padding:12px 11px}
.result-card{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:10px;padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center}
.r-title{font-family:var(--body);font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--blue);margin-bottom:14px;text-align:center}
.circle-wrap{position:relative;width:154px;height:154px;margin-bottom:8px}
.circle-wrap svg{width:154px;height:154px;transform:rotate(-90deg)}
.circle-bg{fill:none;stroke:rgba(14,72,254,.08);stroke-width:9}
.circle-prog{fill:none;stroke:var(--blue);stroke-width:9;stroke-linecap:round;stroke-dasharray:${CIRC};transition:stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)}
.circle-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.c-score{font-family:var(--title);font-size:42px;font-weight:800;color:#111827;letter-spacing:-.04em;line-height:1}
.c-conc{font-family:var(--title);font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1}
.r-status{font-family:var(--body);font-size:10.5px;color:var(--hint);font-weight:500;margin-bottom:8px;text-align:center}
.divider2{width:100%;height:1px;background:rgba(0,0,0,.06);margin:0 0 10px}
.r-score-row{text-align:center;margin-bottom:0}
.r-score-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--blue);margin-bottom:3px}
.r-score-big{font-family:var(--title);font-size:19px;font-weight:800;color:#111827;letter-spacing:-.02em}
.r-score-big span{color:var(--muted);font-size:12px;font-weight:500}
.bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.bottom-card{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:10px;padding:15px 18px}
.bc-title{display:flex;align-items:center;gap:7px;font-family:var(--body);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.bc-title svg{width:14px;height:14px;color:var(--blue)}
.crit-item{display:flex;gap:8px;margin-bottom:8px;align-items:flex-start}
.crit-icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.crit-icon svg{width:11px;height:11px}
.ci-w{background:var(--blue-06)}.ci-w svg{color:var(--blue)}
.ci-l{background:rgba(252,110,31,.07)}.ci-l svg{color:var(--orange)}
.ci-s{background:rgba(22,163,74,.07)}.ci-s svg{color:var(--success)}
.crit-text{font-size:10.5px;color:var(--muted);line-height:1.55}
.crit-text strong{color:var(--blue);font-weight:600;font-size:10.5px}
.scale-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.scale-item{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;border:1px solid rgba(0,0,0,.07)}
.scale-badge{width:26px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:var(--title);font-size:10.5px;font-weight:800;flex-shrink:0}
.scale-range{font-size:10px;color:var(--muted);font-weight:500;white-space:nowrap}
.sig-line{border-bottom:1.5px solid #374151;margin:20px 20px 8px}
.signatures{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid rgba(0,0,0,.07);padding-top:18px;margin-bottom:18px}
.sig-col{text-align:center;padding:0 16px}
.sig-col+.sig-col{border-left:1px solid rgba(0,0,0,.07)}
.sig-role{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--hint);margin-bottom:6px}
.sig-name{font-size:10.5px;color:var(--muted);font-weight:500}
.footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(0,0,0,.07);padding-top:12px;margin-top:0}
.footer-left{display:flex;align-items:center;gap:8px}
.footer-left svg{width:14px;height:14px;color:var(--blue);opacity:.5}
.footer span,.footer-right{font-size:10px;color:var(--hint);font-weight:500}
.boletim-page + .boletim-page{page-break-before:always}
@media print{
  html,body{background:#fff!important;padding:0!important;margin:0!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  a{text-decoration:none}
  .boletim-page{padding:0!important}
  .boletim{box-shadow:none!important;border-radius:0!important;padding:0!important;width:100%!important;max-width:100%!important;margin:0!important}
}
`;

// Monta o miolo (div .boletim) de um boletim — reaproveitado tanto pra
// impressão individual quanto pro PDF em lote com vários alunos.
function buildBoletimBody({ student, turmaInfo, notas, total1, total2, totalFinal, anoAtual, etapaLabel = '1º e 2º Semestre' }, circleId, animar) {
  const fmt = (n) => n != null ? Math.round(n) : '—';
  const initials = (student.name || '??').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const turmaLabel = turmaInfo ? (turmaInfo.nome || turmaInfo.name || '') : (student.course || '—');
  const nivelLabel = turmaInfo?.nivel || '—';
  const professorLabel = student.teacher || '—';
  const pct = totalFinal != null ? totalFinal / 100 : 0;
  const circOffset = +(CIRC * (1 - pct)).toFixed(2);
  const cFinal = conc(totalFinal);
  const c1Total = conc(total1);
  const c2Total = conc(total2);
  const statusLabel = totalFinal == null ? '' : totalFinal >= 90 ? 'Excelente desempenho' : totalFinal >= 75 ? 'Ótimo desempenho' : totalFinal >= 60 ? 'Desempenho regular' : 'Desempenho abaixo da média';
  const emitidoEm = new Date().toLocaleDateString('pt-BR');

  const tableRows = CATEGORIAS.map((cat, i) => {
    const n1 = notas[0][i]; const n2 = notas[1][i];
    const nota1 = fmt(n1.nota);
    const nota2 = fmt(n2.nota);
    const spanAttr = i === 0 ? ` colspan="2" rowspan="${CATEGORIAS.length}"` : '';
    return `<tr>
      <td class="td-av"><div class="test-row"><div class="test-icon">${CAT_ICONS[cat.tipo]}</div><div class="test-info"><div class="test-name">${cat.label} Test</div><div class="test-pts">/ ${cat.max} pts</div></div></div></td>
      <td>${nota1}</td>
      <td>${nota2}</td>
      ${i === 0 ? `<td${spanAttr} style="border-left:1px solid rgba(14,72,254,0.12);background:#fafbff;"></td>` : ''}
    </tr>`;
  }).join('');

  // Cores da legenda batem exatamente com concColor() — mesma cor que o badge
  // de conceito realmente exibido no boletim, pra não confundir quem compara.
  const scaleItems = Object.keys(FAIXA_RANGES).map(label => {
    const color = concColor(label);
    return [label, FAIXA_RANGES[label], `${color}1a`, color];
  });

  // Sem animação (lote): já nasce com o offset final, garantindo que o PDF
  // saia certo mesmo sem esperar nenhum script rodar.
  const dashoffsetInicial = animar ? CIRC : circOffset;

  return `<div class="boletim">
<div class="page-header">
  <div class="logo-area">
    <img src="${LOGO_AZUL_URL}" alt="SpeakUp" />
  </div>
  <div class="title-area">
    <div class="boletim-title">Boletim Semestral</div>
    <div class="boletim-subtitle">${etapaLabel} &nbsp;•&nbsp; ${anoAtual}</div>
  </div>
  <div class="header-right">
    <div class="h-label">Ano Letivo</div>
    <div class="h-val">${anoAtual}</div>
  </div>
</div>
<div class="student-card">
  <div class="avatar-wrap">
    <div class="avatar">${initials}</div>
    <div><div class="sname">${student.name}</div><div class="smeta">Aluno(a) &nbsp;•&nbsp; Ano letivo ${anoAtual}</div></div>
  </div>
  <div class="divider"></div>
  <div class="info-col" style="padding:0 14px">
    <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
    <div><div class="col-label">Turma</div><div class="col-value">${turmaLabel}</div></div>
  </div>
  <div class="divider"></div>
  <div class="info-col" style="padding:0 14px">
    <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg></div>
    <div><div class="col-label">Nível</div><div class="col-value">${nivelLabel}</div></div>
  </div>
  <div class="divider"></div>
  <div class="info-col" style="padding:0 0 0 14px">
    <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
    <div><div class="col-label">Professor(a)</div><div class="col-value">${professorLabel}</div></div>
  </div>
</div>
<div class="main-grid">
  <div class="table-card">
    <table class="grades-table">
      <thead>
        <tr>
          <th class="th-av" rowspan="2" style="padding-left:20px;">Avaliação</th>
          <th style="border-left:1px solid rgba(0,0,0,.06)">1º Semestre</th>
          <th style="border-left:1px solid rgba(0,0,0,.06)">2º Semestre</th>
          <th colspan="2" class="th-r" style="border-left:1px solid rgba(0,0,0,.06)">Resultado Final</th>
        </tr>
        <tr class="sub-head">
          <th style="border-left:1px solid rgba(0,0,0,.06)">Nota</th>
          <th style="border-left:1px solid rgba(0,0,0,.06)">Nota</th>
          <th style="border-left:1px solid rgba(0,0,0,.06)">Pontos</th>
          <th>Conceito</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="total-row">
          <td class="td-av" style="font-family:var(--title);font-size:12px;font-weight:700;padding-left:12px">TOTAL <span style="font-size:10px;color:var(--hint);font-weight:500">/ 100 pts</span></td>
          <td style="border-left:1px solid rgba(14,72,254,.12)"><span style="font-family:var(--title);font-size:18px;font-weight:700">${fmt(total1)}</span>${total1 != null ? `<span class="conc-mini" style="color:${concColor(c1Total)}">${c1Total}</span>` : ''}</td>
          <td style="border-left:1px solid rgba(14,72,254,.12)"><span style="font-family:var(--title);font-size:18px;font-weight:700">${fmt(total2)}</span>${total2 != null ? `<span class="conc-mini" style="color:${concColor(c2Total)}">${c2Total}</span>` : ''}</td>
          <td style="border-left:1px solid rgba(14,72,254,.12)"><span style="font-family:var(--title);font-size:20px;font-weight:700;color:#111827">${fmt(totalFinal)}</span></td>
          <td><span class="conc" style="font-size:18px;color:${concColor(cFinal)}">${cFinal}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="result-card">
    <div class="r-title">Resultado Final</div>
    <div class="circle-wrap">
      <svg viewBox="0 0 200 200"><circle class="circle-bg" cx="100" cy="100" r="90"/><circle class="circle-prog" id="${circleId}" style="stroke-dashoffset:${dashoffsetInicial}" cx="100" cy="100" r="90"/></svg>
      <div class="circle-inner">
        <div class="c-score">${fmt(totalFinal)}</div>
        <div class="c-conc" style="color:${concColor(cFinal)}">${cFinal}</div>
      </div>
    </div>
    <div class="r-status">${statusLabel}</div>
    <div class="divider2"></div>
    <div class="r-score-row"><div class="r-score-label">Aproveitamento Geral</div><div class="r-score-big">${fmt(totalFinal)} <span>/ 100 pts</span></div></div>
  </div>
</div>
<div class="bottom-grid">
  <div class="bottom-card">
    <div class="bc-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Critérios de Avaliação</div>
    <div class="crit-item"><div class="crit-icon ci-w">${CAT_ICONS.written}</div><div class="crit-text"><strong>Written Test (50 pts)</strong> — Vocabulary, Grammar, Reading e Use of English. Aplicada ao término de cada unidade.</div></div>
    <div class="crit-item"><div class="crit-icon ci-l">${CAT_ICONS.listening}</div><div class="crit-text"><strong>Listening Test (30 pts)</strong> — Compreensão de áudio: diálogos, apresentações e narrações. Aplicada ao final do semestre.</div></div>
    <div class="crit-item"><div class="crit-icon ci-s">${CAT_ICONS.speaking}</div><div class="crit-text"><strong>Speaking Test (20 pts)</strong> — Avaliação oral em dupla. Critérios: argumentação, organização, espontaneidade e desenvoltura. Aplicada ao final do semestre.</div></div>
  </div>
  <div class="bottom-card">
    <div class="bc-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Tabela de Conceitos</div>
    <div class="scale-grid">${scaleItems.map(([label, range, bg, color]) =>
      `<div class="scale-item"><div class="scale-badge" style="background:${bg};color:${color}">${label}</div><span class="scale-range">${range}</span></div>`
    ).join('')}</div>
  </div>
</div>
<div class="signatures">
  <div class="sig-col">
    <div class="sig-role">Professor(a)</div>
    <div class="sig-line"></div>
    <div class="sig-name">${professorLabel}</div>
  </div>
  <div class="sig-col">
    <div class="sig-role">Coordenação</div>
    <div class="sig-line"></div>
    <div class="sig-name">SpeakUp English Language Academy</div>
  </div>
</div>
<footer class="footer">
  <div class="footer-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg><span>SpeakUp English Language Academy &nbsp;•&nbsp; Cataguases, MG</span></div>
  <div class="footer-right">Documento oficial — uso interno e externo &nbsp;•&nbsp; Emitido em ${emitidoEm}</div>
</footer>
</div>`;
}

// Boletim de um único aluno, documento HTML completo pronto pra impressão.
export function buildBoletimHTML(params) {
  const circleId = 'cp-single';
  const pct = params.totalFinal != null ? params.totalFinal / 100 : 0;
  const circOffset = +(CIRC * (1 - pct)).toFixed(2);
  const body = buildBoletimBody(params, circleId, true);
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Boletim — ${params.student.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${STYLE}
@media print{ #${circleId}{stroke-dashoffset:${circOffset}!important} }
</style></head><body>
<div class="boletim-page">${body}</div>
<script>
window.addEventListener('load',()=>{
  const c=document.getElementById('${circleId}');
  setTimeout(()=>{ if(c) c.style.strokeDashoffset='${circOffset}'; },300);
});
</script>
</body></html>`;
}

// Boletins de vários alunos num único documento (um PDF só ao imprimir),
// cada um em sua própria página. Sem animação — já nasce com o valor final,
// então funciona corretamente mesmo se o professor mandar imprimir na hora.
export function buildBoletimLoteHTML(itemsParams, tituloDoc = 'Boletins da turma') {
  const bodies = itemsParams
    .map((params, idx) => `<div class="boletim-page">${buildBoletimBody(params, `cp-${idx}`, false)}</div>`)
    .join('\n');
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tituloDoc}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>
${bodies}
</body></html>`;
}
