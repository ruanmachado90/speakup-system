import { montarDadosFicticios } from '../../scripts/emulador/dadosFicticios';
import { montarParcelas } from '../utils/matricula';

const contas = {
  equipe: [
    { uid: 'teste-admin', googleSub: 'g-a', email: 'admin@teste.local', nome: 'Admin', role: 'admin' },
    { uid: 'teste-secretaria', googleSub: 'g-s', email: 'sec@teste.local', nome: 'Secretaria', role: 'secretaria' },
  ],
  professores: [{ uid: 'teste-prof', email: 'p@teste.local', senha: 'x', nome: 'Prof Ána', slug: 'prof-ana' }],
};
const hoje = new Date(2026, 9, 14); // 14/10/2026, como na contagem de produção
const dados = montarDadosFicticios({ hoje, contas });
const ativos = dados.students.filter((s) => s.data.status === 'ativo');
const parcelasDe = (id) => dados.payments.filter((p) => p.data.studentId === id).map((p) => p.data);
const hojeISO = '2026-10-14';
const aberta = (p) => p.status !== 'Pago' && p.status !== 'cancelada';

describe('dados fictícios do emulador', () => {
  it('20 ativos e 2 cancelados', () => {
    expect(ativos).toHaveLength(20);
    expect(dados.students.filter((s) => s.data.status === 'cancelado')).toHaveLength(2);
  });

  it('parcelas no mesmo formato de montarParcelas (os dois não podem se separar)', () => {
    const doSistema = montarParcelas({
      studentId: 'x', studentName: 'X', fee: 100, installmentDates: ['2026-01-10'], course: 'KIDS', professorId: 'p',
    })[0];
    const pendente = dados.payments.map((p) => p.data).find((p) => p.status === 'Pendente');
    expect(Object.keys(pendente).sort()).toEqual(Object.keys(doSistema).sort());
    expect(pendente.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/);
  });

  it('casos reais da renovação estão representados', () => {
    const comVencida = ativos.filter((s) => parcelasDe(s.id).some((p) => aberta(p) && p.dueDate.slice(0, 10) < hojeISO));
    expect(comVencida.map((s) => s.id).sort()).toEqual(['al-04', 'al-08', 'al-11']);

    const ate2027 = ativos.filter((s) => parcelasDe(s.id).some((p) => p.dueDate.startsWith('2027')));
    expect(ate2027.map((s) => s.id).sort()).toEqual(['al-05', 'al-06', 'al-07', 'al-08', 'al-14']);

    // Gabriela pagou adiantado parcelas que vencem em 2027
    expect(parcelasDe('al-07').filter((p) => p.dueDate.startsWith('2027') && p.status === 'Pago').length).toBeGreaterThan(0);

    // irmãos: mesmo CPF de responsável
    const porCpf = {};
    ativos.forEach((s) => { porCpf[s.data.responsibleCpf] = (porCpf[s.data.responsibleCpf] || 0) + 1; });
    expect(Object.entries(porCpf).filter(([cpf, n]) => cpf && n > 1)).toHaveLength(2);

    // adultos sem responsável, VIP/In Company fora da faixa, sem curso
    expect(ativos.filter((s) => !s.data.responsibleContact)).toHaveLength(4);
    expect(ativos.filter((s) => s.data.fee > 1000 || s.data.fee < 1)).toHaveLength(3);
    expect(ativos.filter((s) => !s.data.course)).toHaveLength(1);
  });

  it('cancelado: parcelas depois do cancelamento ficam canceladas', () => {
    const futuras = parcelasDe('al-21').filter((p) => p.dueDate.slice(0, 10) >= '2026-06-20');
    expect(futuras.every((p) => p.status === 'cancelada')).toBe(true);
  });

  it('turmas só com alunos ativos e contagem coerente', () => {
    const idsAtivos = new Set(ativos.map((s) => s.id));
    dados.turmas.forEach((t) => {
      expect(t.data.alunosIds.every((id) => idsAtivos.has(id))).toBe(true);
      expect(t.data.alunosCount).toBe(t.data.alunosIds.length);
    });
  });

  it('papéis: admin e secretaria pelo users/{uid}; professor com slug e nomeKey', () => {
    const porId = Object.fromEntries(dados.users.map((u) => [u.id, u.data]));
    expect(porId['teste-admin'].role).toBe('admin');
    expect(porId['teste-secretaria'].role).toBe('secretaria');
    expect(porId['teste-prof']).toMatchObject({ role: 'professor', slug: 'prof-ana', nomeKey: 'prof ana' });
  });

  it('nenhum dado parece real: todo nome de aluno termina em "Teste"', () => {
    expect(dados.students.every((s) => s.data.name.endsWith('Teste'))).toBe(true);
  });
});
