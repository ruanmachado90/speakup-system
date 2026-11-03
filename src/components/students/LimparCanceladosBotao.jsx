import { useMemo, useState } from 'react';
import { Loader2, UserX } from 'lucide-react';
import { turmasDoAluno } from '../../utils/matricula';
import { removerCanceladosDasTurmas } from '../../utils/handlersTurmas';

/**
 * "Tirar N cancelado(s) das turmas" — só aparece quando há aluno cancelado
 * que ficou em turma (antes de o cancelamento passar a tirar). Saiu de
 * Students.jsx, que estava no limite de tamanho.
 */
export default function LimparCanceladosBotao({ students, turmas, requestConfirm, toastMsg }) {
  const [limpando, setLimpando] = useState(false);
  const quantos = useMemo(
    () => students.filter(s => s.status === 'cancelado' && turmasDoAluno(turmas, s.id).length > 0).length,
    [students, turmas]
  );
  if (quantos === 0) return null;

  const limpar = async () => {
    const ok = await requestConfirm({
      title: 'Tirar cancelados das turmas',
      message: `${quantos} aluno(s) com matrícula cancelada ainda aparecem em turmas. Removê-los das turmas? Chamadas e notas já lançadas continuam no histórico.`,
      confirmLabel: 'Remover das turmas',
    });
    if (!ok) return;
    setLimpando(true);
    try {
      const n = await removerCanceladosDasTurmas(turmas, students);
      toastMsg(`${n} vínculo(s) de aluno cancelado removido(s) das turmas`);
    } catch (err) {
      console.error(err);
      toastMsg('Erro ao limpar turmas. Nada foi alterado.');
    } finally {
      setLimpando(false);
    }
  };

  return (
    <button
      onClick={limpar}
      disabled={limpando}
      className="border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 rounded-full font-semibold text-xs flex gap-2 items-center hover:bg-amber-100 transition-colors disabled:opacity-60"
      title="Alunos cancelados que ainda aparecem em turmas"
    >
      {limpando ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
      Tirar {quantos} cancelado(s) das turmas
    </button>
  );
}
