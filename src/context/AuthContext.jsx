/**
 * AuthContext — gerencia autenticação e roles para toda a aplicação
 *
 * Roles:
 *  'admin'      → Google Sign-In + doc /users/{uid} com role:'admin'
 *  'secretaria' → Google Sign-In + doc /users/{uid} com role:'secretaria'
 *  'professor'  → Email magic link (passwordless)
 *  null         → autenticado mas sem role (acesso negado ao painel admin)
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = ainda carregando; null = não autenticado
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        return;
      }

      // Usuário anônimo (legado) — sem role
      if (firebaseUser.isAnonymous) {
        setUser(firebaseUser);
        setRole(null);
        return;
      }

      const providerId = firebaseUser.providerData[0]?.providerId;

      // Google Sign-In → busca role no Firestore antes de setar user
      if (providerId === 'google.com') {
        setRoleLoading(true);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          setRole(snap.exists() ? (snap.data().role ?? null) : null);
        } catch {
          setRole(null);
        } finally {
          setUser(firebaseUser);
          setRoleLoading(false);
        }
        return;
      }

      // Magic link (passwordless) → providerId === 'password' no Firebase SDK
      if (providerId === 'password') {
        setRole('professor');
        setUser(firebaseUser);
        return;
      }

      setUser(firebaseUser);
      setRole(null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading: user === undefined || roleLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>');
  return ctx;
};
