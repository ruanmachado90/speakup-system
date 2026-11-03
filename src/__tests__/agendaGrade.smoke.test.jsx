import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SemanaGrid, { LegendaAgenda } from '../components/agenda/SemanaGrid';
import { EventoDialog, OcorrenciaDialog } from '../components/agenda/AgendaDialogs';
import { diasDaSemana, ocorrenciasDaSemana, itensDeEventos } from '../utils/agendaProfessor';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

const turma = {
  id: 't1', nome: 'GENERAL ENGLISH 5 - Ter/Qui 18:00 - Bárbara', nivel: 'B2', alunosIds: ['a1'],
  horarios: [{ dia: 'Terça', horario: '18:00', horarioFim: '19:30' }, { dia: 'Quinta', horario: '18:00', horarioFim: '19:30' }],
};
const dias = diasDaSemana('2026-11-02');
const ocorrencias = ocorrenciasDaSemana([turma], dias, [
  { turmaId: 't1', data: '2026-11-03', status: 'realizada', conteudo: 'Unit 4', chamadas: [{ alunoId: 'a1', status: 'presente' }] },
], { hojeISO: '2026-11-06', agoraMin: 600 });
const eventos = itensDeEventos([{ id: 'e1', titulo: 'Aula experimental', data: '2026-11-04', inicio: '15:00', fim: '16:00' }], dias);

describe('agenda do professor (montagem)', () => {
  it('grade mostra aulas e compromissos, e o clique chega no item', () => {
    const onItemClick = jest.fn();
    render(<SemanaGrid dias={dias} itens={[...ocorrencias, ...eventos]} hojeISO="2026-11-06" agoraMin={600} onSlotClick={jest.fn()} onItemClick={onItemClick} />);
    expect(screen.getAllByText(/GENERAL ENGLISH 5/)).toHaveLength(2);
    fireEvent.click(screen.getByText('Aula experimental'));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'evento' }));
    expect(screen.queryByText('Dom')).toBeNull(); // domingo vazio fica de fora
  });

  it('legenda e detalhe da aula registrada', () => {
    render(<LegendaAgenda />);
    render(<OcorrenciaDialog item={ocorrencias[0]} students={[{ id: 'a1', name: 'Ana' }]} professorNome="Bárbara Dias" onLembrar={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Unit 4')).toBeTruthy();
    expect(screen.getByText(/1 de 1 presentes/)).toBeTruthy();
  });

  it('aula não registrada oferece o lembrete', () => {
    const pendente = { ...ocorrencias[1], status: 'pendente', aula: null };
    render(<OcorrenciaDialog item={pendente} students={[]} professorNome="Bárbara Dias" onLembrar={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Lembrar Bárbara de registrar')).toBeTruthy();
  });

  it('formulário de compromisso recusa fim antes do início', () => {
    const onSalvar = jest.fn();
    render(<EventoDialog inicial={{ data: '2026-11-04', inicio: '15:00' }} professorNome="Bárbara Dias" onSalvar={onSalvar} onExcluir={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Fim').value).toBe('16:00');
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '14:00' } });
    fireEvent.click(screen.getByText('Agendar'));
    expect(screen.getByRole('alert').textContent).toMatch(/depois do início/);
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
