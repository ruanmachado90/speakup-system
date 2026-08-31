import React from 'react';
import { X, Printer } from 'lucide-react';
import { abrirJanelaImpressao } from '../../utils/janelaImpressao';

const MEDALS = ['🥇', '🥈', '🥉'];
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function RankingTarefas({ turma, aulas, alunos, onClose }) {
  const medals = MEDALS;

  const parseAulaDate = (aula) => {
    if (!aula.data) return null;
    if (typeof aula.data === 'string') {
      const p = aula.data.split('-');
      if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }
    if (aula.data?.toDate) return aula.data.toDate();
    if (aula.data?.seconds) return new Date(aula.data.seconds * 1000);
    return new Date(aula.data);
  };

  const ranking = React.useMemo(() => {
    const aulasT = aulas
      .filter(a => a.turmaId === turma.id)
      .map(a => ({ ...a, _date: parseAulaDate(a) }))
      .filter(a => a._date)
      .sort((a, b) => a._date - b._date);

    return alunos.map(aluno => {
      const xpBlocks = [];
      aulasT.forEach(aula => {
        const c = (aula.chamadas || []).find(c => c.alunoId === aluno.id);
        if (c?.tarefa === 'feito' || c?.tarefa === 'nao_feito' || c?.tarefa === 'incompleto') {
          const d = aula._date;
          xpBlocks.push({
            tarefa: c.tarefa,
            dia: String(d.getDate()).padStart(2, '0'),
            mes: MESES[d.getMonth()],
            dataLabel: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }),
          });
        }
      });
      const feitas = xpBlocks.filter(b => b.tarefa === 'feito').length;
      const total = xpBlocks.length;
      return {
        id: aluno.id,
        nome: aluno.nome || aluno.name || aluno.id,
        feitas,
        total,
        pct: total > 0 ? Math.round((feitas / total) * 100) : null,
        xpBlocks,
      };
    })
    .filter(a => a.total > 0)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.feitas - a.feitas);
  }, [turma, aulas, alunos]);

  const handlePrint = () => {
    const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const blockHtml = (blocks) => blocks.map(b => {
      const bg = b.tarefa === 'feito' ? '#10b981' : b.tarefa === 'incompleto' ? '#fbbf24' : '#f87171';
      return `<div title="${b.dataLabel}" style="width:26px;height:26px;background:${bg};border-radius:5px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:2px;color:white;line-height:1;font-size:7px;font-weight:bold">
        <span>${b.dia}</span><span>${b.mes}</span>
      </div>`;
    }).join('');
    abrirJanelaImpressao(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Ranking de Tarefas — ${turma.nome}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px;max-width:620px;margin:0 auto}
        h1{font-size:20px;color:#005DE4;margin-bottom:2px}
        .sub{font-size:12px;color:#64748b;margin-bottom:20px}
        .card{border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px}
        .header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .pos{font-size:20px;width:28px;text-align:center}
        .nome{flex:1;font-weight:700;font-size:14px}
        .pct{font-size:17px;font-weight:800}
        .cnt{font-size:11px;color:#94a3b8;margin-left:4px}
        .blocks{display:flex;flex-wrap:wrap;gap:2px;margin-top:4px}
        .legend{display:flex;gap:16px;font-size:10px;color:#64748b;margin-top:14px;margin-bottom:6px}
        .dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:4px}
        .footer{margin-top:20px;text-align:center;font-size:10px;color:#94a3b8}
      </style>
    </head><body>
      <h1>📚 Ranking de Tarefas</h1>
      <p class="sub">${turma.nome}${turma.nivel ? ' • ' + turma.nivel : ''} — ${mesLabel}</p>
      <div class="legend">
        <span><span class="dot" style="background:#10b981"></span>Tarefa feita</span>
        <span><span class="dot" style="background:#fbbf24"></span>Incompleto</span>
        <span><span class="dot" style="background:#f87171"></span>Não fez</span>
      </div>
      ${ranking.map((a, i) => {
        const color = a.pct >= 80 ? '#16a34a' : a.pct >= 50 ? '#d97706' : '#dc2626';
        return `<div class="card">
          <div class="header">
            <span class="pos">${i < 3 ? medals[i] : `<span style="color:#94a3b8;font-size:13px">${i+1}°</span>`}</span>
            <span class="nome">${a.nome}</span>
            <span class="pct" style="color:${color}">${a.pct}%</span>
            <span class="cnt">${a.feitas}/${a.total} aulas</span>
          </div>
          <div class="blocks">${blockHtml(a.xpBlocks)}</div>
        </div>`;
      }).join('')}
      <p class="footer">SpeakUp English Academy • ${turma.nome} • ${new Date().toLocaleDateString('pt-BR')}</p>
    </body></html>`, { delay: 300 });
  };

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-800">📚 Ranking de Tarefas</h2>
          <p className="text-sm text-slate-500">{turma.nome}{turma.nivel ? ` — ${turma.nivel}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:border-[#005DE4] hover:text-[#005DE4] transition-all"
          >
            <Printer size={16} /> Imprimir / Enviar
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-3 pb-1 bg-white border-b border-slate-100 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Tarefa feita (+XP)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Incompleto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Não fez
        </span>
        <span className="ml-auto text-slate-400 italic">passe o mouse nos blocos para ver a data</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        {ranking.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-semibold text-slate-600 mb-1">Nenhum dado de tarefa ainda</p>
            <p className="text-sm">Marque "Fez" ou "Não fez" na chamada para ver o ranking aparecer aqui.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {ranking.map((aluno, i) => {
                const pctColor = aluno.pct >= 80 ? 'text-emerald-600' : aluno.pct >= 50 ? 'text-amber-600' : 'text-red-500';
                const cardStyle =
                  i === 0 ? 'bg-yellow-50 border-yellow-300 shadow-sm' :
                  i === 1 ? 'bg-slate-100 border-slate-300' :
                  i === 2 ? 'bg-orange-50 border-orange-300' :
                  'bg-white border-slate-200';
                return (
                  <div key={aluno.id} className={`p-4 rounded-2xl border ${cardStyle}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl w-8 text-center flex-shrink-0">
                        {i < 3 ? medals[i] : <span className="text-sm font-bold text-slate-400">{i + 1}°</span>}
                      </span>
                      <p className="font-semibold text-slate-800 text-sm flex-1 truncate">{aluno.nome}</p>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-lg font-bold ${pctColor}`}>{aluno.pct}%</span>
                        <span className="text-xs text-slate-400 ml-1">{aluno.feitas}/{aluno.total}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {aluno.xpBlocks.map((block, bi) => (
                        <div
                          key={bi}
                          title={block.dataLabel}
                          className={`flex flex-col items-center justify-center rounded-md text-white select-none cursor-default
                            transition-transform hover:scale-125 hover:z-10 relative
                            ${block.tarefa === 'feito'
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-300'
                              : block.tarefa === 'incompleto'
                              ? 'bg-amber-400 shadow-sm shadow-amber-200'
                              : 'bg-red-400 shadow-sm shadow-red-200'
                            }`}
                          style={{ width: 26, height: 26 }}
                        >
                          <span style={{ fontSize: 7, lineHeight: 1, fontWeight: 700 }}>{block.dia}</span>
                          <span style={{ fontSize: 6, lineHeight: 1, opacity: 0.85 }}>{block.mes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-center text-slate-400">
              {ranking.length} aluno{ranking.length !== 1 ? 's' : ''} com registros de tarefa
            </p>
          </>
        )}
      </div>
    </div>
  );
}
