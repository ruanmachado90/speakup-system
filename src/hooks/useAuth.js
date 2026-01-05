import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export const useAuth = (auth, onError) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Try sign-in and handle errors
    (async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Erro na autenticação:', err);
        if (onError) {
          onError('Erro na autenticação. Recarregue a página.');
        }
      }
    })();

    return onAuthStateChanged(auth, setUser);
  }, [auth, onError]);

  return user;
};
