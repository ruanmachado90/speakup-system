import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const PixInfoForm = ({ isOpen, onClose, onSave, payment, isSaving = false }) => {
  const [pixQRCode, setPixQRCode] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState(false);

  // Atualizar campos quando payment mudar
  useEffect(() => {
    if (payment) {
      setPixQRCode(payment.pixQRCode || '');
      setPixCode(payment.pixCode || '');
    }
  }, [payment]);

  // Resetar erro de preview quando URL mudar
  useEffect(() => {
    setPreviewError(false);
  }, [pixQRCode]);

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
      const url = new URL(pixQRCode);
      // Verificar se é HTTPS
      if (url.protocol !== 'https:') {
        setError('A URL deve usar HTTPS para maior segurança');
        return;
      }
      // Verificar se parece ser uma URL de imagem
      const pathname = url.pathname.toLowerCase();
      const isImageUrl = pathname.endsWith('.png') || 
                         pathname.endsWith('.jpg') || 
                         pathname.endsWith('.jpeg') || 
                         pathname.endsWith('.gif') || 
                         pathname.endsWith('.webp') ||
                         pathname.includes('image');
      
    } catch {
      setError('URL do QR Code inválida. Certifique-se de incluir https://');
      return;
    }

    setError('');

    try {
      // Testar se a imagem realmente carrega antes de salvar
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve();
        };
        img.onerror = () => {
          reject(new Error('Não foi possível carregar a imagem do QR Code. Verifique se a URL está correta e acessível.'));
        };
        // Timeout de 10 segundos
        setTimeout(() => reject(new Error('Tempo esgotado ao carregar imagem. Verifique sua conexão.')), 10000);
        img.src = pixQRCode.trim();
      });

      await onSave({
        pixQRCode: pixQRCode.trim(),
        pixCode: pixCode.trim()
      });
      
      // Não limpar campos nem fechar aqui - o pai (Finance.jsx) controla o fechamento
      // Se houver erro no pai, os dados permanecem para nova tentativa
    } catch (err) {
      setError(err.message || 'Erro ao salvar informações. Tente novamente.');
    }
  };

  const handleClose = () => {
    if (!isSaving) {
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
            disabled={isSaving}
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
                      <p><span className="font-medium">Vencimento:</span> {formatDate(payment.dueDate)}</p>
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
                    disabled={isSaving}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cole a URL pública da imagem do QR Code. A imagem deve estar hospedada online e ser acessível publicamente.
                  </p>
                  <p className="mt-1 text-xs text-orange-600">
                    ⚠️ Certifique-se de que a URL começa com https:// e aponta diretamente para uma imagem (.png, .jpg, .jpeg)
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
                    disabled={isSaving}
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
                      {!previewError ? (
                        <img 
                          src={pixQRCode} 
                          alt="Preview QR Code" 
                          className="w-48 h-48 object-contain border border-gray-200 rounded"
                          onLoad={() => {}}
                          onError={(e) => {
                            setPreviewError(true);
                            setError('Não foi possível carregar a imagem. Verifique se a URL é válida e pública.');
                          }}
                        />
                      ) : (
                        <div className="w-48 h-48 border-2 border-dashed border-red-300 rounded flex items-center justify-center">
                          <div className="text-center p-4">
                            <p className="text-red-600 text-sm mb-1">⚠️</p>
                            <p className="text-red-600 text-xs">Erro ao carregar</p>
                            <p className="text-gray-500 text-xs mt-1">Verifique a URL</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
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
