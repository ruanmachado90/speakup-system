// src/utils/email.js
import emailjs from '@emailjs/browser';

// IDs do EmailJS ficam em variáveis de ambiente (.env, fora do git) só por
// higiene de configuração — em uma SPA eles sempre acabam no bundle final,
// então a proteção real contra abuso é restringir os domínios permitidos
// (Allowed Origins) no painel do EmailJS, não escondê-los aqui.
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_oy82swm';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_b19mk5e';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'mzhJreGSIzRzd5BkP';

export function enviarContratoPorEmail({
  aluno_nome,
  responsavel_nome,
  contrato_html,
  destinatario = 'seu-email@dominio.com',
  recaptchaToken,
}) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      aluno_nome,
      responsavel_nome,
      contrato_html,
      destinatario,
      'g-recaptcha-response': recaptchaToken,
    },
    PUBLIC_KEY
  );
}
