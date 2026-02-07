import React, { useState } from "react";
import { Card } from "../components";

const calendars = [
  {
    label: "Ruan Machado",
    src: "https://calendar.google.com/calendar/embed?src=ruan.speakup%40gmail.com&ctz=America%2FSao_Paulo"
  },
  {
    label: "Bárbara Dias",
    src: "https://calendar.google.com/calendar/embed?src=babudiassantos%40gmail.com&ctz=America%2FSao_Paulo"
  },
  {
    label: "Fernando Machado",
    src: "https://calendar.google.com/calendar/embed?src=fernando.speakup%40gmail.com&ctz=America%2FSao_Paulo"
  },
  {
    label: "Vera Machado",
    src: "https://calendar.google.com/calendar/embed?src=vera.speakup%40gmail.com&ctz=America%2FSao_Paulo"
  },
  {
    label: "Bruna Amorim",
    src: "https://calendar.google.com/calendar/embed?src=bruna.speakup%40gmail.com&ctz=America%2FSao_Paulo"
  }
];

export default function AgendaGoogle() {
  const [selected, setSelected] = useState(calendars[0].label);
  const calendar = calendars.find(c => c.label === selected);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">Agenda Google dos Professores</h2>
        <div className="flex gap-2 mb-4">
          {calendars.map(c => (
            <button
              key={c.label}
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${selected === c.label ? 'bg-[#005DE4] text-white border-[#005DE4]' : 'bg-white text-[#005DE4] border-[#005DE4] hover:bg-blue-50'}`}
              onClick={() => setSelected(c.label)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="w-full border rounded-lg overflow-hidden flex justify-center" style={{height: '600px'}}>
          <iframe
            title={`Google Calendar de ${calendar.label}`}
            src={calendar.src}
            style={{border: 0, width: '100%', height: '600px'}}
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </Card>
    </div>
  );
}
