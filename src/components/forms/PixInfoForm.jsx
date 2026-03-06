import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const PixInfoForm = ({ isOpen, onClose, onSave, payment }) => {
  const [pixQRCode, setPixQRCode] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Atualizar campos quando payment mudar
  useEffect(() => {
    if (payment) {
      setPixQRCode(payment.pixQRCode || '');
      setPixCode(payment.pixCode || '');
    }
  }, [payment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!pixQRCode.trim()) {
      setError('Por favor, insira a URL da imagem do QR Code');
      return;
    }

    if (!pixCode.trim()) {
      setError('Por favor, insira o código PIX');
      return;
    }

    // Validar se é uma URL válida
    try {
      new URL(pixQRCode);
    } catch {
      setError('URL do QR Code inválida');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        pixQRCode: pixQRCode.trim(),
        pixCode: pixCode.trim()
      });
      
      // Não limpar campos nem fechar aqui - o pai (Finance.jsx) controla o fechamento
      // Se houver erro no pai, os dados permanecem para nova tentativa
    } catch (err) {
      console.error('Erro ao salvar informações PIX:', err);
      setError(err.message || 'Erro ao salvar informações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPixQRCode('');
      setPixCode('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Configurar Informações PIX</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Informações do Pagamento */}
            {payment ? (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Pagamento</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Aluno:</span> {payment?.studentName || 'N/A'}</p>
                    <p><span className="font-medium">Valor:</span> R$ {Number(payment?.valuePlanned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {payment?.dueDate && (
                      <p><span className="font-medium">Vencimento:</span> {new Date(payment.dueDate).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                {/* URL do QR Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL da Imagem do QR Code PIX *
                  </label>
                  <input
                    type="url"
                    value={pixQRCode}
                    onChange={(e) => setPixQRCode(e.target.value)}
                    placeholder="https://exemplo.com/qrcode.png"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={loading}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cole a URL da imagem do QR Code gerado pelo seu banco
                  </p>
                </div>

                {/* Código PIX Copia e Cola */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código PIX Copia e Cola *
                  </label>
                  <textarea
                    value={pixCode}
                    onChange={(e) => setPixCode(e.target.value)}
                    placeholder="Cole aqui o código PIX gerado pelo seu banco..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                    disabled={loading}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cole o código PIX completo (geralmente começa com números e letras aleatórios)
                  </p>
                </div>

                {/* Preview do QR Code se houver URL */}
                {pixQRCode && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview do QR Code:</h4>
                    <div className="flex justify-center">
                      <img 
                        src={pixQRCode} 
                        alt="Preview QR Code" 
                        className="w-48 h-48 object-contain border border-gray-200 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          setError('Não foi possível carregar a imagem. Verifique a URL.');
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar e Gerar Link'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="font-semibold">Erro: Nenhum pagamento selecionado</p>
                <p className="text-sm mt-1">Feche esta janela e tente novamente clicando no ícone de engrenagem ao lado do pagamento.</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PixInfoForm;
