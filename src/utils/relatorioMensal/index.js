/**
 * Relatório mensal / trimestral da SpeakUp em PDF (A4 paisagem, formato slides).
 *
 * Estrutura fixa (pedido do Ruan, 11/09/2026) — sem anexos:
 *  S1  Capa (só a capa)
 *  S2  Visão geral — previsto, realizado, atrasados, taxa de inadimplência,
 *      lucro, margem, índice de saúde do negócio + alertas
 *  S3  Retenção — ativos, novas matrículas, cancelamentos, churn + alertas
 *  S4  Alunos por professor / curso — nº de alunos e renda, nas 2 dimensões
 *  S5  Despesas — por categoria, evolução, pontos de melhoria + alertas
 *  S6  Cobranças & inadimplência — previstas/pagas/atrasadas + comparativo
 *  S7  Plano de ação
 */

import {
  montarRelatorioMensal,
  montarRelatorioTrimestral,
  rotuloMes,
  variacao as calcVariacao,
  despesaTotalNoMes,
  inadimplenciaDoMes,
  churnMensalPct,
  fimDoMes,
  inadimplenciaValor,
  planoDeAcao,
  pontosDeMelhoriaDespesas,
} from '../reportKPIs';
import { PARAMETROS_PADRAO } from '../../config/parametros';
import { criarDocumento, COR, PAGINA, LARGURA } from './documento';
import { graficoLinha, graficoBarrasH, graficoRosca } from './graficosCanvas';

// ───────────────── formatação ─────────────────

const NBSP = String.fromCharCode(160);
const semNbsp = (s) => String(s).split(NBSP).join(String.fromCharCode(32));
const fBRL = (v) => (v == null ? '—' : semNbsp(Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })));
const fBRLk = (n) => {
  const x = Number(n || 0);
  if (Math.abs(x) >= 1000) return `${(x / 1000).toFixed(Math.abs(x) >= 10000 ? 0 : 1)}k`;
  return `R$ ${Math.round(x)}`;
};
const fPct = (v, d = 1) => (v == null ? '—' : `${Number(v).toFixed(d)}%`);
const fInt = (v) => (v == null ? '—' : String(Math.round(Number(v))));

function kpi(label, res, fmt, { variacao, sufixo, menorEhMelhor } = {}) {
  const bruto = res && typeof res === 'object' && 'valor' in res ? res.valor : res;
  const disp = res && typeof res === 'object' && 'disponivel' in res ? res.disponivel : bruto != null;
  return { label, disponivel: disp, motivo: res && res.motivo, valorFmt: fmt(bruto), sufixo, menorEhMelhor, variacao };
}

function serieUltimosMeses(fn, mes, ano, n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(ano, mes - i, 1);
    out.push({ rotulo: rotuloMes(d.getMonth(), d.getFullYear()), valor: fn(d.getMonth(), d.getFullYear()) });
  }
  return out;
}

function subtitulo(doc, txt, x = PAGINA.margem) {
  doc.fonte('bold', 8.5).cor(COR.tinta).texto(txt, x, doc.y);
  doc.y += 5;
}

/** Alertas do relatório cujo título ou detalhe batem com o assunto do slide. */
function alertasSobre(R, re) {
  return (R.alertas || []).filter((a) => re.test(a.titulo) || re.test(a.detalhe));
}

/** Desenha até `limite` alertas empilhados a partir de doc.y. Avança doc.y. */
function blocoAlertas(doc, alertas, { limite = 3, vazio = 'Nenhum alerta nesta área.' } = {}) {
  const lista = (alertas || []).slice(0, limite);
  if (lista.length === 0) {
    doc.preenche(COR.painel).pdf.rect(PAGINA.margem, doc.y, LARGURA, 11, 'F');
    doc.fonte('normal', 8).cor(COR.cinza).texto(vazio, PAGINA.margem + 4, doc.y + 7);
    doc.y += 15;
    return;
  }
  lista.forEach((al) => {
    const cor = al.nivel === 'critico' ? COR.rosa : al.nivel === 'atencao' ? COR.laranja : COR.azul;
    const linhas = doc.pdf.splitTextToSize(semNbsp(al.detalhe), LARGURA - 12);
    const h = 8 + linhas.length * 3.4;
    doc.preenche(COR.painel).pdf.rect(PAGINA.margem, doc.y, LARGURA, h, 'F');
    doc.preenche(cor).pdf.rect(PAGINA.margem, doc.y, 1.6, h, 'F');
    doc.fonte('bold', 8).cor(cor).texto(al.titulo, PAGINA.margem + 5, doc.y + 5);
    doc.fonte('normal', 7).cor(COR.tinta);
    linhas.forEach((ln, i) => doc.texto(ln, PAGINA.margem + 5, doc.y + 9 + i * 3.4));
    doc.y += h + 3;
  });
}

