import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Search, AlertTriangle, Loader2, RefreshCw, CalendarClock } from 'lucide-react';
import { NIVEIS, DIAS_DISPONIVEIS, CURSOS, BOOKS_POR_CURSO, DEFAULT_MAX_ALUNOS, DEFAULT_TOTAL_AULAS } from '../../constants/turmasConfig';
import { calcularPrevisaoAulas } from '../../utils/calendarioLetivo';
import { useCalendarioLetivo } from '../../hooks/useCalendarioLetivo';

/**
 * Modal de criação/edição de turma com focus trap e fechar com ESC.
 */
export default function TurmasForm({
  isOpen,
  editingTurma,
  professores,
  form,
  formErrors,
  saving,
  selectedAlunos,
  searchAluno,
  alunosFiltrados,
  nomeSugerido,
  onClose,
  onSave,
  onFormChange,
  onAdicionarAluno,
  onRemoverAluno,
  onSearchChange,
}) {
  const firstFocusRef = useRef(null);
  const modalRef = useRef(null);

  const anoAtual = new Date().getFullYear();
  const { dados: calendarioAno, loading: loadingCalendario } = useCalendarioLetivo(anoAtual);
  const previsao = useMemo(
    () => calcularPrevisaoAulas(form.horarios, calendarioAno),
    [form.horarios, calendarioAno]
  );

  // Foco inicial quando o modal abre
  useEffect(() => {
    if (isOpen && firstFocusRef.current) {
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Fechar com ESC e fazer trap de foco dentro do modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableSelectors =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusable = Array.from(modalRef.current.querySelectorAll(focusableSelectors));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const clearFieldError = useCallback(
    (field) => {
      if (formErrors[field]) onFormChange({ ...form, _clearError: field });
    },
    [formErrors, form, onFormChange]
  );

  if (!isOpen) return null;

  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 transition-colors focus:outline-none focus:ring-2 ${
      formErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
    }`;

  const FieldError = ({ field }) =>
    formErrors[field] ? (
      <span className="text-red-500 text-xs ml-2 inline-flex items-center gap-1">
        <AlertTriangle size={12} /> {formErrors[field]}
      </span>
    ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="turmas-form-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div
        ref={modalRef}
        className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-5">
          <h3 id="turmas-form-title" className="text-xl font-bold text-gray-900">
            {editingTurma ? 'Editar Turma' : 'Nova Turma'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors rounded-lg p-1 hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Curso + Book — usados para gerar o nome da turma automaticamente */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="turma-curso" className="block text-sm font-semibold mb-1.5">
              Curso
            </label>
            <select
              id="turma-curso"
              value={form.curso || ''}
              onChange={(e) => onFormChange({ ...form, curso: e.target.value, book: '' })}
              className={inputCls('curso')}
              disabled={saving}
            >
              <option value="">Selecione o curso</option>
              {CURSOS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="turma-book" className="block text-sm font-semibold mb-1.5">
              Book
            </label>
            <select
              id="turma-book"
              value={form.book || ''}
              onChange={(e) => onFormChange({ ...form, book: e.target.value })}
              className={inputCls('book')}
              disabled={saving || !form.curso}
            >
              <option value="">{form.curso ? 'Selecione o book' : 'Escolha o curso primeiro'}</option>
              {(BOOKS_POR_CURSO[form.curso] || []).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 1: Nome + Nível */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="turma-nome" className="block text-sm font-semibold mb-1.5">
              Nome da Turma * <FieldError field="nome" />
            </label>
            <div className="flex items-center gap-1.5">
              <input
                ref={firstFocusRef}
                id="turma-nome"
                type="text"
                value={form.nome}
                onChange={(e) => {
                  onFormChange({ ...form, nome: e.target.value });
                  clearFieldError('nome');
                }}
                className={inputCls('nome')}
                placeholder="Selecione curso e book, ou digite"
                disabled={saving}
              />
              {nomeSugerido && nomeSugerido !== form.nome && (
                <button
                  type="button"
                  onClick={() => { onFormChange({ ...form, nome: nomeSugerido }); clearFieldError('nome'); }}
                  disabled={saving}
                  title={`Usar nome sugerido: ${nomeSugerido}`}
                  className="flex-shrink-0 p-2 text-[#005DE4] hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Gerado automaticamente a partir do curso, book e dia — pode editar se precisar.</p>
          </div>

          <div>
            <label htmlFor="turma-nivel" className="block text-sm font-semibold mb-1.5">
              Nível * <FieldError field="nivel" />
            </label>
            <select
              id="turma-nivel"
              value={form.nivel}
              onChange={(e) => {
                onFormChange({ ...form, nivel: e.target.value });
                clearFieldError('nivel');
              }}
              className={inputCls('nivel')}
              disabled={saving}
            >
              <option value="">Selecione o nível</option>
              {NIVEIS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Professor */}
          <div>
            <label htmlFor="turma-professor" className="block text-sm font-semibold mb-1.5">
              Professor * <FieldError field="professor" />
            </label>
            <select
              id="turma-professor"
              value={form.professor}
              onChange={(e) => {
                onFormChange({ ...form, professor: e.target.value });
                clearFieldError('professor');
              }}
              className={inputCls('professor')}
              disabled={saving}
            >
              <option value="">Selecione o professor</option>
              {(professores || []).map((p) => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Dias e Horários (combinado) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1.5">
            Dias e Horários * <FieldError field="horarios" />
          </label>
          <div className={`border rounded-lg p-3 ${formErrors.horarios ? 'border-red-300' : 'border-gray-300'}`}>
            {/* Chips de dias */}
            <div className="flex flex-wrap gap-2">
              {DIAS_DISPONIVEIS.map((dia) => {
                const selected = (form.horarios || []).some((h) => h.dia === dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      const current = form.horarios || [];
                      const novo = selected
                        ? current.filter((h) => h.dia !== dia)
                        : [...current, { dia, horario: '' }];
                      const sorted = DIAS_DISPONIVEIS
                        .map((d) => novo.find((h) => h.dia === d))
                        .filter(Boolean);
                      onFormChange({ ...form, horarios: sorted });
                      clearFieldError('horarios');
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-[#005DE4] text-white border-[#005DE4]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#005DE4] hover:text-[#005DE4]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Inputs de horário por dia */}
            {(form.horarios || []).length > 0 ? (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {(form.horarios || []).map((entry, idx) => (
                  <div key={entry.dia} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#005DE4] w-16 flex-shrink-0">{entry.dia}</span>

                    {/* Início */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 whitespace-nowrap">Início</span>
                      <input
                        type="time"
                        value={entry.horario}
                        onChange={(e) => {
                          const novo = form.horarios.map((h, i) =>
                            i === idx ? { ...h, horario: e.target.value } : h
                          );
                          onFormChange({ ...form, horarios: novo });
                          clearFieldError('horarios');
                        }}
                        className={`border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-colors ${
                          !entry.horario && formErrors.horarios ? 'border-red-300' : 'border-gray-300'
                        }`}
                        disabled={saving}
                      />
                    </div>

                    <span className="text-gray-300">–</span>

                    {/* Término */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 whitespace-nowrap">Término</span>
                      <input
                        type="time"
                        value={entry.horarioFim || ''}
                        onChange={(e) => {
                          const novo = form.horarios.map((h, i) =>
                            i === idx ? { ...h, horarioFim: e.target.value } : h
                          );
                          onFormChange({ ...form, horarios: novo });
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-colors"
                        disabled={saving}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center mt-3">Selecione ao menos um dia acima</p>
            )}
          </div>

          {/* Previsão de aulas/horas até o fim do ano letivo, cruzando os dias
              escolhidos acima com o calendário letivo (feriados + recesso). */}
          {(form.horarios || []).length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <CalendarClock size={14} className="text-gray-400 flex-shrink-0" />
              {loadingCalendario ? (
                <span className="text-gray-400">Calculando previsão de aulas...</span>
              ) : previsao === null ? (
                <span className="text-amber-600">
                  Calendário letivo de {anoAtual} ainda não cadastrado — cadastre na aba Calendário pra ver a previsão de aulas.
                </span>
              ) : (
                <span className="text-gray-600">
                  <strong className="text-[#005DE4]">≈ {previsao.aulas} aula{previsao.aulas !== 1 ? 's' : ''}</strong>
                  {previsao.horas > 0 && <> · <strong className="text-[#005DE4]">{previsao.horas.toFixed(1)}h</strong></>}
                  {' '}até o fim do ano letivo ({previsao.fimAno.split('-').reverse().join('/')})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Máx + Total Aulas */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="turma-max" className="block text-sm font-semibold mb-1.5">
              Máximo de Alunos * <FieldError field="maxAlunos" />
            </label>
            <input
              id="turma-max"
              type="number"
              value={form.maxAlunos}
              onChange={(e) => {
                onFormChange({ ...form, maxAlunos: parseInt(e.target.value, 10) || DEFAULT_MAX_ALUNOS });
                clearFieldError('maxAlunos');
              }}
              className={inputCls('maxAlunos')}
              min="1" max="30" placeholder="15"
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="turma-total-aulas" className="block text-sm font-semibold mb-1.5">
              Total de Aulas Previstas
            </label>
            <input
              id="turma-total-aulas"
              type="number"
              value={form.totalAulas}
              onChange={(e) => onFormChange({ ...form, totalAulas: parseInt(e.target.value, 10) || DEFAULT_TOTAL_AULAS })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-colors"
              min="1" max="200" placeholder="40"
              disabled={saving}
            />
            <p className="text-xs text-gray-400 mt-1">Quantidade total de aulas planejadas</p>
          </div>
        </div>

        {/* Busca de Alunos */}
        <div className="mb-4">
          <label htmlFor="turma-search-aluno" className="block text-sm font-semibold mb-1.5">
            Adicionar Alunos
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              id="turma-search-aluno"
              type="text"
              value={searchAluno}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-transparent transition-colors"
              placeholder="Buscar alunos para adicionar..."
              disabled={saving}
              autoComplete="off"
            />
            {searchAluno && alunosFiltrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-lg max-h-40 overflow-y-auto z-10 shadow-lg">
                {alunosFiltrados.slice(0, 5).map((aluno) => (
                  <button
                    key={aluno.id}
                    onClick={() => onAdicionarAluno(aluno)}
                    disabled={saving || !!selectedAlunos.find((a) => a.id === aluno.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="font-medium">{aluno.name}</span>
                    <span className="text-xs text-gray-500">{aluno.course || 'Sem curso'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alunos Selecionados */}
        {selectedAlunos.length > 0 && (
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-1.5">
              Alunos da Turma ({selectedAlunos.length}/{form.maxAlunos})
              {selectedAlunos.length >= form.maxAlunos && (
                <span className="text-orange-600 text-xs ml-2">Turma lotada</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
              {selectedAlunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                >
                  <span>{aluno.name}</span>
                  <button
                    onClick={() => onRemoverAluno(aluno.id)}
                    disabled={saving}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                    aria-label={`Remover ${aluno.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {selectedAlunos.length >= form.maxAlunos && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                Limite atingido. Aumente o máximo ou remova alguns alunos.
              </p>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-[#005DE4] text-white px-4 py-2 rounded-lg hover:bg-[#0048b3] disabled:opacity-50 flex items-center gap-2 transition-colors text-sm font-semibold"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
          </button>
        </div>
      </div>
    </div>
  );
}
