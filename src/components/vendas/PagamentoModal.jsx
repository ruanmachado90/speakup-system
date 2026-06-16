import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function PagamentoModal({ venda, onClose, onConfirm }) {
  const [valorPago, setValorPago] = useState(String(venda.valor || ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-2xl" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4 text-center">Registrar pagamento</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Aluno:</strong></div><div>{venda.aluno}</div>
              <div><strong>Serviço:</strong></div><div>{venda.tipo}</div>
              <div><strong>Parcela:</strong></div><div>{venda.parcelas}</div>
              <div><strong>Valor Original:</strong></div><div className="font-bold text-blue-600">R$ {parseFloat(venda.valor).toFixed(2)}</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Valor Pago *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPago}
              onChange={e => setValorPago(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
              onClick={() => onConfirm(valorPago)}
            >
              <CheckCircle size={16} /> Confirmar pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