/** Alertas na METADE direita da largura (colD/xD), pra ficar lado a lado com outro bloco. */
function blocoAlertasColuna(doc, alertas, x, w, { limite = 2, vazio = 'Nenhum alerta nesta área.' } = {}) {
  const lista = (alertas || []).slice(0, limite);
  if (lista.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto(vazio, x, doc.y + 2);
    return;
  }
  const yInicial = doc.y;
  lista.forEach((al) => {
    const cor = al.nivel === 'critico' ? COR.rosa : al.nivel === 'atencao' ? COR.laranja : COR.azul;
    const linhas = doc.pdf.splitTextToSize(semNbsp(al.detalhe), w - 10);
    const h = 7 + linhas.length * 3.2;
    doc.preenche(COR.painel).pdf.rect(x, doc.y, w, h, 'F');
    doc.preenche(cor).pdf.rect(x, doc.y, 1.4, h, 'F');
    doc.fonte('bold', 7).cor(cor).texto(al.titulo, x + 4, doc.y + 4.5);
    doc.fonte('normal', 6.5).cor(COR.tinta);
    linhas.forEach((ln, i) => doc.texto(ln, x + 4, doc.y + 8 + i * 3.2));
    doc.y += h + 2.5;
  });
  doc._yFinalColuna = doc.y;
  doc.y = yInicial;
}

// ───────────────── API ─────────────────

export async function gerarRelatorioMensalPDF(dados) {
  const params = { ...PARAMETROS_PADRAO, ...(dados.params || {}) };
  const {
    students = [], payments = [], expenses = [], leads = [], turmas = [], vendas = [],
    saldosBancarios = [], mes, ano,
  } = dados;

  const R = montarRelatorioMensal({ students, payments, expenses, leads, turmas, vendas, saldosBancarios, mes, ano, params });
  const plano = planoDeAcao(R, params);
  const pontosDespesas = pontosDeMelhoriaDespesas(R);

  const doc = await criarDocumento();
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  doc.rodapeTexto = `Relatório mensal · ${R.periodo.rotulo} · SpeakUp English Language Academy · gerado em ${geradoEm}`;

  await construirRelatorio(doc, R, {
    tipo: 'mensal', titulo: 'Relatório mensal', params, plano, pontosDespesas,
    ctx: { students, payments, expenses }, mesRef: mes, anoRef: ano,
  });

  const nome = `Relatorio-Mensal-SpeakUp-${R.periodo.rotulo.replace('/', '-')}.pdf`;
  if (dados.retornarBlob) return doc.blob();
  return doc.finalizar(nome);
}

export async function gerarRelatorioTrimestralPDF(dados) {
  const params = { ...PARAMETROS_PADRAO, ...(dados.params || {}) };
  const {
    students = [], payments = [], expenses = [], leads = [], turmas = [], vendas = [],
    saldosBancarios = [], trimestre, ano,
  } = dados;

  const R = montarRelatorioTrimestral({ students, payments, expenses, leads, turmas, vendas, saldosBancarios, trimestre, ano, params });
  const mesFim = trimestre * 3 + 2;
  const plano = planoDeAcao(R, params);
  const pontosDespesas = pontosDeMelhoriaDespesas(R);

  const doc = await criarDocumento();
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  doc.rodapeTexto = `Relatório trimestral · ${R.periodo.rotulo} · SpeakUp English Language Academy · gerado em ${geradoEm}`;

  await construirRelatorio(doc, R, {
    tipo: 'trimestral', titulo: 'Relatório trimestral', params, plano, pontosDespesas,
    ctx: { students, payments, expenses }, mesRef: mesFim, anoRef: ano,
  });

  const nome = `Relatorio-Trimestral-SpeakUp-${R.periodo.rotulo.replace(/[º\s]/g, '').replace(/\//g, '-')}.pdf`;
  if (dados.retornarBlob) return doc.blob();
  return doc.finalizar(nome);
}

