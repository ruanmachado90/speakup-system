import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

// Observa o estado de autenticação sem forçar login anônimo.
// O login é gerenciado pelo AuthContext (Google / magic link).
export const useAuth = (auth) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, [auth]);

  return user;
};
