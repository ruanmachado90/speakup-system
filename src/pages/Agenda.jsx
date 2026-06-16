import React, { useState } from "react";
import { Card } from "../components";
import { Calendar, ChevronDown } from "lucide-react";

const calendars = [
  {
    label: "Ruan Machado",
    name: "Ruan",
    src: "https://calendar.google.com/calendar/embed?src=ruan.speakup%40gmail.com&ctz=America%2FSao_Paulo",
    color: "bg-blue-500"
  },
  {
    label: "Bárbara Dias",
    name: "Bárbara",
    src: "https://calendar.google.com/calendar/embed?src=babudiassantos%40gmail.com&ctz=America%2FSao_Paulo",
    color: "bg-purple-500"
  },
  {
    label: "Fernando Machado",
    name: "Fernando",
    src: "https://calendar.google.com/calendar/embed?src=fernando.speakup%40gmail.com&ctz=America%2FSao_Paulo",
    color: "bg-green-500"
  },
  {
    label: "Vera Machado",
    name: "Vera",
    src: "https://calendar.google.com/calendar/embed?src=vera.speakup%40gmail.com&ctz=America%2FSao_Paulo",
    color: "bg-pink-500"
  },
  {
    label: "Bruna Amorim",
    name: "Bruna",
    src: "https://calendar.google.com/calendar/embed?src=bruna.speakup%40gmail.com&ctz=America%2FSao_Paulo",
    color: "bg-orange-500"
  }
];

export default function AgendaGoogle() {
  const [selected, setSelected] = useState(calendars[0].label);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const calendar = calendars.find(c => c.label === selected);

  const handleCalendarChange = (label) => {
    setSelected(label);
    setLoading(true);
    setIsDropdownOpen(false);
  };

  return (
    <div className="pb-6">
      <Card className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${calendar.color} bg-opacity-10`}>
              <Calendar className={`w-6 h-6 ${calendar.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Agenda dos professores</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Visualize e gerencie as agendas</p>
            </div>
          </div>
        </div>

        {/* Desktop: Buttons - Mobile: Dropdown */}
        <div className="mb-4 shrink-0">
          {/* Desktop version */}
          <div className="hidden md:flex gap-2 flex-wrap">
            {calendars.map(c => (
              <button
                key={c.label}
                onClick={() => handleCalendarChange(c.label)}
                className={`
                  relative px-4 py-2.5 rounded-lg font-medium transition-all duration-200
                  flex items-center gap-2 group
                  ${selected === c.label 
                    ? `${c.color} text-white shadow-lg scale-105` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                  }
                `}
              >
                <span className={`w-2 h-2 rounded-full ${selected === c.label ? 'bg-white' : c.color}`}></span>
                {c.label}
              </button>
            ))}
          </div>

          {/* Mobile version - Dropdown */}
          <div className="md:hidden relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200
                flex items-center justify-between gap-2 ${calendar.color} text-white shadow-lg`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {calendar.label}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10">
                {calendars.map(c => (
                  <button
                    key={c.label}
                    onClick={() => handleCalendarChange(c.label)}
                    className={`
                      w-full px-4 py-3 text-left transition-colors flex items-center gap-2
                      ${selected === c.label ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}
                    `}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.color}`}></span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Container */}
        <div className="relative bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden" style={{ height: '800px' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium">Carregando agenda...</p>
              </div>
            </div>
          )}
          <iframe
            key={calendar.label}
            title={`Google Calendar de ${calendar.label}`}
            src={calendar.src}
            className="w-full h-full"
            frameBorder="0"
            onLoad={() => setLoading(false)}
          />
        </div>
      </Card>
    </div>
  );
}
