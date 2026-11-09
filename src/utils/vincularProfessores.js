// Vínculo entre a CONTA de login do professor (users/{uid}, role professor) e
// o CADASTRO dele (professores/{id}, que é o professorId das turmas) —
// 06/11/2026. Sem esse vínculo as regras do Firestore não sabem se uma turma
// é do professor que está gravando: os nomes divergem ("Barbara Dias" na
// conta × "Bárbara Dias" no cadastro) e o cadastro não tem e-mail.
//
// O par sai pelo nome sem acento/maiúsculas (normalizeNome), como o
// diretorioDe() da página Professores. Quem grava é o admin (botão
// "Vincular contas" em ProfessoresAdmin): users/{uid}.professorId.
import { normalizeNome } from './normalizeNome';

/**
 * @param {Array<{uid, nome, nomeKey?, professorId?}>} contas  users com role professor
 * @param {Array<{id, nome}>} diretorio  coleção professores
 * @returns {Array<{uid, contaNome, professorId?, cadastroNome?, situacao}>}
 *   situacao: 'vinculado' (já certo) | 'novo' (vai gravar) | 'trocar' (tinha
 *   outro professorId) | 'sem-cadastro' | 'ambiguo' (2+ cadastros com o nome)
 */
export function paresDeVinculo(contas = [], diretorio = []) {
  return contas
    .map((c) => {
      const chave = c.nomeKey || normalizeNome(c.nome);
      const achados = diretorio.filter((d) => normalizeNome(d.nome) === chave);
      if (achados.length !== 1) {
        return { uid: c.uid, contaNome: c.nome || '', situacao: achados.length ? 'ambiguo' : 'sem-cadastro' };
      }
      const d = achados[0];
      const situacao = c.professorId === d.id ? 'vinculado' : c.professorId ? 'trocar' : 'novo';
      return { uid: c.uid, contaNome: c.nome || '', professorId: d.id, cadastroNome: d.nome || '', situacao };
    })
    .sort((a, b) => a.contaNome.localeCompare(b.contaNome, 'pt-BR'));
}

/** Só os pares que precisam ser gravados. */
export const paresAGravar = (pares = []) => pares.filter((p) => p.situacao === 'novo' || p.situacao === 'trocar');
