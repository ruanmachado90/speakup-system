import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Link vindo do LMS ("Take attendance" na turma): /professor/<slug>?chamada=<turmaId>
// abre o registro de aula daquela turma assim que as turmas do professor
// carregam. Só abre se a turma for dele (está em `turmas`); o parâmetro sai da
// URL em seguida, pra recarregar a página não reabrir o modal.
// (Fora de ProfessorDashboard.jsx por causa da catraca de tamanho.)
export function useAbrirChamadaPeloLink(turmas, loading, abrir) {
  const [searchParams, setSearchParams] = useSearchParams();
  const turmaId = searchParams.get('chamada');

  useEffect(() => {
    if (!turmaId || loading) return;
    const turma = turmas.find((t) => t.id === turmaId);
    if (turma) abrir(turma);
    setSearchParams({}, { replace: true });
    // `abrir` é recriado a cada render do painel; só reagir ao link e à carga.
  }, [turmaId, loading, turmas]); // eslint-disable-line react-hooks/exhaustive-deps
}
