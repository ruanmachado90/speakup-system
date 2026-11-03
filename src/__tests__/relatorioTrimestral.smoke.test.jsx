import React from 'react';
import { render, screen } from '@testing-library/react';
import { montarRelatorioCompleto } from '../utils/relatorioTrimestralModelo';
import { FolhaSumario, FolhaReceita, FolhaDespesas, FolhaInadimplencia } from '../components/relatorioTrimestral/FolhasFinanceiro';
import {
  FolhaAlunos, FolhaComercial, FolhaPedagogico, FolhaNotas, FolhaTurmas, FolhaEquipe, FolhaPlano,
} from '../components/relatorioTrimestral/FolhasOperacao';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const FOLHAS = [FolhaSumario, FolhaReceita, FolhaDespesas, FolhaInadimplencia, FolhaAlunos, FolhaComercial, FolhaPedagogico, FolhaNotas, FolhaTurmas, FolhaEquipe, FolhaPlano];

const dados = {
  tri: 3, ano: 2026, hojeISO: '2026-11-03',
  students: [
    { id: 'a', name: 'Ana', status: 'ativo', createdAt: '2026-02-01', fee: 300, course: 'TEENS', book: 2, teacher: 'Bárbara Dias' },
    { id: 'b', name: 'Beto', status: 'cancelado', createdAt: '2026-02-01', canceledAt: '2026-10-10', cancelReason: 'Financeiro', fee: 300 },
    { id: 'c', name: 'Caio', status: 'ativo', createdAt: '2026-10-05', fee: 350, course: 'KIDS', teacher: 'Bárbara Dias' },
  ],
  payments: [
    { studentId: 'a', studentName: 'Ana', dueDate: '2026-10-10', status: 'Pago', valuePlanned: 300, valuePaid: 300, paymentDate: '2026-10-09' },
    { studentId: 'c', studentName: 'Caio', dueDate: '2026-10-15', status: 'Pendente', valuePlanned: 350, valuePaid: 0 },
  ],
  expenses: [{ month: 10, year: 2026, value: 1200, category: 'Aluguel', status: 'pago', recorrente: true }],
  leads: [{ createdAt: '2026-10-02', status: 'novo' }, { createdAt: '2026-10-03', status: 'matriculado' }],
  turmas: [{ id: 't1', nome: 'GE 5', professor: 'Bárbara Dias', professorId: 'p1', alunosIds: ['a', 'c'], maxAlunos: 8, horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:00' }] }],
  professores: [{ id: 'p1', nome: 'Bárbara Dias' }],
  aulas: [{ turmaId: 't1', turmaNome: 'GE 5', data: '2026-10-06', status: 'realizada', conteudo: 'U1', chamadas: [{ alunoId: 'a', status: 'presente' }, { alunoId: 'c', status: 'falta' }] }],
  avulsas: [{ id: 'v', tipo: 'extra', data: '2026-10-08', inicio: '14:00', fim: '15:00', turmaId: 't1', turmaNome: 'GE 5', professorId: 'p1', alunos: [{ nome: 'Ana' }] }],
  eventos: [{ id: 'e', tipo: 'experimental', data: '2026-10-09', professorId: 'p1' }],
  avaliacoes: [{ id: 'w', turmaId: 't1', tipo: 'written', pontos: 10 }],
  grades: [{ turmaId: 't1', studentId: 'a', scores: { w: 9 } }],
  contratosAssinados: new Set(['a']),
};

describe('relatório trimestral (montagem das folhas)', () => {
  const M = montarRelatorioCompleto(dados);
  const ctx = { titulo: 'Relatório trimestral', periodo: '4º trimestre de 2026', total: FOLHAS.length, geradoEm: '03/11/2026' };

  it.each(FOLHAS.map((F, i) => [i + 1, F]))('folha %i monta sem erro', (numero, Folha) => {
    render(<Folha M={M} ctx={ctx} numero={numero} />);
    expect(screen.getByText(`Gerado em 03/11/2026 · página ${numero} de ${FOLHAS.length}`)).toBeTruthy();
  });

  it('período vazio também monta todas as folhas', () => {
    const vazio = montarRelatorioCompleto({ tri: 0, ano: 2020, hojeISO: '2026-11-03' });
    FOLHAS.forEach((Folha, i) => render(<Folha M={vazio} ctx={ctx} numero={i + 1} />));
  });
});