async function construirRelatorio(doc, R, opts) {
  doc.vsLabel = opts.tipo === 'trimestral' ? 'vs. tri. ant.' : 'vs. mês ant.';
  slideCapa(doc, R, opts.titulo);
  slideVisaoGeral(doc, R, opts);
  await slideRetencao(doc, R, opts);
  await slideAlunosPorProfessorCurso(doc, R, opts);
  await slideDespesas(doc, R, opts);
  await slideCobrancas(doc, R, opts);
  slidePlanoAcao(doc, R, opts.plano);
}

function abrirSlide(doc, titulo, opts) {
  doc.slide(titulo, { ...opts, primeiro: false });
}

// ───────────────── S1 · Capa (só a capa) ─────────────────

function slideCapa(doc, R, titulo = 'Relatório mensal') {
  const { margem } = PAGINA;
  if (doc.logo) {
    try { doc.pdf.addImage(doc.logo, 'PNG', margem, 60, 60, 60 * (204 / 943)); } catch { /* sem logo */ }
  }
  doc.fonte('bold', 9).cor(COR.cinza).texto('SPEAKUP ENGLISH LANGUAGE ACADEMY', margem, 105, { charSpace: 0.6 });
  doc.fonte('bold', 40).cor(COR.tinta).texto(titulo, margem, 130);
  doc.fonte('normal', 16).cor(COR.azul).texto(R.periodo.faixa ? `${R.periodo.rotulo} · ${R.periodo.faixa}` : R.periodo.rotulo, margem, 142);
  doc.fonte('normal', 8).cor(COR.cinzaClaro).texto('Relatório gerencial — visão de slides (A4 paisagem)', margem, 175);
}

// ───────────────── S2 · Visão geral ─────────────────

function slideVisaoGeral(doc, R, opts) {
  const { params } = opts;
  const per = opts.tipo === 'trimestral' ? 'trimestre' : 'mês';
  const vsLabel = opts.tipo === 'trimestral' ? 'vs. trimestre anterior' : 'vs. mês anterior';
  const a = R.atual;
  const v = R.variacoes;
  abrirSlide(doc, 'Visão geral', { subtitulo: `${R.periodo.rotulo} — indicadores-chave (variação ${vsLabel})` });

  const varPrevisto = calcVariacao(a.cobrancas.previsto, R.anterior.cobrancas.previsto);
  const varAtrasadoValor = calcVariacao(a.inadimplenciaMes.valor, R.anterior.inadimplenciaMes.valor);

  doc.fileiraCards([
    kpi('Previsto', a.cobrancas.previsto, fBRL, { variacao: varPrevisto, sufixo: `${a.cobrancas.emitidas} cobrança(s)` }),
    kpi('Realizado', a.receitaRecebida, fBRL, { variacao: v.receitaRecebida.vsMesAnterior, sufixo: `${a.cobrancas.pagasCount} paga(s)` }),
    kpi('Atrasados', a.inadimplenciaMes.valor, fBRL, { variacao: varAtrasadoValor, menorEhMelhor: true, sufixo: `${a.cobrancas.atrasadasCount} parcela(s)` }),
    kpi(`Taxa de inadimplência (${per})`, { valor: a.inadimplenciaMes.pct, disponivel: a.inadimplenciaMes.disponivel }, (x) => fPct(x), { variacao: v.inadimplenciaMes.vsMesAnterior, menorEhMelhor: true }),
  ], { h: 30 });

  doc.fileiraCards([
    kpi('Lucro operacional', a.lucroOperacional, fBRL, { variacao: v.lucroOperacional.vsMesAnterior, sufixo: 'receita recebida − custo − imposto' }),
    kpi('Margem operacional', a.margemOperacional, (x) => fPct(x), { variacao: v.margemOperacional.vsMesAnterior }),
    { indiceSaude: R.indiceSaude },
  ], { h: 30 });

  subtitulo(doc, 'ALERTAS');
  blocoAlertas(doc, R.alertas, { limite: 2 });

  doc.fonte('normal', 6.5).cor(COR.cinzaClaro).texto(
    `Metas: churn até ${params.metaChurnPct}% · inadimplência até ${params.metaInadimplenciaPct}% · ocupação mínima ${params.metaOcupacaoPct}%`,
    PAGINA.margem, doc.y + 2, { maxWidth: LARGURA },
  );
}

