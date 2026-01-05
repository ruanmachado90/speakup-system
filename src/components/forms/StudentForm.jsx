import React from 'react';
import { Form } from '../ui';

export const StudentForm = ({ modal, saving, onSubmit, onCancel }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black text-[#00234b]">
        {modal.data?.id ? "Editar Aluno" : "Novo Aluno"}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Form label="Nome do aluno" name="name" defaultValue={modal.data?.name} required />
        <Form label="CPF do aluno" name="cpf" defaultValue={modal.data?.cpf} required />
        <Form label="Contato do aluno" name="contact" defaultValue={modal.data?.contact} required />
      </div>

      <div className="bg-slate-50 p-4 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-500">Responsável (opcional)</p>
        <div className="grid grid-cols-3 gap-4">
          <Form label="Nome" name="responsibleName" defaultValue={modal.data?.responsibleName} />
          <Form label="CPF" name="responsibleCpf" defaultValue={modal.data?.responsibleCpf} />
          <Form label="Contato" name="responsibleContact" defaultValue={modal.data?.responsibleContact} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form label="Curso" name="course" defaultValue={modal.data?.course} required />
        <Form label="Professor" name="teacher" defaultValue={modal.data?.teacher} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Form label="Mensalidade (R$)" name="fee" type="number" step="0.01" defaultValue={modal.data?.fee} required />
        <Form label="Parcelas" name="installments" type="number" defaultValue={modal.data?.installments || 12} required />
        <Form label="Data de vencimento" name="dueDate" type="date" defaultValue={modal.data?.dueDate} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={onCancel} 
          className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={saving} 
          className={`w-full py-3 rounded-xl font-bold ${saving?"bg-slate-300 text-slate-600":"bg-[#005DE4] text-white"}`}
        >
          {saving?"Salvando...":"Salvar"}
        </button>
      </div>
    </form>
  );
};
