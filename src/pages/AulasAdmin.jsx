import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, orderBy, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen, Printer, ChevronDown } from 'lucide-react';

// ── Diário de Classe ───────────────────────────────────────────────────────
function DiarioDeClasse({ turmaInfo, aulasMes, mesLabel }) {
  const printRef = useRef();

  const datas = useMemo(() =>
    [...new Set(aulasMes.map(a => a.data).filter(Boolean))].sort()
  , [aulasMes]);

  const alunos = useMemo(() => {
    const map = {};
    aulasMes.forEach(aula => {
      (aula.chamadas || []).forEach(c => {
        const key = c.alunoId || c.alunoNome;
        if (!map[key]) map[key] = c.alunoNome || c.alunoId;
      });
    });
    return Object.entries(map)
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [aulasMes]);

  const aulaMap = useMemo(() => {
    const m = {};
    aulasMes.forEach(a => { if (a.data) m[a.data] = a; });
    return m;
  }, [aulasMes]);

  const getStatus = (alunoId, data) => {
    const aula = aulaMap[data];
    if (!aula) return null;
    const c = (aula.chamadas || []).find(c => (c.alunoId || c.alunoNome) === alunoId);
    if (!c?.status) return null;
    // Normaliza: ChamadaForm salva 'justificada', o diário espera 'falta-justificada'
    return c.status === 'justificada' ? 'falta-justificada' : c.status;
  };

  const resumoAluno = (alunoId) => {
    let presencas = 0, faltas = 0, justificadas = 0;
    datas.forEach(data => {
      const s = getStatus(alunoId, data);
      if (s === 'presente') presencas++;
      else if (s === 'falta-justificada') justificadas++;
      else if (s === 'falta') faltas++;
    });
    return { presencas, faltas, justificadas };
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Diário de Classe — ${turmaInfo?.nome} — ${mesLabel}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;color:#0f172a;padding:16px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #cbd5e1;margin-bottom:16px}
        .info-cell{padding:6px 10px;border:1px solid #cbd5e1}
        .info-label{font-weight:700;margin-right:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:center}
        th{background:#f1f5f9;font-weight:700;font-size:10px}
        td.nome{text-align:left}
        .p{color:#16a34a;font-weight:700}
        .f{color:#dc2626;font-weight:700}
        .fj{color:#d97706;font-weight:700}
        .sec-title{font-weight:700;background:#f1f5f9;padding:5px 8px;border:1px solid #cbd5e1;border-bottom:none}
        .content-row td{text-align:left;padding:5px 8px}
        .total{background:#f8fafc;font-weight:600}
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  const diaFormatado = (data) => new Date(data + 'T12:00:00').getDate();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] text-sm font-medium transition-colors"
        >
          <Printer size={16} /> Imprimir Diário
        </button>
      </div>

      <div ref={printRef}>
        {/* Info da turma */}
        <div className="grid grid-cols-2 border border-slate-300 rounded-t-lg overflow-hidden text-sm info-grid">
          <div className="px-4 py-2.5 border-b border-r border-slate-300 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Turma:</span>
            <span className="text-slate-800 font-bold">{turmaInfo?.nome || '—'}</span>
          </div>
          <div className="px-4 py-2.5 border-b border-slate-300 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Mês:</span>
            <span className="text-slate-800">{mesLabel}</span>
          </div>
          <div className="px-4 py-2.5 border-b border-r border-slate-300 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Nível:</span>
            <span className="text-slate-800">{turmaInfo?.nivel || '—'}</span>
          </div>
          <div className="px-4 py-2.5 border-b border-slate-300 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Dia:</span>
            <span className="text-slate-800">{turmaInfo?.dias || '—'}</span>
          </div>
          <div className="px-4 py-2.5 border-r border-slate-300 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Professor:</span>
            <span className="text-[#005DE4] font-semibold">{turmaInfo?.professor || '—'}</span>
          </div>
          <div className="px-4 py-2.5 flex gap-2 info-cell">
            <span className="font-semibold text-slate-500 info-label">Horário:</span>
            <span className="text-slate-800">{turmaInfo?.horario || '—'}</span>
          </div>
        </div>

        {alunos.length === 0 && datas.length === 0 ? (
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-10 text-center text-slate-400 bg-white">
            <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma aula registrada neste período para esta turma</p>
          </div>
        ) : (
          <>
            {/* Tabela de chamada */}
            <div className="overflow-x-auto border border-t-0 border-slate-300 rounded-b-lg">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700 border-r border-slate-300 min-w-[180px]">Aluno</th>
                    {datas.map(data => (
                      <th key={data} className="px-3 py-2.5 font-semibold text-slate-700 border-r border-slate-200 text-center min-w-[44px]">
                        {diaFormatado(data)}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-semibold text-slate-600 text-center min-w-[56px] bg-slate-50">Faltas</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-600 text-center min-w-[56px] bg-slate-50">Freq.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alunos.map(aluno => {
                    const { presencas, faltas, justificadas } = resumoAluno(aluno.id);
                    const freq = datas.length > 0 ? Math.round((presencas / datas.length) * 100) : null;
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-800 border-r border-slate-200 nome">{aluno.nome}</td>
                        {datas.map(data => {
                          const s = getStatus(aluno.id, data);
                          return (
                            <td key={data} className="px-3 py-2 text-center border-r border-slate-100">
                              {s === 'presente' && <span className="p font-bold text-emerald-600 text-sm">P</span>}
                              {s === 'falta' && <span className="f font-bold text-red-600 text-sm">F</span>}
                              {s === 'falta-justificada' && <span className="fj font-bold text-amber-500 text-sm">FJ</span>}
                              {!s && <span className="text-slate-200 text-xs">—</span>}
                            </td>
                          );
                        })}
                        <td className={`px-3 py-2 text-center font-semibold text-sm bg-slate-50 total ${faltas > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {faltas}
                          {justificadas > 0 && <span className="text-amber-500 text-xs ml-1">(+{justificadas}FJ)</span>}
                        </td>
                        <td className={`px-3 py-2 text-center font-semibold text-sm bg-slate-50 total ${freq !== null && freq < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {freq !== null ? `${freq}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2 px-1">
              <span><span className="font-bold text-emerald-600">P</span> = Presente</span>
              <span><span className="font-bold text-red-600">F</span> = Falta</span>
              <span><span className="font-bold text-amber-500">FJ</span> = Falta Justificada</span>
              <span className="ml-auto text-red-500 font-medium">Freq. &lt; 75% em vermelho</span>
            </div>

            {/* Conteúdo lecionado */}
            <div className="mt-6 border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 sec-title">
                <span className="font-semibold text-slate-700 text-sm">Conteúdo Lecionado</span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-r border-slate-200 w-28">Data</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Conteúdo Lecionado</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-l border-slate-200 w-64 hidden md:table-cell">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {datas.map(data => {
                    const aula = aulaMap[data];
                    const dataFmt = data.split('-').reverse().join('/');
                    return (
                      <tr key={data} className="hover:bg-slate-50 content-row">
                        <td className="px-4 py-2.5 text-slate-700 font-medium border-r border-slate-200 whitespace-nowrap">{dataFmt}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {aula?.conteudo || <span className="text-slate-300 italic text-xs">Sem registro</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs border-l border-slate-200 hidden md:table-cell">
                          {aula?.observacoes || ''}
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 6 - datas.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="content-row">
                      <td className="px-4 py-3 border-r border-slate-200">&nbsp;</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 border-l border-slate-200 hidden md:table-cell"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Remove acentos e normaliza para comparação de nomes com/sem acento
const normalizeStr = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Página principal ───────────────────────────────────────────────────────
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function AulasAdmin() {
  const [aulas, setAulas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const [filtroMes, setFiltroMes] = useState(hoje.getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(hoje.getFullYear());
  const [filtroProfessor, setFiltroProfessor] = useState('');
  const [filtroTurmaId, setFiltroTurmaId] = useState('');

  useEffect(() => {
    const unsubAulas = onSnapshot(
      query(collection(db, 'aulas'), orderBy('data', 'desc')),
      (snap) => {
        setAulas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    getDocs(collection(db, 'turmas')).then(snap =>
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsubAulas;
  }, []);

  const professores = useMemo(() =>
    [...new Set(aulas.map(a => a.professor).filter(Boolean))].sort()
  , [aulas]);

  const turmasFiltradas = useMemo(() => {
    if (!filtroProfessor) return [];
    // Normaliza acentos: professor no slug (ex: "Joao") deve bater com "João" na turma
    const primNorm = normalizeStr(filtroProfessor.split(' ')[0]);
    return turmas.filter(t => normalizeStr(t.professor).includes(primNorm));
  }, [turmas, filtroProfessor]);

  const turmaInfo = useMemo(() =>
    turmas.find(t => t.id === filtroTurmaId) || null
  , [turmas, filtroTurmaId]);

  const aulasMes = useMemo(() => {
    const mesStr = String(filtroMes).padStart(2, '0');
    return aulas.filter(a => {
      if (!a.data) return false;
      const [ano, mes] = a.data.split('-');
      if (ano !== String(filtroAno) || mes !== mesStr) return false;
      if (filtroTurmaId && a.turmaId !== filtroTurmaId) return false;
      if (filtroProfessor && a.professor !== filtroProfessor) return false;
      return true;
    });
  }, [aulas, filtroMes, filtroAno, filtroTurmaId, filtroProfessor]);

  const mesLabel = `${MESES[filtroMes - 1]}/${filtroAno}`;

  const anos = useMemo(() => {
    const set = new Set(aulas.map(a => a.data?.split('-')[0]).filter(Boolean));
    return [...set].sort().reverse();
  }, [aulas]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-[#005DE4] rounded-full animate-spin mr-3" />
      Carregando...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-[#005DE4] to-[#0041a8] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen size={28} /> Diário de Classe
        </h2>
        <p className="text-blue-100 mt-1 text-sm">Selecione professor, turma e mês para visualizar o diário</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Professor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Professor</label>
            <div className="relative">
              <select
                value={filtroProfessor}
                onChange={e => { setFiltroProfessor(e.target.value); setFiltroTurmaId(''); }}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#005DE4]/30 focus:border-[#005DE4]"
              >
                <option value="">Selecione...</option>
                {professores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Turma */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Turma</label>
            <div className="relative">
              <select
                value={filtroTurmaId}
                onChange={e => setFiltroTurmaId(e.target.value)}
                disabled={!filtroProfessor}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#005DE4]/30 focus:border-[#005DE4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{filtroProfessor ? 'Selecione...' : 'Primeiro, professor'}</option>
                {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Mês */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mês</label>
            <div className="relative">
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(Number(e.target.value))}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#005DE4]/30 focus:border-[#005DE4]"
              >
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Ano */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ano</label>
            <div className="relative">
              <select
                value={filtroAno}
                onChange={e => setFiltroAno(Number(e.target.value))}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#005DE4]/30 focus:border-[#005DE4]"
              >
                {anos.length > 0 ? anos.map(a => <option key={a} value={a}>{a}</option>) : <option value={filtroAno}>{filtroAno}</option>}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Diário ou placeholder */}
      {filtroProfessor && filtroTurmaId ? (
        <DiarioDeClasse turmaInfo={turmaInfo} aulasMes={aulasMes} mesLabel={mesLabel} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-xl border border-slate-200">
          <BookOpen size={52} className="mb-4 opacity-40" />
          <p className="text-slate-500 font-medium text-lg">Selecione um professor e uma turma</p>
          <p className="text-slate-400 text-sm mt-1">O diário de classe aparecerá aqui</p>
        </div>
      )}
    </div>
  );
}

