import { NIVEL_POR_CURSO_BOOK } from '../constants/turmasConfig';
import { paraISODia } from './matricula';

// O QR do PDF impresso precisa funcionar de qualquer lugar (inclusive quando o
// certificado é emitido em localhost ou por outro domínio), então a base é fixa.
export const CERTIFICADO_BASE_URL = 'https://gestao.speakupcataguases.com';
export const CERTIFICADO_SITE_VERIFICACAO = 'gestao.speakupcataguases.com/verificar';

// Quem assina o certificado. Com `nome` vazio, o PDF mostra só o cargo sob a
// linha (assinatura à mão). Preencher com o nome de quem assina de fato.
export const ASSINATURA_CERTIFICADO = {
  nome: '',
  cargo: 'Pedagogical Director',
};

export const NIVEIS_CERTIFICADO = {
  'A1': 'A1 Beginner English',
  'A2': 'A2 Elementary English',
  'A2+': 'A2+ Pre-Intermediate English',
  'B1': 'B1 Intermediate English',
  'B1+': 'B1+ Intermediate Plus English',
  'B2': 'B2 Upper-Intermediate English',
  'B2+': 'B2+ Upper-Intermediate Plus English',
  'C1': 'C1 Advanced English',
};

/** Título do certificado para um nível CEFR; sem correspondência devolve ''. */
export const tituloDoNivel = (nivel) => NIVEIS_CERTIFICADO[String(nivel || '').trim().toUpperCase()] || '';

/**
 * Nível do aluno: o da turma em que está; sem turma (ou turma sem nível, como
 * KIDS), deduz do curso + book cadastrados. Vazio se não der pra saber — quem
 * emite escolhe na tela.
 */
export function nivelDoAluno(aluno, turma) {
  const daTurma = String(turma?.nivel || '').trim().toUpperCase();
  if (NIVEIS_CERTIFICADO[daTurma]) return daTurma;
  const porBook = NIVEL_POR_CURSO_BOOK[aluno?.course]?.[Number(aluno?.book)];
  return porBook && NIVEIS_CERTIFICADO[porBook] ? porBook : '';
}

// Sem 0/O, 1/I/L: o código é lido em voz alta e digitado à mão.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Código de verificação "SU-2026-K7QX4M". Sufixo aleatório de propósito: um
 * código sequencial (0001, 0002...) deixaria qualquer pessoa enumerar
 * certificados e ler o nome de outros alunos.
 */
export function gerarCodigoCertificado(ano = new Date().getFullYear(), aleatorio) {
  const bytes = aleatorio || (() => {
    const b = new Uint8Array(6);
    globalThis.crypto.getRandomValues(b);
    return b;
  })();
  let sufixo = '';
  for (let i = 0; i < 6; i += 1) sufixo += ALFABETO[bytes[i] % ALFABETO.length];
  return `SU-${ano}-${sufixo}`;
}

const REGEX_CODIGO = /^SU-\d{4}-[2-9A-HJKMNP-Z]{6}$/;

/** Normaliza o que a pessoa digitou (minúsculas, espaços) e valida o formato. */
export function normalizarCodigo(texto) {
  const codigo = String(texto || '').trim().toUpperCase().replace(/\s+/g, '');
  return REGEX_CODIGO.test(codigo) ? codigo : null;
}

export const urlVerificacao = (codigo) => `${CERTIFICADO_BASE_URL}/verificar/${codigo}`;

/** "2026-09-24" → "24/09/2026". */
export function dataBR(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * Documento gravado no Firestore. Só o necessário pra verificar (nome, título,
 * data, situação) — a página de verificação é pública, então nada de CPF,
 * contato ou turma aqui.
 */
export function montarCertificado({ aluno, titulo, nivel, dataEmissao, emitidoPor, agora = new Date(), codigo }) {
  const nome = String(aluno?.name || '').trim();
  const tit = String(titulo || '').trim();
  if (!nome) return { erro: 'Aluno sem nome cadastrado.' };
  if (!tit) return { erro: 'Informe o título do certificado (nível).' };
  const emissao = dataEmissao || paraISODia(agora);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(emissao)) return { erro: 'Data de emissão inválida.' };
  const cod = codigo || gerarCodigoCertificado(Number(emissao.slice(0, 4)));
  return {
    codigo: cod,
    dados: {
      codigo: cod,
      studentId: aluno.id,
      nome,
      titulo: tit,
      nivel: nivel || null,
      dataEmissao: emissao,
      status: 'valido',
      emitidoPor: emitidoPor || null,
      criadoEm: agora.getTime(),
    },
  };
}
