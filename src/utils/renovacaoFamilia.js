/**
 * Página da família `/renovar/:codigo` (etapa 4 do docs/rematricula/PLANO.md).
 * Puro: situação do link, opções de plano, validação das escolhas e os
 * documentos gravados juntos (resposta do convite + contrato do ano).
 *
 * A página MOSTRA os valores; quem grava as parcelas é a efetivação (etapa 5),
 * que recalcula tudo. As regras do Firestore conferem o que a página grava.
 */
import { STATUS, opcoesDePlano, datasDosPagamentos, planoDaCampanha, diaEmBrasilia } from './renovacao';
import { soDigitos } from './matricula';
import { urlWhatsApp } from './renovacaoEnvio';
import { PAGINA_FAMILIA_PADRAO } from '../config/renovacao';

const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ── Textos da página ───────────────────────────────────────────────────────

/** Textos da página com o padrão por baixo (campo vazio usa o padrão). */
export function paginaDaFamilia(campanha) {
  const salvos = campanha?.paginaFamilia || {};
  return Object.fromEntries(Object.entries(PAGINA_FAMILIA_PADRAO).map(([k, v]) => [k, String(salvos[k] ?? '').trim() || v]));
}

/** As condições do desconto de renovação, na ordem da carta (lista vazia sem o desconto). */
export function condicoesDoDesconto(campanha) {
  const noPrazo = campanha.descontoRenovacaoNoPrazo;
  if (!(noPrazo?.pct > 0)) return [];
  const ate = noPrazo.respostaAte || campanha.encerramento;
  return [
    noPrazo.exigeEmDia !== false && `Estar em dia com as mensalidades de ${campanha.anoLetivo - 1}.`,
    ate ? `Renovar por este link até ${dataBR(ate)}.` : 'Renovar por este link dentro do prazo da campanha.',
    noPrazo.primeiraParcelaPagaAte && `Pagar a 1ª mensalidade até ${dataBR(noPrazo.primeiraParcelaPagaAte)}.`,
  ].filter(Boolean);
}

/**
 * "Com x sem renovação antecipada" no plano do desconto (12x): o valor de
 * cada pagamento com o desconto, o cheio e a economia no ano. null se o
 * desconto não estiver em nenhum plano oferecido.
 */
export function comparativoAntecipada(calculo, campanha) {
  const ids = campanha.descontoRenovacaoNoPrazo?.planos || [];
  const o = calculo.opcoes.find((x) => ids.includes(x.planoId) && x.desconto?.id === 'renovacao_no_prazo');
  if (!o) return null;
  const cheio = Math.round(o.bruto / o.pagamentos);
  return { planoId: o.planoId, pagamentos: o.pagamentos, comDesconto: o.valorPagamento, cheio, economia: o.bruto - o.total };
}

/** Botão "Falar com a secretaria": WhatsApp com a mensagem já começada. */
export const whatsappDaSecretaria = (campanha, alunoNome) =>
  urlWhatsApp(paginaDaFamilia(campanha).whatsapp, `Olá! Tenho uma dúvida sobre a renovação de matrícula${alunoNome ? ` de ${alunoNome}` : ''}.`);

// ── Situação do link ───────────────────────────────────────────────────────

const RESPONDIDOS = [STATUS.RESPONDIDA, STATUS.AGUARDANDO, STATUS.EFETIVADA];
const ABERTOS = [STATUS.GERADA, STATUS.ENVIADA, STATUS.ABERTA];

/**
 * O que a página mostra para este link:
 * 'invalido' | 'respondido' | 'indisponivel' | 'fechada' | 'aberto'.
 * Quem já respondeu vê o comprovante mesmo com a campanha encerrada.
 */
export function situacaoDoLink({ convite, campanha, hoje = diaEmBrasilia(Date.now()) }) {
  if (!convite || !campanha) return 'invalido';
  if (RESPONDIDOS.includes(convite.status)) return 'respondido';
  if (!ABERTOS.includes(convite.status)) return 'indisponivel';
  if (campanha.status !== 'aberta') return 'fechada';
  if (campanha.encerramento && hoje > campanha.encerramento) return 'fechada';
  return 'aberto';
}

/** Marca "aberto pela família" só na primeira visita (gerado ou enviado). */
export const deveMarcarAberto = (convite) => [STATUS.GERADA, STATUS.ENVIADA].includes(convite?.status);

