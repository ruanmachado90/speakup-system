import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { decidirAmbiente, PROJETO_EMULADOR, PORTAS_EMULADOR } from "./config/ambiente";

// `npm run dev` liga o emulador (dados fictícios); `npm run dev:producao` e o
// build publicado usam a produção. Ver src/config/ambiente.js.
export const AMBIENTE = decidirAmbiente({
  env: import.meta.env,
  hostname: typeof window !== 'undefined' ? window.location.hostname : '',
});

const firebaseConfig = AMBIENTE.emulador
  ? {
      apiKey: "demo-api-key",
      authDomain: `${PROJETO_EMULADOR}.firebaseapp.com`,
      projectId: PROJETO_EMULADOR,
      appId: "demo-app",
    }
  : {
      apiKey: "AIzaSyCkJ7pFFaVkjMoTpSI5V0YW_eJw8e76XaQ",
      authDomain: "speakup-system.firebaseapp.com",
      projectId: "speakup-system",
      storageBucket: "speakup-system.firebasestorage.app",
      messagingSenderId: "242228047792",
      appId: "1:242228047792:web:eb6344c3bb458229bfb075"
    };

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (AMBIENTE.emulador) {
  connectFirestoreEmulator(db, '127.0.0.1', PORTAS_EMULADOR.firestore);
  connectAuthEmulator(auth, `http://127.0.0.1:${PORTAS_EMULADOR.auth}`, { disableWarnings: true });
  // getFunctions() sem argumentos (ProfessoresAdmin) devolve esta mesma instância:
  // as chamadas vão para o emulador e, sem ele rodando, falham — nunca a produção.
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', PORTAS_EMULADOR.functions);
}

// Garante que a sessão persiste no localStorage (sobrevive ao refresh e fechar aba)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('[Auth] Falha ao definir persistência de sessão:', err);
});
