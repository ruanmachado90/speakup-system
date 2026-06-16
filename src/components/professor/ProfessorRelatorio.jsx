import React from 'react';
import { X, Printer } from 'lucide-react';

export function ProfessorRelatorio({ professor, turmas, aulas, alunosPorTurma, onClose }) {
  const printRef = React.useRef(null);
  const hoje = new Date();
  const mesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const mesAtual = mesNomes[hoje.getMonth()];
  const anoAtual = hoje.getFullYear();

  const aulasMes = aulas.filter(a => {
    if (!a.data) return false;
    const [ano, mes] = a.data.split('-').map(Number);
    return mes - 1 === hoje.getMonth() && ano === anoAtual;
  });

  const statsPorTurma = turmas.map(turma => {
    const aulasT = aulas.filter(a => a.turmaId === turma.id);
    const aulasTMes = aulasMes.filter(a => a.turmaId === turma.id);
    const alunos = alunosPorTurma[turma.id] || [];
    const previstas = turma.totalAulas || 40;

    let freqMedia = null;
    if (aulasT.length > 0) {
      const total = aulasT.reduce((acc, a) => {
        const presentes = (a.chamadas || []).filter(c => c.status === 'presente').length;
        const tot = (a.chamadas || []).length;
        return tot > 0 ? acc + (presentes / tot) : acc;
      }, 0);
      freqMedia = Math.round((total / aulasT.length) * 100);
    }

    const emRisco = alunos.filter(aluno => {
      const presencas = aulasT.filter(a =>
        (a.chamadas || []).find(c => c.alunoId === aluno.id && c.status === 'presente')
      ).length;
      return aulasT.length > 0 && Math.round((presencas / aulasT.length) * 100) < 75;
    });

    return {
      id: turma.id, nome: turma.nome, nivel: turma.nivel, dias: turma.dias, horario: turma.horario,
      totalAlunos: alunos.length, aulasDadas: aulasT.length, aulasMes: aulasTMes.length,
      previstas, freqMedia, emRisco,
    };
  });

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Relatório — ${professor} — ${mesAtual}/${anoAtual}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 20px; }
        h1 { font-size: 18px; color: #005DE4; margin-bottom: 4px; }
        .section-title { font-weight: 700; font-size: 13px; border-bottom: 2px solid #005DE4; padding-bottom: 4px; margin: 16px 0 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; color: #64748b; }
        td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
        .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const totalAulasMes = statsPorTurma.reduce((s, t) => s + t.aulasMes, 0);
  const totalAlunosEmRisco = statsPorTurma.reduce((s, t) => s + t.emRisco.length, 0);
  const freqGeral = statsPorTurma.filter(t => t.freqMedia !== null);
  const freqMedia = freqGeral.length > 0
    ? Math.round(freqGeral.reduce((s, t) => s + t.freqMedia, 0) / freqGeral.length) : null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:860, boxShadow:'0 24px 64px rgba(0,0,0,0.2)', marginTop:20, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', background:'linear-gradient(135deg,#005DE4,#0041a8)', borderRadius:'16px 16px 0 0', color:'white' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:17 }}>📊 Relatório — {professor}</div>
            <div style={{ fontSize:13, opacity:0.85 }}>{mesAtual} de {anoAtual}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handlePrint} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', color:'white', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontWeight:600, fontSize:13 }}>
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'white', borderRadius:8, padding:'8px 10px', cursor:'pointer' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={printRef} style={{ padding:24 }}>
          <h1 style={{ display:'none' }}>Relatório Mensal — {professor} — {mesAtual}/{anoAtual}</h1>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Turmas', value: turmas.length, color:'#005DE4' },
              { label:'Aulas este mês', value: totalAulasMes, color:'#7c3aed' },
              { label:'Freq. média geral', value: freqMedia !== null ? `${freqMedia}%` : '—', color: freqMedia === null ? '#64748b' : freqMedia >= 75 ? '#16a34a' : '#dc2626' },
              { label:'Alunos em risco', value: totalAlunosEmRisco, color: totalAlunosEmRisco > 0 ? '#dc2626' : '#16a34a' },
            ].map(s => (
              <div key={s.label} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ fontWeight:700, fontSize:14, borderBottom:'2px solid #005DE4', paddingBottom:6, marginBottom:12, color:'#0f172a' }}>📋 Desempenho por Turma</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:20 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Turma','Nível','Dias / Horário','Alunos','Aulas Dadas','Previstas','Este Mês','Freq. Média','Em Risco'].map(h => (
                  <th key={h} style={{ padding:'8px', textAlign:'left', fontWeight:600, color:'#64748b', fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statsPorTurma.map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'8px', fontWeight:600 }}>{t.nome}</td>
                  <td style={{ padding:'8px' }}><span style={{ background:'#eff6ff', color:'#3b82f6', borderRadius:4, padding:'2px 6px', fontSize:11 }}>{t.nivel}</span></td>
                  <td style={{ padding:'8px', color:'#64748b', fontSize:11 }}>{t.dias}<br/>{t.horario}</td>
                  <td style={{ padding:'8px', textAlign:'center' }}>{t.totalAlunos}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600 }}>{t.aulasDadas}</td>
                  <td style={{ padding:'8px', textAlign:'center', color:'#64748b' }}>{t.previstas}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600, color:'#7c3aed' }}>{t.aulasMes}</td>
                  <td style={{ padding:'8px', textAlign:'center', fontWeight:600, color: t.freqMedia === null ? '#64748b' : t.freqMedia >= 75 ? '#16a34a' : '#dc2626' }}>
                    {t.freqMedia !== null ? `${t.freqMedia}%` : '—'}
                  </td>
                  <td style={{ padding:'8px', textAlign:'center' }}>
                    {t.emRisco.length > 0 ? <span style={{ color:'#dc2626', fontWeight:600 }}>{t.emRisco.length} ⚠️</span> : <span style={{ color:'#16a34a' }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalAlunosEmRisco > 0 && (
            <>
              <div className="section-title" style={{ fontWeight:700, fontSize:14, borderBottom:'2px solid #ef4444', paddingBottom:6, marginBottom:12, color:'#0f172a' }}>⚠️ Alunos com Frequência &lt; 75%</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:20 }}>
                <thead>
                  <tr style={{ background:'#fef2f2' }}>
                    {['Aluno','Turma','Frequência'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, color:'#ef4444', fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statsPorTurma.flatMap(t =>
                    t.emRisco.map(aluno => {
                      const aulasT = aulas.filter(a => a.turmaId === t.id);
                      const presencas = aulasT.filter(a => (a.chamadas||[]).find(c => c.alunoId === aluno.id && c.status === 'presente')).length;
                      const pct = aulasT.length > 0 ? Math.round(presencas / aulasT.length * 100) : 0;
                      return (
                        <tr key={`${t.id}-${aluno.id}`} style={{ borderBottom:'1px solid #fee2e2' }}>
                          <td style={{ padding:'8px 10px', fontWeight:600 }}>{aluno.nome || aluno.name}</td>
                          <td style={{ padding:'8px 10px', color:'#64748b' }}>{t.nome}</td>
                          <td style={{ padding:'8px 10px', color:'#dc2626', fontWeight:700 }}>{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </>
          )}

          <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:12, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
            Gerado em {hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})} — SpeakUp English Academy — Prof.: {professor}
          </div>
        </div>
      </div>
    </div>
  );
}
