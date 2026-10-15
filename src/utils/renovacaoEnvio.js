/**
 * Convites e envio da renovação (etapa 3 do docs/rematricula/PLANO.md).
 * Puro: monta documentos, mensagens e links; quem grava é useRenovacoes.
 *
 * O convite (`renovacoes/{codigo}`) será lido pela página pública na etapa 4
 * por quem tiver o link — por isso NÃO guarda telefone, e-mail da equipe nem
 * anotação interna. O telefone sai do cadastro do aluno só na hora de enviar;
 * o motivo de "não renovará" fica em `renovacoes-notas/{codigo}`.
 */
import { soDigitos } from './matricula';
import { STATUS, podeMudarStatus, reajustar, paraCentavos } from './renovacao';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';

export const CAMINHO_LINK = '/renovar';
export const linkDoConvite = (origem, codigo) => `${origem}${CAMINHO_LINK}/${codigo}`;

// Campanhas criadas antes do campo existir usam o texto padrão
export const MENSAGEM_PADRAO = CAMPANHA_PADRAO_2027.mensagemWhatsApp;

/** Rótulo e tom de cada situação do convite (tela e planilha). */
export const SITUACAO_CONVITE = {
  [STATUS.GERADA]: ['Gerado, não enviado', 'neutro'],
  [STATUS.ENVIADA]: ['Enviado', 'info'],
  [STATUS.ABERTA]: ['Aberto pela família', 'info'],
  [STATUS.RESPONDIDA]: ['Respondido', 'sucesso'],
  [STATUS.AGUARDANDO]: ['Aguardando regularização', 'alerta'],
  [STATUS.EFETIVADA]: ['Efetivado', 'sucesso'],
  [STATUS.NAO_RENOVARA]: ['Não renovará', 'alerta'],
  [STATUS.EXPIRADA]: ['Expirado', 'neutro'],
  [STATUS.CANCELADA]: ['Cancelado', 'neutro'],
};

const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';