// ───────────────── S3 · Retenção ─────────────────

async function slideRetencao(doc, R, opts) {
  const per = opts.tipo === 'trimestral' ? 'trimestre' : 'mês';
  const a = R.atual;
  const v = R.variacoes;
  abrirSlide(doc, 'Retenção', { subtitulo: 'Base ativa, entradas, saídas e churn — o negócio é o aluno' });

  doc.fileiraCards([
    kpi(`Alunos ativos`, a.alunosAtivos, fInt, { variacao: v.alunosAtivos.vsMesAnterior }),
    kpi('Novas matrículas', a.novasMatriculas, fInt, { variacao: v.novasMatriculas.vsMesAnterior }),
    kpi('Cancelamentos', a.cancelamentos, fInt, { variacao: v.cancelamentos.vsMesAnterior, menorEhMelhor: true }),
    kpi(`Churn no ${per}`, a.churnPct, (x) => fPct(x), { variacao: v.churnPct.vsMesAnterior, menorEhMelhor: true }),
  ], { h: 32 });

  subtitulo(doc, 'ALERTAS DE RETENÇÃO');
  blocoAlertas(doc, alertasSobre(R, /churn|retenç|cancelamento/i), { limite: 2, vazio: 'Churn dentro da meta — nenhum alerta de retenção.' });

  subtitulo(doc, 'Churn mensal (%) — últimos 6 meses');
  const sChurn = serieUltimosMeses((m, y) => {
    const c = churnMensalPct(opts.ctx.students, m, y);
    return c.disponivel ? Number(c.valor.toFixed(1)) : 0;
  }, opts.mesRef, opts.anoRef);
  const img = await graficoLinha(LARGURA, 46, {
    labels: sChurn.map((x) => x.rotulo),
    valores: sChurn.map((x) => x.valor),
    cor: COR.rosa,
    formato: (n) => `${n}%`,
  });
  doc.imagem(img, PAGINA.margem, doc.y, LARGURA, 46);
  doc.y += 50;
}

// ───────────────── S4 · Alunos por professor / curso ─────────────────

async function slideAlunosPorProfessorCurso(doc, R) {
  abrirSlide(doc, 'Alunos por professor e por curso', { subtitulo: 'Quantidade de alunos e receita, nas duas dimensões' });

  const colW = (LARGURA - 8) / 2;
  const xD = PAGINA.margem + colW + 8;
  const hG = 52;
  const gapLinha = 8;

  const profs = (R.receitaPorProfessor || []).slice(0, 7);
  const cursos = (R.atual.mensalidadePorCurso || []).slice(0, 7);

  // linha 1: nº de alunos
  const y1 = doc.y;
  subtitulo(doc, 'Alunos por professor');
  if (profs.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto('Sem alunos ativos vinculados a professor.', PAGINA.margem, doc.y + 2);
  } else {
    const img = await graficoBarrasH(colW, hG, { itens: profs.map((p) => ({ label: p.professor, valor: p.alunos, cor: COR.azul })), formato: fInt });
    doc.imagem(img, PAGINA.margem, doc.y, colW, hG);
  }
  doc.y = y1;
  subtitulo(doc, 'Alunos por curso', xD);
  if (cursos.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto('Sem alunos ativos no período.', xD, doc.y + 2);
  } else {
    const img = await graficoBarrasH(colW, hG, { itens: cursos.map((c) => ({ label: c.curso, valor: c.alunos, cor: COR.amarelo })), formato: fInt });
    doc.imagem(img, xD, doc.y, colW, hG);
  }
  doc.y = y1 + 5 + hG + gapLinha;

  // linha 2: renda
  const y2 = doc.y;
  subtitulo(doc, 'Renda de alunos por professor (MRR)');
  if (profs.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto('Sem dados no período.', PAGINA.margem, doc.y + 2);
  } else {
    const img = await graficoBarrasH(colW, hG, { itens: profs.map((p) => ({ label: p.professor, valor: p.receita, cor: COR.laranja })), formato: fBRLk });
    doc.imagem(img, PAGINA.margem, doc.y, colW, hG);
  }
  doc.y = y2;
  subtitulo(doc, 'Renda de alunos por curso (MRR)', xD);
  if (cursos.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto('Sem dados no período.', xD, doc.y + 2);
  } else {
    const img = await graficoBarrasH(colW, hG, { itens: cursos.map((c) => ({ label: c.curso, valor: c.mrr, cor: COR.rosa })), formato: fBRLk });
    doc.imagem(img, xD, doc.y, colW, hG);
  }
  doc.y = y2 + 5 + hG;
}

