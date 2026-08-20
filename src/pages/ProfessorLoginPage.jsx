import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useAuthContext } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const SPEAKUP_LOGO_URL =
  'https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png';

export default function ProfessorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, role } = useAuthContext();

  // Redireciona quando auth confirma professor logado (fallback para pendingSlug)
  useEffect(() => {
    if (!user || role !== 'professor') return;
    const pending = localStorage.getItem('pendingProfessorSlug');
    if (pending) {
      localStorage.removeItem('pendingProfessorSlug');
      navigate(`/professor/${pending}`, { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // Busca slug imediatamente após login para redirecionar
      const snap = await getDoc(doc(db, 'users', result.user.uid));
      const slug = snap.exists() ? snap.data().slug : null;
      if (slug) {
        navigate(`/professor/${slug}`, { replace: true });
      } else {
        setError('Sua conta entrou, mas não está configurada corretamente (falta o link do painel). Contate a administração.');
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'E-mail não cadastrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
        'auth/user-disabled': 'Conta desativada. Entre em contato com a direção.',
      };
      setError(msgs[err.code] || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FF] via-slate-50 to-[#E8F0FE] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005DE4] to-[#0041a8] px-8 py-6 text-center">
          <img
            src={SPEAKUP_LOGO_URL}
            alt="SpeakUp"
            className="h-12 mx-auto object-contain"
          />
        </div>

        <div className="p-8">
          <h1 className="text-xl font-bold text-slate-800 mb-1 text-center">
            Acesso do Professor
          </h1>
          <p className="text-sm text-slate-500 mb-6 text-center">
            Entre com seu e-mail e senha cadastrados.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 mb-1 block">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@speakup.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 mb-1 block">Senha</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-3 bg-[#005DE4] text-white rounded-xl font-semibold text-sm hover:bg-[#0041a8] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center">
            É administrador ou secretária?{' '}
            <Link to="/login" className="text-[#005DE4] hover:underline">
              Entrar com Google
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
