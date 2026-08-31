import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookMarked,
  FileText,
  ChevronDown,
  ChevronUp,
  Users,
  Trash2,
  Edit,
  Save,
} from 'lucide-react';
import { baixarRelatorioSemanal } from '../utils/relatorioSemanal';
import { abrirJanelaImpressao } from '../utils/janelaImpressao';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from './ui/ConfirmDialog';

const statusIcon = { presente: CheckCircle, falta: XCircle, justificada: AlertCircle };
const statusColor = {
  presente: 'text-emerald-600',
  falta: 'text-red-500',
  justificada: 'text-amber-500',
};
const statusLabel = { presente: 'Presente', falta: 'Falta', justificada: 'Justificada' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [ano, mes, dia] = dateStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

const STATUS_AULA = {
  cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-700 border-red-200' },
  feriado:   { label: 'Feriado',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  recesso:   { label: 'Recesso',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function AulaCard({ aula, defaultOpen = false, onDelete, onUpdate }) {
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [editConteudo, setEditConteudo] = useState(aula.conteudo || '');
  const [editHomework, setEditHomework] = useState(aula.homework || '');
  const [editObs, setEditObs] = useState(aula.observacoes || '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingThis, setDeletingThis] = useState(false);

  // Sync edit fields when aula prop updates (e.g. after external edit via EditarChamadaModal)
  React.useEffect(() => {
    if (!editing) {
      setEditConteudo(aula.conteudo || '');
      setEditHomework(aula.homework || '');
      setEditObs(aula.observacoes || '');
    }
  }, [aula.conteudo, aula.homework, aula.observacoes, editing]);

  const isNaoRealizada = aula.status && aula.status !== 'realizada';
  const statusInfo = STATUS_AULA[aula.status] || null;

  const presentes = aula.chamadas?.filter((c) => c.status === 'presente').length || 0;
  const faltas = aula.chamadas?.filter((c) => c.status === 'falta').length || 0;
  const justificadas = aula.chamadas?.filter((c) => c.status === 'justificada').length || 0;
  const total = aula.chamadas?.length || 0;

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await onUpdate(aula.id, { conteudo: editConteudo, homework: editHomework, observacoes: editObs });
    setSavingEdit(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await requestConfirm({
      title: 'Excluir aula',
      message: 'Excluir esta aula? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingThis(true);
    await onDelete(aula.id);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* div com role=button: os botões de editar/excluir vivem aqui dentro e
          <button> aninhado em <button> é HTML inválido */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
        }}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#005DE4] text-white rounded-lg p-2.5">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              {formatDate(aula.data)} — {aula.turmaNome}
              {isNaoRealizada && statusInfo && (
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isNaoRealizada
                ? `Aula não realizada — ${statusInfo?.label || aula.status}`
                : (aula.conteudo || 'Sem conteúdo registrado')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle size={13} /> {presentes}
            </span>
            <span className="text-red-500 font-medium flex items-center gap-1">
              <XCircle size={13} /> {faltas}
            </span>
            {justificadas > 0 && (
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <AlertCircle size={13} /> {justificadas}
              </span>
            )}
          </div>
          {/* Acões de editar/excluir */}
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setEditing(e => !e); setOpen(true); }}
              className="p-1.5 rounded text-slate-400 hover:text-[#005DE4] hover:bg-blue-50 transition-colors"
              title="Editar aula"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deletingThis}
              className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Excluir aula"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Modo edição de conteúdo */}
          {editing ? (
            <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700">Editando aula</p>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Conteúdo</label>
                <input
                  type="text"
                  value={editConteudo}
                  onChange={e => setEditConteudo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Homework</label>
                <input
                  type="text"
                  value={editHomework}
                  onChange={e => setEditHomework(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Observações</label>
                <textarea
                  value={editObs}
                  onChange={e => setEditObs(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#005DE4] text-white rounded-lg text-xs font-medium hover:bg-[#0041a8] disabled:opacity-60"
                >
                  <Save size={13} /> {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* Info normal */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {isNaoRealizada && statusInfo && (
                <div className="col-span-2 sm:col-span-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${statusInfo.cls}`}>
                    {statusInfo.label} — sem chamada registrada
                  </span>
                </div>
              )}
              {aula.conteudo && (
                <div>
                  <span className="text-slate-500 text-xs block">Conteúdo</span>
                  <span className="font-medium text-slate-800">{aula.conteudo}</span>
                </div>
              )}
              {aula.homework && (
                <div>
                  <span className="text-purple-500 text-xs block flex items-center gap-1">
                    <BookMarked size={11} /> Homework
                  </span>
                  <span className="font-medium text-purple-800">{aula.homework}</span>
                </div>
              )}
              {aula.observacoes && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 text-xs block">Observações</span>
                  <span className="font-medium text-slate-800">{aula.observacoes}</span>
                </div>
              )}
            </div>
          )}

          {/* Chamada */}
          {aula.chamadas && aula.chamadas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Chamada ({total} alunos)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {aula.chamadas.map((c, i) => {
                  const Icon = statusIcon[c.status] || CheckCircle;
                  return (
                    <div
                      key={c.alunoId || i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="text-sm text-slate-800">{c.alunoNome}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${statusColor[c.status]}`}>
                        <Icon size={13} /> {statusLabel[c.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

export default function HistoricoAulas({ aulas, turmas, onClose, onDeleteAula, onUpdateAula, initialTurmaFiltro, professorNome }) {
  const [turmaFiltro, setTurmaFiltro] = useState(initialTurmaFiltro || 'all');
  const [mesFiltro, setMesFiltro] = useState('all');

  // Meses disponíveis com base nas aulas existentes
  const mesesDisponiveis = useMemo(() => {
    const set = new Set();
    aulas.forEach(a => {
      if (a.data && typeof a.data === 'string') {
        set.add(a.data.substring(0, 7)); // "2026-04"
      }
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [aulas]);

  const aulasFiltradas = useMemo(() => {
    return aulas.filter(a => {
      if (turmaFiltro !== 'all' && a.turmaId !== turmaFiltro) return false;
      if (mesFiltro !== 'all' && !(a.data || '').startsWith(mesFiltro)) return false;
      return true;
    });
  }, [aulas, turmaFiltro, mesFiltro]);

  const handlePrint = () => {
    const turmaObj = turmas.find((t) => t.id === turmaFiltro);
    const turmaNome = turmaObj ? turmaObj.nome : 'Todas as Turmas';

    const rows = aulasFiltradas.map((aula) => {
      const presentes = aula.chamadas?.filter((c) => c.status === 'presente') || [];
      const faltas = aula.chamadas?.filter((c) => c.status === 'falta') || [];
      const justificadas = aula.chamadas?.filter((c) => c.status === 'justificada') || [];

      return `
        <div class="aula-card">
          <div class="aula-header">
            <strong>${formatDate(aula.data)}</strong>
            <span>${aula.turmaNome || ''}</span>
            <span>${aula.horario || ''}</span>
          </div>
          ${aula.conteudo ? `<p class="field"><span>Conteúdo:</span> ${aula.conteudo}</p>` : ''}
          ${aula.homework ? `<p class="field homework"><span>Homework:</span> ${aula.homework}</p>` : ''}
          ${aula.observacoes ? `<p class="field"><span>Obs:</span> ${aula.observacoes}</p>` : ''}
          <div class="chamada-grid">
            ${(aula.chamadas || []).map((c) => `
              <div class="chamada-item ${c.status}">
                <span>${c.alunoNome}</span>
                <span class="status-badge">${statusLabel[c.status]}</span>
              </div>
            `).join('')}
          </div>
          <div class="resumo">
            ✅ ${presentes.length} presentes &nbsp; ❌ ${faltas.length} faltas &nbsp; ⚠️ ${justificadas.length} justificadas
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Histórico de Aulas - ${turmaNome}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; }
          .page-header { background: #005DE4; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
          .page-header img { height: 32px; }
          .page-header-right { text-align: right; color: #ffffff; }
          .page-header-right .report-title { font-size: 11px; font-weight: bold; }
          .page-header-right .report-sub { font-size: 8px; opacity: 0.85; margin-top: 2px; }
          .content { padding: 0 10mm 10mm 10mm; }
          .subtitle { font-size: 8px; color: #64748b; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
          .aula-card { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; padding: 8px; page-break-inside: avoid; }
          .aula-header { display: flex; gap: 16px; font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #005DE4; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .field { font-size: 8px; margin-bottom: 3px; color: #475569; }
          .field span { font-weight: bold; color: #1e293b; }
          .homework span { color: #7c3aed; }
          .chamada-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-top: 5px; }
          .chamada-item { display: flex; justify-content: space-between; padding: 2px 5px; border-radius: 3px; font-size: 8px; }
          .chamada-item.presente { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .chamada-item.falta { background: #fef2f2; border: 1px solid #fecaca; }
          .chamada-item.justificada { background: #fffbeb; border: 1px solid #fde68a; }
          .status-badge { font-weight: bold; }
          .presente .status-badge { color: #16a34a; }
          .falta .status-badge { color: #dc2626; }
          .justificada .status-badge { color: #d97706; }
          .resumo { font-size: 8px; color: #64748b; margin-top: 5px; text-align: right; }
          @media print { @page { margin: 0; size: A4; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="page-header">
          <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="SpeakUp" />
          <div class="page-header-right">
            <div class="report-title">Histórico de Aulas</div>
            <div class="report-sub">${turmaNome} &nbsp;·&nbsp; ${aulasFiltradas.length} aula(s) &nbsp;·&nbsp; ${new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="content">
          ${rows || '<p style="text-align:center;color:#94a3b8;padding:20px">Nenhuma aula registrada.</p>'}
        </div>
      </body>
      </html>
    `;

    abrirJanelaImpressao(html);
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#005DE4] text-white p-2 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Histórico de Aulas</h2>
            <p className="text-sm text-slate-500">{aulasFiltradas.length} aula(s) registrada(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => baixarRelatorioSemanal(aulas, professorNome || 'Professor')}
            className="flex items-center gap-2 px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0041a8] transition-all text-sm"
            title="Baixa o relatório da semana anterior como arquivo HTML"
          >
            <Download size={16} /> Relatório Semanal
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-sm"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors ml-1">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3">
        <Users size={16} className="text-slate-400 shrink-0" />
        <select
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        >
          <option value="all">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <select
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        >
          <option value="all">Todos os meses</option>
          {mesesDisponiveis.map(m => {
            const [ano, mes] = m.split('-');
            const label = new Date(Number(ano), Number(mes) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
          })}
        </select>
        {(turmaFiltro !== 'all' || mesFiltro !== 'all') && (
          <button
            onClick={() => { setTurmaFiltro('all'); setMesFiltro('all'); }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
        {aulasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma aula registrada ainda.</p>
            <p className="text-xs mt-1">Registre a primeira aula clicando em uma turma.</p>
          </div>
        ) : (
          aulasFiltradas.map((aula, i) => (
            <AulaCard
              key={aula.id || i}
              aula={aula}
              defaultOpen={i === 0}
              onDelete={onDeleteAula}
              onUpdate={onUpdateAula}
            />
          ))
        )}
      </div>
    </div>
  );
}
