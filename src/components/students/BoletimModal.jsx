import { X } from 'lucide-react';

export default function BoletimModal({ aluno, boletimData, setBoletimData, loading, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative print:p-0 print:shadow-none print:bg-white">
        <button className="absolute top-2 right-2 p-2 print:hidden" onClick={onClose}>
          <X className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex flex-col items-center border-b pb-2 mb-4">
          <div className="flex w-full items-center">
            <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo" className="h-24 w-24 object-contain mr-4 filter brightness-0" />
            <div className="flex-1 text-center">
              <div className="font-bold text-lg">SPEAKUP ENGLISH LANGUAGE ACADEMY</div>
              <div className="text-xs">Praça Governador Valadares 119, Centro - Cataguases MG</div>
              <div className="text-xs">CNPJ: 28.649.636/0001-88</div>
            </div>
          </div>
          <div className="font-bold text-xl mt-2">Boletim</div>
        </div>
        <table className="w-full text-sm border mb-4">
          <tbody>
            <tr>
              <td className="border px-2 py-1 font-semibold">Turma</td>
              <td className="border px-2 py-1">
                <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.turma} onChange={e => setBoletimData(d => ({ ...d, turma: e.target.value }))} disabled={loading} />
              </td>
              <td className="border px-2 py-1 font-semibold">Nível:</td>
              <td className="border px-2 py-1">
                <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.nivel} onChange={e => setBoletimData(d => ({ ...d, nivel: e.target.value }))} disabled={loading} />
              </td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-semibold">Aluno</td>
              <td className="border px-2 py-1">{aluno.name}</td>
              <td className="border px-2 py-1 font-semibold">Dia:</td>
              <td className="border px-2 py-1">
                <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.dia} onChange={e => setBoletimData(d => ({ ...d, dia: e.target.value }))} disabled={loading} />
              </td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-semibold">Professor:</td>
              <td className="border px-2 py-1">{aluno.teacher || '-'}</td>
              <td className="border px-2 py-1 font-semibold">Horário:</td>
              <td className="border px-2 py-1">
                <input type="text" className="border rounded px-2 py-1 w-full" value={boletimData.horario} onChange={e => setBoletimData(d => ({ ...d, horario: e.target.value }))} disabled={loading} />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex gap-2 print:hidden">
          <button className="bg-[#005DE4] text-white px-6 py-2 rounded-lg font-bold mt-2" onClick={onSave} disabled={loading}>
            Salvar
          </button>
          <button className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold mt-2" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
