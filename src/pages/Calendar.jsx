import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, Modal } from '../components';

export default function Calendar() {
  const [calendarView, setCalendarView] = useState('month'); // 'month' ou 'year'
  const [agendaView, setAgendaView] = useState('week'); // 'day' ou 'week'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [teacherFilter, setTeacherFilter] = useState('all'); // 'all' ou nome do professor
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [eventForm, setEventForm] = useState({
    description: '',
    responsible: '',
    date: '',
    time: '',
    recurrence: 'none'
  });

  const teachers = [
    'Ruan Machado',
    'Bruna Amorim',
    'Barbara Santos',
    'Vera Machado',
    'Fernando Machado'
  ];
  
  const currentDate = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Meses
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Feriados Nacionais do Brasil
  const holidays = [
    { month: 0, day: 1, name: 'Ano Novo' },
    { month: 1, day: 24, name: 'Carnaval' },
    { month: 1, day: 25, name: 'Carnaval' },
    { month: 3, day: 18, name: 'Paixão de Cristo' },
    { month: 3, day: 21, name: 'Tiradentes' },
    { month: 4, day: 1, name: 'Dia do Trabalho' },
    { month: 5, day: 4, name: 'Corpus Christi' },
    { month: 8, day: 7, name: 'Independência do Brasil' },
    { month: 9, day: 12, name: 'Nossa Senhora Aparecida' },
    { month: 10, day: 2, name: 'Finados' },
    { month: 10, day: 15, name: 'Proclamação da República' },
    { month: 10, day: 20, name: 'Dia da Consciência Negra' },
    { month: 11, day: 25, name: 'Natal' }
  ];

  // Verificar se é feriado
  const isHoliday = (day) => {
    return holidays.find(h => h.month === currentMonth && h.day === day);
  };

  // Feriados do mês atual
  const monthHolidays = holidays.filter(h => h.month === currentMonth);

  // Navegação
  const goToPrevious = () => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    setSelectedDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    setSelectedDate(newDate);
  };

  const goToPreviousAgenda = () => {
    const newDate = new Date(selectedDate);
    if (agendaView === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (agendaView === 'week') newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextAgenda = () => {
    const newDate = new Date(selectedDate);
    if (agendaView === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (agendaView === 'week') newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    // Criar novo evento
    const newEvent = {
      id: Date.now(),
      ...eventForm
    };
    
    // Adicionar o evento ao array
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    
    // Mostrar mensagem de sucesso
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
    
    // Fechar modal e limpar formulário
    setShowEventModal(false);
    setEventForm({
      description: '',
      responsible: '',
      date: '',
      time: '',
      recurrence: 'none'
    });
    
    // Debug: verificar se o evento foi adicionado
    console.log('Evento adicionado:', newEvent);
    console.log('Total de eventos:', updatedEvents.length);
  };

  // Filtrar eventos por professor
  const getFilteredEvents = () => {
    if (teacherFilter === 'all') return [];
    return events.filter(event => event.responsible === teacherFilter);
  };

  // Obter eventos de um dia específico
  const getEventsForDay = (year, month, day) => {
    const filteredEvents = getFilteredEvents();
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === year &&
             eventDate.getMonth() === month &&
             eventDate.getDate() === day;
    });
  };

  // Primeiro dia do mês e total de dias
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Criar array de dias
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

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
            <h2 className="text-2xl font-bold">Calendário</h2>
            <p className="text-slate-600">Visualize feriados e datas importantes</p>
          </div>
          <button
            onClick={() => setShowEventModal(true)}
            className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-[#0048b3] transition-colors"
          >
            <Plus size={20} />
            Novo Evento
          </button>
        </div>

        {/* Toggle Calendário: Mês / Ano */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setCalendarView('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              calendarView === 'month' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setCalendarView('year')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              calendarView === 'year' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ano
          </button>
          <button
            onClick={goToToday}
            className="ml-auto px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            Hoje
          </button>
        </div>
      </Card>

      {/* Calendário */}
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={goToPrevious}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <h3 className="text-2xl font-bold text-center">
            {calendarView === 'month' && `${months[currentMonth]} ${currentYear}`}
            {calendarView === 'year' && `${currentYear}`}
          </h3>

          <button
            onClick={goToNext}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Grid do Calendário - Visualização Mês */}
        {calendarView === 'month' && (
          <div className="grid grid-cols-7 gap-2">
            {/* Cabeçalho dos dias da semana */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center font-bold text-slate-600 py-2 text-sm"
              >
                {day}
              </div>
            ))}

            {/* Dias do mês */}
            {days.map((day, index) => {
              const isToday = day === currentDate.getDate() && 
                             currentMonth === currentDate.getMonth() && 
                             currentYear === currentDate.getFullYear();
              const holiday = day ? isHoliday(day) : null;
              const dayEvents = day ? getEventsForDay(currentYear, currentMonth, day) : [];
              
              return (
                <div
                  key={index}
                  className={`
                    flex flex-col items-start justify-start rounded-lg relative p-2 min-h-24
                    ${day ? 'cursor-pointer' : ''}
                    ${isToday ? 'bg-[#005DE4] text-white font-bold hover:bg-[#0048b3]' : ''}
                    ${holiday && !isToday ? 'border-2' : ''}
                    ${!isToday && !holiday && day ? 'bg-slate-50 hover:bg-slate-100' : ''}
                    transition-colors
                  `}
                  style={holiday && !isToday ? {
                    backgroundColor: '#fce7f0',
                    borderColor: '#f30961'
                  } : isToday ? { backgroundColor: '#005DE4' } : {}}
                  title={holiday ? holiday.name : ''}
                >
                  {day && (
                    <>
                      <span className={`text-lg font-bold ${isToday ? 'text-white' : ''}`}
                            style={holiday && !isToday ? { color: '#f30961' } : {}}>
                        {day}
                      </span>
                      {holiday && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#f30961' } : {}}>
                          {holiday.name}
                        </div>
                      )}
                      {/* Eventos do dia */}
                      {dayEvents.length > 0 && (
                        <div className="w-full mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div 
                              key={event.id} 
                              className={`text-[9px] px-1 py-0.5 rounded truncate ${
                                isToday ? 'bg-white text-[#005DE4]' : 'bg-blue-100 text-blue-800'
                              }`}
                              title={`${event.time} - ${event.description}`}
                            >
                              {event.time} {event.description}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className={`text-[9px] ${isToday ? 'text-white' : 'text-slate-600'}`}>
                              +{dayEvents.length - 2} mais
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Visualização Ano */}
        {calendarView === 'year' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {months.map((month, monthIndex) => {
              const firstDay = new Date(currentYear, monthIndex, 1).getDay();
              const daysInThisMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
              const monthDays = [];
              
              // Preencher dias vazios no início
              for (let i = 0; i < firstDay; i++) {
                monthDays.push(null);
              }
              // Adicionar dias do mês
              for (let i = 1; i <= daysInThisMonth; i++) {
                monthDays.push(i);
              }
              
              const isCurrentMonth = monthIndex === currentDate.getMonth() && 
                                     currentYear === currentDate.getFullYear();
              
              const monthHolidaysList = holidays.filter(h => h.month === monthIndex);
              
              return (
                <div key={monthIndex} className={`p-3 rounded-lg border-2 ${
                  isCurrentMonth ? 'border-[#005DE4] bg-blue-50' : 'border-slate-200 bg-white'
                } shadow-sm hover:shadow-md transition-shadow`}>
                  {/* Nome do mês */}
                  <div className={`font-bold text-center mb-2 text-sm ${
                    isCurrentMonth ? 'text-[#005DE4]' : 'text-slate-900'
                  }`}>
                    {month}
                  </div>
                  
                  {/* Mini calendário */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {/* Cabeçalho simplificado */}
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                      <div key={idx} className="text-center text-[10px] font-semibold text-slate-500">
                        {day}
                      </div>
                    ))}
                    
                    {/* Dias do mês */}
                    {monthDays.map((day, index) => {
                      const isToday = day === currentDate.getDate() && 
                                     monthIndex === currentDate.getMonth() && 
                                     currentYear === currentDate.getFullYear();
                      const holiday = day ? holidays.find(h => h.month === monthIndex && h.day === day) : null;
                      
                      return (
                        <div
                          key={index}
                          className={`
                            aspect-square flex items-center justify-center rounded text-[10px]
                            ${day ? 'cursor-pointer' : ''}
                            ${isToday ? 'bg-[#005DE4] text-white font-bold' : ''}
                            ${holiday && !isToday ? 'font-bold' : ''}
                            ${!isToday && !holiday && day ? 'hover:bg-slate-100' : ''}
                          `}
                          style={holiday && !isToday ? { backgroundColor: '#fce7f0', color: '#f30961' } : {}}
                          title={holiday ? holiday.name : ''}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legenda de feriados do mês */}
                  {monthHolidaysList.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      {monthHolidaysList.map((holiday, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center"
                               style={{ backgroundColor: '#fce7f0', color: '#f30961' }}>
                            {holiday.day}
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight">
                            {holiday.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Indicador se tem o dia de hoje */}
                  {isCurrentMonth && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-start gap-1.5">
                        <div className="flex-shrink-0 w-4 h-4 bg-[#005DE4] rounded text-[9px] font-bold text-white flex items-center justify-center">
                          {currentDate.getDate()}
                        </div>
                        <div className="text-[10px] text-[#005DE4] font-semibold leading-tight">
                          Hoje
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ==================== AGENDA DOS PROFESSORES ==================== */}
      <Card>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Agenda dos Professores</h2>
          <p className="text-slate-600">Gerencie os horários e compromissos dos professores</p>
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
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 16 }, (_, i) => {
              const hour = i + 7;
              const hourStr = hour.toString().padStart(2, '0') + ':00';
              
              const dayEvents = getEventsForDay(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
              );
              
              const hourEvents = dayEvents.filter(event => 
                event.time.startsWith(hour.toString().padStart(2, '0'))
              );
              
              return (
                <div 
                  key={hour} 
                  className={`grid grid-cols-12 border-b last:border-b-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  } ${hourEvents.length > 0 ? 'bg-blue-50' : ''} hover:bg-blue-100 transition-colors`}
                >
                  <div className="col-span-2 border-r px-3 py-2 text-xs font-medium text-slate-600 flex items-center">
                    {hourStr}
                  </div>
                  <div className="col-span-10 px-3 py-2">
                    {hourEvents.length > 0 ? (
                      <div className="space-y-1">
                        {hourEvents.map(event => (
                          <div key={event.id} className="text-xs">
                            <div className="font-semibold text-[#005DE4]">
                              {event.time} - {event.description}
                            </div>
                            <div className="text-[10px] text-slate-600">
                              Professor: {event.responsible}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">Horário disponível</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Visualização Semana */}
        {agendaView === 'week' && (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-6 bg-slate-100 border-b">
              <div className="border-r px-3 py-3 text-xs font-bold text-slate-600">
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
                    className={`border-r last:border-r-0 px-3 py-3 text-xs font-bold text-center ${
                      isToday ? 'bg-[#005DE4] text-white' : 'text-slate-700'
                    }`}
                  >
                    <div>{day}</div>
                    <div className="text-[10px] font-normal mt-1">
                      {weekDay.getDate()}/{weekDay.getMonth() + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {Array.from({ length: 16 }, (_, i) => {
              const hour = i + 7;
              const hourStr = hour.toString().padStart(2, '0');
              
              return (
                <div 
                  key={hour}
                  className={`grid grid-cols-6 border-b last:border-b-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <div className="border-r px-3 py-2 text-xs font-medium text-slate-600 flex items-center">
                    {hourStr}:00
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
                    
                    const hourEvents = dayEvents.filter(event => 
                      event.time.startsWith(hourStr)
                    );
                    
                    return (
                      <div 
                        key={dayIdx}
                        className={`border-r last:border-r-0 px-2 py-2 text-[10px] hover:bg-blue-50 cursor-pointer transition-colors ${
                          hourEvents.length > 0 ? 'bg-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {hourEvents.length > 0 ? (
                          <div className="space-y-1">
                            {hourEvents.map(event => (
                              <div key={event.id} className="text-[9px] text-blue-800 font-semibold truncate" title={`${event.time} - ${event.description} (${event.responsible})`}>
                                {event.description}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Novo Evento */}
      {showEventModal && (
        <Modal open={showEventModal} setOpen={setShowEventModal}>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Novo Evento</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              
              {/* Descrição do Evento */}
              <div>
                <label className="block text-sm font-semibold mb-2">Descrição do Evento</label>
                <input
                  type="text"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="Ex: Aula de Inglês Intermediário"
                  required
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-sm font-semibold mb-2">Responsável (Professor)</label>
                <select
                  value={eventForm.responsible}
                  onChange={(e) => setEventForm({ ...eventForm, responsible: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  required
                >
                  <option value="">Selecione um professor</option>
                  {teachers.map(teacher => (
                    <option key={teacher} value={teacher}>{teacher}</option>
                  ))}
                </select>
              </div>

              {/* Dia e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Dia</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Hora</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                    required
                  />
                </div>
              </div>

              {/* Recorrência */}
              <div>
                <label className="block text-sm font-semibold mb-2">Recorrência</label>
                <select
                  value={eventForm.recurrence}
                  onChange={(e) => setEventForm({ ...eventForm, recurrence: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="none">Não se repete</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                  <option value="yearly">Anualmente</option>
                </select>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#005DE4] text-white rounded-lg hover:bg-[#0048b3] transition-colors font-semibold"
                >
                  Criar Evento
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
