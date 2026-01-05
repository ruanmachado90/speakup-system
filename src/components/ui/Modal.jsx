import { X } from 'lucide-react';

export const Modal = ({children, onClose}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-auto relative">
      <button onClick={onClose} className="absolute top-4 right-4" aria-label="Fechar">
        <X/>
      </button>
      {children}
    </div>
  </div>
);
