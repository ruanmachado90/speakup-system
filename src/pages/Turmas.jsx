import React, { useState, useMemo, useCallback } from "react";
import {
  Users, Plus, Edit, Trash2, School, X, ChevronDown,
  Loader2, FileText, Printer, GraduationCap, UserCheck, Clock, BookOpen,
} from "lucide-react";

import {
  PROFESSORES, NIVEIS, DIAS_DISPONIVEIS,
  DEFAULT_MAX_ALUNOS, DEFAULT_TOTAL_AULAS,
} from '../constants/turmasConfig';
import { normalizarDias, calcularHorasAula, contarDiasAula, normalizarString, escapeHtml } from '../utils/turmas';

import { useTurmas } from '../hooks/useTurmas';
import { useConfirm } from '../hooks/useConfirm';
import { useErrorHandler } from '../hooks/useErrorHandler';

import TurmasForm from '../components/turmas/TurmasForm';
import ProfessorReport from '../components/turmas/ProfessorReport';
import ConfirmDialog from '../components/ui/ConfirmDialog';

function showToastMsg(message, type) {
  const iconMap = { success: '\u2713', error: '\u2717', warning: '\u26A0', info: '\u2139' };
  const bgMap = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
  const t = type || 'info';
  const el = document.createElement('div');
  el.className = 'fixed top-4 right-4 ' + (bgMap[t] || bgMap.info) + ' text-white px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2 transition-opacity';
  el.innerHTML = '<span>' + (iconMap[t] || '') + '</span><span>' + message + '</span>';
  document.body.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    setTimeout(function() { document.body.contains(el) && document.body.removeChild(el); }, 300);
  }, 3000);
}

const FORM_INICIAL = {
  nome: '', nivel: '', professor: '', horarios: [],
  maxAlunos: DEFAULT_MAX_ALUNOS, totalAulas: DEFAULT_TOTAL_AULAS,
};

function validateForm(form) {
  const errors = {};
  if (!form.nome?.trim()) errors.nome = 'Nome da turma é obrigatório';
  else if (form.nome.length < 3) errors.nome = 'Nome deve ter pelo menos 3 caracteres';
  else if (form.nome.length > 50) errors.nome = 'Nome muito longo (máx. 50 caracteres)';
  if (!form.nivel) errors.nivel = 'Selecione um nível';
  else if (!NIVEIS.includes(form.nivel)) errors.nivel = 'Nível inválido';
  if (!form.professor) errors.professor = 'Selecione um professor';
  else if (!PROFESSORES.includes(form.professor)) errors.professor = 'Professor inválido';
  if (!form.horarios?.length) errors.horarios = 'Selecione ao menos um dia com horário';
  else if (form.horarios.some(function(h) { return !h.horario; })) errors.horarios = 'Informe o horário de cada dia selecionado';
  if (form.maxAlunos < 1 || form.maxAlunos > 30) errors.maxAlunos = 'Máximo de alunos deve ser entre 1 e 30';
  return errors;
}

// Converte array de horarios para string legível para exibição
function formatarHorarios(horarios) {
  if (!horarios?.length) return '';
  if (horarios.length === 1) return horarios[0].dia + ' ' + horarios[0].horario;
  return horarios.map(function(h) { return h.dia.slice(0, 3) + ' ' + h.horario; }).join(' · ');
}

// Extrai string de dias a partir do array de horarios (para funções legadas)
function extrairDias(horarios) {
  if (!horarios?.length) return '';
  return horarios.map(function(h) { return h.dia; }).join(', ');
}

const DIA_NUM_MAP = {
  domingo: 0,
  segunda: 1, 'segunda-feira': 1,
  terca: 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2,
  quarta: 3, 'quarta-feira': 3,
  quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5,
  sabado: 6, 'sábado': 6,
};

function gerarDiasAulaMes(turma, mes, ano) {
  if (!turma.dias) return [];
  const nums = turma.dias.split(',').map(function(d) { return DIA_NUM_MAP[normalizarString(d)]; }).filter(function(n) { return n !== undefined; });
  const dias = [];
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    if (nums.includes(new Date(ano, mes, d).getDay())) dias.push(d);
  }
  return dias;
}

