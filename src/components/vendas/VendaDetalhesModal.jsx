import { useState } from 'react';
import { Eye } from 'lucide-react';

export default function VendaDetalhesModal({ venda, onClose, onDownloadRecibo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-2xl" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Eye size={20} className="text-indigo-500" />
          Detalhes da venda
          <span className={`px-2 py-1 text-xs rounded-full ${venda.status === 'pago' ? 'bg-green-100 text-green-800' : venda.status === 'cancelado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {venda.status === 'pago' ? 'Pago' : venda.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
          </span>
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Informações do cliente</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Nome:</strong> {venda.aluno}</p>
              <p><strong>Tipo de Serviço:</strong> {venda.tipo}</p>
              {venda.livro && <p><strong>Material Didático:</strong> {venda.livro}</p>}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Informações financeiras</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Parcela:</strong> {venda.parcelas}</p>
              <p><strong>Valor da Parcela:</strong> R$ {parseFloat(venda.valor).toFixed(2)}</p>
              <p><strong>Valor Pago:</strong> {venda.valorPago ? `R$ ${parseFloat(venda.valorPago).toFixed(2)}` : 'Não pago'}</p>
              <p><strong>Forma de Pagamento:</strong> {venda.pagamento}</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Informações de data</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Vencimento:</strong> {new Date(venda.vencimento).toLocaleDateString('pt-BR')}</p>
              {venda.dataPagamento && <p><strong>Data do Pagamento:</strong> {new Date(venda.dataPagamento).toLocaleDateString('pt-BR')}</p>}
              {venda.dataCancelamento && <p><strong>Data do Cancelamento:</strong> {new Date(venda.dataCancelamento).toLocaleDateString('pt-BR')}</p>}
              <p><strong>Criada em:</strong> {venda.createdAt ? new Date(venda.createdAt).toLocaleString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => { onDownloadRecibo(venda); onClose(); }}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              ⬇️ Baixar Recibo (.doc)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
