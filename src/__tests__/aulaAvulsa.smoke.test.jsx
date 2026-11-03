import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AulaAvulsaDialog } from '../components/agenda/AulaAvulsaDialog';
import RelatorioMensal from '../components/agenda/RelatorioMensal';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));
jest.mock('../hooks/useAgendaSemana', () => ({
  useAgendaSemana: () => ({
    aulas: [{ turmaId: 't1', data: '2026-11-03', status: 'realizada', conteudo: 'Unit 4', chamadas: [{ status: 'presente' }] }],
    avulsas: [{ id: 'v1', tipo: 'extra', data: '2026-11-04', inicio: '14:00', fim: '15:30', turmaId: 't1', turmaNome: 'GE 5', alunos: [{ nome: 'Ana' }], conteudo: 'Review' }],
    eventos: [], loading: false, error: null,
  }),
  useAgoraMin: () => 600,
}));
jest.mock('../hooks/useCalendarioLetivo', () => ({ useCalendarioLetivo: () => ({ dados: null }) }));
jest.mock('../hooks/useHojeISO', () => ({ useHojeISO: () => '2026-11-12' }));

const turma = {
  id: 't1', nome: 'GE 5', professorId: 'p1',
  horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:30' }],
};
const alunos = [{ id: 'a1', name: 'Ana' }, { id: 'a2', name: 'Beto' }];

describe('aula avulsa (montagem)', () => {
  it('sugere o horário da turma e exige quem participou', async () => {
    const onSalvar = jest.fn().mockResolvedValue();
    render(<AulaAvulsaDialog turmas={[turma]} alunosDaTurma={() => alunos} onSalvar={onSalvar} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Início').value).toBe('18:00');
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Unit 3' } });
    fireEvent.click(screen.getByText('Registrar aula'));
    expect(screen.getByRole('alert').textContent).toMatch(/participou/);
    fireEvent.click(screen.getByLabelText('Ana'));
    fireEvent.click(screen.getByText('Registrar aula'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [form, turmaEscolhida] = onSalvar.mock.calls[0];
    expect(form).toMatchObject({ tipo: 'reposicao', alunosIds: ['a1'], conteudo: 'Unit 3' });
    expect(turmaEscolhida.id).toBe('t1');
  });

  it('relatório soma grade + avulsa e marca terça sem registro', () => {
    render(<RelatorioMensal professor={{ id: 'p1', nome: 'Bárbara Dias' }} turmasProf={[turma]} />);
    expect(screen.getByText('Novembro de 2026')).toBeTruthy();
    expect(screen.getByText('3h')).toBeTruthy(); // 1h30 da terça + 1h30 da extra
    expect(screen.getByText('Aula extra')).toBeTruthy();
    expect(screen.getAllByText('Não registrada')).toHaveLength(1); // 10/11; 03/11 dada, 17/11 é futuro
  });
});
