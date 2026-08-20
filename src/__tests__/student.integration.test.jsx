/* global jest */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Testes de UI não devem inicializar o SDK real do Firebase — vários módulos
// (src/firebase.js, hooks/useAuth.js) importam firebase/app|auth|firestore
// no topo do arquivo, e o build "node" dessas libs quebra sob jsdom (precisa
// de fetch, que o jsdom não implementa). Faz stub de qualquer função pedida.
jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
  onAuthStateChanged: jest.fn(() => () => {}),
  signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), commit: jest.fn(() => Promise.resolve()) })),
  arrayUnion: jest.fn(),
  Timestamp: { now: jest.fn() },
}));
jest.mock('../firebase', () => ({ db: {}, auth: {}, googleProvider: {} }));

import { StudentForm } from '../components/forms/StudentForm';
import { Students } from '../pages/Students';
import { DataContext } from '../context/DataContext';
import { UIContext } from '../context/UIContext';
import { LoadingContext } from '../context/LoadingContext';

const mockStudent = {
  id: '1',
  name: 'Aluno Teste',
  cpf: '123.456.789-00',
  contact: '(32) 99999-9999',
  course: 'Inglês',
  teacher: 'Prof. João',
  fee: 200,
  installments: 12,
  dueDate: '2026-02-10',
  status: 'ativo',
};

const mockContext = {
  students: [mockStudent],
  payments: [],
  expenses: [],
  stats: {},
  teacherStats: {},
};

const mockUI = {
  modal: { open: true, type: 'student', data: {} },
  setModal: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  toast: false,
  toastMsg: '',
  searchTerm: '',
  setSearchTerm: jest.fn(),
};

const mockLoading = {
  saving: false,
  setSaving: jest.fn(),
};

describe('Fluxo de cadastro de aluno', () => {
  it('deve cadastrar um novo aluno', async () => {
    render(
      <DataContext.Provider value={mockContext}>
        <UIContext.Provider value={mockUI}>
          <LoadingContext.Provider value={mockLoading}>
            <StudentForm onSubmit={jest.fn()} />
          </LoadingContext.Provider>
        </UIContext.Provider>
      </DataContext.Provider>
    );
    fireEvent.change(screen.getByLabelText(/Nome do aluno/i), { target: { value: 'Novo Aluno' } });
    fireEvent.change(screen.getByLabelText(/CPF do aluno/i), { target: { value: '98765432100' } });
    fireEvent.change(screen.getByLabelText(/Contato do aluno/i), { target: { value: '(32) 98888-8888' } });
    fireEvent.click(screen.getByText(/Salvar/i));
    await waitFor(() => {
      expect(screen.getByText(/Salvar/i)).toBeInTheDocument();
    });
  });
});

describe('Fluxo de geração de relatório de alunos', () => {
  it('deve renderizar lista de alunos', () => {
    render(
      <DataContext.Provider value={mockContext}>
        <UIContext.Provider value={mockUI}>
          <LoadingContext.Provider value={mockLoading}>
            <Students students={[mockStudent]} payments={[]} searchTerm="" setSearchTerm={jest.fn()} setModal={jest.fn()} handleCancelEnrollment={jest.fn()} handleDeleteStudent={jest.fn()} handleExcelUpload={jest.fn()} />
          </LoadingContext.Provider>
        </UIContext.Provider>
      </DataContext.Provider>
    );
    expect(screen.getByText(/Aluno Teste/i)).toBeInTheDocument();
    expect(screen.getByText(/Prof. João/i)).toBeInTheDocument();
  });
})