// ───────────────── S5 · Despesas ─────────────────

async function slideDespesas(doc, R, opts) {
  abrirSlide(doc, 'Despesas', { subtitulo: 'Por categoria, evolução e onde vale olhar primeiro' });

  const colW = (LARGURA - 8) / 2;
  const xD = PAGINA.margem + colW + 8;
  const yTop = doc.y;
  const hG = 56;

  subtitulo(doc, 'Despesa por categoria');
  const categorias = (R.despesasPorCategoria || []);
  if (categorias.length === 0) {
    doc.fonte('normal', 7.5).cor(COR.cinza).texto('Nenhuma despesa lançada no período.', PAGINA.margem, doc.y + 2);
  } else {
    const top = categorias.slice(0, 5);
    const resto = categorias.slice(5).reduce((s, c) => s + c.valor, 0);
    const itens = resto > 0.005 ? [...top, { categoria: 'Outras', valor: resto }] : top;
    const paleta = [COR.azul, COR.laranja, COR.rosa, COR.amarelo, '#0b3ad4', COR.cinzaClaro];
    const img = await graficoRosca(colW, hG, {
      itens: itens.map((c, i) => ({ label: c.categoria, valor: c.valor, cor: paleta[i % paleta.length] })),
      formato: fBRLk,
    });
    doc.imagem(img, PAGINA.margem, doc.y, colW, hG);
  }

  doc.y = yTop;
  subtitulo(doc, 'Evolução da despesa (últimos 6 meses)', xD);
  const serie = serieUltimosMeses((m, y) => despesaTotalNoMes(opts.ctx.expenses, m, y), opts.mesRef, opts.anoRef);
  const img2 = await graficoLinha(colW, hG, {
    labels: serie.map((x) => x.rotulo),
    valores: serie.map((x) => x.valor),
    cor: COR.laranja,
    formato: fBRLk,
  });
  doc.imagem(img2, xD, doc.y, colW, hG);

  doc.y = yTop + 5 + hG + 6;
  const yLinha2 = doc.y;

  subtitulo(doc, 'PONTOS PARA MELHORAR');
  (opts.pontosDespesas || []).forEach((texto) => {
    const linhas = doc.pdf.splitTextToSize(semNbsp(`•  ${texto}`), colW - 4);
    doc.fonte('normal', 7).cor(COR.tinta);
    linhas.forEach((ln, i) => doc.texto(ln, PAGINA.margem, doc.y + i * 3.6));
    doc.y += linhas.length * 3.6 + 2.5;
  });

  doc.y = yLinha2;
  subtitulo(doc, 'ALERTAS', xD);
  blocoAlertasColuna(doc, alertasSobre(R, /despesa|margem|resultado|lucro|caixa/i), xD, colW, { limite: 2, vazio: 'Nenhum alerta financeiro nesta área.' });
  doc.y = Math.max(doc.y, doc._yFinalColuna || doc.y);
}

// ───────────────── S6 · Cobranças & inadimplência ─────────────────

