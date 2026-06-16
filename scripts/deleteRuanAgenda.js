// Script para apagar todos os eventos do responsável 'Ruan Machado' no Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkJ7pFFaVkjMoTpSI5V0YW_eJw8e76XaQ",
  authDomain: "speakup-system.firebaseapp.com",
  projectId: "speakup-system",
  storageBucket: "speakup-system.firebasestorage.app",
  messagingSenderId: "242228047792",
  appId: "1:242228047792:web:eb6344c3bb458229bfb075"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  const snap = await getDocs(collection(db, 'agendaEventos'));
  let count = 0;
  for (const d of snap.docs) {
    if ((d.data().responsible || '').toLowerCase().includes('ruan machado')) {
      await deleteDoc(doc(db, 'agendaEventos', d.id));
      count++;
      console.log('Apagado:', d.id, d.data().description);
    }
  }
  console.log('Total de eventos apagados:', count);
  process.exit(0);
})();
