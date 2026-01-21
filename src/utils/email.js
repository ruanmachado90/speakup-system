// src/utils/email.js
import emailjs from '@emailjs/browser';

export function enviarContratoPorEmail({
  aluno_nome,
  responsavel_nome,
  contrato_html,
  destinatario = 'seu-email@dominio.com',
}) {
  return emailjs.send(
    'service_oy82swm',
    'template_b19mk5e',
    {
      aluno_nome,
      responsavel_nome,
      contrato_html,
      destinatario,
    },
    'mzhJreGSIzRzd5BkP'
  );
}