async function slideCobrancas(doc, R, opts) {
  const a = R.atual;
  abrirSlide(doc, 'Cobranças & inadimplência', { subtitulo: 'Previstas, pagas, atrasadas e o comparativo de inadimplência' });

  const varPrevistas = calcVariacao(a.cobrancas.emitidas, R.anterior.cobrancas.emitidas);
  const varPagas = calcVariacao(a.cobrancas.pagasCount, R.anterior.cobrancas.pagasCount);
  const varAtrasadas = calcVariacao(a.cobrancas.atrasadasCount, R.anterior.cobrancas.atrasadasCount);

  doc.fileiraCards([
    kpi('Cobranças previstas', a.cobrancas.emitidas, fInt, { variacao: varPrevistas, sufixo: fBRL(a.cobrancas.previsto) }),
    kpi('Cobranças pagas', a.cobrancas.pagasCount, fInt, { variacao: varPagas, sufixo: fBRL(a.receitaRecebida) }),
    kpi('Atrasadas', a.cobrancas.atrasadasCount, fInt, { variacao: varAtrasadas, menorEhMelhor: true, sufixo: fBRL(a.inadimplenciaMes.valor) }),
  ], { h: 34 });

  subtitulo(doc, 'Comparativo de inadimplência (%) — últimos 6 meses');
  const serieInad = serieUltimosMeses((m, y) => {
    const r = inadimplenciaDoMes(opts.ctx.payments, m, y);
    return r.disponivel ? Number(r.pct.toFixed(1)) : 0;
  }, opts.mesRef, opts.anoRef);
  const img = await graficoLinha(LARGURA, 66, {
    labels: serieInad.map((x) => x.rotulo),
    valores: serieInad.map((x) => x.valor),
    cor: COR.rosa,
    formato: (n) => `${n}%`,
  });
  doc.imagem(img, PAGINA.margem, doc.y, LARGURA, 66);
  doc.y += 70;

  doc.fonte('normal', 6.5).cor(COR.cinzaClaro).texto(
    'Inadimplência sempre em R$ (saldo devedor), nunca contagem de parcelas. Carteira vencida total: ' + fBRL(a.inadimplenciaCarteira) + '.',
    PAGINA.margem, doc.y, { maxWidth: LARGURA },
  );
}

// ───────────────── S7 · Plano de ação ─────────────────

function slidePlanoAcao(doc, R, plano) {
  abrirSlide(doc, 'Plano de ação', { subtitulo: 'O que fazer a partir dos dados deste relatório' });

  plano.forEach((p, i) => {
    const cor = p.prioridade === 1 ? COR.rosa : p.prioridade === 2 ? COR.laranja : COR.azul;
    const linhas = doc.pdf.splitTextToSize(semNbsp(p.acao), LARGURA - 40);
    const h = 10 + linhas.length * 3.6;
    doc.precisaEspaco(h + 3);
    doc.preenche(COR.painel).pdf.rect(PAGINA.margem, doc.y, LARGURA, h, 'F');
    doc.preenche(cor).pdf.rect(PAGINA.margem, doc.y, 1.8, h, 'F');
    doc.fonte('bold', 8).cor(cor).texto(`${i + 1}. ${p.area}  ·  P${p.prioridade}`, PAGINA.margem + 5, doc.y + 5.5);
    doc.fonte('normal', 7.5).cor(COR.tinta);
    linhas.forEach((ln, j) => doc.texto(ln, PAGINA.margem + 5, doc.y + 10 + j * 3.6));
    doc.fonte('normal', 6.5).cor(COR.cinza).texto(p.porque, PAGINA.margem + LARGURA - 2, doc.y + 5.5, { align: 'right', maxWidth: 60 });
    doc.y += h + 3;
  });

  doc.espaco(2);
  doc.fonte('normal', 6.5).cor(COR.cinzaClaro).texto(
    'Prioridade: P1 = KPI crítico fora da meta · P2 = risco de margem · P3 = eficiência. Definir responsável e prazo na reunião.',
    PAGINA.margem, doc.y, { maxWidth: LARGURA },
  );
}

export { montarRelatorioMensal, fimDoMes, inadimplenciaValor };
