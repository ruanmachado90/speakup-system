import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Copy, Check, AlertCircle } from 'lucide-react';

const PaymentLink = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        
        if (!paymentDoc.exists()) {
          setError('Pagamento não encontrado');
          setLoading(false);
          return;
        }

        const paymentData = { id: paymentDoc.id, ...paymentDoc.data() };
        
        // Validar se tem informações de PIX
        if (!paymentData.pixCode || !paymentData.pixQRCode) {
          setError('Informações de pagamento não configuradas');
          setLoading(false);
          return;
        }

        // Verificar se pagamento já foi realizado
        if (paymentData.status === 'Pago') {
          setError('Este pagamento já foi realizado');
          setLoading(false);
          return;
        }

        setPayment(paymentData);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar pagamento:', err);
        setError('Erro ao carregar informações de pagamento');
        setLoading(false);
      }
    };

    if (paymentId) {
      fetchPaymentData();
    }
  }, [paymentId]);

  const handleCopyPixCode = () => {
    if (payment?.pixCode) {
      navigator.clipboard.writeText(payment.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Carregando informações de pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops!</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6 bg-indigo-600 -mx-8 -mt-8 pt-6 pb-4 rounded-t-lg">
          <img 
            src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" 
            alt="SpeakUp English School" 
            className="h-12 w-auto"
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Complete seu pagamento via PIX</h1>
        </div>

        {/* Informações do Aluno */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Informações</h3>
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-800">{payment?.studentName || 'Nome não disponível'}</p>
            {payment?.responsibleName && (
              <p className="text-sm text-gray-600">Responsável: {payment.responsibleName}</p>
            )}
          </div>
        </div>

        {/* Informações do Pagamento */}
        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-500 uppercase">Valor</span>
            <span className="text-2xl font-bold text-indigo-600">
              R$ {Number(payment?.valuePlanned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {payment?.dueDate && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500 uppercase">Vencimento</span>
              <span className={`text-sm font-medium ${
                new Date(payment.dueDate) < new Date(new Date().setHours(0,0,0,0))
                  ? 'text-red-600'
                  : 'text-gray-700'
              }`}>
                {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                {new Date(payment.dueDate) < new Date(new Date().setHours(0,0,0,0)) && ' (Vencido)'}
              </span>
            </div>
          )}
          {payment?.description && (
            <div className="mt-2 pt-2 border-t border-indigo-200">
              <span className="text-sm font-semibold text-gray-500 uppercase block mb-1">Descrição</span>
              <span className="text-sm text-gray-700">{payment.description}</span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {payment?.pixQRCode && (
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6 flex justify-center">
            <img 
              src={payment.pixQRCode} 
              alt="QR Code PIX" 
              className="w-64 h-64 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                const container = e.target.parentElement;
                if (container && !container.querySelector('.error-message')) {
                  const errorMsg = document.createElement('p');
                  errorMsg.className = 'error-message text-red-600 text-sm';
                  errorMsg.textContent = 'Erro ao carregar QR Code. Use o código PIX abaixo.';
                  container.appendChild(errorMsg);
                }
              }}
            />
          </div>
        )}

        {/* Código PIX */}
        {payment?.pixCode && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código PIX Copia e Cola
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={payment.pixCode}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={handleCopyPixCode}
                className={`p-3 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-2">Código copiado com sucesso!</p>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Como pagar via PIX:</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Abra o aplicativo do seu banco</li>
            <li>Escolha pagar com PIX</li>
            <li>Escaneie o QR Code ou copie e cole o código acima</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>SpeakUp English School</p>
          <p className="text-xs mt-1">Em caso de dúvidas, entre em contato conosco</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentLink;
