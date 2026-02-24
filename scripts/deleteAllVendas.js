import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnW8xVGl2c0f89GrJ-Nzqxs1I9xmq2Vxc',
  authDomain: 'speakup-b4b85.firebaseapp.com',
  projectId: 'speakup-b4b85',
  storageBucket: 'speakup-b4b85.firebasestorage.app',
  messagingSenderId: '1096831286132',
  appId: '1:1096831286132:web:4fdbb8178fba92c91f75e5'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  try {
    console.log('Iniciando remocao de todas as vendas...');
    const vendasRef = collection(db, 'vendas');
    const vendasSnap = await getDocs(vendasRef);
    console.log('Total de vendas: ' + vendasSnap.docs.length);
    let contador = 0;
    for (const vendaDoc of vendasSnap.docs) {
      await deleteDoc(doc(db, 'vendas', vendaDoc.id));
      contador++;
      console.log('Deletada ' + contador + ' de ' + vendasSnap.docs.length);
    }
    console.log('Todas as vendas foram apagadas!');
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
})();