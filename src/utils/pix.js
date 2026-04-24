// Utilitário para gerar payload PIX (copia e cola)
// Implementação baseada na especificação do PIX do Banco Central

/**
 * Calcula o CRC16-CCITT para validação do código PIX
 */
function calculateCRC16(payload) {
  const polynomial = 0x1021;
  let crc = 0xFFFF;
  
  if (typeof payload !== 'string') {
    payload = payload.toString();
  }
  
  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= (byte << 8);
    
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  crc = crc & 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo PIX no formato ID + Tamanho + Valor
 */
function formatPixField(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Gera o payload PIX (BR Code) para pagamento estático
 */
export function gerarPixPayload({
  chave,
  valor,
  nome,
  cidade = 'Cataguases',
  descricao = '',
}) {
  try {
    // Validações básicas
    if (!chave) throw new Error('Chave PIX obrigatória');
    if (!valor || valor <= 0) throw new Error('Valor deve ser maior que zero');
    
    // Normalizar dados
    const merchantName = (nome || 'SPEAKUP SCHOOL').substring(0, 25);
    const merchantCity = cidade.substring(0, 15);
    const pixKey = chave.trim();
    const transactionAmount = valor.toFixed(2);
    
    // Payload Indicator Format (ID 00)
    let payload = formatPixField('00', '01');
    
    // Merchant Account Information (ID 26 - PIX)
    let merchantAccount = formatPixField('00', 'BR.GOV.BCB.PIX'); // GUI
    merchantAccount += formatPixField('01', pixKey); // Chave PIX
    if (descricao) {
      merchantAccount += formatPixField('02', descricao.substring(0, 72)); // Descrição
    }
    payload += formatPixField('26', merchantAccount);
    
    // Merchant Category Code (ID 52)
    payload += formatPixField('52', '0000');
    
    // Transaction Currency (ID 53) - BRL = 986
    payload += formatPixField('53', '986');
    
    // Transaction Amount (ID 54)
    payload += formatPixField('54', transactionAmount);
    
    // Country Code (ID 58) - Brasil = BR
    payload += formatPixField('58', 'BR');
    
    // Merchant Name (ID 59)
    payload += formatPixField('59', merchantName);
    
    // Merchant City (ID 60)
    payload += formatPixField('60', merchantCity);
    
    // Additional Data Field Template (ID 62)
    let additionalData = formatPixField('05', '***'); // Reference Label
    payload += formatPixField('62', additionalData);
    
    // CRC16 (ID 63) - deve ser calculado com o campo vazio inicialmente
    payload += '6304';
    const crc = calculateCRC16(payload);
    payload += crc;
    
    return payload;
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    return '';
  }
}
