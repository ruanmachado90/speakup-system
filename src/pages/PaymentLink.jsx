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
        
        console.log('Buscando pagamento ID:', paymentId);
        const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
        
        console.log('Documento existe?', paymentDoc.exists());
        
        if (!paymentDoc.exists()) {
          console.error('Documento não encontrado no Firestore. ID:', paymentId);
          setError('Pagamento não encontrado');
          setLoading(false);
          return;
        }

        const paymentData = { id: paymentDoc.id, ...paymentDoc.data() };
        console.log('Dados do pagamento:', paymentData);
        
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Carregando informações de pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Ops!</h2>
            <p className="text-sm sm:text-base text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-2 sm:my-0">
        {/* Logo */}
        <div className="flex justify-center bg-indigo-600 pt-3 sm:pt-6 pb-2 sm:pb-4 rounded-t-lg">
          <img 
            src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" 
            alt="SpeakUp English School" 
            className="h-8 sm:h-12 w-auto"
          />
        </div>

        <div className="p-3 sm:p-6 md:p-8">
          <div className="text-center mb-3 sm:mb-6">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight">Complete seu pagamento via PIX</h1>
          </div>

          {/* Informações do Aluno */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 sm:mb-2">Informações</h3>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-sm sm:text-lg font-medium text-gray-800 break-words">{payment?.studentName || 'Nome não disponível'}</p>
              {payment?.responsibleName && (
                <p className="text-xs sm:text-sm text-gray-600">Responsável: {payment.responsibleName}</p>
              )}
            </div>
          </div>

          {/* Informações do Pagamento */}
          <div className="bg-indigo-50 rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-1">
              <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">Valor</span>
              <span className="text-2xl sm:text-2xl md:text-3xl font-bold text-indigo-600">
                R$ {Number(payment?.valuePlanned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {payment?.dueDate && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase flex-shrink-0">Vencimento</span>
                <span className={`text-xs sm:text-sm font-medium text-right ${
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
                <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Descrição</span>
                <span className="text-xs sm:text-sm text-gray-700 break-words">{payment.description}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          {payment?.pixQRCode && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-2 sm:p-4 mb-3 sm:mb-6 flex justify-center">
              <img 
                src={payment.pixQRCode} 
                alt="QR Code PIX" 
                className="w-full max-w-[220px] sm:max-w-[280px] h-auto aspect-square object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const container = e.target.parentElement;
                  if (container && !container.querySelector('.error-message')) {
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'error-message text-red-600 text-xs sm:text-sm text-center p-4';
                    errorMsg.textContent = 'Erro ao carregar QR Code. Use o código PIX abaixo.';
                    container.appendChild(errorMsg);
                  }
                }}
              />
            </div>
          )}

          {/* Código PIX */}
          {payment?.pixCode && (
            <div className="mb-3 sm:mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Código PIX Copia e Cola
              </label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={payment.pixCode}
                    readOnly
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg bg-gray-50 text-[10px] sm:text-sm font-mono overflow-x-auto"
                    style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
                  />
                </div>
                <button
                  onClick={handleCopyPixCode}
                  className={`p-2.5 sm:p-3 rounded-lg transition-all flex-shrink-0 touch-manipulation active:scale-95 ${
                    copied 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-md'
                  }`}
                  aria-label="Copiar código PIX"
                >
                  {copied ? <Check size={20} className="sm:w-5 sm:h-5" /> : <Copy size={20} className="sm:w-5 sm:h-5" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs sm:text-sm text-green-600 mt-1.5 sm:mt-2 font-medium">Código copiado com sucesso!</p>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-4">
            <h4 className="font-semibold text-blue-800 mb-1.5 sm:mb-2 text-xs sm:text-base">Como pagar via PIX:</h4>
            <ol className="text-xs sm:text-sm text-blue-700 space-y-0.5 sm:space-y-1 list-decimal list-inside leading-relaxed">
              <li>Abra o aplicativo do seu banco</li>
              <li>Escolha pagar com PIX</li>
              <li>Escaneie o QR Code ou copie e cole o código acima</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>

          {/* Rodapé */}
          <div className="mt-3 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
            <p className="font-medium">SpeakUp English School</p>
            <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Em caso de dúvidas, entre em contato conosco</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentLink;
