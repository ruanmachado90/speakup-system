import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit2 } from 'lucide-react';
import { Card, Modal } from '../components';

// Constantes
const HOUR_HEIGHT = 48;
const EVENT_WIDTH_PERCENTAGE = 95;


export default function AgendaProfessores() {
      // Buscar eventos do Firestore ao carregar a página
      useEffect(() => {
        async function fetchEvents() {
          try {
            const snapshot = await getDocs(collection(db, 'agendaEventos'));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(data);
          } catch (err) {
            console.error('Erro ao buscar eventos do Firestore:', err);
          }
        }
        fetchEvents();
      }, []);
    // Estado para visualização da agenda (dia/semana)
    const [agendaView, setAgendaView] = useState('day');
  // Estado para os eventos
  const [events, setEvents] = useState([]);
  // Lista de professores únicos para o filtro
  const teachers = Array.from(new Set(events.map(e => e.responsible).filter(Boolean)));
  // Estado para filtro de professor
  const [teacherFilter, setTeacherFilter] = useState('all');
  // Estado para mensagem de sucesso
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
    // Estado para modal de evento
    const [showEventModal, setShowEventModal] = useState(false);
    // Estado para evento em edição
    const [editingEvent, setEditingEvent] = useState(null);
    // Estado do formulário de evento
    const [eventForm, setEventForm] = useState({
      description: '',
      responsible: '',
      date: '',
      time: '',
      endTime: '',
      recurrence: 'none'
    });
    // Estado para erros do formulário
    const [formErrors, setFormErrors] = useState({});
    // Estado para data selecionada
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Meses do ano
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    // Data atual
    const currentDate = new Date();
    // Funções de navegação da agenda
    const goToPreviousAgenda = () => {
      if (agendaView === 'day') {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
      } else {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 7);
        setSelectedDate(prev);
      }
    };
    const goToNextAgenda = () => {
      if (agendaView === 'day') {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
      } else {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 7);
        setSelectedDate(next);
      }
    };
  // ...existing code...
  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    const eventsToAdd = [];
    const baseEvent = {
      id: editingEvent ? editingEvent.id : Date.now(),
      description: eventForm.description,
      responsible: eventForm.responsible,
      date: eventForm.date,
      time: eventForm.time,
      endTime: eventForm.endTime,
      recurrence: eventForm.recurrence
    };
    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? baseEvent : e));
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    } else {
      eventsToAdd.push(baseEvent);
      if (eventForm.recurrence !== 'none') {
        const startDate = new Date(eventForm.date);
        const occurrences = 10;
        for (let i = 1; i <= occurrences; i++) {
          const newDate = new Date(startDate);
          if (eventForm.recurrence === 'daily') newDate.setDate(startDate.getDate() + i);
          else if (eventForm.recurrence === 'weekly') newDate.setDate(startDate.getDate() + (i * 7));
          else if (eventForm.recurrence === 'monthly') newDate.setMonth(startDate.getMonth() + i);
          else if (eventForm.recurrence === 'yearly') newDate.setFullYear(startDate.getFullYear() + i);
          const formattedDate = newDate.toISOString().split('T')[0];
          eventsToAdd.push({
            id: Date.now() + i,
            description: eventForm.description,
            responsible: eventForm.responsible,
            date: formattedDate,
            time: eventForm.time,
            endTime: eventForm.endTime,
            recurrence: eventForm.recurrence
          });
        }
      }
      const updatedEvents = [...events, ...eventsToAdd];
      setEvents(updatedEvents);
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    }
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm({
      description: '',
      responsible: '',
      date: '',
      time: '',
      endTime: '',
      recurrence: 'none'
    });
    setFormErrors({});
  };
  // ...existing code...

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      description: event.description,
      responsible: event.responsible,
      date: event.date,
      time: event.time,
      endTime: event.endTime || '',
      recurrence: event.recurrence || 'none'
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Deseja realmente excluir este evento?')) {
      try {
        await deleteDoc(doc(db, 'agendaEventos', eventId));
        setEvents(events.filter(event => event.id !== eventId));
      } catch (err) {
        alert('Erro ao deletar evento no Firebase!');
        console.error(err);
      }
    }
  };

  // Imprimir PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Filtrar eventos por professor
  const getFilteredEvents = useMemo(() => {
    if (teacherFilter === 'all') return events;
    return events.filter(event => event.responsible === teacherFilter);
  }, [events, teacherFilter]);

  // Obter eventos de um dia específico
  const getEventsForDay = (year, month, day) => {
    return getFilteredEvents.filter(event => {
      // Parse da data no formato YYYY-MM-DD
      const [eventYear, eventMonth, eventDay] = event.date.split('-').map(Number);
      return eventYear === year &&
             eventMonth === (month + 1) && // month é 0-indexed
             eventDay === day;
    });
  };

  // Funções auxiliares para cálculos de eventos
  const getEventDurationInHours = (event) => {
    if (!event.endTime) return 1;
    const startHour = parseInt(event.time.split(':')[0]);
    const startMinute = parseInt(event.time.split(':')[1]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const endMinute = parseInt(event.endTime.split(':')[1]);
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    return (endInMinutes - startInMinutes) / 60;
  };

  const isHourOccupiedByEvent = (event, hour) => {
    const eventStartHour = parseInt(event.time.split(':')[0]);
    if (!event.endTime) return eventStartHour === hour;
    const eventEndHour = parseInt(event.endTime.split(':')[0]);
    const eventEndMinute = parseInt(event.endTime.split(':')[1]);
    const eventEndInHours = eventEndMinute > 0 ? eventEndHour + 1 : eventEndHour;
    return hour >= eventStartHour && hour < eventEndInHours;
  };

  const isHourOccupied = (dayEvents, hour) => {
    return dayEvents.some(event => isHourOccupiedByEvent(event, hour));
  };

  const shouldHideHourBorder = (dayEvents, hour) => {
    const currentOccupied = isHourOccupied(dayEvents, hour);
    const nextOccupied = isHourOccupied(dayEvents, hour + 1);
    return currentOccupied && nextOccupied;
  };

  return (
    <div className="space-y-6">
      {/* Mensagem de Sucesso */}
      {showSuccessMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">Evento registrado com sucesso!</span>
        </div>
      )}

      {/* Header Info */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <CalendarIcon className="text-[#005DE4]" size={32} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Agenda dos Professores</h2>
            <p className="text-slate-600">Gerencie os horários e compromissos dos professores</p>
          </div>
          <button
            onClick={() => setShowEventModal(true)}
            className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-[#0048b3] transition-colors"
          >
            <Plus size={20} />
            Novo Evento
          </button>
          <button
            onClick={handlePrintPDF}
            className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-orange-600 transition-colors ml-auto"
            title="Imprimir em PDF"
          >
            🖨️ Imprimir
          </button>
        </div>

        {/* Filtro de Professor */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Filtrar por Professor:</label>
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="w-full md:w-64 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
          >
            <option value="all">Todos os professores</option>
            {teachers.map(teacher => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
        </div>

        {/* Toggle Agenda: Dia / Semana */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAgendaView('day')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              agendaView === 'day' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setAgendaView('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              agendaView === 'week' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semana
          </button>
        </div>

        {/* Navegação da Agenda */}
        <div className="mb-6 flex items-center justify-between border-t pt-4">
          <button
            onClick={goToPreviousAgenda}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <h3 className="text-xl font-bold text-center">
            {agendaView === 'day' && `${selectedDate.getDate()} de ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
            {agendaView === 'week' && `Semana de ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
          </h3>

          <button
            onClick={goToNextAgenda}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Visualização Dia */}
        {agendaView === 'day' && (
          <div className="border rounded-lg overflow-hidden relative">
            {(() => {
              const startHour = 7;
              const endHour = 22;
              const interval = 30; // minutos
              const slots = [];
              for (let h = startHour; h < endHour; h++) {
                slots.push({ hour: h, min: 0 });
                slots.push({ hour: h, min: 30 });
              }
              slots.push({ hour: endHour, min: 0 });
              return slots.map(({ hour, min }, i) => {
                const hourStr = hour.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');

                const dayEvents = getEventsForDay(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth(),
                  selectedDate.getDate()
                );

                // Pegar apenas eventos que começam neste horário exato
                const eventsStartingHere = dayEvents.filter(event => {
                  const [eventHour, eventMin] = event.time.split(':').map(Number);
                  return eventHour === hour && eventMin === min;
                });

                // Verificar se há algum evento ocupando este slot
                const occupied = dayEvents.some(event => {
                  const [startH, startM] = event.time.split(':').map(Number);
                  const [endH, endM] = event.endTime ? event.endTime.split(':').map(Number) : [startH, startM + 60];
                  const start = startH * 60 + startM;
                  const end = endH * 60 + endM;
                  const slot = hour * 60 + min;
                  return slot >= start && slot < end;
                });

                return (
                <div
                  key={hourStr}
                  className={`grid grid-cols-12 border-b last:border-b-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  } transition-colors relative`}
                  style={{
                    backgroundColor: occupied ? '#FFF9E6' : undefined,
                    minHeight: '32px'
                  }}
                >
                  <div className="col-span-2 border-r px-2 py-1 text-[10px] font-medium text-slate-600 flex items-center">
                    {hourStr}
                  </div>
                  <div className="col-span-10 px-2 py-1 relative flex items-center">
                    {eventsStartingHere.length > 0 ? (
                      <div className="w-full">
                        {eventsStartingHere.map((event, eventIndex) => {
                          const totalEventsHere = eventsStartingHere.length;
                          const eventWidth = totalEventsHere > 1 ? `${95 / totalEventsHere}%` : 'calc(100% - 12px)';
                          const eventLeft = totalEventsHere > 1 ? `${(eventIndex * 95) / totalEventsHere}%` : '6px';

                          return (
                            <div
                              key={event.id}
                              className="p-1 bg-white rounded border-l-4 border-[#FFD700]"
                              style={{
                                width: eventWidth,
                                marginLeft: eventLeft,
                                display: 'inline-block'
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex-1">
                                  <div className="text-[10px] text-[#005DE4]">
                                    {event.time} {event.endTime && `- ${event.endTime}`}
                                  </div>
                                  <div className="font-extrabold text-[#222] text-[15px] leading-tight mt-0.5 mb-0.5">
                                    {event.description}
                                  </div>
                                  <div className="text-[9px] text-slate-600 mt-0.5">
                                    Professor: {event.responsible}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                    title="Editar evento"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                                    title="Excluir evento"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : !occupied ? (
                      <div className="text-xs text-slate-500">Horário disponível</div>
                    ) : null}
                  </div>
                </div>
                );
              });
            })()}
          </div>
        )}

        {/* Visualização Semana */}
        {agendaView === 'week' && (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-6 bg-slate-100 border-b">
              <div className="border-r px-2 py-2 text-[10px] font-bold text-slate-600">
                Horário
              </div>
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day, idx) => {
                const weekDay = new Date(selectedDate);
                const dayOffset = idx + 1;
                const firstDayOfWeek = selectedDate.getDate() - selectedDate.getDay();
                weekDay.setDate(firstDayOfWeek + dayOffset);
                const isToday = weekDay.toDateString() === currentDate.toDateString();
                return (
                  <div
                    key={day}
                    className={`border-r last:border-r-0 px-2 py-2 text-[10px] font-bold text-center ${
                      isToday ? 'bg-[#005DE4] text-white' : 'text-slate-700'
                    }`}
                  >
                    <div>{day}</div>
                    <div className="text-[9px] font-normal mt-0.5">
                      {weekDay.getDate()}/{weekDay.getMonth() + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gera slots de 30 em 30 minutos das 07:00 às 22:00 */}
            {(() => {
              const startHour = 7;
              const endHour = 22;
              const interval = 30; // minutos
              const slots = [];
              for (let h = startHour; h < endHour; h++) {
                slots.push({ hour: h, min: 0 });
                slots.push({ hour: h, min: 30 });
              }
              slots.push({ hour: endHour, min: 0 });
              return slots.map(({ hour, min }, i) => {
                const hourStr = hour.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
                return (
                  <div
                    key={hourStr}
                    className={`grid grid-cols-6 border-b last:border-b-0 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                    style={{ minHeight: '32px' }}
                  >
                    <div className="border-r px-2 py-1 text-[10px] font-medium text-slate-600 flex items-center">
                      {hourStr}
                    </div>
                    {[1, 2, 3, 4, 5].map((dayIdx) => {
                      const weekDay = new Date(selectedDate);
                      const firstDayOfWeek = selectedDate.getDate() - selectedDate.getDay();
                      weekDay.setDate(firstDayOfWeek + dayIdx);
                      const dayEvents = getEventsForDay(
                        weekDay.getFullYear(),
                        weekDay.getMonth(),
                        weekDay.getDate()
                      );
                      // Pegar apenas eventos que começam neste horário exato
                      const eventsStartingHere = dayEvents.filter(event => {
                        const [eventHour, eventMin] = event.time.split(':').map(Number);
                        return eventHour === hour && eventMin === min;
                      });
                      // Verificar se há algum evento ocupando este slot
                      const occupied = dayEvents.some(event => {
                        const [startH, startM] = event.time.split(':').map(Number);
                        const [endH, endM] = event.endTime ? event.endTime.split(':').map(Number) : [startH, startM + 60];
                        const start = startH * 60 + startM;
                        const end = endH * 60 + endM;
                        const slot = hour * 60 + min;
                        return slot >= start && slot < end;
                      });
                      return (
                        <div
                          key={dayIdx}
                          className={`border-r last:border-r-0 px-1 py-1 text-[9px] transition-colors relative flex items-center ${
                            !occupied ? 'text-slate-500' : ''
                          }`}
                          style={{ backgroundColor: occupied ? '#FFF9E6' : undefined }}
                        >
                          {eventsStartingHere.length > 0 ? (
                            <div className="space-y-1 w-full">
                              {eventsStartingHere.map(event => (
                                <div
                                  key={event.id}
                                  className="p-1 bg-white rounded border-l-2 border-[#FFD700]"
                                  style={{ minHeight: '24px' }}
                                >
                                  <div className="h-full flex flex-col justify-center">
                                    <div className="text-[9px] text-[#005DE4]">
                                      {event.time}{event.endTime && ` - ${event.endTime}`}
                                    </div>
                                    <div className="font-extrabold text-[#222] text-[13px] leading-tight mt-0.5 mb-0.5 truncate">
                                      {event.description}
                                    </div>
                                    <div className="text-[8px] text-slate-700 truncate">
                                      Professor: {event.responsible}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      <button
                                        onClick={() => handleEditEvent(event)}
                                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                        title="Editar evento"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                                        title="Excluir evento"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : !occupied ? (
                            '-'
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Card>

      {/* Modal Novo/Editar Evento */}
      {showEventModal && (
        <Modal open={showEventModal} setOpen={() => {
          setShowEventModal(false);
          setEditingEvent(null);
          setFormErrors({});
        }}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
            
            {/* Alerta de conflito */}
            {formErrors.conflict && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ⚠️ {formErrors.conflict}
              </div>
            )}
            
            <form onSubmit={handleEventSubmit} className="space-y-4">
              
              {/* Descrição do Evento */}
              <div>
                <label className="block text-sm font-semibold mb-2">Descrição do Evento</label>
                <input
                  type="text"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] ${formErrors.description ? 'border-red-500' : ''}`}
                  placeholder="Ex: Aula de Inglês Intermediário"
                  required
                />
                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-sm font-semibold mb-2">Responsável (Professor)</label>
                <select
                  value={eventForm.responsible}
                  onChange={(e) => setEventForm({ ...eventForm, responsible: e.target.value })}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] ${formErrors.responsible ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Selecione um professor</option>
                  {teachers.map(teacher => (
                    <option key={teacher} value={teacher}>{teacher}</option>
                  ))}
                </select>
                {formErrors.responsible && <p className="text-red-500 text-xs mt-1">{formErrors.responsible}</p>}
              </div>

              {/* Dia e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Dia</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] ${formErrors.date ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Hora de Início</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] ${formErrors.time ? 'border-red-500' : ''}`}
                    required
                  />
                  {formErrors.time && <p className="text-red-500 text-xs mt-1">{formErrors.time}</p>}
                </div>
              </div>

              {/* Hora de Término */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Hora de Término</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] ${formErrors.endTime ? 'border-red-500' : ''}`}
                  />
                  {formErrors.endTime ? (
                    <p className="text-red-500 text-xs mt-1">{formErrors.endTime}</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Opcional</p>
                  )}
                </div>
                <div></div>
              </div>

              {/* Recorrência */}
              <div>
                <label className="block text-sm font-semibold mb-2">Recorrência</label>
                <select
                  value={eventForm.recurrence}
                  onChange={(e) => setEventForm({ ...eventForm, recurrence: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  disabled={editingEvent !== null}
                >
                  <option value="none">Não se repete</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                  <option value="yearly">Anualmente</option>
                </select>
                {editingEvent && <p className="text-xs text-slate-500 mt-1">Recorrência não pode ser editada</p>}
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                    setFormErrors({});
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0048b3] transition-colors font-semibold"
                >
                  {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
