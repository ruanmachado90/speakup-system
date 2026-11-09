// Vínculo conta de login ↔ cadastro do professor (06/11/2026): base da regra
// de notas (cada professor só grava nas turmas dele).
import { paresDeVinculo, paresAGravar } from '../utils/vincularProfessores';

const diretorio = [
  { id: 'p-barbara', nome: 'Bárbara Dias' },
  { id: 'p-ruan', nome: 'Ruan Machado' },
  { id: 'p-yure', nome: 'Yure Martins' },
  { id: 'p-dup1', nome: 'Ana Souza' },
  { id: 'p-dup2', nome: 'Ana  Souza' },
];

test('casa pelo nome sem acento (conta "Barbara Dias" × cadastro "Bárbara Dias")', () => {
  const [par] = paresDeVinculo([{ uid: 'u1', nome: 'Barbara Dias', nomeKey: 'barbara dias' }], diretorio);
  expect(par).toEqual({ uid: 'u1', contaNome: 'Barbara Dias', professorId: 'p-barbara', cadastroNome: 'Bárbara Dias', situacao: 'novo' });
});

test('situações: já vinculado, corrigir, sem cadastro, ambíguo', () => {
  const pares = paresDeVinculo([
    { uid: 'u2', nome: 'Ruan Machado', professorId: 'p-ruan' },
    { uid: 'u3', nome: 'Yure Martins', professorId: 'p-errado' },
    { uid: 'u4', nome: 'Fulano Sem Cadastro' },
    { uid: 'u5', nome: 'Ana Souza' },
  ], diretorio);
  const porUid = Object.fromEntries(pares.map((p) => [p.uid, p.situacao]));
  expect(porUid).toEqual({ u2: 'vinculado', u3: 'trocar', u4: 'sem-cadastro', u5: 'ambiguo' });
  expect(paresAGravar(pares).map((p) => p.uid)).toEqual(['u3']);
});
