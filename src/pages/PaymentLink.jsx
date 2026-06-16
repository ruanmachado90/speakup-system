import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { gerarPixPayload } from '../utils/pix';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { APP_ID } from '../utils/constants';
import { formatDate } from '../utils/formatters';

const PaymentLink = () => {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pixCode, setPixCode] = useState('');

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        setError(null);
        const paymentDoc = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'payments', paymentId));
        if (!paymentDoc.exists()) {
          setError('Pagamento não encontrado');
          setLoading(false);
          return;
        }
        const paymentData = { id: paymentDoc.id, ...paymentDoc.data() };
        // Verificar se pagamento já foi realizado
        if (paymentData.status === 'Pago') {
          setError('Este pagamento já foi realizado');
          setLoading(false);
          return;
        }
        setPayment(paymentData);
        // Gera o payload PIX automaticamente
        const chavePix = 'ruan@speakupcataguases.com';
        const valor = Number(paymentData.valuePlanned || 0);
        const nome = paymentData.studentName || 'SPEAKUP SCHOOL';
        const descricao = paymentData.description || '';
        const payload = gerarPixPayload({
          chave: chavePix,
          valor,
          nome,
          descricao,
        });
        setPixCode(payload);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar informações de pagamento');
        setLoading(false);
      }
    };
    if (paymentId) {
      fetchPaymentData();
    }
  }, [paymentId]);

  const handleCopyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaf0ff] to-[#c7d6ff] flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#eaf0ff', borderBottomColor: '#0e48fe' }}></div>
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
    <div className="min-h-screen bg-gradient-to-br from-[#eaf0ff] to-[#c7d6ff] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-0 border border-[#eaf0ff]">
        {/* Logo e título */}
        <div className="flex flex-col items-center justify-center" style={{ background: '#0e48fe', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', padding: '2rem 0 0 0' }}>
          <img 
            src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" 
            alt="SpeakUp English School" 
            className="h-10 sm:h-14 w-auto mb-2 drop-shadow-lg"
          />
          {/* Linha separadora laranja */}
          <div style={{ height: '5px', width: '100%', background: '#ffae1e', border: 'none', margin: 0, marginTop: '1rem' }} />
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Título Pagamento via PIX (agora em azul, acima do nome do aluno) */}
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#0e48fe] tracking-wide text-center drop-shadow-md mb-4">Pagamento via PIX</h1>
          {/* Nome do aluno, valor e vencimento */}
          <div className="flex flex-col items-center justify-center mb-6 gap-2">
            <span className="text-xs text-gray-500">Aluno</span>
            <span className="text-base sm:text-lg font-semibold text-gray-800 break-words text-center">{payment?.studentName || 'Nome não disponível'}</span>
            <span className="text-xs font-semibold text-[#0e48fe] uppercase tracking-wider mt-2">Valor a pagar</span>
            <span className="text-3xl font-black text-[#0e48fe]">R$ {Number(payment?.valuePlanned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {payment?.dueDate && (
              <span className={`text-xs font-medium ${new Date(payment.dueDate) < new Date(new Date().setHours(0,0,0,0)) ? 'text-red-600' : 'text-gray-700'}`}>Vencimento: {formatDate(payment.dueDate)}{new Date(payment.dueDate) < new Date(new Date().setHours(0,0,0,0)) && ' (Vencido)'}</span>
            )}
          </div>

          {/* QR Code PIX gerado automaticamente */}
          {pixCode && (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="bg-white border-2 border-[#eaf0ff] rounded-xl p-4 shadow-sm">
                <QRCode value={pixCode} size={200} />
              </div>
              <span className="mt-2 text-xs text-gray-500">Escaneie com o app do seu banco</span>
            </div>
          )}

          {/* Código PIX Copia e Cola */}
          {pixCode && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#0e48fe] mb-2">Copia e Cola PIX</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pixCode}
                  readOnly
                  className="w-full p-3 border border-[#eaf0ff] rounded-lg bg-[#f6f8ff] text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0e48fe] transition-all select-all"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                  aria-label="Código PIX Copia e Cola"
                  onFocus={e => e.target.select()}
                />
                <button
                  onClick={handleCopyPixCode}
                  className={`p-3 rounded-lg transition-all flex-shrink-0 active:scale-95 ${copied ? 'bg-green-500 text-white shadow-lg' : 'bg-[#f30961] text-white hover:bg-[#c1074e] shadow-md'}`}
                  aria-label="Copiar código PIX"
                  tabIndex={0}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-2 font-medium animate-pulse">Código copiado com sucesso!</p>
              )}
            </div>
          )}

          {/* Instruções visuais */}
          <div className="bg-[#eaf0ff] border border-[#b3c6ff] rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-[#0e48fe] mb-2 text-xs sm:text-base flex items-center gap-2"><span>Como pagar via PIX</span></h4>
            <ol className="text-xs sm:text-sm text-[#0e48fe] space-y-1 list-decimal list-inside leading-relaxed">
              <li>Abra o aplicativo do seu banco</li>
              <li>Escolha pagar com PIX</li>
              <li>Escaneie o QR Code ou copie e cole o código acima</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>


          {/* Informações do banco/chave PIX */}
          <div className="flex flex-col items-center mt-2 mb-2">
            <span className="text-xs text-gray-500">Pagamento para:</span>
            <span className="text-xs font-semibold text-gray-800 text-center">SpeakUp English School</span>
            <span className="text-xs text-gray-500 mt-1">Chave PIX:</span>
            <span className="text-xs font-mono text-[#0e48fe] break-all text-center">ruan@speakupcataguases.com</span>
          </div>

          {/* Rodapé */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <p className="font-medium">SpeakUp English School</p>
            <p className="text-[10px] mt-1">Dúvidas? Fale conosco pelo WhatsApp ou e-mail</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentLink;
