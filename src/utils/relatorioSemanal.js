const DIAS_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function fmtData(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return DIAS_PT[new Date(y, m - 1, d).getDay()];
}

function semanaAnterior() {
  const hoje = new Date();
  const dow = hoje.getDay() === 0 ? 7 : hoje.getDay();
  const segundaEsta = new Date(hoje);
  segundaEsta.setDate(hoje.getDate() - (dow - 1));
  const segunda = new Date(segundaEsta);
  segunda.setDate(segundaEsta.getDate() - 7);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  const iso = d => d.toISOString().slice(0, 10);
  return [iso(segunda), iso(domingo)];
}

function cardAula(aula) {
  const presentes    = (aula.chamadas || []).filter(c => c.status === 'presente').length;
  const faltas       = (aula.chamadas || []).filter(c => c.status === 'falta').length;
  const justificadas = (aula.chamadas || []).filter(c => c.status === 'justificada').length;

  if (aula.status && aula.status !== 'realizada') {
    const badges = {
      cancelada: ['🔴', 'Cancelada', '#fef2f2', '#dc2626'],
      feriado:   ['🟡', 'Feriado',   '#fffbeb', '#d97706'],
      recesso:   ['🟢', 'Recesso',   '#f0fdf4', '#16a34a'],
    };
    const [emoji, label, bg, cor] = badges[aula.status] || ['⚪', aula.status, '#f8fafc', '#64748b'];
    return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;">
      <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;">
        <div style="background:#005DE4;color:#fff;border-radius:8px;padding:8px;font-size:16px;">📖</div>
        <div>
          <div style="font-weight:700;color:#1e293b;font-size:14px;">${fmtData(aula.data)} — ${aula.turmaNome}</div>
          <span style="background:${bg};color:${cor};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;">${emoji} ${label}</span>
        </div>
      </div>
    </div>`;
  }

  const conteudo = aula.conteudo || 'Não registrado';
  const homework = aula.homework || 'Nenhum';
  const obs      = aula.observacoes || '—';

  const justifRow = justificadas > 0
    ? `<tr><td style="color:#d97706;padding:3px 0;">⚠️ Justificadas</td><td style="padding:3px 0;font-weight:600;color:#d97706;">${justificadas}</td></tr>`
    : '';

  const cores = {
    presente:    ['#f0fdf4', '#16a34a', '✅'],
    falta:       ['#fef2f2', '#dc2626', '❌'],
    justificada: ['#fffbeb', '#d97706', '⚠️'],
  };
  const alunosHTML = (aula.chamadas || []).length ? `
    <div style="margin-top:10px;">
      <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
        Chamada (${aula.chamadas.length} alunos)
      </div>
      ${aula.chamadas.map(c => {
        const [bg, cor, emoji] = cores[c.status] || ['#f8fafc','#64748b','—'];
        return `<div style="background:${bg};border-radius:6px;padding:4px 10px;display:flex;justify-content:space-between;margin-bottom:3px;font-size:12px;">
          <span>${c.alunoNome}</span><span style="color:${cor};font-weight:600;">${emoji}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  return `
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;">
    <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;">
      <div style="background:#005DE4;color:#fff;border-radius:8px;padding:8px;font-size:16px;">📖</div>
      <div>
        <div style="font-weight:700;color:#1e293b;font-size:14px;">${fmtData(aula.data)} — ${aula.turmaNome}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">${conteudo}</div>
      </div>
    </div>
    <div style="padding:14px 16px;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#64748b;padding:3px 0;width:120px;">📖 Conteúdo</td><td style="padding:3px 0;font-weight:500;">${conteudo}</td></tr>
        <tr><td style="color:#7c3aed;padding:3px 0;">📝 Homework</td><td style="padding:3px 0;font-weight:500;color:#7c3aed;">${homework}</td></tr>
        <tr><td style="color:#64748b;padding:3px 0;">💬 Observações</td><td style="padding:3px 0;">${obs}</td></tr>
        <tr><td style="color:#16a34a;padding:3px 0;">✅ Presentes</td><td style="padding:3px 0;font-weight:600;color:#16a34a;">${presentes}</td></tr>
        <tr><td style="color:#dc2626;padding:3px 0;">❌ Faltas</td><td style="padding:3px 0;font-weight:600;color:#dc2626;">${faltas}</td></tr>
        ${justifRow}
      </table>
      ${alunosHTML}
    </div>
  </div>`;
}

function gerarHTMLRelatorio(aulas, segunda, domingo, professor) {
  const porDia = {};
  aulas.forEach(a => { (porDia[a.data] = porDia[a.data] || []).push(a); });

  const realizadas    = aulas.filter(a => !a.status || a.status === 'realizada');
  const naoRealizadas = aulas.filter(a => a.status && a.status !== 'realizada');

  const corpo = aulas.length === 0
    ? `<div style="text-align:center;padding:40px;color:#64748b;">
        <div style="font-size:40px;margin-bottom:12px;">📭</div>
        <p style="font-size:16px;font-weight:600;">Nenhuma aula registrada esta semana.</p>
       </div>`
    : Object.keys(porDia).sort().map(data => `
        <div style="margin-bottom:24px;">
          <div style="font-size:13px;font-weight:700;color:#005DE4;text-transform:uppercase;
                      letter-spacing:.8px;padding:6px 0;border-bottom:2px solid #005DE4;margin-bottom:12px;">
            ${diaSemana(data)}, ${fmtData(data)}
          </div>
          ${porDia[data].map(cardAula).join('')}
        </div>`).join('')
      + `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-top:8px;">
          <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">📊 Resumo da semana</div>
          <table style="font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:3px 16px 3px 0;color:#64748b;">✅ Aulas realizadas</td><td style="font-weight:700;color:#16a34a;">${realizadas.length}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#64748b;">🔴 Não realizadas</td><td style="font-weight:700;color:#dc2626;">${naoRealizadas.length}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#64748b;">📚 Total</td><td style="font-weight:700;">${aulas.length}</td></tr>
          </table>
        </div>`;

  const periodo = `${fmtData(segunda)} a ${fmtData(domingo)}/${domingo.slice(0,4)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório Semanal — ${professor}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#005DE4;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="color:#fff;font-size:20px;font-weight:800;">SpeakUp</div>
        <div style="color:#93c5fd;font-size:12px;margin-top:2px;">English Language Academy</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#fff;font-weight:700;font-size:15px;">📋 Resumo Semanal</div>
        <div style="color:#93c5fd;font-size:12px;margin-top:2px;">${periodo}</div>
      </div>
    </div>
    <div style="background:#eff6ff;padding:12px 28px;border-bottom:1px solid #dbeafe;">
      <span style="font-size:13px;color:#1d4ed8;font-weight:600;">👤 Professor: ${professor}</span>
    </div>
    <div style="padding:24px 28px;">${corpo}</div>
    <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
      SpeakUp Cataguases · gestao.speakupcataguases.com
    </div>
  </div>
</body>
</html>`;
}

export function baixarRelatorioSemanal(todasAulas, professorNome) {
  const [segunda, domingo] = semanaAnterior();
  const aulasNaSemana = todasAulas.filter(
    a => a.data >= segunda && a.data <= domingo
  );
  const html = gerarHTMLRelatorio(aulasNaSemana, segunda, domingo, professorNome);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `relatorio_semanal_${segunda}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
