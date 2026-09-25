import { useParams, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

// Componente de loading para Suspense
export const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '400px',
    color: 'var(--su-blue)',
    fontSize: '14px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '3px solid #e2e8f0',
        borderTopColor: 'var(--su-blue)',
        borderRadius: '50%',
        margin: '0 auto 12px',
        animation: 'spin 0.8s linear infinite'
      }} />
      Carregando...
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ── Guard: admin ou secretaria ───────────────────────────────────────────
export function RequireAdminAuth({ children }) {
  const { user, role, loading } = useAuthContext();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user || !['admin', 'secretaria'].includes(role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// ── Guard: professor (ou admin/secretaria para suporte) ───────────────────
export function RequireProfessorAuth({ children }) {
  const { user, role, loading } = useAuthContext();
  const { professorSlug } = useParams();

  if (loading) return <PageLoader />;
  if (!user || !['professor', 'admin', 'secretaria'].includes(role)) {
    if (professorSlug) localStorage.setItem('pendingProfessorSlug', professorSlug);
    return <Navigate to="/professor-login" replace />;
  }
  return children;
}
