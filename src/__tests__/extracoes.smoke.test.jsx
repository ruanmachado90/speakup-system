/**
 * Smoke dos componentes extraídos de App.jsx e Notas.jsx: montam sem erro.
 * Pega import faltando, que o build NÃO pega (esbuild não checa identificador
 * indefinido; só estoura ao renderizar a tela).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(), GoogleAuthProvider: jest.fn(), setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {}, onAuthStateChanged: jest.fn(() => () => {}), signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(), collection: jest.fn(), doc: jest.fn(), query: jest.fn(), where: jest.fn(),
  orderBy: jest.fn(), limit: jest.fn(), onSnapshot: jest.fn(() => () => {}),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })), getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(), addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(), writeBatch: jest.fn(),
  Timestamp: { now: jest.fn() }, arrayUnion: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(), httpsCallable: jest.fn(() => jest.fn()) }));
jest.mock('../firebase', () => ({ db: {}, auth: {}, googleProvider: {} }));

import ModalAddAvaliacao from '../components/notas/ModalAddAvaliacao';
import BoletimNotasModal from '../components/notas/BoletimNotasModal';
import ProfessoresAdmin from '../pages/ProfessoresAdmin';
import { DataContext } from '../context/DataContext';
import { RequireAdminAuth, PageLoader } from '../components/auth/RequireAuth';

describe('componentes extraídos montam', () => {
  it('ModalAddAvaliacao: estado local (pontos) e salvar', () => {
    const onSave = jest.fn();
    render(<ModalAddAvaliacao tipo="written" onSave={onSave} onClose={jest.fn()} />);
    const campo = screen.getByRole('spinbutton');
    expect(campo.value).toBe('50'); // começa no máximo da categoria
    fireEvent.change(campo, { target: { value: '20' } });
    expect(campo.value).toBe('20');
    const botoes = screen.getAllByRole('button');
    fireEvent.click(botoes[botoes.length - 1]); // último botão = salvar
    expect(onSave).toHaveBeenCalledWith({ tipo: 'written', pontos: 20 });
  });

  it('BoletimNotasModal: mostra o nome do aluno e as iniciais', () => {
    render(
      <BoletimNotasModal
        aluno={{ name: 'Maria Souza' }} totalFinal={88.5} conceito="B+" medias={[40, 25, 15]}
        turma={{ nome: 'TEENS 1' }} semestre="2026-1" professorNome="Vera Machado" onClose={jest.fn()}
      />
    );
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('ProfessoresAdmin monta com a lista vazia', () => {
    render(
      <DataContext.Provider value={{ professores: [], students: [], turmas: [] }}>
        <ProfessoresAdmin />
      </DataContext.Provider>
    );
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('PageLoader e guard exportados', () => {
    render(<PageLoader />);
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
    expect(typeof RequireAdminAuth).toBe('function');
  });
});
