import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Link vindo do LMS ("Take attendance" na turma): /professor/<slug>?chamada=<turmaId>
// abre o registro de aula daquela turma assim que as turmas do professor
// carregam. Só abre se a turma for dele (está em `turmas`); o parâmetro sai da
// URL em seguida, pra recarregar a página não reabrir o modal.
//
// Com &embed=1 o painel está dentro do modal do LMS (iframe): o CSS
// `html.embed-chamada` (index.css) esconde tudo menos o modal de registro, e
// quando ele fecha (salvou ou cancelou) o LMS é avisado por postMessage pra
// fechar a janela dele. Turma que não é do professor também avisa.
// (Fora de ProfessorDashboard.jsx por causa da catraca de tamanho.)
export function useAbrirChamadaPeloLink(turmas, loading, abrir, registroAberto) {
  const [searchParams, setSearchParams] = useSearchParams();
  const turmaId = searchParams.get('chamada');
  const embed = useRef(searchParams.get('embed') === '1');
  const abriuPeloLink = useRef(false);

  const avisarLms = (tipo) => {
    if (embed.current && window.parent !== window) window.parent.postMessage({ tipo }, '*');
  };

  useEffect(() => {
    if (embed.current) document.documentElement.classList.add('embed-chamada');
  }, []);

  useEffect(() => {
    if (!turmaId || loading) return;
    const turma = turmas.find((t) => t.id === turmaId);
    if (turma) {
      abrir(turma);
      abriuPeloLink.current = true;
    } else {
      avisarLms('speakup-chamada-indisponivel');
    }
    setSearchParams({}, { replace: true });
    // `abrir` é recriado a cada render do painel; só reagir ao link e à carga.
  }, [turmaId, loading, turmas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (abriuPeloLink.current && !registroAberto) {
      abriuPeloLink.current = false;
      avisarLms('speakup-chamada-fechada');
    }
  }, [registroAberto]);
}