export default function Turmas({ students }) {
  const alunosProp = students || [];
  const { turmas, aulas: aulasRegistradas, loading, criarTurma, editarTurma, excluirTurma, verificarDuplicata } = useTurmas();
  const { handleError } = useErrorHandler(showToastMsg);
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const [showModal, setShowModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedAlunos, setSelectedAlunos] = useState([]);
  const [searchAluno, setSearchAluno] = useState('');
  const [expandedTurmas, setExpandedTurmas] = useState(new Set());
  const [expandedProfessores, setExpandedProfessores] = useState(new Set());
  const [copiedLink, setCopiedLink] = useState(null);
  const [filtros, setFiltros] = useState({ professor: 'all', dia: 'all', nivel: 'all' });

  const alunosAtivos = useMemo(function() { return alunosProp.filter(function(a) { return a.status !== 'cancelado'; }); }, [alunosProp]);

  const alunosFiltrados = useMemo(function() {
    const s = searchAluno.toLowerCase();
    return alunosAtivos.filter(function(a) { return a.name && a.name.toLowerCase().includes(s); });
  }, [alunosAtivos, searchAluno]);

  const turmasFiltradas = useMemo(function() {
    return turmas.filter(function(t) {
      if (filtros.professor !== 'all' && t.professor !== filtros.professor) return false;
      if (filtros.dia !== 'all' && !normalizarDias(t.dias || '').includes(filtros.dia)) return false;
      if (filtros.nivel !== 'all' && t.nivel !== filtros.nivel) return false;
      return true;
    });
  }, [turmas, filtros]);

  const getAlunosDaTurma = useCallback(function(turma) {
    if (!Array.isArray(turma.alunosIds)) return [];
    return alunosProp.filter(function(s) { return turma.alunosIds.includes(s.id); });
  }, [alunosProp]);

  const professorStats = useMemo(function() {
    const stats = {};
    turmasFiltradas.forEach(function(turma) {
      if (!stats[turma.professor]) {
        stats[turma.professor] = { nome: turma.professor, turmas: [], totalTurmas: 0, totalAlunos: 0, horasPorSemana: 0, horasPorMes: 0 };
      }
      const horasAula = calcularHorasAula(turma.horario);
      const diasSemana = contarDiasAula(turma.dias);
      const horasSemanais = horasAula * diasSemana;
      const alunos = getAlunosDaTurma(turma);
      stats[turma.professor].turmas.push(Object.assign({}, turma, { horasAula, diasSemana, horasSemanais, alunos }));
      stats[turma.professor].totalTurmas += 1;
      stats[turma.professor].totalAlunos += alunos.length;
      stats[turma.professor].horasPorSemana += horasSemanais;
      stats[turma.professor].horasPorMes = stats[turma.professor].horasPorSemana * 4;
    });
    return Object.values(stats).sort(function(a, b) { return b.horasPorSemana - a.horasPorSemana; });
  }, [turmasFiltradas, getAlunosDaTurma]);

  const toggleTurmaExpansion = useCallback(function(id) {
    setExpandedTurmas(function(prev) {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleProfessorExpansion = useCallback(function(nome) {
    setExpandedProfessores(function(prev) {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });
  }, []);

  const handleCopyLink = useCallback(function(nome) {
    setCopiedLink(nome);
    setTimeout(function() { setCopiedLink(null); }, 2000);
  }, []);

  const resetForm = useCallback(function() {
    setForm(FORM_INICIAL);
    setSelectedAlunos([]);
    setEditingTurma(null);
    setShowModal(false);
    setFormErrors({});
  }, []);

  const abrirNovoModal = useCallback(function() {
    setEditingTurma(null);
    setForm(FORM_INICIAL);
    setSelectedAlunos([]);
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleEditTurma = useCallback(function(turma) {
    setEditingTurma(turma);
    // Converter formato antigo (dias + horario) para o novo (horarios array)
    var horarios = turma.horarios || [];
    if (!horarios.length && turma.dias) {
      var diasArr = turma.dias.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
      var horarioInicio = turma.horario ? turma.horario.split(' - ')[0].trim() : '';
      horarios = diasArr.map(function(dia) { return { dia: dia, horario: horarioInicio }; });
    }
    setForm({
      nome: turma.nome, nivel: turma.nivel, professor: turma.professor,
      horarios: horarios,
      maxAlunos: turma.maxAlunos || DEFAULT_MAX_ALUNOS, totalAulas: turma.totalAulas || DEFAULT_TOTAL_AULAS,
    });
    setSelectedAlunos(turma.alunosIds && turma.alunosIds.length ? alunosProp.filter(function(s) { return turma.alunosIds.includes(s.id); }) : []);
    setFormErrors({});
    setShowModal(true);
  }, [alunosProp]);

  const handleFormChange = useCallback(function(newForm) {
    if (newForm._clearError) {
      const { _clearError } = newForm;
      const rest = Object.assign({}, newForm);
      delete rest._clearError;
      setFormErrors(function(prev) { return Object.assign({}, prev, { [_clearError]: '' }); });
      setForm(rest);
    } else {
      setForm(newForm);
    }
  }, []);

  const adicionarAluno = useCallback(function(aluno) {
    setSelectedAlunos(function(prev) { return prev.find(function(a) { return a.id === aluno.id; }) ? prev : [...prev, aluno]; });
    setSearchAluno('');
  }, []);

  const removerAluno = useCallback(function(id) {
    setSelectedAlunos(function(prev) { return prev.filter(function(a) { return a.id !== id; }); });
  }, []);

  const salvarTurma = useCallback(async function() {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToastMsg('Corrija os erros no formulário', 'error');
      return;
    }
    var horarios = form.horarios || [];
    var turmaData = {
      nome: form.nome.trim(), professor: form.professor, nivel: form.nivel,
      horarios: horarios,
      // Campos legados para compatibilidade com ChamadaForm e filtros
      dias: extrairDias(horarios),
      horario: formatarHorarios(horarios),
      maxAlunos: Math.max(1, Math.min(30, parseInt(form.maxAlunos, 10) || DEFAULT_MAX_ALUNOS)),
      totalAulas: Math.max(1, parseInt(form.totalAulas, 10) || DEFAULT_TOTAL_AULAS),
      alunosIds: selectedAlunos.map(function(a) { return a.id; }),
    };
    if (verificarDuplicata(turmaData, editingTurma ? editingTurma.id : null)) {
      showToastMsg('Já existe turma para este professor no mesmo dia e horário', 'warning');
      return;
    }
    try {
      setSaving(true);
      setFormErrors({});
      if (editingTurma) {
        await editarTurma(editingTurma.id, turmaData, editingTurma.createdAt);
        showToastMsg('Turma editada com sucesso!', 'success');
      } else {
        await criarTurma(turmaData);
        showToastMsg('Turma criada com sucesso!', 'success');
      }
      resetForm();
    } catch (err) {
      handleError(err, 'salvar turma');
    } finally {
      setSaving(false);
    }
  }, [form, selectedAlunos, editingTurma, verificarDuplicata, criarTurma, editarTurma, handleError, resetForm]);

  const handleDeleteTurma = useCallback(async function(turma) {
    const confirmed = await requestConfirm({
      title: 'Excluir "' + turma.nome + '"?',
      message: 'Esta ação não pode ser desfeita. Todos os dados da turma serão removidos permanentemente.',
      variant: 'danger', confirmLabel: 'Excluir',
    });
    if (!confirmed) return;
    try {
      setDeleting(turma.id);
      await excluirTurma(turma.id);
      showToastMsg('Turma excluída com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'excluir turma');
    } finally {
      setDeleting(null);
    }
  }, [requestConfirm, excluirTurma, handleError]);

  const gerarChamada = useCallback(function(turma) {
    const alunosDaTurma = getAlunosDaTurma(turma);
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const diasAula = gerarDiasAulaMes(turma, mes, ano);
    const linhas = Array.from({ length: 10 }, function(_, i) {
      const a = alunosDaTurma[i];
      return '<tr><td class="aluno-col">' + escapeHtml(a ? (a.name || '') : '') + '</td>' + diasAula.map(function() { return '<td class="dia-col"></td>'; }).join('') + '</tr>';
    }).join('');
    const html = '<html><head><title>Lista de Presença - ' + escapeHtml(turma.nome) + '</title><style>body{font-family:Arial,sans-serif;margin:20px}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #005DE4;padding-bottom:15px}.logo img{max-width:150px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}.info-item{padding:8px;border:1px solid #ccc}.info-label{font-weight:bold;width:80px;display:inline-block}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #000;padding:8px;text-align:center;height:.3in}th{background-color:#f5f5f5;font-weight:bold}.aluno-col{text-align:left;width:300px;font-size:12px}.dia-col{width:30px}.footer-table th,.footer-table td{border:1px solid #000;padding:8px;text-align:left}.footer-table th{background-color:#f5f5f5;font-weight:bold}.data-col{width:100px}.content-cell{height:.3in;vertical-align:top}</style></head><body><div class="header"><div class="logo"><img src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png" alt="SpeakUp"/></div><p>Praça Governador Valadares 119, Centro - Cataguases MG</p><p>CNPJ: 28.649.636-000/88</p></div><div class="info-grid"><div class="info-item"><span class="info-label">Turma:</span> ' + escapeHtml(turma.nome) + '</div><div class="info-item"><span class="info-label">Mês:</span> ' + meses[mes] + '/' + ano + '</div><div class="info-item"><span class="info-label">Nível:</span> ' + escapeHtml(turma.nivel) + '</div><div class="info-item"><span class="info-label">Dia:</span> ' + escapeHtml(turma.dias) + '</div><div class="info-item"><span class="info-label">Professor:</span> ' + escapeHtml(turma.professor) + '</div><div class="info-item"><span class="info-label">Horário:</span> ' + escapeHtml(turma.horario) + '</div></div><table><thead><tr><th class="aluno-col">Aluno</th>' + diasAula.map(function(d) { return '<th class="dia-col">' + d + '</th>'; }).join('') + '</tr></thead><tbody>' + linhas + '</tbody></table><table class="footer-table"><tr><th class="data-col">Data</th><th>Conteúdo Lecionado</th></tr>' + Array.from({length:7},function(){return '<tr><td class="content-cell data-col"></td><td class="content-cell"></td></tr>';}).join('') + '</table></body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
    showToastMsg('Lista de presença gerada!', 'success');
  }, [getAlunosDaTurma]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="text-[#005DE4]" size={32} />
              Gestão de Turmas
            </h1>
            <p className="text-gray-600 font-medium">Gerencie suas turmas, horários e alunos matriculados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {loading ? (
            Array.from({ length: 4 }).map(function(_, i) {
              return (
                <div key={i} className="bg-gray-50 p-6 rounded-xl animate-pulse">
                  <div className="h-8 bg-gray-300 rounded mb-2" />
                  <div className="h-4 bg-gray-300 rounded w-3/4" />
                </div>
              );
            })
          ) : (
            <>
              <StatCard2 color="blue" icon={<School size={20} className="text-white" />} value={turmasFiltradas.length} label="Total de Turmas" sub="Turmas ativas" />
              <StatCard2 color="green" icon={<GraduationCap size={20} className="text-white" />} value={turmasFiltradas.reduce(function(a, t) { return a + (t.alunosIds ? t.alunosIds.length : 0); }, 0)} label="Total de Alunos" sub="Estudantes matriculados" />
              <StatCard2 color="purple" icon={<UserCheck size={20} className="text-white" />} value={new Set(turmasFiltradas.map(function(t) { return t.professor; })).size} label="Professores" sub="Docentes ativos" />
              <StatCard2 color="orange" icon={<Clock size={20} className="text-white" />}
                value={(function() {
                  const totalAlunos = turmasFiltradas.reduce(function(a, t) { return a + (t.alunosIds ? t.alunosIds.length : 0); }, 0);
                  const totalMax = turmasFiltradas.reduce(function(a, t) { return a + (t.maxAlunos || DEFAULT_MAX_ALUNOS); }, 0);
                  return turmasFiltradas.length > 0 ? Math.round((totalAlunos / totalMax) * 100) + '%' : '0%';
                })()}
                label="Taxa de Ocupação" sub="Capacidade utilizada" />
            </>
          )}
        </div>
      </div>

      <ProfessorReport
        professorStats={professorStats}
        expandedProfessores={expandedProfessores}
        copiedLink={copiedLink}
        onToggleProfessor={toggleProfessorExpansion}
        onCopyLink={handleCopyLink}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Lista de turmas</h2>
              <p className="text-sm text-gray-500">Total: {turmasFiltradas.length} turma{turmasFiltradas.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={abrirNovoModal} disabled={loading} className="bg-[#005DE4] text-white px-4 py-2 rounded-lg font-semibold flex gap-1.5 items-center hover:bg-[#0048b3] transition-colors text-sm disabled:opacity-50">
              <Plus size={16} /> Nova Turma
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={filtros.professor} onChange={function(e) { setFiltros(function(f) { return Object.assign({}, f, { professor: e.target.value }); }); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#005DE4] bg-white">
              <option value="all">Todos os professores</option>
              {PROFESSORES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
            <select value={filtros.dia} onChange={function(e) { setFiltros(function(f) { return Object.assign({}, f, { dia: e.target.value }); }); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#005DE4] bg-white">
              <option value="all">Todos os dias</option>
              {DIAS_DISPONIVEIS.map(function(d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
            <select value={filtros.nivel} onChange={function(e) { setFiltros(function(f) { return Object.assign({}, f, { nivel: e.target.value }); }); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#005DE4] bg-white">
              <option value="all">Todos os níveis</option>
              {NIVEIS.map(function(n) { return <option key={n} value={n}>{n}</option>; })}
            </select>
            {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
              <button onClick={function() { setFiltros({ professor: 'all', dia: 'all', nivel: 'all' }); }} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 3 }).map(function(_, i) {
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-300 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-300 rounded w-2/3" />
                </div>
              );
            })}
          </div>
        ) : turmasFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-xl mb-4">
              <School size={28} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma turma encontrada</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all')
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Ainda não há turmas cadastradas. Comece criando sua primeira turma!'}
            </p>
            {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') ? (
              <button onClick={function() { setFiltros({ professor: 'all', dia: 'all', nivel: 'all' }); }} className="text-sm text-[#005DE4] hover:text-[#0048b3] font-semibold bg-blue-50 px-4 py-2 rounded-lg transition-colors">Limpar filtros</button>
            ) : (
              <button onClick={abrirNovoModal} className="bg-[#005DE4] text-white px-6 py-3 rounded-xl font-semibold flex gap-2 items-center hover:bg-[#0048b3] transition-all mx-auto">
                <Plus size={20} /> Criar primeira turma
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#005DE4] text-xs font-semibold text-white uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-6" />
                  <th className="px-4 py-3 text-left">Turma</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Dias</th>
                  <th className="px-4 py-3 text-left">Horário</th>
                  <th className="px-4 py-3 text-center">Alunos</th>
                  <th className="px-4 py-3 text-center">Aulas</th>
                  <th className="px-4 py-3 text-center">Ocupação</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {turmasFiltradas.map(function(turma) {
                  const alunosDaTurma = getAlunosDaTurma(turma);
                  const isExpanded = expandedTurmas.has(turma.id);
                  const max = turma.maxAlunos || DEFAULT_MAX_ALUNOS;
                  const ocupacao = Math.round((alunosDaTurma.length / max) * 100);
                  const aulasDadas = aulasRegistradas.filter(function(a) { return a.turmaId === turma.id; }).length;
                  const aulasPrevistas = turma.totalAulas || DEFAULT_TOTAL_AULAS;
                  const aulasProgress = Math.min(Math.round((aulasDadas / aulasPrevistas) * 100), 100);
                  const aulasBarColor = aulasProgress >= 100 ? 'bg-emerald-500' : aulasProgress >= 60 ? 'bg-[#005DE4]' : 'bg-amber-400';
                  const nivelColor = turma.nivel === 'A1' || turma.nivel === 'A2' ? 'bg-emerald-100 text-emerald-700' : turma.nivel === 'A2+' || turma.nivel === 'B1' ? 'bg-amber-100 text-amber-700' : turma.nivel === 'B2' || turma.nivel === 'B2+' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                  const statusLabel = alunosDaTurma.length === max ? 'Lotada' : alunosDaTurma.length > max * 0.8 ? 'Quase cheia' : 'Disponível';
                  const statusColor = alunosDaTurma.length === max ? 'bg-red-100 text-red-700' : alunosDaTurma.length > max * 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                  const barColor = alunosDaTurma.length === max ? 'bg-red-500' : alunosDaTurma.length > max * 0.8 ? 'bg-amber-400' : 'bg-[#005DE4]';
                  return (
                    <React.Fragment key={turma.id}>
                      <tr className={'hover:bg-blue-50/40 transition-colors ' + (isExpanded ? 'bg-blue-50/20' : '')}>
                        <td className="px-4 py-3 text-center">
                          <button onClick={function() { toggleTurmaExpansion(turma.id); }} className="text-gray-400 hover:text-[#005DE4] transition-colors" aria-label={isExpanded ? 'Recolher detalhes da turma' : 'Expandir detalhes da turma'}>
                            <ChevronDown size={16} className={'transition-transform duration-200 ' + (isExpanded ? 'rotate-180' : '')} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{turma.nome}</span>
                            <span className={'px-2 py-0.5 rounded text-xs font-semibold ' + nivelColor}>{turma.nivel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{turma.professor}</td>
                        <td className="px-4 py-3 text-gray-600" colSpan={2}>
                          {turma.horarios?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {turma.horarios.map(function(h) {
                                return (
                                  <span key={h.dia} className="inline-flex items-center gap-1 bg-blue-50 text-[#005DE4] text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                                    {h.dia} {h.horario}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-500">{turma.dias} {turma.horario && '· ' + turma.horario}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-900">{alunosDaTurma.length}</span>
                          <span className="text-gray-400">/{max}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-gray-900">{aulasDadas}<span className="text-gray-400 font-normal">/{aulasPrevistas}</span></span>
                            <div className="w-16 bg-gray-200 rounded-full h-1">
                              <div className={'h-1 rounded-full ' + aulasBarColor} style={{ width: aulasProgress + '%' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div className={'h-1.5 rounded-full ' + barColor} style={{ width: Math.min(ocupacao, 100) + '%' }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{ocupacao}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + statusColor}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={function() { gerarChamada(turma); }} className="p-1.5 text-gray-400 hover:text-[#005DE4] hover:bg-blue-50 rounded-lg transition-colors" aria-label="Gerar lista de chamada">
                              <FileText size={16} />
                            </button>
                            <button onClick={function() { handleEditTurma(turma); }} disabled={saving} className="p-1.5 text-gray-400 hover:text-[#005DE4] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" aria-label="Editar turma">
                              <Edit size={16} />
                            </button>
                            <button onClick={function() { handleDeleteTurma(turma); }} disabled={deleting === turma.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" aria-label="Excluir turma">
                              {deleting === turma.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-6 py-4">
                            {alunosDaTurma.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Users size={14} className="text-[#005DE4]" />
                                    {alunosDaTurma.length} aluno{alunosDaTurma.length !== 1 ? 's' : ''} matriculado{alunosDaTurma.length !== 1 ? 's' : ''} · {max - alunosDaTurma.length} vaga{max - alunosDaTurma.length !== 1 ? 's' : ''} livre{max - alunosDaTurma.length !== 1 ? 's' : ''}
                                  </p>
                                  <button onClick={function() { gerarChamada(turma); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005DE4] text-white rounded-lg hover:bg-[#0048b3] text-xs font-medium transition-colors">
                                    <Printer size={13} /> Gerar Lista
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {alunosDaTurma.map(function(aluno, idx) {
                                    const aulasT = aulasRegistradas.filter(function(a) { return a.turmaId === turma.id; });
                                    const presencas = aulasT.filter(function(a) { return (a.chamadas || []).find(function(c) { return c.alunoId === aluno.id && c.status === 'presente'; }); }).length;
                                    const pct = aulasT.length > 0 ? Math.round((presencas / aulasT.length) * 100) : null;
                                    const lowFreq = pct !== null && pct < 75;
                                    return (
                                      <div key={turma.id + '-aluno-' + (aluno.id || idx)} className={'border rounded-lg px-3 py-2 flex items-center gap-2 ' + (lowFreq ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}>
                                        <div className={'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ' + (lowFreq ? 'bg-red-100' : 'bg-blue-100')}>
                                          <span className={'text-xs ' + (lowFreq ? 'text-red-600' : 'text-blue-600')}>{lowFreq ? '⚠' : '👤'}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-gray-900 truncate">{aluno.name || 'Sem nome'}</p>
                                          {pct !== null && <p className={'text-xs ' + (lowFreq ? 'text-red-600 font-semibold' : 'text-gray-400')}>{pct}% freq.</p>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-2">Nenhum aluno matriculado nesta turma.</p>
                            )}
                            <div className="mt-4 border-t border-gray-200 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                  <BookOpen size={14} className="text-[#005DE4]" /> Aulas Registradas
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#005DE4]">{aulasRegistradas.filter(function(a) { return a.turmaId === turma.id; }).length}</span>
                                  <span className="text-xs text-gray-400">de {turma.totalAulas || DEFAULT_TOTAL_AULAS} previstas</span>
                                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                    <div className={'h-1.5 rounded-full ' + (aulasProgress >= 100 ? 'bg-emerald-500' : 'bg-[#005DE4]')} style={{ width: aulasProgress + '%' }} />
                                  </div>
                                  <span className="text-xs text-gray-500">{aulasProgress}%</span>
                                </div>
                              </div>
                              {aulasRegistradas.filter(function(a) { return a.turmaId === turma.id; }).length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-2">Nenhuma aula registrada pelo professor ainda.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                  {aulasRegistradas.filter(function(a) { return a.turmaId === turma.id; }).sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); }).map(function(aula, i) {
                                    const presentes = (aula.chamadas || []).filter(function(c) { return c.status === 'presente'; }).length;
                                    const faltas = (aula.chamadas || []).filter(function(c) { return c.status === 'falta'; }).length;
                                    const total = (aula.chamadas || []).length;
                                    const dataFmt = aula.data ? aula.data.split('-').reverse().join('/') : '—';
                                    const pct = total > 0 ? Math.round(presentes / total * 100) : null;
                                    return (
                                      <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{dataFmt}</span>
                                          {aula.conteudo && <span className="text-xs text-gray-500 truncate">· {aula.conteudo}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                                          <span className="text-emerald-600 font-medium">✓ {presentes}</span>
                                          <span className="text-red-500 font-medium">✗ {faltas}</span>
                                          {pct !== null && <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{pct}%</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TurmasForm
        isOpen={showModal}
        editingTurma={editingTurma}
        form={form}
        formErrors={formErrors}
        saving={saving}
        selectedAlunos={selectedAlunos}
        searchAluno={searchAluno}
        alunosFiltrados={alunosFiltrados}
        onClose={resetForm}
        onSave={salvarTurma}
        onFormChange={handleFormChange}
        onAdicionarAluno={adicionarAluno}
        onRemoverAluno={removerAluno}
        onSearchChange={setSearchAluno}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

function StatCard2({ color, icon, value, label, sub }) {
  const cfg = {
    blue:   { bg: 'from-blue-50 to-blue-100',    border: 'border-blue-200/50',    iconBg: 'bg-blue-500',   val: 'text-blue-700',   lbl: 'text-blue-600',   sub2: 'text-blue-500' },
    green:  { bg: 'from-green-50 to-green-100',   border: 'border-green-200/50',   iconBg: 'bg-green-500',  val: 'text-green-700',  lbl: 'text-green-600',  sub2: 'text-green-500' },
    purple: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200/50',  iconBg: 'bg-purple-500', val: 'text-purple-700', lbl: 'text-purple-600', sub2: 'text-purple-500' },
    orange: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200/50',  iconBg: 'bg-orange-500', val: 'text-orange-700', lbl: 'text-orange-600', sub2: 'text-orange-500' },
  }[color] || {};
  return (
    <div className={'bg-gradient-to-br ' + cfg.bg + ' border ' + cfg.border + ' p-6 rounded-xl'}>
      <div className="flex items-center justify-between mb-2">
        <div className={'inline-flex items-center justify-center w-10 h-10 ' + cfg.iconBg + ' rounded-lg'}>{icon}</div>
        <span className={'text-2xl font-bold ' + cfg.val}>{value}</span>
      </div>
      <p className={'text-sm font-semibold ' + cfg.lbl}>{label}</p>
      <p className={'text-xs ' + cfg.sub2 + ' mt-1'}>{sub}</p>
    </div>
  );
}
