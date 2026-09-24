import React, { useState, useContext, useMemo } from 'react';
import { Form } from '../ui';
import { useUI } from '../../context/UIContext';
import { useLoading } from '../../context/LoadingContext';
import { DataContext } from '../../context/DataContext';
import { CursoBookSelect, TeacherSelect, ContratoFinanceiroFields, AvisoCpfExistente } from '../students/MatriculaFields';
import { alunosComMesmoCpf } from '../../utils/matricula';

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

const MaskedInput = ({ label, name, defaultValue, mask, required, onValueChange }) => {
  const [value, setValue] = useState(defaultValue || '');

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const formatted = mask === 'cpf' ? formatCPF(rawValue) : mask === 'phone' ? formatPhone(rawValue) : rawValue;
    setValue(formatted);
    onValueChange?.(formatted);
  };

  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="text-sm font-bold text-slate-600 mb-1">{label}</label>
      <input
        id={name}
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe]"
      />
    </div>
  );
};

/**
 * Novo aluno (matrícula de balcão) e edição de cadastro.
 *
 * Novo: mesmos campos da confirmação de pré-cadastro — curso/book/professor e
 * contrato financeiro com a data de cada parcela.
 * Edição: dados cadastrais, curso/professor e mensalidade. Vencimentos e nº de
 * parcelas ficam no Financeiro (editar aqui recalculava todas as parcelas).
 */
export const StudentForm = ({ onSubmit }) => {
  const { modal, closeModal } = useUI();
  const { saving } = useLoading();
  const students = useContext(DataContext)?.students;
  const aluno = modal.data || {};
  const editando = Boolean(aluno.id);
  const [cpf, setCpf] = useState(aluno.cpf || '');

  // Na matrícula nova, CPF já cadastrado: ativo bloqueia, inativo sugere reativar.
  const duplicados = useMemo(
    () => (editando ? [] : alunosComMesmoCpf(students || [], cpf)),
    [editando, students, cpf]
  );
  const bloqueado = duplicados.some((s) => s.status !== 'cancelado');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <h3 className="text-2xl font-black text-[#0a2540]">
        {editando ? "Editar Aluno" : "Nova Matrícula"}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Form label="Nome do aluno" name="name" defaultValue={aluno.name} required />
        <MaskedInput label="CPF do aluno" name="cpf" defaultValue={aluno.cpf} mask="cpf" required onValueChange={setCpf} />
        <MaskedInput label="Contato do aluno" name="contact" defaultValue={aluno.contact} mask="phone" required />
        <Form label="E-mail do aluno" name="email" type="email" defaultValue={aluno.email} />
        <Form label="Data de Nascimento" name="dataNascimento" type="date" defaultValue={aluno.dataNascimento} />
      </div>

      <AvisoCpfExistente duplicados={duplicados} />

      <div className="bg-slate-50 p-4 rounded-xl space-y-3">
        <p className="text-xs font-bold text-slate-500">Responsável financeiro (obrigatório para menor de idade — sai no contrato)</p>
        <div className="grid grid-cols-2 gap-4">
          <Form label="Nome" name="responsibleName" defaultValue={aluno.responsibleName} />
          <MaskedInput label="CPF" name="responsibleCpf" defaultValue={aluno.responsibleCpf} mask="cpf" />
          <MaskedInput label="Contato" name="responsibleContact" defaultValue={aluno.responsibleContact} mask="phone" />
          <Form label="E-mail" name="responsibleEmail" type="email" defaultValue={aluno.responsibleEmail} />
        </div>
      </div>

      <CursoBookSelect defaultCurso={aluno.course} defaultBook={aluno.book} />
      <TeacherSelect defaultValue={aluno.teacher} defaultProfessorId={aluno.professorId} required />

      {editando ? (
        <div className="space-y-2">
          <Form label="Mensalidade (R$)" name="fee" type="number" step="0.01" defaultValue={aluno.fee} required />
          <p className="text-xs text-slate-500">
            Mudar a mensalidade atualiza só as parcelas pendentes. Para mudar a data de uma parcela, use o Financeiro.
          </p>
        </div>
      ) : (
        <ContratoFinanceiroFields />
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={closeModal}
          className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || bloqueado}
          className={`w-full py-3 rounded-xl font-bold ${saving || bloqueado ? "bg-slate-300 text-slate-600" : "bg-[#0e48fe] text-white"}`}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
};
