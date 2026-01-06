import React, { useState } from 'react';
import { Form } from '../ui';

const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value;
};

const formatPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  return value;
};

const MaskedInput = ({ label, name, defaultValue, mask, required }) => {
  const [value, setValue] = useState(defaultValue || '');

  const handleChange = (e) => {
    const rawValue = e.target.value;
    let formatted = rawValue;
    
    if (mask === 'cpf') {
      formatted = formatCPF(rawValue);
    } else if (mask === 'phone') {
      formatted = formatPhone(rawValue);
    }
    
    setValue(formatted);
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm font-bold text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
      />
    </div>
  );
};

export const StudentForm = ({ modal, saving, onSubmit, onCancel }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black text-[#00234b]">
        {modal.data?.id ? "Editar Aluno" : "Novo Aluno"}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Form label="Nome do aluno" name="name" defaultValue={modal.data?.name} required />
        <MaskedInput label="CPF do aluno" name="cpf" defaultValue={modal.data?.cpf} mask="cpf" required />
        <MaskedInput label="Contato do aluno" name="contact" defaultValue={modal.data?.contact} mask="phone" required />
      </div>

      <div className="bg-slate-50 p-4 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-500">Responsável (opcional)</p>
        <div className="grid grid-cols-3 gap-4">
          <Form label="Nome" name="responsibleName" defaultValue={modal.data?.responsibleName} />
          <MaskedInput label="CPF" name="responsibleCpf" defaultValue={modal.data?.responsibleCpf} mask="cpf" />
          <MaskedInput label="Contato" name="responsibleContact" defaultValue={modal.data?.responsibleContact} mask="phone" />
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
