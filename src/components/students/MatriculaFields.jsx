import { useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useProfessores } from '../../hooks/useProfessores';
import { CURSOS, BOOKS_POR_CURSO } from '../../constants/turmasConfig';
import { dataParcelaPadrao, datasDasParcelas, paraISODia, MAX_PARCELAS } from '../../utils/matricula';

// Campos compartilhados por todo caminho de entrada de aluno (Novo aluno,
// confirmação de pré-cadastro, reativação). Todos são inputs nomeados: quem
// usa lê com FormData, e os três fluxos gravam exatamente os mesmos campos.

const labelCls = 'text-sm font-bold text-slate-600 mb-1';
const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] bg-white';

/**
 * Curso + Book do catálogo (mesmo do formulário de turma), em vez de texto
 * livre — os dashboards e relatórios agrupam por esse campo.
 */
export function CursoBookSelect({ defaultCurso, defaultBook }) {
  const [curso, setCurso] = useState(defaultCurso || '');
  const [book, setBook] = useState(defaultBook ? String(defaultBook) : '');

  // Aluno antigo com curso fora do catálogo: mantém o valor como opção extra
  // em vez de apagar o dado ao abrir a edição.
  const legado = defaultCurso && !CURSOS.includes(defaultCurso) ? defaultCurso : null;
  const books = BOOKS_POR_CURSO[curso] || [];

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col">
        <label htmlFor="matricula-course" className={labelCls}>Curso</label>
        <select
          id="matricula-course"
          name="course"
          value={curso}
          required
          onChange={(e) => { setCurso(e.target.value); setBook(''); }}
          className={inputCls}
        >
          <option value="">Selecione o curso</option>
          {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
          {legado && <option value={legado}>{legado} (atual)</option>}
        </select>
      </div>
      <div className="flex flex-col">
        <label htmlFor="matricula-book" className={labelCls}>Book</label>
        <select
          id="matricula-book"
          name="book"
          value={book}
          disabled={books.length === 0}
          onChange={(e) => setBook(e.target.value)}
          className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}
        >
          <option value="">{curso ? (books.length ? 'Selecione o book' : 'Sem book') : 'Escolha o curso primeiro'}</option>
          {books.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Professor da coleção `professores`, gravando nome + professorId. */
export function TeacherSelect({ defaultValue, defaultProfessorId, required }) {
  const { professores } = useProfessores();
  const professoresAtivos = professores.filter((p) => p.status !== 'inativo');
  const [nome, setNome] = useState(defaultValue || '');
  const [professorId, setProfessorId] = useState(defaultProfessorId || '');

  return (
    <div className="flex flex-col">
      <label htmlFor="matricula-teacher" className={labelCls}>Professor</label>
      <select
        id="matricula-teacher"
        name="teacher"
        value={nome}
        required={required}
        onChange={(e) => {
          setNome(e.target.value);
          const selecionado = professoresAtivos.find((p) => p.nome === e.target.value);
          setProfessorId(selecionado ? selecionado.id : '');
        }}
        className={inputCls}
      >
        <option value="">Selecione o professor</option>
        {professoresAtivos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
        {/* Nome antigo que não bate com nenhum cadastrado: preserva ao editar */}
        {nome && !professoresAtivos.some((p) => p.nome === nome) && <option value={nome}>{nome} (atual)</option>}
      </select>
      {/* Aluno antigo sem professorId: deduz pelo nome, e o id é gravado ao salvar */}
      <input type="hidden" name="professorId" value={professorId || professoresAtivos.find((p) => p.nome === nome)?.id || ''} />
    </div>
  );
}

/**
 * Mensalidade, 1º vencimento, nº de parcelas e a data de cada parcela
 * (ajustável individualmente, ex: semestralidade). Gera os inputs `fee`,
 * `dueDate`, `installments` e `installmentDates` (JSON).
 */
export function ContratoFinanceiroFields({ defaultFee = '', defaultDueDate, defaultInstallments = 12, accent = 'blue' }) {
  const [fee, setFee] = useState(defaultFee === null ? '' : String(defaultFee));
  const [dueDate, setDueDate] = useState(defaultDueDate || paraISODia(new Date()));
  const [installments, setInstallments] = useState(String(defaultInstallments));
  const [overrides, setOverrides] = useState({});

  const ring = accent === 'green' ? 'focus:ring-emerald-400' : 'focus:ring-[#0e48fe]';
  const n = Number(installments) || 0;
  const nValido = Number.isInteger(n) && n >= 1 && n <= MAX_PARCELAS;
  const datas = dueDate && nValido ? datasDasParcelas(dueDate, n, overrides) : [];

  const previewEnd = datas.length
    ? new Date(datas[datas.length - 1] + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  // Trocar o 1º vencimento reinicia os ajustes: eles eram relativos à data antiga.
  const mudarPrimeira = (v) => { setDueDate(v); setOverrides({}); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label htmlFor="matricula-fee" className={labelCls}>Mensalidade (R$)</label>
          <input id="matricula-fee" name="fee" type="number" min="0.01" step="0.01" required value={fee}
            onChange={(e) => setFee(e.target.value)} placeholder="Ex: 350.00" className={`${inputCls} ${ring}`} />
        </div>
        <div className="flex flex-col">
          <label htmlFor="matricula-due" className={labelCls}>1º vencimento</label>
          <input id="matricula-due" name="dueDate" type="date" required value={dueDate}
            onChange={(e) => mudarPrimeira(e.target.value)} className={`${inputCls} ${ring}`} />
        </div>
        <div className="flex flex-col">
          <label htmlFor="matricula-inst" className={labelCls}>Parcelas</label>
          <input id="matricula-inst" name="installments" type="number" min="1" max={MAX_PARCELAS} required value={installments}
            onChange={(e) => { setInstallments(e.target.value); setOverrides({}); }} className={`${inputCls} ${ring}`} />
        </div>
      </div>

      {datas.length > 0 && (
        <div>
          <p className={labelCls}>Vencimento de cada parcela</p>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {datas.map((valor, i) => {
              const alterada = overrides[i] != null && overrides[i] !== dataParcelaPadrao(dueDate, i);
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-500 w-14 flex-shrink-0">{i + 1}ª parcela</span>
                  <input
                    type="date"
                    value={valor}
                    aria-label={`Vencimento da ${i + 1}ª parcela`}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [i]: e.target.value }))}
                    className={`flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${ring} ${alterada ? 'border-amber-300 bg-amber-50' : 'border-slate-300'}`}
                  />
                  {alterada && (
                    <button
                      type="button"
                      onClick={() => setOverrides((prev) => { const c = { ...prev }; delete c[i]; return c; })}
                      title="Restaurar data padrão"
                      className="p-1.5 text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cada parcela vence um mês após a anterior. Ajuste qualquer data individualmente se precisar (ex: semestralidade).
          </p>
        </div>
      )}

      {previewEnd && Number(fee) > 0 && (
        <div className={`rounded-lg px-3 py-2.5 text-sm border ${accent === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span className="font-semibold">{n}x</span> de{' '}
          <span className="font-semibold">R$ {Number(fee).toFixed(2).replace('.', ',')}</span>
          {' '}— até <span className="font-semibold">{previewEnd}</span>
        </div>
      )}

      <input type="hidden" name="installmentDates" value={JSON.stringify(datas)} />
    </div>
  );
}

/**
 * Aviso de CPF já cadastrado. Aluno ativo com o mesmo CPF = duplicata (quem usa
 * bloqueia o salvar); inativo = sugere reativar, pra ex-aluno não virar
 * "matrícula nova" nos números.
 */
export function AvisoCpfExistente({ duplicados, onReativar, onDescartar }) {
  if (!duplicados.length) return null;
  const ativo = duplicados.find((s) => s.status !== 'cancelado');
  const inativo = duplicados.find((s) => s.status === 'cancelado');

  if (ativo) {
    return (
      <div role="alert" className="flex gap-2 items-start bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2.5 text-sm">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p><strong>{ativo.name}</strong> já está matriculado com este CPF. Confirmar criaria um aluno duplicado.</p>
          {onDescartar && (
            <button type="button" onClick={onDescartar} className="mt-1.5 font-semibold underline">
              Descartar este pré-cadastro (já é aluno)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className="flex gap-2 items-start bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 text-sm">
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p><strong>{inativo.name}</strong> já foi aluno (matrícula cancelada). O certo é reativar a matrícula dele, não criar outra.</p>
        {onReativar ? (
          <button type="button" onClick={() => onReativar(inativo)} className="mt-1.5 font-semibold underline">
            Reativar a matrícula de {inativo.name}
          </button>
        ) : (
          <p className="mt-1 text-xs">Use o botão Reativar na lista de alunos inativos.</p>
        )}
      </div>
    </div>
  );
}
