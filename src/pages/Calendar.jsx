import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components';

export default function Calendar() {
  const [calendarView, setCalendarView] = useState('month'); // 'month' ou 'year'
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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

  // Feriados Nacionais do Brasil - 2026
  const holidays = [
    { month: 0, day: 1, name: 'Confraternização Universal' },
    { month: 1, day: 17, name: 'Carnaval' },
    { month: 3, day: 3, name: 'Sexta-feira Santa' },
    { month: 3, day: 21, name: 'Tiradentes' },
    { month: 4, day: 1, name: 'Dia do Trabalho' },
    { month: 5, day: 4, name: 'Corpus Christi' },
    { month: 8, day: 7, name: 'Independência do Brasil' },
    { month: 9, day: 12, name: 'Nossa Senhora Aparecida' },
    { month: 10, day: 2, name: 'Finados' },
    { month: 10, day: 15, name: 'Proclamação da República' },
    { month: 10, day: 20, name: 'Consciência Negra' },
    { month: 11, day: 25, name: 'Natal' }
  ];

  // Recesso Escolar
  const schoolBreak = [
    { month: 1, startDay: 14, endDay: 20, name: 'Recesso Escolar' },
    { month: 3, startDay: 20, endDay: 20, name: 'Recesso Escolar' },
    { month: 5, startDay: 5, endDay: 6, name: 'Recesso Escolar' },
    { month: 6, startDay: 18, endDay: 31, name: 'Férias Escolares' },
    { month: 9, startDay: 12, endDay: 16, name: 'Recesso Escolar - Semana da Criança' },
    { month: 11, startDay: 13, endDay: 31, name: 'Férias Escolares' }
  ];

  // Semanas de Prova
  const examWeeks = [
    { month: 6, startDay: 13, endDay: 17, name: 'Semana de Prova (Listening / Speaking)' },
    { month: 11, startDay: 7, endDay: 12, name: 'Semana de Prova (Listening / Speaking)' }
  ];

  // Períodos de Recuperação
  const recoveryPeriods = [
    { month: 11, startDay: 13, endDay: 17, name: 'Recuperação' }
  ];

  // Eventos Escolares Importantes
  const schoolEvents = [
    { month: 1, day: 2, name: 'Início do ano letivo' },
    { month: 6, day: 18, name: 'Encerramento do 1º semestre' },
    { month: 7, day: 1, name: 'Início do 2º semestre' },
    { month: 11, day: 18, name: 'Encerramento do ano letivo' }
  ];

  // Verificar se é feriado
  const isHoliday = (day) => {
    return holidays.find(h => h.month === currentMonth && h.day === day);
  };

  // Verificar se é recesso escolar
  const isSchoolBreak = (day) => {
    return schoolBreak.find(sb => 
      sb.month === currentMonth && 
      day >= sb.startDay && 
      day <= sb.endDay
    );
  };

  // Verificar se é semana de prova
  const isExamWeek = (day) => {
    return examWeeks.find(ew => 
      ew.month === currentMonth && 
      day >= ew.startDay && 
      day <= ew.endDay
    );
  };

  // Verificar se é período de recuperação
  const isRecoveryPeriod = (day) => {
    return recoveryPeriods.find(rp => 
      rp.month === currentMonth && 
      day >= rp.startDay && 
      day <= rp.endDay
    );
  };

  // Verificar se é evento escolar importante
  const isSchoolEvent = (day) => {
    return schoolEvents.find(se => se.month === currentMonth && se.day === day);
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

  const goToToday = () => {
    setSelectedDate(new Date());
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
      {/* Header Info */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <CalendarIcon className="text-[#005DE4]" size={32} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Calendário</h2>
            <p className="text-slate-600">Visualize feriados e datas importantes</p>
          </div>
        </div>

        {/* Toggle Calendário: Mês / Ano */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setCalendarView('month')}
            className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base ${
              calendarView === 'month' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setCalendarView('year')}
            className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base ${
              calendarView === 'year' 
                ? 'bg-[#005DE4] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ano
          </button>
          <button
            onClick={goToToday}
            className="px-3 md:px-4 py-2 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors text-sm md:text-base"
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
              const schoolBreakDay = day ? isSchoolBreak(day) : null;
              const examWeek = day ? isExamWeek(day) : null;
              const recoveryPeriod = day ? isRecoveryPeriod(day) : null;
              const schoolEvent = day ? isSchoolEvent(day) : null;
              
              return (
                <div
                  key={index}
                  className={`
                    flex flex-col items-center justify-center rounded-lg relative p-2 min-h-24
                    ${day ? 'cursor-pointer' : ''}
                    ${isToday ? 'bg-[#005DE4] text-white font-bold hover:bg-[#0048b3]' : ''}
                    ${holiday && !isToday ? 'border-2' : ''}
                    ${schoolEvent && !isToday ? 'border-2 border-[#005DE4]' : ''}
                    ${schoolBreakDay && !isToday && !examWeek && !recoveryPeriod ? 'bg-slate-200' : ''}
                    ${examWeek && !isToday ? 'bg-[#ffae1e]' : ''}
                    ${recoveryPeriod && !isToday ? 'bg-[#e6f2ff]' : ''}
                    ${!isToday && !holiday && !schoolBreakDay && !schoolEvent && !examWeek && !recoveryPeriod && day ? 'bg-slate-50 hover:bg-slate-100' : ''}
                    transition-colors
                  `}
                  style={holiday && !isToday ? {
                    backgroundColor: '#fce7f0',
                    borderColor: '#f30961'
                  } : isToday ? { backgroundColor: '#005DE4' } : recoveryPeriod && !isToday ? {
                    backgroundColor: '#e6f2ff'
                  } : examWeek && !isToday ? {
                    backgroundColor: '#ffae1e'
                  } : schoolBreakDay && !isToday ? {
                    backgroundColor: '#e2e8f0'
                  } : {}}
                  title={holiday ? holiday.name : recoveryPeriod ? recoveryPeriod.name : examWeek ? examWeek.name : schoolBreakDay ? schoolBreakDay.name : schoolEvent ? schoolEvent.name : ''}
                >
                  {day && (
                    <>
                      <span className={`text-lg font-bold ${isToday ? 'text-white' : ''}`}
                            style={holiday && !isToday ? { color: '#f30961' } : recoveryPeriod && !isToday ? { color: '#005DE4' } : examWeek && !isToday ? { color: '#b8860b' } : schoolBreakDay && !isToday ? { color: '#64748b' } : schoolEvent && !isToday ? { color: '#005DE4' } : {}}>
                        {day}
                      </span>
                      {holiday && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#f30961' } : {}}>
                          {holiday.name}
                        </div>
                      )}
                      {recoveryPeriod && !holiday && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full font-semibold ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#005DE4' } : {}}>
                          {recoveryPeriod.name}
                        </div>
                      )}
                      {examWeek && !holiday && !recoveryPeriod && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full font-semibold ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#b8860b' } : {}}>
                          {examWeek.name}
                        </div>
                      )}
                      {schoolBreakDay && !holiday && !examWeek && !recoveryPeriod && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#64748b' } : {}}>
                          {schoolBreakDay.name}
                        </div>
                      )}
                      {schoolEvent && !holiday && !examWeek && !recoveryPeriod && (
                        <div className={`text-[10px] text-center mt-1 leading-tight w-full font-semibold ${isToday ? 'text-white' : ''}`}
                             style={!isToday ? { color: '#005DE4' } : {}}>
                          {schoolEvent.name}
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
              const monthSchoolBreakList = schoolBreak.filter(sb => sb.month === monthIndex);
              const monthExamWeeksList = examWeeks.filter(ew => ew.month === monthIndex);
              const monthRecoveryPeriodsList = recoveryPeriods.filter(rp => rp.month === monthIndex);
              const monthSchoolEventsList = schoolEvents.filter(se => se.month === monthIndex);
              
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
                      const schoolBreakDay = day ? schoolBreak.find(sb => 
                        sb.month === monthIndex && 
                        day >= sb.startDay && 
                        day <= sb.endDay
                      ) : null;
                      const examWeek = day ? examWeeks.find(ew => 
                        ew.month === monthIndex && 
                        day >= ew.startDay && 
                        day <= ew.endDay
                      ) : null;
                      const recoveryPeriod = day ? recoveryPeriods.find(rp => 
                        rp.month === monthIndex && 
                        day >= rp.startDay && 
                        day <= rp.endDay
                      ) : null;
                      const schoolEvent = day ? schoolEvents.find(se => se.month === monthIndex && se.day === day) : null;
                      
                      return (
                        <div
                          key={index}
                          className={`
                            aspect-square flex items-center justify-center rounded text-[10px]
                            ${day ? 'cursor-pointer' : ''}
                            ${isToday ? 'bg-[#005DE4] text-white font-bold' : ''}
                            ${holiday && !isToday ? 'font-bold' : ''}
                            ${schoolEvent && !isToday ? 'border-2 border-[#005DE4] font-bold' : ''}
                            ${recoveryPeriod && !isToday && !holiday ? 'bg-[#e6f2ff] font-bold' : ''}
                            ${examWeek && !isToday && !holiday && !recoveryPeriod ? 'bg-[#ffae1e] font-bold' : ''}
                            ${schoolBreakDay && !isToday && !holiday && !examWeek && !recoveryPeriod ? 'bg-slate-200' : ''}
                            ${!isToday && !holiday && !schoolBreakDay && !schoolEvent && !examWeek && !recoveryPeriod && day ? 'hover:bg-slate-100' : ''}
                          `}
                          style={holiday && !isToday ? { backgroundColor: '#fce7f0', color: '#f30961' } : 
                                recoveryPeriod && !isToday && !holiday ? { backgroundColor: '#e6f2ff', color: '#005DE4' } : 
                                examWeek && !isToday && !holiday ? { backgroundColor: '#ffae1e', color: '#b8860b' } : 
                                schoolBreakDay && !isToday && !holiday ? { backgroundColor: '#e2e8f0', color: '#64748b' } : 
                                schoolEvent && !isToday ? { color: '#005DE4' } : {}}
                          title={holiday ? holiday.name : recoveryPeriod ? recoveryPeriod.name : examWeek ? examWeek.name : schoolBreakDay ? schoolBreakDay.name : schoolEvent ? schoolEvent.name : ''}
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
                  
                  {/* Legenda de recesso escolar do mês */}
                  {monthSchoolBreakList.length > 0 && (
                    <div className={`${monthHolidaysList.length > 0 ? '' : 'border-t'} pt-2 space-y-1`}>
                      {monthSchoolBreakList.map((sb, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center bg-slate-200 text-slate-600">
                            {sb.startDay}
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight">
                            {sb.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Legenda de semanas de prova */}
                  {monthExamWeeksList.length > 0 && (
                    <div className={`${monthHolidaysList.length > 0 || monthSchoolBreakList.length > 0 ? '' : 'border-t'} pt-2 space-y-1`}>
                      {monthExamWeeksList.map((ew, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#ffae1e' }}>
                            {ew.startDay}
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight font-semibold">
                            {ew.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Legenda de períodos de recuperação */}
                  {monthRecoveryPeriodsList.length > 0 && (
                    <div className={`${monthHolidaysList.length > 0 || monthSchoolBreakList.length > 0 || monthExamWeeksList.length > 0 ? '' : 'border-t'} pt-2 space-y-1`}>
                      {monthRecoveryPeriodsList.map((rp, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: '#e6f2ff', color: '#005DE4' }}>
                            {rp.startDay}
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight font-semibold">
                            {rp.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Legenda de eventos escolares importantes */}
                  {monthSchoolEventsList.length > 0 && (
                    <div className={`${monthHolidaysList.length > 0 || monthSchoolBreakList.length > 0 || monthExamWeeksList.length > 0 || monthRecoveryPeriodsList.length > 0 ? '' : 'border-t'} pt-2 space-y-1`}>
                      {monthSchoolEventsList.map((se, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center border-2 border-[#005DE4] text-[#005DE4]">
                            {se.day}
                          </div>
                          <div className="text-[10px] text-slate-700 leading-tight font-semibold">
                            {se.name}
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
    </div>
  );
}
