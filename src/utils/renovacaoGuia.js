/**
 * Aba "Como funciona" da renovação (docs/rematricula/PLANO_COMO_FUNCIONA.md).
 * Puro: valores da campanha para o texto do guia, etapa do dia e checklist.
 * O texto em si fica em content/renovacaoGuia.js.
 */
import { diaEmBrasilia } from './renovacao';
import { MENSAGEM_PADRAO } from './renovacaoEnvio';

const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : null);
const pct = (n) => `${String(n).replace('.', ',')}%`;

/** "a, b ou c" (null se a lista estiver vazia). */
export function listaPorExtenso(itens = [], conector = 'ou') {
  const xs = itens.map(String).filter(Boolean);
  if (!xs.length) return null;
  return xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} ${conector} ${xs[xs.length - 1]}`;
}

/** Soma `dias` a uma data "YYYY-MM-DD" (sem fuso: só o calendário). */
export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Descontos configurados, em frases. Nenhum acumula: vale o maior. */
export function descontosDaCampanha(campanha) {
  const linhas = [];
  const prazo = campanha.descontoRenovacaoNoPrazo;
  if (prazo?.pct > 0) {
    const ate = dataBR(prazo.respostaAte || campanha.encerramento);
    const planos = (prazo.planos || [])
      .map((id) => campanha.planos?.find((p) => p.id === id)?.rotulo || id);
    const pago = dataBR(prazo.primeiraParcelaPagaAte);
    linhas.push(`Renovação no prazo: ${pct(prazo.pct)}${planos.length ? ` em ${listaPorExtenso(planos)}` : ''}`
      + `${ate ? `, para quem concluir até ${ate}` : ''}${pago ? ` e pagar a 1ª mensalidade até ${pago}` : ''}`
      + `${prazo.exigeEmDia !== false && campanha.anoLetivo ? `, estando em dia com as mensalidades de ${campanha.anoLetivo - 1}` : ''}`);
  }
  (campanha.planos || []).filter((p) => p.descontoPct > 0)
    .forEach((p) => linhas.push(`${p.rotulo}: ${pct(p.descontoPct)}`));
  if (campanha.descontoIrmao?.pct > 0) linhas.push(`Irmão: ${pct(campanha.descontoIrmao.pct)}`);
  return linhas;
}

/**
 * Valores que o texto do guia usa, lidos da campanha salva. `null` = ainda
 * não configurado (a tela mostra "A definir").
 */
export function variaveisDaCampanha(campanha) {
  const descontos = descontosDaCampanha(campanha);
  const prazo = campanha.descontoRenovacaoNoPrazo || {};
  return {
    ano: campanha.anoLetivo ? String(campanha.anoLetivo) : null,
    anoAtual: campanha.anoLetivo ? String(campanha.anoLetivo - 1) : null,
    abertura: dataBR(campanha.abertura),
    encerramento: dataBR(campanha.encerramento),
    fimBeneficio: dataBR(prazo.respostaAte || campanha.encerramento),
    pagamentoBeneficio: dataBR(prazo.primeiraParcelaPagaAte),
    reajuste: Number.isFinite(campanha.reajustePct) ? pct(campanha.reajustePct) : null,
    beneficios: descontos.length ? `${descontos.join('; ')}. Os descontos não se somam: vale o maior.` : null,
    planos: listaPorExtenso((campanha.planos || []).map((p) => p.rotulo), 'e'),
    formas: listaPorExtenso(campanha.formasPagamento),
    diasVencimento: listaPorExtenso(campanha.diasVencimento),
  };
}

const VARIAVEL = /\{(\w+)\}|\*\*(.+?)\*\*/g;

/**
 * Quebra um texto do guia em partes para a tela:
 * { texto } | { negrito } | { variavel, valor } (valor null = "A definir")
 * | { campoAluno } para as variáveis que não são da campanha ({aluno} etc.).
 */
export function partesDoTexto(texto, vars) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(VARIAVEL)) {
    if (m.index > ultimo) partes.push({ texto: texto.slice(ultimo, m.index) });
    if (m[2] !== undefined) partes.push({ negrito: m[2] });
    else if (m[1] in vars) partes.push({ variavel: m[1], valor: vars[m[1]] });
    else partes.push({ campoAluno: m[1] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo) });
  return partes;
}

/**
 * Texto para o botão "Copiar": variáveis da campanha preenchidas, as do
 * aluno mantidas entre chaves para a secretaria completar.
 */
export function textoParaCopiar(texto, vars) {
  return partesDoTexto(texto, vars).map((p) => {
    if ('texto' in p) return p.texto;
    if ('negrito' in p) return p.negrito;
    if ('variavel' in p) return p.valor ?? '[a definir]';
    return `{${p.campoAluno}}`;
  }).join('');
}

/**
 * Modelo do convite no formato do guia: o texto salvo na campanha usa
 * {alunos}/{prazo}/{links}; aqui viram {aluno}/{encerramento}/{link}.
 */
export function modeloConvite(campanha) {
  return (campanha.mensagemWhatsApp || MENSAGEM_PADRAO)
    .replaceAll('{alunos}', '{aluno}')
    .replaceAll('{prazo}', '{encerramento}')
    .replaceAll('{links}', '{link}');
}

export const DIAS_DE_ENVIO = 7; // "abertura e dias seguintes"

/**
 * Etapa da campanha no dia `hoje` ("YYYY-MM-DD", horário de Brasília).
 * Sem datas configuradas, a campanha está em preparação.
 */
export function etapaAtual(campanha, hoje = diaEmBrasilia(Date.now())) {
  const { abertura, encerramento, anoLetivo } = campanha;
  if (anoLetivo && hoje >= `${anoLetivo}-01-01`) return 'virada';
  if (!abertura || hoje < abertura) return 'preparacao';
  if (encerramento && hoje >= encerramento) return 'encerramento';
  if (hoje < somarDias(abertura, DIAS_DE_ENVIO)) return 'envio';
  return 'acompanhamento';
}

/** Quantos itens do checklist estão marcados (só conta os que existem na lista). */
export function progressoChecklist(itens, checklist = {}) {
  const feitos = itens.filter((i) => checklist[i.id]?.feito).length;
  return { feitos, total: itens.length };
}
