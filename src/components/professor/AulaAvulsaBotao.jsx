import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AulaAvulsaDialog } from '../agenda/AulaAvulsaDialog';
import { montarAulaAvulsa } from '../../utils/aulasAvulsas';
import { registrarAulaAvulsa } from '../../hooks/useAgendaSemana';

/**
 * Item "Aula avulsa" no menu do botão "+" do painel do professor: reposição
 * ou aula extra, que o registro normal recusa (uma aula por turma por dia)
 * e que não deve contar no andamento da turma.
 */
export default function AulaAvulsaBotao({ turmas, alunosPorTurma, professorNome, professorSlug, onFeito, onErro }) {
  const [aberto, setAberto] = useState(false);

  const salvar = async (form, turma, alunos) => {
    try {
      await registrarAulaAvulsa(montarAulaAvulsa(form, { turma, alunos, professorNome, professorSlug, origem: 'professor' }));
    } catch (err) {
      onErro?.(err);
      throw err;
    }
    setAberto(false);
    onFeito?.('Aula avulsa registrada.');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full mt-1 pt-3 border-t border-slate-100 text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 hover:text-accent text-sm text-slate-700 transition-colors flex items-center gap-2"
      >
        <RotateCcw size={15} className="text-accent" />
        <span>
          <span className="block font-medium">Aula avulsa</span>
          <span className="block text-xs text-slate-500">Reposição ou aula extra</span>
        </span>
      </button>
      {aberto && (
        <AulaAvulsaDialog
          turmas={turmas}
          alunosDaTurma={(t) => alunosPorTurma[t.id] || []}
          onSalvar={salvar}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}
