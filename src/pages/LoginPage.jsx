import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase';

const SPEAKUP_LOGO_URL =
  'https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png';

const ROLES_PERMITIDOS = ['admin', 'secretaria'];

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
      <path fill="#34A853" d="M6.3 16.7l7 5.1C15.1 19 19.3 16 24 16c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 6.1 29.6 4 24 4c-7.6 0-14.2 4.4-17.7 10.7z"/>
      <path fill="#FBBC05" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.6 37 26.9 38 24 38c-5.9 0-10.9-3.8-12.7-9.1L4.1 34c3.5 6.5 10.2 12 19.9 12z"/>
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 3-3.3 5.5-6.5 7l6.6 5.4C40 37 46 31 46 24c0-1.3-.2-2.7-.5-4z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const snap = await getDoc(doc(db, 'users', result.user.uid));

      if (!snap.exists() || !ROLES_PERMITIDOS.includes(snap.data().role)) {
        await signOut(auth);
        setError(
          'Conta sem permissão de acesso. Solicite ao administrador do sistema.'
        );
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Erro ao entrar com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FF] via-slate-50 to-[#E8F0FE] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center">
        {/* Faixa azul com logo */}
        <div className="bg-gradient-to-r from-[#005DE4] to-[#0041a8] px-8 py-6">
          <img
            src={SPEAKUP_LOGO_URL}
            alt="SpeakUp"
            className="h-12 mx-auto object-contain"
          />
        </div>

        {/* Conteúdo do card */}
        <div className="p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-1">
          Painel Administrativo
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Entre com sua conta Google autorizada
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:border-[#005DE4] hover:bg-blue-50 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#005DE4] rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Entrando...' : 'Continuar com Google'}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          É professor?{' '}
          <Link to="/professor-login" className="text-[#005DE4] hover:underline">
            Entrar com link de acesso
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
