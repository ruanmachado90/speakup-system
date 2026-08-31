import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { APP_ID } from '../utils/constants';
import { useGrades, CATEGORIAS, calcularConceito, conceitoCor, calcularMediaCategoria } from '../hooks/useNotas';

// ── Helpers ───────────────────────────────────────────────────────────────────
function gerarSemestres() {
  const ano = new Date().getFullYear();
  const list = [];
  for (let y = ano - 1; y <= ano + 1; y++) list.push(`${y}-1`, `${y}-2`);
  return list;
}
function semestreLabel(s) {
  const [ano, sem] = s.split('-');
  return `${sem}o Sem / ${ano}`;
}

// ── Modal: adicionar avaliacao ────────────────────────────────────────────────
function ModalAddAvaliacao({ tipo, onSave, onClose }) {
  const cat = CATEGORIAS.find(c => c.tipo === tipo) || CATEGORIAS[0];
  const [pontos, setPontos] = useState(String(cat.max));
  const [err, setErr] = useState('');

  const handleSave = () => {
    const p = parseFloat(pontos);
    if (isNaN(p) || p <= 0) { setErr('Informe uma pontuacao valida.'); return; }
    onSave({ tipo, pontos: p });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(135deg, ${cat.bg}, ${cat.bgMedia})` }}>
          <span className="text-white font-bold text-sm">
            Nova Prova — {cat.label} ({cat.labelPt})
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            Categoria <strong>{cat.label}</strong> vale até <strong>{cat.max} pontos</strong> na nota final.
            A média das provas desta categoria será usada como resultado.
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Pontuação desta prova</label>
            <input
              type="number" min="0.5" step="0.5" autoFocus
              value={pontos}
              onChange={e => setPontos(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005DE4] focus:ring-1 focus:ring-[#005DE4] transition-all"
            />
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-[#005DE4] text-white rounded-xl text-sm font-semibold hover:bg-[#0041a8] transition-all flex items-center gap-1.5"><Plus size={13} /> Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View embeddable: recebe dados já carregados, sem auth/fetch próprio ────────
// ── Modal: card de nota para responsáveis ────────────────────────────────────
function BoletimModal({ aluno, totalFinal, conceito, medias, turma, semestre, professorNome, onClose }) {
  const [ano, sem] = semestre ? semestre.split('-') : ['2026', '1'];
  const semestreFmt = `${sem}º Semestre · ${ano}`;
  const iniciais = (aluno.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  const concInfo = (c) => {
    if (!c) return { label: '—', color: '#64748b', cls: '' };
    if (c === 'A+') return { label: 'Excelente',   color: '#16a34a', cls: 'conc-green' };
    if (c === 'A')  return { label: 'Ótimo',        color: '#16a34a', cls: 'conc-green' };
    if (c === 'B+') return { label: 'Muito Bom',    color: '#0e48fe', cls: 'conc-blue' };
    if (c === 'B')  return { label: 'Bom',          color: '#0e48fe', cls: 'conc-blue' };
    if (c === 'C+') return { label: 'Regular',      color: '#c2410c', cls: 'conc-orange' };
    if (c === 'C')  return { label: 'Suficiente',   color: '#fc6e1f', cls: 'conc-orange' };
    if (c === 'C-') return { label: 'Recuperação',  color: '#d97706', cls: 'conc-amber' };
    if (c === 'D')  return { label: 'Insuficiente', color: '#9d174d', cls: 'conc-red' };
    return { label: 'Reprovado', color: '#f30961', cls: 'conc-red' };
  };

  const ci = concInfo(conceito);
  const catConc = CATEGORIAS.map((cat, i) => {
    const m = medias[i];
    if (m === null) return { conceito: null, ...concInfo(null) };
    const c = calcularConceito((m / cat.max) * 100);
    return { conceito: c, ...concInfo(c) };
  });

  const professorDisplay = turma?.professor || professorNome || 'Professor(a)';
  const turmaDisplay = turma?.nome || '—';
  const nivelDisplay = turma?.nivel || '—';

  const svgW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const svgL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;
  const svgS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const catSvgs = { written: svgW, listening: svgL, speaking: svgS };

  const handlePrint = () => {
    const r = 82;
    const circ = Math.round(2 * Math.PI * r * 10) / 10;
    const off = totalFinal !== null ? Math.round((1 - totalFinal / 100) * circ * 10) / 10 : circ;

    const tableRows = CATEGORIAS.map((cat, i) => {
      const m = medias[i];
      const cc = catConc[i];
      return `<tr>
        <td class="td-av"><div class="test-row"><div class="test-icon">${catSvgs[cat.tipo]}</div><div class="test-info"><div class="test-name">${cat.label} Test</div><div class="test-pts">/ ${cat.max} pts</div></div></div></td>
        <td style="border-left:1px solid var(--bd)"><span class="nota-val">${m !== null ? m.toFixed(1) : '—'}</span></td>
        <td><span class="conc ${cc.cls}">${cc.conceito || '—'}</span></td>
      </tr>`;
    }).join('');

    const miniRows = CATEGORIAS.map((cat, i) => `
      <div class="mini-res">
        <div class="mini-res-label">${cat.label}</div>
        <div class="mini-res-val ${catConc[i].cls}">${catConc[i].conceito || '—'}</div>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Boletim — ${aluno.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>
:root{--B:#0e48fe;--B06:rgba(14,72,254,0.06);--B10:rgba(14,72,254,0.10);--OR:#fc6e1f;--RD:#f30961;--GR:#16a34a;--AM:#d97706;--wh:#fff;--dim:#f4f6fb;--bd:rgba(0,0,0,0.08);--t1:#111827;--t2:#6b7280;--th:#9ca3af;--pg:#e8edf5;--f1:'Plus Jakarta Sans',sans-serif;--f2:'Montserrat',sans-serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--pg);font-family:var(--f2);-webkit-font-smoothing:antialiased}
body{display:flex;align-items:flex-start;justify-content:center;padding:16px;min-height:100vh}

/* ── Card principal ── */
.bol{width:277mm;background:var(--wh);border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.1)}

/* ── Header ── */
.hdr{background:linear-gradient(135deg,#003ba8 0%,#0e48fe 100%);padding:11px 20px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden}
.hdr::after{content:'';position:absolute;top:-20px;right:80px;width:180px;height:120px;background:radial-gradient(circle,rgba(255,255,255,0.18) 1px,transparent 1px);background-size:9px 9px;pointer-events:none}
.hdr-left{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
.brand-logo{height:30px;object-fit:contain}
.hdr-sep{width:1px;height:28px;background:rgba(255,255,255,0.25)}
.hdr-title{color:white;font-family:var(--f1);font-size:15px;font-weight:800;letter-spacing:-.01em;text-transform:uppercase;line-height:1}
.hdr-sub{color:rgba(255,255,255,0.6);font-size:8.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-top:2px}
.doc-badge{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:5px 13px;position:relative;z-index:1}
.doc-badge svg{width:9px;height:9px;color:rgba(255,255,255,0.85)}
.doc-badge span{color:rgba(255,255,255,0.9);font-size:8.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}

/* ── Faixa do aluno ── */
.stud{display:flex;align-items:center;padding:9px 20px;border-bottom:1px solid var(--bd);background:#fafbff;gap:0}
.stud-av{width:36px;height:36px;border-radius:50%;background:var(--B06);border:2px solid var(--B10);display:flex;align-items:center;justify-content:center;font-family:var(--f1);font-size:12px;font-weight:800;color:var(--B);flex-shrink:0}
.stud-info{margin-left:10px}
.stud-name{font-family:var(--f1);font-size:13px;font-weight:700;color:var(--t1);letter-spacing:-.02em}
.stud-meta{font-size:8.5px;color:var(--th);margin-top:1px}
.dv{width:1px;height:26px;background:var(--bd);margin:0 14px;flex-shrink:0}
.ic-col{display:flex;align-items:center;gap:7px}
.ic-lbl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--th);margin-bottom:1px}
.ic-val{font-size:11px;font-weight:700;color:var(--t1);font-family:var(--f1)}

/* ── Layout principal: 2 colunas ── */
.main{display:grid;grid-template-columns:1fr 210px;gap:11px;padding:11px 20px 0}

/* ── Coluna esquerda ── */
.left{}

/* Tabela de notas */
.tbl-wrap{border:1px solid var(--bd);border-radius:9px;overflow:hidden;margin-bottom:10px}
.gt{width:100%;border-collapse:collapse}
.gt thead tr:first-child th{background:#f0f4ff;font-size:7.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--th);padding:7px 12px;border-bottom:1px solid var(--bd)}
.gt thead tr:first-child th.th-av{text-align:left;color:var(--t2)}
.gt thead tr:first-child th.th-res{color:var(--B)}
.gt td{padding:9px 12px;text-align:center;border-bottom:1px solid var(--bd);vertical-align:middle}
.gt td.td-av{text-align:left}
.gt tbody tr:last-child td{border-bottom:none}
.test-row{display:flex;align-items:center;gap:8px}
.test-icon{width:22px;height:22px;border-radius:5px;background:var(--B06);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.test-icon svg{width:10px;height:10px;color:var(--B)}
.test-name{font-size:11px;font-weight:600;color:var(--t1)}
.test-pts{font-size:7.5px;color:var(--th);margin-top:1px}
.nota-val{font-family:var(--f1);font-size:13px;font-weight:700;color:var(--t1)}
.conc{font-family:var(--f1);font-size:12px;font-weight:800}
.conc-green{color:#16a34a}.conc-blue{color:#0e48fe}.conc-orange{color:#fc6e1f}.conc-amber{color:#d97706}.conc-red{color:#f30961}
.total-row td{background:rgba(14,72,254,0.03)!important;border-top:1px solid rgba(14,72,254,0.12)!important}

/* Grade de critérios + escala lado a lado */
.bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bot-card{border:1px solid var(--bd);border-radius:9px;padding:10px 12px}
.bot-ttl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:7px;display:flex;align-items:center;gap:5px}
.bot-ttl svg{width:10px;height:10px;color:var(--B);flex-shrink:0}
.cr-item{display:flex;gap:6px;margin-bottom:5px;align-items:flex-start}
.cr-item:last-child{margin-bottom:0}
.cr-ico{width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.cr-ico svg{width:8px;height:8px}
.cr-ico.wr{background:var(--B06)}.cr-ico.wr svg{color:var(--B)}
.cr-ico.li{background:rgba(252,110,31,0.07)}.cr-ico.li svg{color:var(--OR)}
.cr-ico.sp{background:rgba(22,163,74,0.07)}.cr-ico.sp svg{color:var(--GR)}
.cr-txt{font-size:8px;color:var(--t2);line-height:1.45}
.cr-txt strong{color:var(--t1);font-weight:600}
.sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
.sc-item{display:flex;align-items:center;gap:4px;padding:3px 5px;border-radius:5px;border:1px solid var(--bd)}
.sc-badge{width:20px;height:15px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:var(--f1);font-size:8px;font-weight:800;flex-shrink:0}
.sc-range{font-size:7.5px;color:var(--t2);white-space:nowrap}
.bg-ap{background:#f0fdf4;color:#166534}.bg-a{background:#f0fdf4;color:#16a34a}
.bg-bp{background:#eff6ff;color:#1e40af}.bg-b{background:var(--B06);color:var(--B)}
.bg-cp{background:rgba(252,110,31,0.07);color:#c2410c}.bg-c{background:rgba(252,110,31,0.07);color:var(--OR)}
.bg-cm{background:#fffbeb;color:#92400e}.bg-d{background:rgba(243,9,97,0.06);color:#9d174d}
.bg-f{background:rgba(243,9,97,0.08);color:var(--RD)}

/* ── Coluna direita ── */
.right{display:flex;flex-direction:column;gap:10px}

/* Card de resultado */
.res-card{border:1px solid var(--bd);border-radius:9px;padding:11px 10px 10px;display:flex;flex-direction:column;align-items:center}
.res-ttl{font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--B);margin-bottom:8px;text-align:center}
.circ{position:relative;width:120px;height:120px;margin-bottom:4px}
.circ svg{width:120px;height:120px;transform:rotate(-90deg)}
.c-bg{fill:none;stroke:rgba(14,72,254,0.08);stroke-width:9}
.c-prog{fill:none;stroke:var(--B);stroke-width:9;stroke-linecap:round}
.c-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.c-score{font-family:var(--f1);font-size:28px;font-weight:800;color:var(--t1);letter-spacing:-.04em;line-height:1}
.c-conc{font-family:var(--f1);font-size:13px;font-weight:800;line-height:1.2}
.res-status{font-size:8.5px;color:var(--th);margin-bottom:6px}
.divr{width:100%;height:1px;background:var(--bd);margin:0 0 6px}
.pts-lbl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--B);margin-bottom:1px;text-align:center}
.pts-val{font-family:var(--f1);font-size:13px;font-weight:800;color:var(--t1);text-align:center}
.pts-val span{color:var(--t2);font-size:9px;font-weight:500}
.mini-g{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:100%;margin-top:5px}
.mini-res{background:var(--dim);border-radius:6px;padding:4px 2px;text-align:center}
.mini-res-label{font-size:6px;color:var(--th);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:1px}
.mini-res-val{font-family:var(--f1);font-size:10px;font-weight:800}

/* Assinaturas */
.sigs-card{border:1px solid var(--bd);border-radius:9px;padding:10px;flex:1}
.sigs{display:grid;grid-template-columns:repeat(3,1fr);height:100%}
.sig-c{text-align:center;padding:0 6px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sig-c+.sig-c{border-left:1px solid var(--bd)}
.sig-role{font-size:7px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--th);margin-bottom:3px}
.sig-cur{font-family:'Georgia',serif;font-style:italic;font-size:11px;color:var(--t1);margin-bottom:1px;line-height:1.3}
.sig-line{color:#d1d5db;font-family:var(--f2);font-style:normal;font-size:10px}
.sig-nm{font-size:7.5px;color:var(--t2);font-weight:500}

/* ── Footer ── */
.foot{display:flex;justify-content:space-between;align-items:center;padding:7px 20px;margin-top:11px;border-top:1px solid var(--bd);background:#fafbff}
.foot-txt{font-size:7.5px;color:var(--th);font-weight:500}

/* ── Botão flutuante ── */
.btn-pdf{position:fixed;bottom:18px;right:18px;z-index:100;background:var(--B);color:white;border:none;border-radius:10px;padding:10px 20px;font-family:var(--f1);font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(14,72,254,0.35);display:flex;align-items:center;gap:7px;transition:background .15s}
.btn-pdf:hover{background:#0041d4}
.btn-png{position:fixed;bottom:18px;right:160px;z-index:100;background:#0f172a;color:white;border:none;border-radius:10px;padding:10px 20px;font-family:var(--f1);font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(15,23,42,0.3);display:flex;align-items:center;gap:7px;transition:background .15s}
.btn-png:hover{background:#1e293b}
.btn-png.loading{opacity:.7;cursor:default}

/* ── Impressão ── */
@page{size:A4 landscape;margin:5mm}
@media print{
  html,body{background:white!important;padding:0!important;display:block!important}
  .bol{box-shadow:none!important;border-radius:0!important;width:100%!important;max-width:none!important}
  .btn-pdf{display:none!important}
  .main{padding:8px 14px 0!important}
  .foot{margin-top:8px!important;padding:5px 14px!important}
}
</style>
</head>
<body>
<div class="bol">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-left">
      <img class="brand-logo" src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-brancal-1.png" alt="SpeakUp"/>
      <div class="hdr-sep"></div>
      <div>
        <div class="hdr-title">Boletim Semestral</div>
        <div class="hdr-sub">${semestreFmt} &nbsp;·&nbsp; Ano letivo ${ano}</div>
      </div>
    </div>
    <div class="doc-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>Documento Oficial</span>
    </div>
  </div>

  <!-- Faixa do aluno -->
  <div class="stud">
    <div class="stud-av">${iniciais}</div>
    <div class="stud-info">
      <div class="stud-name">${aluno.name}</div>
      <div class="stud-meta">Aluno(a) &nbsp;·&nbsp; ${semestreFmt}</div>
    </div>
    <div class="dv"></div>
    <div class="ic-col">
      <div><div class="ic-lbl">Turma</div><div class="ic-val">${turmaDisplay}</div></div>
    </div>
    <div class="dv"></div>
    <div class="ic-col">
      <div><div class="ic-lbl">Nível</div><div class="ic-val">${nivelDisplay}</div></div>
    </div>
    <div class="dv"></div>
    <div class="ic-col">
      <div><div class="ic-lbl">Professor(a)</div><div class="ic-val">${professorDisplay}</div></div>
    </div>
  </div>

  <!-- Main: 2 colunas -->
  <div class="main">

    <!-- Esquerda: tabela + critérios + escala -->
    <div class="left">
      <div class="tbl-wrap">
        <table class="gt">
          <thead>
            <tr>
              <th class="th-av" style="padding-left:14px">Avaliação</th>
              <th style="border-left:1px solid var(--bd)">Nota</th>
              <th class="th-res">Conceito</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td class="td-av" style="font-family:var(--f1);font-size:12px;font-weight:700;padding-left:14px">TOTAL <span style="font-size:10px;color:var(--th);font-weight:500">/ 100 pts</span></td>
              <td style="border-left:1px solid rgba(14,72,254,0.12)"><span class="nota-val" style="font-size:16px">${totalFinal !== null ? totalFinal.toFixed(1) : '—'}</span></td>
              <td><span class="conc ${ci.cls}" style="font-size:15px">${conceito || '—'}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bot-grid">
        <div class="bot-card">
          <div class="bot-ttl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Critérios de Avaliação
          </div>
          <div class="cr-item"><div class="cr-ico wr">${svgW}</div><div class="cr-txt"><strong>Written (50 pts)</strong> — Vocabulary, Grammar, Reading e Use of English.</div></div>
          <div class="cr-item"><div class="cr-ico li">${svgL}</div><div class="cr-txt"><strong>Listening (30 pts)</strong> — Compreensão de áudio: diálogos e narrações.</div></div>
          <div class="cr-item"><div class="cr-ico sp">${svgS}</div><div class="cr-txt"><strong>Speaking (20 pts)</strong> — Avaliação oral em dupla: fluência e desenvoltura.</div></div>
        </div>
        <div class="bot-card">
          <div class="bot-ttl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Tabela de Conceitos
          </div>
          <div class="sc-grid">
            <div class="sc-item"><div class="sc-badge bg-ap">A+</div><span class="sc-range">95–100</span></div>
            <div class="sc-item"><div class="sc-badge bg-b">B</div><span class="sc-range">80–84</span></div>
            <div class="sc-item"><div class="sc-badge bg-cm">C–</div><span class="sc-range">60–69</span></div>
            <div class="sc-item"><div class="sc-badge bg-a">A</div><span class="sc-range">90–94</span></div>
            <div class="sc-item"><div class="sc-badge bg-cp">C+</div><span class="sc-range">75–79</span></div>
            <div class="sc-item"><div class="sc-badge bg-d">D</div><span class="sc-range">50–59</span></div>
            <div class="sc-item"><div class="sc-badge bg-bp">B+</div><span class="sc-range">85–89</span></div>
            <div class="sc-item"><div class="sc-badge bg-c">C</div><span class="sc-range">70–74</span></div>
            <div class="sc-item"><div class="sc-badge bg-f">F</div><span class="sc-range">&lt; 50</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Direita: resultado + assinaturas -->
    <div class="right">
      <div class="res-card">
        <div class="res-ttl">Resultado Semestral</div>
        <div class="circ">
          <svg viewBox="0 0 180 180">
            <circle class="c-bg" cx="90" cy="90" r="${r}"/>
            <circle class="c-prog" cx="90" cy="90" r="${r}" style="stroke-dasharray:${circ};stroke-dashoffset:${off}"/>
          </svg>
          <div class="c-inner">
            <div class="c-score">${totalFinal !== null ? Math.round(totalFinal) : '—'}</div>
            <div class="c-conc ${ci.cls}">${conceito || '—'}</div>
          </div>
        </div>
        <div class="res-status">${ci.label}</div>
        <div class="divr"></div>
        <div class="pts-lbl">Aproveitamento Geral</div>
        <div class="pts-val">${totalFinal !== null ? totalFinal.toFixed(1) : '—'} <span>/ 100 pts</span></div>
        <div class="mini-g">${miniRows}</div>
      </div>

      <div class="sigs-card">
        <div class="sigs">
          <div class="sig-c">
            <div class="sig-role">Professor(a)</div>
            <div class="sig-cur">${professorDisplay}</div>
            <div class="sig-nm">${professorDisplay}</div>
          </div>
          <div class="sig-c">
            <div class="sig-role">Responsável</div>
            <div class="sig-line">______________________</div>
            <div class="sig-nm">Assinatura</div>
          </div>
          <div class="sig-c">
            <div class="sig-role">Coordenação</div>
            <div class="sig-cur">SpeakUp</div>
            <div class="sig-nm">SpeakUp Academy</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <footer class="foot">
    <span class="foot-txt">SpeakUp English Language Academy &nbsp;·&nbsp; Cataguases, MG</span>
    <span class="foot-txt">Documento oficial &nbsp;·&nbsp; ${new Date().toLocaleDateString('pt-BR')}</span>
  </footer>

</div>
<button class="btn-png" id="btnPng" onclick="baixarPng()">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  Baixar PNG
</button>
<button class="btn-pdf" onclick="window.print()">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  Baixar PDF
</button>
<script>
function baixarPng() {
  var btn = document.getElementById('btnPng');
  if (btn.classList.contains('loading')) return;
  btn.classList.add('loading');
  btn.textContent = 'Gerando…';
  var el = document.querySelector('.bol');
  html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'boletim-${aluno.name.replace(/\\s+/g, '-').toLowerCase()}.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    btn.classList.remove('loading');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Baixar PNG';
  }).catch(function() {
    btn.classList.remove('loading');
    btn.textContent = 'Baixar PNG';
    alert('Erro ao gerar imagem. Tente novamente.');
  });
}
</script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      alert('Permita popups nesta página para gerar o boletim.');
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', marginTop: 20, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,#0e48fe,#0041a8)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="SpeakUp" style={{ height: 26, objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, paddingLeft: 10 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Boletim Semestral</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{semestreFmt}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(14,72,254,0.06)', border: '2px solid rgba(14,72,254,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#0e48fe', flexShrink: 0 }}>
              {iniciais}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', letterSpacing: '-0.02em' }}>{aluno.name}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                {turma && <span style={{ background: '#eff6ff', color: '#0e48fe', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid rgba(14,72,254,0.15)' }}>{turma.nome}</span>}
                {turma?.nivel && <span style={{ background: '#eff6ff', color: '#0e48fe', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid rgba(14,72,254,0.15)' }}>{turma.nivel}</span>}
                <span style={{ background: '#eff6ff', color: '#0e48fe', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid rgba(14,72,254,0.15)' }}>{semestreFmt}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
            {CATEGORIAS.map((cat, i) => (
              <div key={cat.tipo} style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 5px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{cat.prefix}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: catConc[i].color }}>{catConc[i].conceito || '—'}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{medias[i] !== null ? medias[i].toFixed(1) : '—'}/{cat.max}</div>
              </div>
            ))}
            <div style={{ background: 'rgba(14,72,254,0.05)', borderRadius: 10, padding: '8px 5px', textAlign: 'center', border: '1px solid rgba(14,72,254,0.1)' }}>
              <div style={{ fontSize: 9, color: '#0e48fe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Total</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: ci.color }}>{conceito || '—'}</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>{totalFinal !== null ? totalFinal.toFixed(1) : '—'}/100</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#64748b' }}>Fechar</button>
          <button onClick={handlePrint} style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg,#0e48fe,#0041a8)', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            📄 Gerar Boletim (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotasView({ professorSlug, professorNome, turmas, alunosPorTurma, onVoltar }) {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [semestre, setSemestre] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`;
  });
  const [addAvTipo, setAddAvTipo] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [aulas, setAulas] = useState([]);
  const inputRef = useRef(null);
  const [cardAluno, setCardAluno] = useState(null);

  const {
    avaliacoes, gradesMap, loading: loadingGrades,
    addAvaliacao, deleteAvaliacao, setScore,
  } = useGrades({ professorSlug, turmaId: selectedTurma || null, semestre });

  // Auto-seleciona turma quando há apenas uma
  useEffect(() => {
    if (turmas.length === 1) setSelectedTurma(turmas[0].id);
  }, [turmas]);

  // Busca aulas da turma selecionada para calcular faltas reais
  useEffect(() => {
    if (!selectedTurma) return;
    const fetchAulas = async () => {
      try {
        const q = query(collection(db, 'aulas'), where('turmaId', '==', selectedTurma));
        const snap = await getDocs(q);
        setAulas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Notas fetchAulas error:', e);
      }
    };
    fetchAulas();
  }, [selectedTurma]);

  // Mapa de faltas reais: { [alunoId]: { faltas, total, pct } }
  const faltasMap = useMemo(() => {
    const map = {};
    for (const aula of aulas) {
      for (const chamada of (aula.chamadas || [])) {
        if (!chamada.alunoId) continue;
        if (!map[chamada.alunoId]) map[chamada.alunoId] = { faltas: 0, total: 0 };
        map[chamada.alunoId].total++;
        if (chamada.status === 'falta') map[chamada.alunoId].faltas++;
      }
    }
    for (const id of Object.keys(map)) {
      const { faltas, total } = map[id];
      map[id].pct = total > 0 ? Math.round(((total - faltas) / total) * 100) : 100;
    }
    return map;
  }, [aulas]);

  const alunos = useMemo(() => {
    if (!selectedTurma) return [];
    return [...(alunosPorTurma[selectedTurma] || [])].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
  }, [selectedTurma, alunosPorTurma]);

  const turmaObj = useMemo(() => turmas.find(t => t.id === selectedTurma) || null, [turmas, selectedTurma]);

  // Provas agrupadas por categoria
  const avsByTipo = useMemo(() => {
    const map = {};
    for (const cat of CATEGORIAS) {
      map[cat.tipo] = avaliacoes.filter(av => av.tipo === cat.tipo);
    }
    return map;
  }, [avaliacoes]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  const startEdit = (studentId, key, currentVal) => {
    setEditingCell({ studentId, key });
    setEditVal(currentVal != null ? String(currentVal) : '');
  };

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { studentId, key } = editingCell;
    setEditingCell(null);
    setSavingCell({ studentId, key });
    try {
      const val = editVal === '' ? null : parseFloat(editVal);
      if (val === null || (!isNaN(val) && val >= 0)) {
        await setScore(studentId, key, val);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
      }
    } finally {
      setSavingCell(null);
    }
  }, [editingCell, editVal, setScore]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleAddAv = async (data) => {
    await addAvaliacao(data);
    setAddAvTipo(null);
  };

  // Celula de score / faltas
  const renderCell = (studentId, key, val, max) => {
    const isEditing = editingCell?.studentId === studentId && editingCell?.key === key;
    const isSaving  = savingCell?.studentId  === studentId && savingCell?.key  === key;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="number" min="0" max={max} step="0.5"
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', border: '2px solid #005DE4', borderRadius: 4, padding: '2px 4px', fontSize: 12, textAlign: 'center', outline: 'none', fontWeight: 700, boxSizing: 'border-box', color: '#0f172a', background: '#eff6ff' }}
        />
      );
    }
    if (isSaving) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 26 }}>
          <div style={{ width: 12, height: 12, border: '2px solid #e2e8f0', borderTopColor: '#005DE4', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
      );
    }
    const hasVal = val !== null && val !== undefined;
    return (
      <div
        onClick={() => startEdit(studentId, key, val)}
        title="Clique para editar"
        style={{ cursor: 'pointer', minHeight: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: hasVal ? 600 : 400, color: hasVal ? '#0f172a' : '#cbd5e1', background: hasVal ? 'white' : 'transparent', border: hasVal ? '1px solid #e2e8f0' : '1px dashed #e2e8f0' }}
      >
        {hasVal ? val : '—'}
      </div>
    );
  };

  const semestres = useMemo(() => gerarSemestres(), []);

  // Total de colunas da tabela
  const totalCols = 2 + CATEGORIAS.reduce((s, cat) => s + (avsByTipo[cat.tipo]?.length || 0) + 1, 0) + 3;

  return (
    <div className="space-y-5">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#005DE4] to-[#0041a8] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onVoltar}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-all border border-white/20"
              >
                <ArrowLeft size={15} /> Voltar ao Painel
              </button>
              <div>
                <h1 className="text-white font-bold text-xl">Lançamento de Notas</h1>
                <p className="text-white/70 text-xs">{professorNome}</p>
              </div>
              {savedIndicator && (
                <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs rounded-full px-3 py-1 font-medium">
                  ✓ Salvo automaticamente
                </span>
              )}
            </div>
            <img
              src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png"
              alt="SpeakUp"
              className="h-10 object-contain hidden sm:block"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-[2] min-w-[180px]">
              <label className="text-white/80 text-xs font-semibold block mb-1.5 uppercase tracking-wide">Turma</label>
              <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none cursor-pointer focus:border-white/60 transition-all">
                <option value="" className="bg-[#0041a8]">— Selecione a turma —</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#0041a8]">{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-white/80 text-xs font-semibold block mb-1.5 uppercase tracking-wide">Semestre</label>
              <select value={semestre} onChange={e => setSemestre(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none cursor-pointer focus:border-white/60 transition-all">
                {semestres.map(s => (
                  <option key={s} value={s} className="bg-[#0041a8]">{semestreLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda das categorias */}
      {selectedTurma && (
        <div className="flex gap-3 flex-wrap">
          {CATEGORIAS.map(cat => (
            <div key={cat.tipo} className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-slate-100 flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.bg }} />
              <span className="font-bold text-slate-800 text-sm">{cat.label}</span>
              <span className="text-slate-500 text-xs">{cat.labelPt}</span>
              <span className="bg-slate-100 rounded px-2 py-0.5 text-xs font-bold text-slate-600">{cat.max} pts</span>
              <button
                onClick={() => setAddAvTipo(cat.tipo)}
                className="ml-1 flex items-center gap-1 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition-opacity hover:opacity-80"
                style={{ background: cat.bg }}
              >
                <Plus size={11} /> Add
              </button>
            </div>
          ))}
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-slate-100 flex items-center gap-2">
            <span className="text-slate-500 text-xs">Total</span>
            <span className="bg-[#005DE4] text-white rounded px-2 py-0.5 text-xs font-bold">100 pts</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {!selectedTurma ? (
          <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center border border-slate-100">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg font-semibold text-slate-600">Selecione uma turma para lançar as notas</p>
            <p className="text-slate-400 text-sm mt-1">As notas são salvas automaticamente</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>

                {/* Linha 1: categorias com colSpan */}
                <tr>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 36, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>N</th>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', textAlign: 'left', minWidth: 160, borderRight: '2px solid rgba(255,255,255,0.2)' }}>Aluno</th>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <th
                        key={cat.tipo}
                        colSpan={avs.length + 1}
                        style={{ ...thBase, background: cat.bg, color: 'white', textAlign: 'center', borderRight: '2px solid rgba(255,255,255,0.2)', padding: '6px 10px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800 }}>{cat.label}</span>
                          <span style={{ fontSize: 11, opacity: 0.8 }}>({cat.labelPt})</span>
                          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{cat.max} pts</span>
                        </div>
                      </th>
                    );
                  })}
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 80, textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total<div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>/100</div></th>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 90, textAlign: 'center' }}>Faltas<div style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>de chamadas</div></th>
                  <th rowSpan={3} style={{ ...thBase, background: '#00234b', color: 'white', width: 70, textAlign: 'center' }}>Boletim</th>
                </tr>

                {/* Linha 2: labels das provas + "Media" */}
                <tr>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <React.Fragment key={cat.tipo}>
                        {avs.map(av => (
                          <th key={av.id} style={{ ...thBase, background: cat.bgMedia, color: 'white', fontSize: 11, textAlign: 'center', minWidth: 70, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              {av.label}
                              <button
                                onClick={() => deleteAvaliacao(av.id)}
                                title="Remover"
                                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, padding: '1px 3px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
                              >
                                <X size={8} />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th style={{ ...thBase, background: cat.bgMedia, color: 'rgba(255,255,255,0.9)', fontSize: 10, textAlign: 'center', fontStyle: 'italic', borderRight: '2px solid rgba(255,255,255,0.2)' }}>
                          Media
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* Linha 3: pontos das provas + max categoria */}
                <tr>
                  {CATEGORIAS.map(cat => {
                    const avs = avsByTipo[cat.tipo] || [];
                    return (
                      <React.Fragment key={cat.tipo}>
                        {avs.map(av => (
                          <td key={av.id} style={{ ...tdBase, background: '#002d6b', color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '3px 8px' }}>
                            /{av.pontos}
                          </td>
                        ))}
                        <td style={{ ...tdBase, background: '#243d5c', color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'center', fontStyle: 'italic', borderRight: '2px solid rgba(255,255,255,0.15)', padding: '3px 8px' }}>
                          /{cat.max}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {alunos.length === 0 && (
                  <tr>
                    <td colSpan={totalCols} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
                      {loadingGrades ? 'Carregando...' : 'Nenhum aluno encontrado nesta turma.'}
                    </td>
                  </tr>
                )}

                {alunos.map((aluno, idx) => {
                  const grade = gradesMap[aluno.id] || { scores: {}, faltas: 0 };
                  const medias = CATEGORIAS.map(cat =>
                    calcularMediaCategoria(avsByTipo[cat.tipo] || [], grade.scores, cat.max)
                  );
                  const hasAnyScore = medias.some(m => m !== null);
                  const allScored = medias.every(m => m !== null);
                  const totalFinal = allScored
                    ? parseFloat(medias.reduce((s, m) => s + m, 0).toFixed(2))
                    : null;
                  const conceito = totalFinal !== null ? calcularConceito(totalFinal) : null;
                  const rowBg = idx % 2 === 0 ? 'white' : '#f8fafc';

                  return (
                    <tr key={aluno.id} style={{ background: rowBg }}>
                      {/* N */}
                      <td style={{ ...tdBase, textAlign: 'center', color: '#94a3b8', fontSize: 12, width: 36, borderRight: '1px solid #f1f5f9', padding: '6px 8px' }}>
                        {idx + 1}
                      </td>
                      {/* Nome */}
                      <td style={{ ...tdBase, fontWeight: 500, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', borderRight: '2px solid #e2e8f0', padding: '6px 10px' }}>
                        {aluno.name}
                      </td>

                      {/* Scores por categoria */}
                      {CATEGORIAS.map((cat, ci) => {
                        const avs = avsByTipo[cat.tipo] || [];
                        const media = medias[ci];
                        return (
                          <React.Fragment key={cat.tipo}>
                            {avs.map(av => (
                              <td key={av.id} style={{ ...tdBase, textAlign: 'center', borderRight: '1px solid #f1f5f9', padding: '4px 6px', minWidth: 70 }}>
                                {renderCell(aluno.id, av.id, grade.scores[av.id] ?? null, av.pontos)}
                              </td>
                            ))}
                            {/* Media da categoria */}
                            <td style={{ ...tdBase, textAlign: 'center', padding: '4px 8px', borderRight: '2px solid #e2e8f0', background: media !== null ? '#f0f9ff' : rowBg }}>
                              {media !== null ? (
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0369a1' }}>{media.toFixed(1)}</div>
                                  <div style={{ fontSize: 9, color: '#94a3b8' }}>/{cat.max}</div>
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Total final */}
                      <td style={{ ...tdBase, textAlign: 'center', borderLeft: '2px solid #e2e8f0', padding: '4px 8px', background: totalFinal !== null ? '#f0f4ff' : rowBg }}>
                        {totalFinal !== null ? (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{totalFinal.toFixed(1)}</div>
                            {conceito && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: conceitoCor(conceito) }}>{conceito}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Faltas reais das aulas */}
                      <td style={{ ...tdBase, textAlign: 'center', padding: '4px 6px' }}>
                        {(() => {
                          const f = faltasMap[aluno.id];
                          if (!f || f.total === 0) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
                          const baixaFreq = f.pct < 75;
                          return (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: baixaFreq ? '#dc2626' : '#0f172a' }}>
                                {f.faltas}
                              </div>
                              <div style={{ fontSize: 10, color: baixaFreq ? '#dc2626' : '#94a3b8', fontWeight: baixaFreq ? 700 : 400 }}>
                                {f.pct}%
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Boletim */}
                      <td style={{ ...tdBase, textAlign: 'center', padding: '4px 6px' }}>
                        {hasAnyScore && (
                          <button
                            onClick={() => setCardAluno({ aluno, totalFinal, conceito, medias })}
                            title="Gerar boletim semestral"
                            style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                          >
                            📤
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Boletim */}
      {cardAluno && (
        <BoletimModal
          aluno={cardAluno.aluno}
          totalFinal={cardAluno.totalFinal}
          conceito={cardAluno.conceito}
          medias={cardAluno.medias}
          turma={turmaObj}
          semestre={semestre}
          professorNome={professorNome}
          onClose={() => setCardAluno(null)}
        />
      )}

      {/* Modal add avaliacao */}
      {addAvTipo && (
        <ModalAddAvaliacao
          tipo={addAvTipo}
          onSave={handleAddAv}
          onClose={() => setAddAvTipo(null)}
        />
      )}
    </div>
  );
}

// ── Página completa (wrapper para rota standalone) ────────────────────────────
export default function Notas() {
  const { professorSlug } = useParams();
  const navigate = useNavigate();

  const professorNome = useMemo(() => {
    if (!professorSlug) return '';
    return professorSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [professorSlug]);

  const professorPrimeiroNome = useMemo(() => {
    const p = professorSlug?.split('-')[0] || '';
    return p.charAt(0).toUpperCase() + p.slice(1);
  }, [professorSlug]);

  const [turmas, setTurmas] = useState([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setAuthReady(true); }
      else { signInAnonymously(auth).catch(() => { setAuthReady(true); }); }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!professorPrimeiroNome || !authReady) return;
    const fetchData = async () => {
      setLoadingData(true);
      setFetchError(null);
      try {
        const [snap, alunosSnap] = await Promise.all([
          getDocs(collection(db, 'turmas')),
          getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'students')),
        ]);
        const minhas = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => (t.professor || '').toLowerCase().includes(professorPrimeiroNome.toLowerCase()));
        setTurmas(minhas);
        const todos = alunosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const mapa = {};
        for (const t of minhas) {
          const ids = t.alunosIds || [];
          mapa[t.id] = ids.length > 0
            ? todos.filter(a => ids.includes(a.id))
            : todos.filter(a => (a.turma || a.turmaId) === t.id);
        }
        setAlunosPorTurma(mapa);
      } catch (e) {
        setFetchError(e.message || 'Erro ao carregar dados.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [professorPrimeiroNome, authReady]);

  if (!authReady || loadingData) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#005DE4', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {!authReady ? 'Autenticando...' : 'Carregando turmas...'}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#dc2626', maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>x</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Erro ao carregar dados</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{fetchError}</div>
          <button onClick={() => window.location.reload()} style={{ background: '#005DE4', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <NotasView
      professorSlug={professorSlug}
      professorNome={professorNome}
      turmas={turmas}
      alunosPorTurma={alunosPorTurma}
      onVoltar={() => navigate(`/professor/${professorSlug}`)}
    />
  );
}

// ── Styles (apenas para elementos da tabela com cores dinâmicas) ─────────────
const thBase  = { padding: '8px 10px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' };
const tdBase  = { padding: '5px 8px', borderBottom: '1px solid #f1f5f9' };
