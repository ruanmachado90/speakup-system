import { normalizeNome } from './normalizeNome';

/**
 * Nome canônico do professor de um aluno (`campo` 'teacher') ou de uma turma
 * (`campo` 'professor').
 *
 * O campo é texto livre e registros antigos carregam grafias como "BÁRBARA" ou
 * "Vera". A coleção `professores` é a fonte da verdade, então:
 *  1. `professorId` resolvido → nome cadastrado;
 *  2. sem id: nome igual ao cadastrado ignorando acento/caixa;
 *  3. sem id: primeiro nome ("vera" → "Vera Machado"), só se for inequívoco;
 *  4. nada bate → mantém o texto original (nunca inventa nome).
 */
export function resolverNomeProfessor(entidade, professores = [], campo = 'teacher') {
  const bruto = entidade?.[campo];
  if (entidade?.professorId) {
    const porId = professores.find((p) => p.id === entidade.professorId);
    if (porId?.nome) return porId.nome;
  }
  const chave = normalizeNome(bruto);
  if (!chave) return bruto;

  const exato = professores.find((p) => normalizeNome(p.nome) === chave);
  if (exato) return exato.nome;

  const porPrimeiroNome = professores.filter((p) => normalizeNome(p.nome).split(' ')[0] === chave);
  if (porPrimeiroNome.length === 1) return porPrimeiroNome[0].nome;

  return bruto;
}

// Só cria objeto novo quando o nome muda, então quem depende da identidade dos
// itens não re-renderiza à toa.
function normalizarCampoProfessor(lista, professores, campo) {
  if (professores.length === 0) return lista;
  return lista.map((item) => {
    const nome = resolverNomeProfessor(item, professores, campo);
    return nome === item[campo] ? item : { ...item, [campo]: nome };
  });
}

/** Alunos com `teacher` canônico. */
export function normalizarProfessoresDosAlunos(students = [], professores = []) {
  return normalizarCampoProfessor(students, professores, 'teacher');
}

/** Turmas com `professor` canônico. */
export function normalizarProfessoresDasTurmas(turmas = [], professores = []) {
  return normalizarCampoProfessor(turmas, professores, 'professor');
}
