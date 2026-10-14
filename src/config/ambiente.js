// Decide com qual Firebase o app conversa: o emulador local (dados fictícios)
// ou a produção. Puro, para ser testado sem navegador.
//
//  - `npm run dev`          → emulador (VITE_USE_EMULATOR=true, via .env.emulador)
//  - `npm run dev:producao` → produção, com aviso vermelho na tela
//  - build publicado        → produção, sem aviso
//
// O projeto do emulador começa com "demo-": por regra do próprio Firebase, um
// projeto demo nunca alcança recursos reais — o que não estiver emulado falha
// em vez de cair na produção.

export const PROJETO_EMULADOR = 'demo-speakup';

export const PORTAS_EMULADOR = { auth: 9099, firestore: 8080, functions: 5001 };

const HOSTS_LOCAIS = ['localhost', '127.0.0.1'];

/**
 * @param {{ env?: object, hostname?: string }} entrada
 *   env: import.meta.env; hostname: window.location.hostname
 * @returns {{ emulador: boolean, producaoLocal: boolean }}
 *   producaoLocal = rodando no computador, mas ligado aos dados reais
 */
export function decidirAmbiente({ env = {}, hostname = '' } = {}) {
  const emulador = env.VITE_USE_EMULATOR === 'true';
  const local = HOSTS_LOCAIS.includes(hostname);

  if (emulador && !local) {
    // Um build publicado com o emulador ligado deixaria o site sem dados.
    throw new Error('Modo emulador ligado fora do computador local. Confira VITE_USE_EMULATOR.');
  }

  return { emulador, producaoLocal: !emulador && Boolean(env.DEV) && local };
}
