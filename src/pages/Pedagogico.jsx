import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card } from '../components';
import { Edit2, Trash2, X } from 'lucide-react';

function getWeekDay(dateStr) {
  if (!dateStr) return '';
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dias[date.getDay()];
}

export default function Pedagogico() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [professorFilter, setProfessorFilter] = useState('');
  const [editEvent, setEditEvent] = useState(null);
  const [searchStudent, setSearchStudent] = useState('');
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [alunosCadastrados, setAlunosCadastrados] = useState([]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'agendaEventos'), orderBy('date'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Buscar alunos cadastrados do Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlunosCadastrados(data);
    });
    return () => unsubscribe();
  }, []);

  // Get unique professors for filter dropdown
  const professors = Array.from(new Set(events.map(e => e.responsible).filter(Boolean)));
  // Filter events by professor if needed
  const filteredEvents = professorFilter
    ? events.filter(e => e.responsible === professorFilter)
    : events;
  // Get only one example per unique event description
  const uniqueEvents = Object.values(
    filteredEvents.reduce((acc, event) => {
      if (!acc[event.description]) acc[event.description] = event;
      return acc;
    }, {})
  );

  // Placeholder: alunos por evento (mock)
  const getAlunos = (event) => [
    'Aluno 1',
    'Aluno 2',
    'Aluno 3'
  ];

  // Estado para exibir ou não a lista de alunos cadastrados
  const [showAlunosList, setShowAlunosList] = useState(false);

  // Adiciona aluno à turma (mock)
  const handleAddAluno = (aluno) => {
    if (!alunosTurma.some(a => a.id === aluno.id)) {
      setAlunosTurma([...alunosTurma, aluno]);
    }
    setSearchStudent('');
  };

  // Abre modal e carrega alunos da turma (mock)
  const handleEdit = (event) => {
    setEditEvent(event);
    setAlunosTurma(getAlunos(event).map((name, idx) => ({ id: String(idx), name })));
    setSearchStudent('');
  };

  // Remove aluno da turma (mock)
  const handleRemoveAluno = (id) => {
    setAlunosTurma(alunosTurma.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 p-4">
      {/* Subheader TURMAS */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#005DE4] uppercase tracking-tight">TURMAS</h2>
      </div>
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
        <label className="block text-sm font-semibold mb-2 md:mb-0">Filtrar por professor:</label>
        <select
          value={professorFilter}
          onChange={e => setProfessorFilter(e.target.value)}
          className="w-full md:w-64 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        >
          <option value="">Todos</option>
          {professors.map(prof => (
            <option key={prof} value={prof}>{prof}</option>
          ))}
        </select>
        {professorFilter && (
          <button
            type="button"
            onClick={() => setProfessorFilter('')}
            className="ml-2 px-3 py-2 bg-slate-200 rounded-lg text-slate-700 hover:bg-slate-300 transition-colors text-xs font-semibold"
          >Limpar filtro</button>
        )}
      </div>
      {loading ? (
        <div className="text-center text-slate-500">Carregando eventos...</div>
      ) : uniqueEvents.length === 0 ? (
        <div className="text-center text-slate-500">Nenhum evento encontrado.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uniqueEvents.map(event => (
            <Card key={event.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-[#005DE4] text-lg">{event.description}</div>
                <div className="flex gap-1">
                  <button className="p-1 rounded hover:bg-blue-100 transition" title="Editar evento" onClick={() => handleEdit(event)}>
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 rounded hover:bg-red-100 transition" title="Excluir evento">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-700">Professor: <span className="font-bold">{event.responsible}</span></div>
              <div className="text-sm text-slate-600">Dia da semana: {getWeekDay(event.date)}</div>
              <div className="text-sm text-slate-600">Horário: {event.time}{event.endTime && ` - ${event.endTime}`}</div>
              <div className="mt-2">
                <div className="text-xs font-semibold text-slate-500 mb-1">Alunos:</div>
                <ul className="list-disc list-inside text-sm text-slate-700">
                  {getAlunos(event).map((aluno, idx) => (
                    <li key={idx}>{aluno}</li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de edição de turma */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
            <button className="absolute top-2 right-2 p-2" onClick={() => setEditEvent(null)}>
              <X className="w-5 h-5 text-slate-500" />
            </button>
            {/* Cabeçalho modelo */}
            <div className="flex items-center gap-4 border-b pb-2 mb-4">
              <img src="/logo192.png" alt="Logo" className="h-12 w-12 object-contain" />
              <div className="flex-1 text-center">
                <div className="font-bold text-lg">SPEAKUP ENGLISH LANGUAGE ACADEMY</div>
                <div className="text-xs">Praça Governador Valadares 119, Centro - Cataguases MG</div>
                <div className="text-xs">CNPJ: 28.649.636/0001-88</div>
              </div>
            </div>
            <table className="w-full text-sm border mb-4">
              <tbody>
                <tr>
                  <td className="border px-2 py-1 font-semibold">Turma</td>
                  <td className="border px-2 py-1">{editEvent.description}</td>
                  <td className="border px-2 py-1 font-semibold">Mês:</td>
                  <td className="border px-2 py-1">{new Date(editEvent.date).toLocaleString('pt-BR', { month: 'long' })}</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-semibold">Nível</td>
                  <td className="border px-2 py-1">-</td>
                  <td className="border px-2 py-1 font-semibold">Dia:</td>
                  <td className="border px-2 py-1">{getWeekDay(editEvent.date)}</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1 font-semibold">Professor:</td>
                  <td className="border px-2 py-1">{editEvent.responsible}</td>
                  <td className="border px-2 py-1 font-semibold">Horário:</td>
                  <td className="border px-2 py-1">{editEvent.time}{editEvent.endTime && ` - ${editEvent.endTime}`}</td>
                </tr>
              </tbody>
            </table>
            {/* Barra de pesquisa e adicionar aluno */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Adicionar aluno à turma</label>
              <button
                className="bg-[#005DE4] text-white px-4 py-2 rounded-lg font-bold mb-2"
                onClick={() => setShowAlunosList(v => !v)}
              >{showAlunosList ? 'Fechar lista de alunos' : 'Mostrar lista de alunos'}</button>
              {showAlunosList && (
                <ul className="border rounded-lg mt-2 bg-white max-h-40 overflow-y-auto">
                  {alunosCadastrados.length > 0 ? (
                    alunosCadastrados.map((aluno, idx) => (
                      <li
                        key={aluno.id || `${aluno.name}-${idx}`}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleAddAluno(aluno)}
                      >{aluno.name}</li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-slate-400">Nenhum aluno cadastrado</li>
                  )}
                </ul>
              )}
            </div>
            {/* Lista de alunos da turma */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">Alunos da turma:</div>
              <ul className="list-disc list-inside text-sm text-slate-700">
                {alunosTurma.map((aluno, idx) => (
                  <li key={aluno.id || `${aluno.name}-${idx}`} className="flex items-center justify-between">
                    <span>{aluno.name}</span>
                    <button className="ml-2 text-red-500 hover:text-red-700" onClick={() => handleRemoveAluno(aluno.id)}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
