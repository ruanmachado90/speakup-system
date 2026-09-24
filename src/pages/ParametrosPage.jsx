import { useState, useEffect } from 'react';
import { Save, RotateCcw, Info } from 'lucide-react';
import { useParametrosData } from '../hooks';
import { PARAMETROS_PADRAO } from '../config/parametros';

const CAMPOS = [
  {
    grupo: 'Custo do professor',
    itens: [
      { chave: 'valorHoraAula', label: 'Valor da hora-aula (R$)', hint: 'O que o professor recebe por hora-aula.' },
      { chave: 'encargosProfessorPct', label: 'Encargos sobre a hora-aula (%)', hint: 'CLT: FGTS 8% + INSS 20% + provisão de 13º/férias + RAT ≈ 70%. PJ/MEI: 0%.' },
      { chave: 'horasMensaisPadraoTurma', label: 'Horas/mês padrão da turma', hint: 'Usado quando a turma não tem "Horas por mês" cadastrado. Custo da turma = horas × hora-aula × (1 + encargos).' },
    ],
  },
  {
    grupo: 'Metas para alertas do relatório',
    itens: [
      { chave: 'metaChurnPct', label: 'Churn mensal máximo (%)', hint: 'Acima disso o relatório dispara alerta crítico.' },
      { chave: 'metaInadimplenciaPct', label: 'Inadimplência máxima (% da receita prevista)', hint: 'Acima disso o relatório dispara alerta crítico.' },
      { chave: 'metaOcupacaoPct', label: 'Ocupação mínima por turma (%)', hint: 'Turmas abaixo disso aparecem como alerta.' },
    ],
  },
];

export default function ParametrosPage() {
  const { parametros, parametrosLoading, salvarParametros } = useParametrosData();
  const [form, setForm] = useState(parametros);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo, msg }

  // Sincroniza o form quando os parâmetros salvos chegam/mudam (e não estamos editando).
  useEffect(() => {
    if (!parametrosLoading) setForm(parametros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametrosLoading, JSON.stringify(parametros)]);

  const alterado = JSON.stringify(form) !== JSON.stringify(parametros);

  const setCampo = (chave, valor) => {
    setForm((f) => ({ ...f, [chave]: valor }));
    setFeedback(null);
  };

  const handleSalvar = async () => {
    // Valida: todos numéricos e >= 0
    for (const chave of Object.keys(PARAMETROS_PADRAO)) {
      const v = Number(form[chave]);
      if (!Number.isFinite(v) || v < 0) {
        setFeedback({ tipo: 'erro', msg: 'Todos os campos devem ser números maiores ou iguais a zero.' });
        return;
      }
    }
    setSalvando(true);
    try {
      await salvarParametros(form);
      setFeedback({ tipo: 'ok', msg: 'Parâmetros salvos. Os relatórios já usam os novos valores.' });
    } catch (err) {
      console.error('[ParametrosPage] Erro ao salvar:', err);
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 p-1">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Parâmetros de negócio</h2>
        <p className="text-sm text-slate-500 mt-1">
          Valores usados pelos relatórios gerenciais. Vêm da auditoria financeira — mantenha-os atualizados.
        </p>
      </div>

      {feedback && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          feedback.tipo === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.msg}
        </div>
      )}

      {CAMPOS.map((grupo) => (
        <div key={grupo.grupo} className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">{grupo.grupo}</h3>
          <div className="space-y-4">
            {grupo.itens.map((item) => (
              <div key={item.chave}>
                <label htmlFor={item.chave} className="block text-sm font-semibold text-slate-600 mb-1">
                  {item.label}
                </label>
                <input
                  id={item.chave}
                  type="number"
                  min="0"
                  step={item.chave.includes('Pct') || item.chave.startsWith('horas') ? '1' : '0.01'}
                  value={form[item.chave] ?? ''}
                  onChange={(e) => setCampo(item.chave, e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={parametrosLoading || salvando}
                  className="w-full max-w-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] disabled:bg-slate-50"
                />
                <p className="flex items-start gap-1.5 text-xs text-slate-400 mt-1">
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  {item.hint} <span className="text-slate-300">· padrão: {PARAMETROS_PADRAO[item.chave]}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSalvar}
          disabled={!alterado || salvando || parametrosLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            !alterado || salvando || parametrosLoading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#0e48fe] text-white hover:bg-[#0b3ad4]'
          }`}
        >
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar parâmetros'}
        </button>
        {alterado && !salvando && (
          <button
            onClick={() => { setForm(parametros); setFeedback(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={15} />
            Descartar
          </button>
        )}
      </div>
    </div>
  );
}