// ── Opções e escolhas ──────────────────────────────────────────────────────

/**
 * Planos já calculados para este convite, como se respondesse agora.
 * `respondidaEm` em ms; a efetivação usa o horário gravado pelo servidor.
 */
export function opcoesDoConvite({ convite, campanha, respondidaEm = Date.now() }) {
  return opcoesDePlano({
    campanha,
    mensalidadeBaseCentavos: convite.mensalidadeBaseCentavos,
    respondidaEm,
    irmao: Boolean(convite.descontoIrmao),
  });
}

/** Vencimentos do plano escolhido no ano letivo ("YYYY-MM-DD"). */
export function vencimentosDaEscolha({ campanha, planoId, dia }) {
  if (!planoId || !dia) return [];
  return datasDosPagamentos({ ano: campanha.anoLetivo, meses: planoDaCampanha(campanha, planoId).meses, dia });
}

/** CPF válido (dígitos verificadores). */
export function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    const soma = [...d.slice(0, n)].reduce((s, c, i) => s + Number(c) * (n + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/** Erros das escolhas e da assinatura (lista vazia = pode enviar). */
export function validarEscolha({ planoId, formaPagamento, diaVencimento, nome, cpf, aceite, email }, campanha) {
  const erros = [];
  if (!(campanha.planos || []).some((p) => p.id === planoId)) erros.push('Escolha o plano.');
  if (!(campanha.formasPagamento || []).includes(formaPagamento)) erros.push('Escolha a forma de pagamento.');
  if (!(campanha.diasVencimento || []).includes(Number(diaVencimento))) erros.push('Escolha o dia de vencimento.');
  const n = String(nome || '').trim();
  if (n.length < 3 || !n.includes(' ')) erros.push('Informe o nome completo de quem assina.');
  if (!cpfValido(cpf)) erros.push('Informe um CPF válido.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) erros.push('O e-mail parece incompleto.');
  if (!aceite) erros.push('Marque que leu e concorda com o contrato.');
  return erros;
}

// ── Documentos gravados ────────────────────────────────────────────────────

/** A resposta do convite (sem `respondidaEm`: quem grava põe o horário do servidor). */
export const montarResposta = ({ planoId, formaPagamento, diaVencimento }) => ({
  planoId,
  formaPagamento,
  diaVencimento: Number(diaVencimento),
  canal: 'link',
});

/** Id do contrato do ano: o de 2026 continua sendo `contratos/{studentId}`. */
export const idContratoDoAno = (studentId, anoLetivo) => `${studentId}_${anoLetivo}`;

/**
 * Contrato do ano, gravado junto com a resposta. Leva os valores mostrados
 * à família no momento da assinatura (para o PDF e para conferência na
 * efetivação, que recalcula).
 */
export function montarContratoRenovacao({ convite, campanha, escolha, opcao, vencimentos, assinatura }) {
  const plano = planoDaCampanha(campanha, escolha.planoId);
  return {
    nome: assinatura.nome.trim(),
    cpf: soDigitos(assinatura.cpf),
    timestamp: assinatura.timestamp,
    ip: assinatura.ip || '',
    alunoId: convite.studentId,
    alunoNome: convite.alunoNome,
    anoLetivo: convite.anoLetivo,
    renovacaoId: convite.codigo,
    cursoAtual: convite.cursoAtual || '',
    planoId: plano.id,
    planoRotulo: plano.rotulo,
    formaPagamento: escolha.formaPagamento,
    diaVencimento: Number(escolha.diaVencimento),
    mensalidadeCentavos: opcao.mensalidade,
    pagamentos: opcao.pagamentos,
    valorPagamentoCentavos: opcao.valorPagamento,
    totalCentavos: opcao.total,
    desconto: opcao.desconto
      ? { id: opcao.desconto.id, nome: opcao.desconto.nome, pct: opcao.desconto.pct, condicao: opcao.desconto.condicao ?? null }
      : null,
    vencimentos,
  };
}

/** Carimbo da assinatura no horário de Brasília (mesmo formato do contrato atual). */
export const carimboDeAssinatura = (agora = new Date()) =>
  `${agora.toLocaleString('pt-BR', { hour12: false, timeZone: 'America/Sao_Paulo' })} (BRT)`;
