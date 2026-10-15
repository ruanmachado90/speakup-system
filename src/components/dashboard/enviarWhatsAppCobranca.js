import { telefoneDeEnvio } from '../../utils/renovacao';
import { urlWhatsApp } from '../../utils/renovacaoEnvio';

/**
 * Abre o WhatsApp com a mensagem de cobrança já montada.
 * Usado tanto pelo card "Vencimentos" quanto pelo detalhe de "Cobranças vencidas".
 */
export const enviarWhatsAppCobranca = (payment, students) => {
  const student = students.find(s => s.id === payment.studentId);
  const paymentLink = `${window.location.origin}/pagamento/${payment.id}`;
  const nome = student?.responsibleName || payment.studentName || 'Cliente';
  const valor = Number(payment.valuePlanned || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dVenc = new Date(payment.dueDate);
  const dataFmt = dVenc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const dias = Math.ceil((dVenc - new Date()) / 86400000);
  const diasTexto =
    dias === 0 ? 'vence hoje' :
    dias < 0 ? `venceu ha ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}` :
    `daqui a ${dias} dia${dias !== 1 ? 's' : ''}`;
  const statusMsg =
    dias === 0 ? 'Cobranca vence hoje' :
    dias < 0 ? 'Cobranca em atraso' :
    'Lembrete de cobranca';
  const descricao = payment.description || 'Mensalidade - SpeakUp English School';
  let pixInfo = '';
  if (payment.pixCode) pixInfo += `\n\n*PIX Copia e Cola:*\n${payment.pixCode}`;
  if (payment.pixQRCode) pixInfo += `\n\n*QR Code PIX disponivel no link acima.*`;
  const msg = `*${statusMsg}*\n\nOla, ${nome}\n\nLembramos que a sua cobranca no valor de *${valor}* ${diasTexto} (${dataFmt}).\n\n*Descricao:* ${descricao}\n\nClique no link abaixo para visualizar a cobranca:\n${paymentLink}${pixInfo}\n\nAtenciosamente,\n*Equipe SpeakUp*`;
  // Os campos do cadastro são responsibleContact/contact (responsiblePhone e
  // phone não existem, e a mensagem sempre abria sem destinatário).
  window.open(urlWhatsApp(telefoneDeEnvio(student), msg), '_blank');
};
