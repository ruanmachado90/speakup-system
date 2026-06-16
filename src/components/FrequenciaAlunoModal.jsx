import React, { useMemo } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Download, Calendar } from 'lucide-react';

export default function FrequenciaAlunoModal({ aluno, aulas, turma, semestre, onClose }) {
  const nomeAluno = aluno?.nome || aluno?.name || '?';
  const iniciais = nomeAluno.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const [ano] = semestre ? semestre.split('-') : [new Date().getFullYear().toString()];

  const aulasT = useMemo(() => {
    if (!turma?.id) return [];
    return (aulas ?? [])
      .filter(a => a.turmaId === turma.id && a.status === 'realizada')
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  }, [aulas, turma]);

  const stats = useMemo(() => {
    let presencas = 0, faltas = 0, justificadas = 0;
    aulasT.forEach(aula => {
      const ch = (aula.chamadas || []).find(c => c.alunoId === aluno.id);
      if (!ch) return;
      if (ch.status === 'presente') presencas++;
      else if (ch.status === 'falta') faltas++;
      else if (ch.status === 'justificada') justificadas++;
    });
    const total = presencas + faltas + justificadas;
    const pct = total > 0 ? Math.round((presencas / total) * 100) : null;
    return { presencas, faltas, justificadas, total, pct };
  }, [aulasT, aluno.id]);

  const pctColor = stats.pct === null ? '#64748b' : stats.pct >= 75 ? '#16a34a' : stats.pct >= 50 ? '#d97706' : '#ef4444';
  const lowFreq = stats.pct !== null && stats.pct < 75;

  const statusCfg = {
    presente:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', label: 'Presente',   Icon: CheckCircle },
    falta:      { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'Falta',      Icon: XCircle },
    justificada:{ bg: '#fffbeb', border: '#fde68a', color: '#d97706', label: 'Justificada',Icon: AlertCircle },
  };

  const handlePrint = () => {
    const r = 82;
    const circ = Math.round(2 * Math.PI * r * 10) / 10;
    const off = stats.pct !== null ? Math.round((1 - stats.pct / 100) * circ * 10) / 10 : circ;

    const stColor = { presente: '#16a34a', falta: '#ef4444', justificada: '#d97706' };
    const stLabel = { presente: 'Presente', falta: 'Falta', justificada: 'Justificada' };
    const stMark  = { presente: '✓', falta: '✗', justificada: '!' };

    const rows = aulasT.map((aula, i) => {
      const ch = (aula.chamadas || []).find(c => c.alunoId === aluno.id);
      const st = ch?.status;
      const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';
      const badge = st
        ? `<span class="st-badge" style="color:${stColor[st]};background:${stColor[st]}18;border:1px solid ${stColor[st]}30">${stMark[st]} ${stLabel[st]}</span>`
        : '<span style="color:#9ca3af">—</span>';
      return `<tr>
        <td style="color:#9ca3af;font-size:10px;text-align:center;padding:8px 10px;width:32px">${i + 1}</td>
        <td style="font-family:var(--f1);font-weight:600;color:#111827;white-space:nowrap;padding:8px 10px;width:82px">${dataFmt}</td>
        <td style="color:#6b7280;padding:8px 10px;font-size:11px">${aula.conteudo || '—'}</td>
        <td style="padding:8px 10px;width:110px">${badge}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Frequência — ${nomeAluno}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--B:#0e48fe;--B06:rgba(14,72,254,0.06);--B10:rgba(14,72,254,0.10);--wh:#fff;--bd:rgba(0,0,0,0.07);--t1:#111827;--t2:#6b7280;--th:#9ca3af;--pg:#edf2f8;--f1:'Plus Jakarta Sans',sans-serif;--f2:'Montserrat',sans-serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f2);background:var(--pg);display:flex;align-items:flex-start;justify-content:center;padding:20px 16px 28px;-webkit-font-smoothing:antialiased}
.bol{width:860px;max-width:100%;background:var(--wh);border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08)}
.hdr{padding:14px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd);position:relative;overflow:hidden}
.brand-logo{height:34px;object-fit:contain;position:relative;z-index:1}
.world-deco{position:absolute;top:0;right:160px;width:220px;height:70px;background-image:radial-gradient(circle,rgba(14,72,254,0.45) 1.2px,transparent 1.2px);background-size:10px 10px;opacity:0.12;pointer-events:none}
.doc-badge{display:flex;align-items:center;gap:7px;background:var(--B06);border:1px solid rgba(14,72,254,0.15);border-radius:999px;padding:6px 14px;position:relative;z-index:1}
.doc-badge span{font-family:var(--f1);font-size:10px;font-weight:700;color:var(--B);letter-spacing:.09em;text-transform:uppercase}
.body{padding:20px 28px 24px}
.pg-title{font-family:var(--f1);font-size:30px;font-weight:800;color:var(--t1);letter-spacing:-.04em;text-transform:uppercase}
.pg-sub{font-size:10px;font-weight:700;color:var(--th);letter-spacing:.14em;text-transform:uppercase;margin-top:5px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.pg-sub-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--B)}
.alert-bar{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 14px;margin-bottom:14px;font-size:11px;color:#dc2626;font-weight:600}
.stud{border:1px solid var(--bd);border-radius:14px;padding:11px 18px;display:flex;align-items:center;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,23,42,.03)}
.stud-av{width:42px;height:42px;border-radius:50%;background:var(--B06);display:flex;align-items:center;justify-content:center;font-family:var(--f1);font-size:14px;font-weight:800;color:var(--B);flex-shrink:0;border:2px solid var(--B10)}
.stud-info{padding-left:11px;padding-right:16px}
.stud-name{font-family:var(--f1);font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.stud-meta{font-size:10px;color:var(--th);margin-top:2px}
.stud-meta span{color:var(--t2);font-weight:600}
.div-v{width:1px;height:32px;background:var(--bd);margin:0 14px;flex-shrink:0}
.ic-col{display:flex;align-items:center;gap:7px}
.ic-box{width:26px;height:26px;border-radius:6px;background:var(--B06);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ic-box svg{width:12px;height:12px;color:var(--B)}
.ic-lbl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--th);margin-bottom:1px}
.ic-val{font-family:var(--f1);font-size:11px;font-weight:700;color:var(--t1)}
.main-g{display:grid;grid-template-columns:1fr 188px;gap:12px;margin-bottom:14px}
.tbl-card{background:var(--wh);border:1px solid var(--bd);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.03)}
table{width:100%;border-collapse:collapse}
th{font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--th);padding:9px 10px;border-bottom:1px solid var(--bd);text-align:left}
td{border-bottom:1px solid var(--bd);vertical-align:middle;font-size:11px}
tr:last-child td{border-bottom:none}
.st-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;font-family:var(--f1);font-size:10px;font-weight:700}
.res-card{background:var(--wh);border:1px solid var(--bd);border-radius:14px;padding:14px 12px 12px;display:flex;flex-direction:column;align-items:center;box-shadow:0 1px 3px rgba(15,23,42,.03)}
.res-ttl{font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--B);margin-bottom:10px;text-align:center}
.circ{position:relative;width:140px;height:140px;margin-bottom:8px}
.circ svg{width:140px;height:140px;transform:rotate(-90deg)}
.c-bg{fill:none;stroke:rgba(14,72,254,0.08);stroke-width:10}
.c-prog{fill:none;stroke-width:10;stroke-linecap:round}
.c-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.c-score{font-family:var(--f1);font-size:30px;font-weight:800;letter-spacing:-.04em;line-height:1}
.c-label{font-size:8px;font-weight:600;color:var(--th);letter-spacing:.08em;text-transform:uppercase}
.rd-item{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)}
.rd-item:last-child{border-bottom:none}
.rd-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-right:6px}
.rd-lbl{display:flex;align-items:center;font-size:9.5px;color:var(--t2)}
.rd-val{font-family:var(--f1);font-size:13px;font-weight:700;color:var(--t1)}
.foot{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--bd);padding-top:10px;margin-top:14px;font-size:9px;color:var(--th);font-weight:500}
.btn-pdf{position:fixed;bottom:22px;right:22px;z-index:100;background:var(--B);color:white;border:none;border-radius:12px;padding:11px 22px;font-family:var(--f1);font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 18px rgba(14,72,254,0.38)}
@page{size:A4 portrait;margin:10mm}
@media print{body{background:white!important;padding:0!important;display:block!important}.bol{box-shadow:none!important;border-radius:0!important;width:100%!important}.btn-pdf{display:none!important}}
</style>
</head>
<body>
<div class="bol">
  <div class="hdr">
    <img class="brand-logo" src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png" alt="SpeakUp"/>
    <div class="world-deco"></div>
    <div class="doc-badge"><span>Documento Oficial</span></div>
  </div>
  <div class="body">
    <h1 class="pg-title">RELATÓRIO DE FREQUÊNCIA</h1>
    <div class="pg-sub"><span class="pg-sub-dot"></span>${ano} &bull; ${turma?.nome || ''}</div>
    ${lowFreq ? `<div class="alert-bar">⚠ Frequência abaixo de 75%. Aluno em risco de reprovação por faltas.</div>` : ''}
    <div class="stud">
      <div class="stud-av">${iniciais}</div>
      <div class="stud-info">
        <div class="stud-name">${nomeAluno}</div>
        <div class="stud-meta"><span>Aluno(a)</span> &nbsp;•&nbsp; ${ano}</div>
      </div>
      <div class="div-v"></div>
      <div class="ic-col">
        <div class="ic-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
        <div><div class="ic-lbl">Turma</div><div class="ic-val">${turma?.nome || '—'}</div></div>
      </div>
      <div class="div-v"></div>
      <div class="ic-col">
        <div class="ic-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg></div>
        <div><div class="ic-lbl">Nível</div><div class="ic-val">${turma?.nivel || '—'}</div></div>
      </div>
      <div class="div-v"></div>
      <div class="ic-col">
        <div class="ic-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div><div class="ic-lbl">Professor(a)</div><div class="ic-val">${turma?.professor || '—'}</div></div>
      </div>
    </div>
    <div class="main-g">
      <div class="tbl-card">
        <table>
          <thead>
            <tr>
              <th style="text-align:center">#</th>
              <th>Data</th>
              <th>Conteúdo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div>
        <div class="res-card">
          <div class="res-ttl">Frequência Geral</div>
          <div class="circ">
            <svg viewBox="0 0 180 180">
              <circle class="c-bg" cx="90" cy="90" r="${r}"/>
              <circle class="c-prog" cx="90" cy="90" r="${r}" style="stroke:${stats.pct === null ? '#9ca3af' : pctColor};stroke-dasharray:${circ};stroke-dashoffset:${off}"/>
            </svg>
            <div class="c-inner">
              <div class="c-score" style="color:${stats.pct === null ? '#9ca3af' : pctColor}">${stats.pct !== null ? stats.pct + '%' : '—'}</div>
              <div class="c-label">presença</div>
            </div>
          </div>
          <div style="width:100%">
            <div class="rd-item"><span class="rd-lbl"><span class="rd-dot" style="background:#16a34a"></span>Presentes</span><span class="rd-val">${stats.presencas}</span></div>
            <div class="rd-item"><span class="rd-lbl"><span class="rd-dot" style="background:#ef4444"></span>Faltas</span><span class="rd-val">${stats.faltas}</span></div>
            <div class="rd-item"><span class="rd-lbl"><span class="rd-dot" style="background:#d97706"></span>Justificadas</span><span class="rd-val">${stats.justificadas}</span></div>
            <div class="rd-item"><span class="rd-lbl"><span class="rd-dot" style="background:#9ca3af"></span>Total</span><span class="rd-val">${stats.total}</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="foot">
      <span>SpeakUp English Language Academy &nbsp;•&nbsp; Cataguases, MG</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
    </div>
  </div>
</div>
<button class="btn-pdf" onclick="window.print()">⬇ Baixar PDF</button>
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0e48fe,#0041a8)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Relatório de Frequência</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              {nomeAluno}{turma ? ` — ${turma.nome}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Stats summary */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          {lowFreq && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '7px 14px', marginBottom: 10, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
              <AlertCircle size={14} /> Frequência abaixo de 75% — risco de reprovação por faltas
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: stats.pct !== null ? 10 : 0 }}>
            {[
              { label: 'Total',        value: stats.total,        color: '#64748b', bg: '#f8fafc' },
              { label: 'Presentes',    value: stats.presencas,    color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Faltas',       value: stats.faltas,       color: '#dc2626', bg: '#fef2f2' },
              { label: 'Justificadas', value: stats.justificadas, color: '#d97706', bg: '#fffbeb' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '9px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {stats.pct !== null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Frequência geral</span>
                <span style={{ fontWeight: 800, color: pctColor }}>{stats.pct}%</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.pct}%`, background: pctColor, borderRadius: 99 }} />
              </div>
              <div style={{ textAlign: 'right', marginTop: 3, fontSize: 9, color: '#94a3b8' }}>Mínimo exigido: 75%</div>
            </div>
          )}
        </div>

        {/* Aulas timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
          {aulasT.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <Calendar size={28} style={{ margin: '0 auto 8px', display: 'block' }} />
              Nenhuma aula registrada para esta turma.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {aulasT.map((aula, i) => {
                const ch = (aula.chamadas || []).find(c => c.alunoId === aluno.id);
                const st = ch?.status;
                const cfg = statusCfg[st] || { bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8', label: '—', Icon: Calendar };
                const Icon = cfg.Icon;
                const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';
                return (
                  <div key={aula.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ minWidth: 62, fontSize: 12, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{dataFmt}</div>
                    <div style={{ flex: 1, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {aula.conteudo || <em style={{ color: '#94a3b8' }}>Sem conteúdo</em>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Icon size={13} style={{ color: cfg.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Fechar
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, background: '#0e48fe', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={15} />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
