import { Form } from '../ui';

export const LeadForm = ({ modal, saving, onSubmit, onCancel }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black text-[#00234b]">
        {modal.data?.id ? "Editar Lead" : "Novo Lead"}
      </h3>

      <Form 
        label="Nome" 
        name="name" 
        defaultValue={modal.data?.name} 
        required 
      />

      <Form 
        label="Contato" 
        name="contact" 
        defaultValue={modal.data?.contact} 
        required 
      />

      <Form 
        label="Curso de interesse" 
        name="interest" 
        defaultValue={modal.data?.interest} 
        placeholder="Ex: Kids, Teens, Adults..."
        required
      />

      <div className="flex flex-col">
        <label className="text-sm font-bold text-slate-600 mb-1">Nível</label>
        <select
          name="level"
          defaultValue={modal.data?.level || ''}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        >
          <option value="">Selecione...</option>
          <option value="Iniciante">Iniciante</option>
          <option value="Básico">Básico</option>
          <option value="Intermediário">Intermediário</option>
          <option value="Avançado">Avançado</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-bold text-slate-600 mb-1">Status</label>
        <select
          name="status"
          defaultValue={modal.data?.status || 'novo'}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
        >
          <option value="novo">Novo</option>
          <option value="contato">Em Contato</option>
          <option value="matriculado">Matriculado</option>
          <option value="perdido">Perdido</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-bold text-slate-600 mb-1">Observações</label>
        <textarea
          name="notes"
          defaultValue={modal.data?.notes}
          rows="4"
          placeholder="Anotações sobre o lead..."
          required
          className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={onCancel} 
          className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={saving} 
          className={`w-full py-3 rounded-xl font-bold ${
            saving 
              ? "bg-slate-300 text-slate-600" 
              : "bg-[#005DE4] text-white hover:bg-[#004BB8]"
          }`}
        >
          {saving ? "Salvando..." : modal.data?.id ? "Salvar" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
};
