import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
