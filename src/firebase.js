import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
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

// Garante que a sessão persiste no localStorage (sobrevive ao refresh e fechar aba)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('[Auth] Falha ao definir persistência de sessão:', err);
});
