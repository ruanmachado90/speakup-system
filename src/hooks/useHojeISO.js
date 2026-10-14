import { useEffect, useState } from 'react';
import { dataLocalISO } from '../utils/aulas';

// Data de hoje (AAAA-MM-DD, fuso local) que vira sozinha à meia-noite.
// Sem isso, a aba deixada aberta de um dia para o outro continuava mostrando
// a agenda, as "aulas de hoje" e as pendências do dia anterior.
// Também confere ao voltar para a aba: com o computador dormindo o
// setTimeout não dispara na hora certa.
export function useHojeISO() {
  const [hoje, setHoje] = useState(() => dataLocalISO());

  useEffect(() => {
    let timer;
    const agendar = () => {
      clearTimeout(timer);
      const agora = new Date();
      const proximaMeiaNoite = new Date(agora);
      proximaMeiaNoite.setHours(24, 0, 1, 0);
      timer = setTimeout(() => { setHoje(dataLocalISO()); agendar(); }, proximaMeiaNoite - agora);
    };
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      setHoje(dataLocalISO()); // mesmo valor → React não re-renderiza
      agendar();
    };
    agendar();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  return hoje;
}
