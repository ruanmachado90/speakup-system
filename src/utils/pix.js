// Utilitário para gerar payload PIX (copia e cola)
// Implementação baseada na especificação do PIX do Banco Central

/**
 * Remove acentos e caracteres não-ASCII.
 * Necessário porque o CRC16 e os tamanhos de campo do BR Code são
 * calculados sobre os bytes UTF-8 do payload: um nome/descrição com
 * acento (ex: "José", "Conceição") gera um CRC diferente do que o
 * app do banco recalcula ao ler o QR Code, e o pagamento é recusado.
 */
function removerAcentos(str) {
  return String(str)
    .normalize('NFD')
    // eslint-disable-next-line no-control-regex -- intervalo ASCII intencional, exigido pelo CRC16 do BR Code
    .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Tamanho em bytes UTF-8 (o BR Code exige o tamanho em bytes, não em
 * caracteres JS).
 */
function getByteLength(str) {
  return new TextEncoder().encode(str).length;
}

/**
 * Calcula o CRC16-CCITT para validação do código PIX.
 * Opera sobre os bytes UTF-8 do payload (não sobre code units UTF-16),
 * que é o que o app do banco valida.
 */
function calculateCRC16(payload) {
  const polynomial = 0x1021;
  let crc = 0xFFFF;
  const bytes = new TextEncoder().encode(payload);

  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] << 8);

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
  const length = getByteLength(value).toString().padStart(2, '0');
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
    const valorNum = Number(String(valor).replace(',', '.'));
    if (!valorNum || valorNum <= 0) throw new Error('Valor deve ser maior que zero');

    // Normalizar dados (ASCII, maiúsculo) — evita CRC inválido por acentos
    const pixKey = chave.trim();
    const merchantName = (removerAcentos(nome || 'SPEAKUP SCHOOL').toUpperCase().trim() || 'SPEAKUP SCHOOL').substring(0, 25);
    const merchantCity = (removerAcentos(cidade).toUpperCase().trim() || 'CATAGUASES').substring(0, 15);
    const transactionAmount = valorNum.toFixed(2);

    // Payload Indicator Format (ID 00)
    let payload = formatPixField('00', '01');

    // Merchant Account Information (ID 26 - PIX)
    let merchantAccount = formatPixField('00', 'BR.GOV.BCB.PIX'); // GUI
    merchantAccount += formatPixField('01', pixKey); // Chave PIX

    if (descricao) {
      // O campo 26 (Merchant Account Information) não pode passar de 99
      // bytes no total. Se a descrição estourar esse limite, o tamanho do
      // campo vira 3 dígitos e todo o BR Code fica malformado. Por isso a
      // descrição é truncada dinamicamente ao espaço restante.
      const usedBytes = getByteLength(merchantAccount);
      const maxDescBytes = 99 - usedBytes - 4; // 4 = ID(2) + tamanho(2) do campo 02
      if (maxDescBytes > 0) {
        let desc = removerAcentos(descricao).substring(0, 72);
        while (getByteLength(desc) > maxDescBytes && desc.length > 0) {
          desc = desc.substring(0, desc.length - 1);
        }
        if (desc) {
          merchantAccount += formatPixField('02', desc); // Descrição
        }
      }
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
