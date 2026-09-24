import { paraISODia } from './matricula';

/**
 * Dados gravados ao dar baixa numa parcela. Função pura (testável) usada pelo
 * savePayment. Devolve { erro } ou { dados }.
 *
 * - Data padrão = hoje no fuso local. Antes usava toISOString (UTC): baixa
 *   registrada depois das 21h saía com a data do dia seguinte.
 * - `paidAt` (quando a baixa foi feita) só é gravado na primeira baixa; editar
 *   um pagamento não muda o mês em que ele entrou.
 * - Parcela cancelada não recebe baixa.
 */
export function montarBaixa(parcela, { valuePaid, paymentDate, paymentMethod, bank }, agora = new Date()) {
  if (parcela?.status === 'cancelada') {
    return { erro: 'Esta parcela foi cancelada junto com a matrícula. Reative a matrícula ou lance uma nova cobrança.' };
  }
  const valor = Number(String(valuePaid ?? '').replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) return { erro: 'Informe um valor válido' };

  const dados = {
    status: 'Pago',
    valuePaid: Math.round(valor * 100) / 100,
    paymentDate: paymentDate || paraISODia(agora),
    paymentMethod: paymentMethod || 'PIX',
    bank: bank || 'Asaas',
  };
  if (!parcela?.paidAt) dados.paidAt = agora.getTime();
  return { dados };
}