/** Idade completa na data `hoje`; null sem data de nascimento legível. */
export function idade(dataNascimento, hoje = new Date()) {
  const m = String(dataNascimento || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos -= 1;
  return anos;
}

/**
 * Documento do convite. `linha` vem de montarLinhas (painel).
 * Valores em centavos, com o sufixo no nome do campo para não haver dúvida.
 */
export function montarConvite({ codigo, student, linha, campanha, por, agora = Date.now(), status = STATUS.GERADA }) {
  const anos = idade(student.dataNascimento, new Date(agora));
  return {
    codigo,
    anoLetivo: campanha.anoLetivo,
    studentId: student.id,
    alunoNome: student.name || '',
    responsavelNome: student.responsibleName || '',
    menorDeIdade: anos == null ? Boolean(student.responsibleName) : anos < 18,
    cursoAtual: linha.curso,
    turmasAtuais: linha.turmas,
    mensalidadeAtualCentavos: linha.mensalidadeAtual,
    mensalidadeBaseCentavos: linha.mensalidadeAtual,
    mensalidadeNovaCentavos: linha.mensalidadeNova,
    parcelasAntigas: linha.antigas,
    temPendencia: linha.pendencia.quantidade > 0,
    revisarValor: linha.revisarValor,
    descontoIrmao: false,
    status,
    enviosQtd: 0,
    historico: [{ evento: status, em: agora, por: por || null }],
    criadaEm: agora,
    criadaPor: por || null,
  };
}

/**
 * Convite que vale para cada aluno no ano: o mais recente que não foi
 * cancelado nem expirou. Devolve Map studentId → convite.
 */
export function convitePorAluno(convites = []) {
  const mapa = new Map();
  [...convites]
    .filter((c) => c.status !== STATUS.CANCELADA && c.status !== STATUS.EXPIRADA)
    .sort((a, b) => (a.criadaEm || 0) - (b.criadaEm || 0))
    .forEach((c) => mapa.set(c.studentId, c));
  return mapa;
}

/** Valores e marcações só mudam antes de a família responder. */
export const podeAjustar = (convite) => [STATUS.GERADA, STATUS.ENVIADA, STATUS.ABERTA].includes(convite?.status);

/** Pode entrar na fila de envio (gerado, já enviado ou aberto, sem resposta). */
export const podeEnviar = (convite) => [STATUS.GERADA, STATUS.ENVIADA, STATUS.ABERTA].includes(convite?.status);

/** Patch de um envio: status vai a "enviada" (se ainda não abriu) e conta o envio. */
export function patchEnvio(convite, { agora = Date.now(), por, canal = 'whatsapp' } = {}) {
  const status = convite.status === STATUS.GERADA ? STATUS.ENVIADA : convite.status;
  return {
    status,
    enviadaEm: agora,
    enviosQtd: (convite.enviosQtd || 0) + 1,
    entradaHistorico: { evento: 'enviada', canal, em: agora, por: por || null },
  };
}

/** Patch de nova mensalidade base (VIP, In Company, ajuste da secretaria). */
export function patchMensalidadeBase(convite, baseReais, campanha, { agora = Date.now(), por } = {}) {
  if (!podeAjustar(convite)) throw new Error('A família já respondeu: o valor não pode mais mudar.');
  const base = paraCentavos(baseReais);
  if (!(base > 0)) throw new Error('Informe um valor maior que zero.');
  return {
    mensalidadeBaseCentavos: base,
    mensalidadeNovaCentavos: reajustar(base, campanha.reajustePct, campanha.arredondamento),
    revisarValor: false,
    entradaHistorico: { evento: 'valor_ajustado', de: convite.mensalidadeBaseCentavos, para: base, em: agora, por: por || null },
  };
}

/**
 * Patch de "não renovará" (o motivo usa a mesma lista do cancelamento).
 * Motivo e observação são internos: vão em `nota` (gravada em
 * `renovacoes-notas/{codigo}`, só a equipe lê), nunca no convite.
 */
export function patchNaoRenovara(convite, { motivo, observacao = '', agora = Date.now(), por } = {}) {
  if (!motivo) throw new Error('Informe o motivo.');
  if (!podeMudarStatus(convite.status, STATUS.NAO_RENOVARA)) throw new Error('Este convite já foi efetivado ou encerrado.');
  return {
    status: STATUS.NAO_RENOVARA,
    entradaHistorico: { evento: STATUS.NAO_RENOVARA, em: agora, por: por || null },
    nota: {
      codigo: convite.codigo, anoLetivo: convite.anoLetivo, studentId: convite.studentId,
      motivo, observacao: String(observacao || '').trim(), em: agora, por: por || null,
    },
  };
}

/**
 * Aluno que avisou que não renova antes de receber convite: o convite já
 * nasce como "não renovará" (fica registrado e pode ser desfeito).
 * @returns {{ convite, nota }}
 */
export function conviteNaoRenovara({ motivo, observacao, ...dados }) {
  const convite = montarConvite(dados);
  const { entradaHistorico, nota, ...campos } = patchNaoRenovara(convite, { motivo, observacao, agora: dados.agora, por: dados.por });
  return { convite: { ...convite, ...campos, historico: [...convite.historico, entradaHistorico] }, nota };
}

/** Desfaz o "não renovará": o convite volta a "gerada" e a nota é apagada (nota: null). */
export function patchDesfazerNaoRenovara(convite, { agora = Date.now(), por } = {}) {
  if (!podeMudarStatus(convite.status, STATUS.GERADA)) throw new Error('Não há "não renovará" para desfazer.');
  return {
    status: STATUS.GERADA,
    entradaHistorico: { evento: 'nao_renovara_desfeito', em: agora, por: por || null },
    nota: null,
  };
}

/** Patch do desconto de irmão (liga/desliga), só antes da resposta. */
export function patchIrmao(convite, ligado, { agora = Date.now(), por } = {}) {
  if (!podeAjustar(convite)) throw new Error('A família já respondeu: o desconto não pode mais mudar.');
  return {
    descontoIrmao: Boolean(ligado),
    entradaHistorico: { evento: ligado ? 'irmao_marcado' : 'irmao_desmarcado', em: agora, por: por || null },
  };
}

// ── WhatsApp ───────────────────────────────────────────────────────────────

/**
 * Link do WhatsApp. Aceita o número com ou sem 55 e com máscara; sem número
 * válido, abre o WhatsApp para a pessoa escolher o contato.
 */
export function urlWhatsApp(telefone, mensagem) {
  let tel = soDigitos(telefone);
  if (tel.length === 10 || tel.length === 11) tel = `55${tel}`;
  const valido = tel.length >= 12 && tel.length <= 13;
  return `https://wa.me/${valido ? tel : ''}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Agrupa por telefone: irmãos com o mesmo número recebem UMA mensagem.
 * @param {Array<{ convite, telefone, responsavel }>} itens
 */
export function gruposDeEnvio(itens = []) {
  const grupos = new Map();
  const semTelefone = [];
  itens.forEach((item) => {
    const chave = soDigitos(item.telefone);
    if (chave.length < 10) { semTelefone.push(item); return; }
    grupos.set(chave, [...(grupos.get(chave) || []), item]);
  });
  return {
    grupos: [...grupos.entries()].map(([chave, lista]) => ({
      chave,
      telefone: lista[0].telefone,
      responsavel: lista[0].responsavel || lista[0].convite.alunoNome,
      itens: lista,
    })),
    semTelefone,
  };
}

/** Texto da mensagem de um grupo (um link por aluno). */
export function mensagemDoGrupo({ modelo, grupo, campanha, origem }) {
  const nomes = grupo.itens.map((i) => primeiroNome(i.convite.alunoNome));
  const alunos = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
  const links = grupo.itens.length > 1
    ? grupo.itens.map((i) => `${primeiroNome(i.convite.alunoNome)}: ${linkDoConvite(origem, i.convite.codigo)}`).join('\n')
    : linkDoConvite(origem, grupo.itens[0].convite.codigo);
  return (modelo || MENSAGEM_PADRAO)
    .replaceAll('{responsavel}', primeiroNome(grupo.responsavel))
    .replaceAll('{alunos}', alunos)
    .replaceAll('{ano}', String(campanha.anoLetivo))
    .replaceAll('{prazo}', dataBR(campanha.encerramento) || 'o fim da campanha')
    .replaceAll('{links}', links);
}

// ── Planilha ───────────────────────────────────────────────────────────────

const celula = (v) => {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV para o Excel em português (separador ";" e BOM para os acentos). */
export function csvConvites(linhas) {
  const cab = ['Aluno', 'Responsável', 'Telefone', 'Curso', 'Mensalidade atual', 'Mensalidade nova', 'Status', 'Link'];
  const corpo = linhas.map((l) => [
    l.aluno, l.responsavel, l.telefone, l.curso,
    (l.mensalidadeAtual / 100).toFixed(2).replace('.', ','),
    (l.mensalidadeNova / 100).toFixed(2).replace('.', ','),
    l.status, l.link,
  ].map(celula).join(';'));
  const BOM = String.fromCharCode(0xfeff);
  return `${BOM}${[cab.join(';'), ...corpo].join('\r\n')}`;
}
