import { AMBIENTE } from '../../firebase';

// Selo fixo que diz com quais dados o app local está falando. No site
// publicado não aparece nada. Ver src/config/ambiente.js.
export default function AmbienteBadge() {
  if (AMBIENTE.emulador) {
    return (
      <div role="status" className="fixed bottom-3 left-3 z-[100] pointer-events-none rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-md">
        Ambiente de teste · dados fictícios (emulador)
      </div>
    );
  }
  if (AMBIENTE.producaoLocal) {
    return (
      <div role="alert" className="fixed bottom-3 left-3 z-[100] pointer-events-none rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md">
        Atenção: conectado aos DADOS REAIS (produção)
      </div>
    );
  }
  return null;
}
