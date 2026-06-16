import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
          <p className="text-sm text-slate-500 mb-6">
            Ocorreu um erro inesperado. Recarregue a página para continuar.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-red-700 bg-red-50 rounded-lg p-3 mb-4 overflow-auto max-h-40">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#005DE4] text-white rounded-lg text-sm font-semibold hover:bg-[#0048b3] transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
