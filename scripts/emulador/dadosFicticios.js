// Dados FICTÍCIOS para o emulador local (projeto demo-speakup). Função pura:
// não toca em banco nenhum — quem grava é scripts/emulador/popular.mjs.
//
// Espelha os casos reais que a renovação 2027 precisa tratar (contagem de
// produção em 14/10/2026): irmãos, parcelas vencidas, contrato de 12x que
// invade 2027 (inclusive com parcela de 2027 paga adiantada), VIP/In Company
// com mensalidade fora da faixa, aluno sem curso, adulto sem responsável e
// cancelados. Nomes, CPFs e telefones são inventados.
//
// As parcelas saem no MESMO formato de montarParcelas (src/utils/matricula.js);
// src/__tests__/dadosEmulador.test.js garante que os dois não se separam.

const pad = (n) => String(n).padStart(2, '0');
const ultimoDia = (ano, mes) => new Date(ano, mes, 0).getDate(); // mes 1..12

/** "YYYY-MM-DD" do i-ésimo mês a partir de (ano, mes), dia limitado ao fim do mês. */
function dataDoMes(ano, mes, dia, i) {
  const total = (mes - 1) + i;
  const a = ano + Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${a}-${pad(m)}-${pad(Math.min(dia, ultimoDia(a, m)))}`;
}

const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const PROFESSORES = [
  { id: 'prof-ana', nome: 'Ana Teste', email: 'ana.prof@teste.local', telefone: '(32) 90000-0001' },
  { id: 'prof-bruno', nome: 'Bruno Teste', email: 'bruno.prof@teste.local', telefone: '(32) 90000-0002' },
];

export const TURMAS = [
  { id: 'turma-kids-2', nome: 'Kids 2 — Seg/Qua 14h', curso: 'KIDS', book: 2, nivel: 'A1', prof: 'prof-ana', dias: ['Segunda', 'Quarta'], horario: '14:00' },
  { id: 'turma-kids-4', nome: 'Kids 4 — Ter/Qui 15h', curso: 'KIDS', book: 4, nivel: 'A2', prof: 'prof-ana', dias: ['Terça', 'Quinta'], horario: '15:00' },
  { id: 'turma-teens-1', nome: 'Teens 1 — Seg/Qua 17h', curso: 'TEENS', book: 1, nivel: 'A2', prof: 'prof-bruno', dias: ['Segunda', 'Quarta'], horario: '17:00' },
  { id: 'turma-teens-3', nome: 'Teens 3 — Ter/Qui 18h', curso: 'TEENS', book: 3, nivel: 'B1', prof: 'prof-bruno', dias: ['Terça', 'Quinta'], horario: '18:00' },
  { id: 'turma-ge-2', nome: 'General English 2 — Sáb 9h', curso: 'GENERAL ENGLISH', book: 2, nivel: 'A2', prof: 'prof-ana', dias: ['Sábado'], horario: '09:00' },
];

// inicio: 1º vencimento do contrato atual ('YYYY-MM'); vencidas: quantas das já
// vencidas ficam em aberto; adiantadas: quantas parcelas FUTURAS já foram pagas.
const R = { nome: '', cpf: '', tel: '' }; // sem responsável (adulto)
export const ALUNOS = [
  { id: 'al-01', nome: 'Alice Ferreira Teste',  turma: 'turma-kids-2',  fee: 189, dia: 10, inicio: '2026-01', nasc: '2017-03-12', resp: { nome: 'Marina Ferreira Teste', cpf: '111.111.111-01', tel: '(32) 90001-0001' } },
  { id: 'al-02', nome: 'Bento Ferreira Teste',  turma: 'turma-teens-1', fee: 209, dia: 10, inicio: '2026-01', nasc: '2013-07-02', resp: { nome: 'Marina Ferreira Teste', cpf: '111.111.111-01', tel: '(32) 90001-0001' } },
  { id: 'al-03', nome: 'Cecília Ramos Teste',   turma: 'turma-kids-2',  fee: 189, dia: 5,  inicio: '2026-01', nasc: '2016-11-30', resp: { nome: 'Paulo Ramos Teste', cpf: '111.111.111-03', tel: '(32) 90001-0003' } },
  { id: 'al-04', nome: 'Davi Costa Teste',      turma: 'turma-kids-4',  fee: 189, dia: 10, inicio: '2026-01', nasc: '2015-05-21', vencidas: 2, resp: { nome: 'Joana Costa Teste', cpf: '111.111.111-04', tel: '(32) 90001-0004' } },
  { id: 'al-05', nome: 'Elisa Mendes Teste',    turma: 'turma-teens-1', fee: 209, dia: 10, inicio: '2026-08', nasc: '2012-09-09', resp: { nome: 'Carlos Mendes Teste', cpf: '111.111.111-05', tel: '(32) 90001-0005' } },
  { id: 'al-06', nome: 'Felipe Souza Teste',    turma: 'turma-teens-3', fee: 209, dia: 15, inicio: '2026-02', nasc: '2011-02-14', resp: { nome: 'Rita Souza Teste', cpf: '111.111.111-06', tel: '(32) 90001-0006' } },
  { id: 'al-07', nome: 'Gabriela Lima Teste',   turma: 'turma-teens-3', fee: 209, dia: 10, inicio: '2026-06', nasc: '2011-12-01', adiantadas: 4, resp: { nome: 'Sérgio Lima Teste', cpf: '111.111.111-07', tel: '(32) 90001-0007' } },
  { id: 'al-08', nome: 'Heitor Alves Teste',    turma: 'turma-kids-4',  fee: 189, dia: 5,  inicio: '2026-09', nasc: '2015-08-18', vencidas: 1, resp: { nome: 'Lúcia Alves Teste', cpf: '111.111.111-08', tel: '(32) 90001-0008' } },
  { id: 'al-09', nome: 'Isadora Pinto Teste',   turma: 'turma-teens-1', fee: 209, dia: 10, inicio: '2026-01', nasc: '2013-01-25', resp: { nome: 'Fábio Pinto Teste', cpf: '111.111.111-09', tel: '(32) 90001-0009' } },
  { id: 'al-10', nome: 'João Barbosa Teste',    turma: 'turma-teens-3', fee: 209, dia: 10, inicio: '2026-01', nasc: '2011-06-06', resp: { nome: 'Tânia Barbosa Teste', cpf: '111.111.111-10', tel: '(32) 90001-0010' } },
  { id: 'al-11', nome: 'Kauã Nunes Teste',      turma: 'turma-kids-2',  fee: 189, dia: 10, inicio: '2026-01', nasc: '2016-04-04', vencidas: 1, resp: { nome: 'Vera Nunes Teste', cpf: '111.111.111-11', tel: '(32) 90001-0011' } },
  { id: 'al-12', nome: 'Lara Teixeira Teste',   turma: 'turma-teens-1', fee: 209, dia: 15, inicio: '2026-01', nasc: '2013-10-10', resp: { nome: 'Rui Teixeira Teste', cpf: '111.111.111-12', tel: '(32) 90001-0012' } },
  { id: 'al-13', nome: 'Miguel Teixeira Teste', turma: 'turma-kids-4',  fee: 189, dia: 15, inicio: '2026-01', nasc: '2015-12-24', resp: { nome: 'Rui Teixeira Teste', cpf: '111.111.111-12', tel: '(32) 90001-0012' } },
  { id: 'al-14', nome: 'Nina Rocha Teste',      turma: null, curso: 'REFORÇO ', fee: 150, dia: 10, inicio: '2026-03', nasc: '2014-07-07', resp: { nome: 'Edu Rocha Teste', cpf: '111.111.111-14', tel: '(32) 90001-0014' } },
  { id: 'al-15', nome: 'Otávio Martins Teste',  turma: 'turma-ge-2',    fee: 239, dia: 10, inicio: '2026-01', nasc: '1990-03-03', resp: R, tel: '(32) 90002-0015', cpf: '222.222.222-15' },
  { id: 'al-16', nome: 'Paula Duarte Teste',    turma: null, curso: 'VIP-ADULTO', fee: 1200, dia: 10, inicio: '2026-01', nasc: '1985-05-05', resp: R, tel: '(32) 90002-0016', cpf: '222.222.222-16' },
  { id: 'al-17', nome: 'Rafael Gomes Teste',    turma: null, curso: 'BUSINESS INCOMPANY', fee: 2700, dia: 5, inicio: '2026-01', nasc: '1980-01-15', resp: R, tel: '(32) 90002-0017', cpf: '222.222.222-17' },
  { id: 'al-18', nome: 'Sofia Araújo Teste',    turma: null, curso: 'VIP 1h', fee: 0.5, dia: 10, inicio: '2026-01', nasc: '1995-09-09', resp: R, tel: '(32) 90002-0018', cpf: '222.222.222-18' },
  { id: 'al-19', nome: 'Tiago Moreira Teste',   turma: null, curso: '', fee: 189, dia: 10, inicio: '2026-01', nasc: '2012-02-02', resp: { nome: 'Ana Moreira Teste', cpf: '111.111.111-19', tel: '(32) 90001-0019' } },
  { id: 'al-20', nome: 'Úrsula Prado Teste',    turma: 'turma-teens-3', fee: 209, dia: 15, inicio: '2026-01', nasc: '2011-11-11', resp: { nome: 'Davi Prado Teste', cpf: '111.111.111-20', tel: '(32) 90001-0020' } },
  // cancelados
  { id: 'al-21', nome: 'Vitor Cardoso Teste',   turma: null, curso: 'TEENS', fee: 209, dia: 10, inicio: '2026-01', nasc: '2012-01-01', cancelado: '2026-06-20', resp: { nome: 'Lia Cardoso Teste', cpf: '111.111.111-21', tel: '(32) 90001-0021' } },
  { id: 'al-22', nome: 'Wesley Freitas Teste',  turma: null, curso: 'KIDS', fee: 189, dia: 10, inicio: '2026-01', nasc: '2016-01-01', cancelado: '2026-04-10', resp: { nome: 'Bia Freitas Teste', cpf: '111.111.111-22', tel: '(32) 90001-0022' } },
];

/**
 * @param {{ hoje?: Date, contas: object }} opcoes  contas = src/config/contasTesteEmulador.json
 */
export function montarDadosFicticios({ hoje = new Date(), contas }) {
  const hojeISO = iso(hoje);
  const criadoEm = new Date('2026-01-05T12:00:00Z').getTime();
  const turmaPorId = Object.fromEntries(TURMAS.map((t) => [t.id, t]));
  const profPorId = Object.fromEntries(PROFESSORES.map((p) => [p.id, p]));

  const students = [];
  const payments = [];

  for (const a of ALUNOS) {
    const turma = a.turma ? turmaPorId[a.turma] : null;
    const prof = profPorId[turma?.prof || 'prof-ana'];
    const course = turma ? turma.curso : a.curso;
    const [anoIni, mesIni] = a.inicio.split('-').map(Number);
    const datas = Array.from({ length: 12 }, (_, i) => dataDoMes(anoIni, mesIni, a.dia, i));

    const student = {
      name: a.nome,
      cpf: a.cpf || `333.333.333-${a.id.slice(-2)}`,
      contact: a.tel || `(32) 90003-00${a.id.slice(-2)}`,
      responsibleName: a.resp.nome,
      responsibleCpf: a.resp.cpf,
      responsibleContact: a.resp.tel,
      dataNascimento: a.nasc,
      course,
      teacher: prof.nome,
      professorId: prof.id,
      fee: a.fee,
      installments: 12,
      dueDate: datas[0],
      status: a.cancelado ? 'cancelado' : 'ativo',
      source: 'balcao',
      createdAt: criadoEm,
    };
    if (a.cancelado) {
      Object.assign(student, {
        canceledAt: new Date(`${a.cancelado}T12:00:00Z`).getTime(),
        cancelReason: 'Financeiro',
        cancelNote: 'Dado fictício do emulador',
      });
    }
    students.push({ id: a.id, data: student });

    // Parcelas no formato de montarParcelas + baixa no formato de montarBaixa
    const vencidasNoPassado = datas.filter((d) => d < hojeISO);
    // as `vencidas` mais recentes já vencidas ficam sem pagamento
    const emAberto = new Set(a.vencidas ? vencidasNoPassado.slice(-a.vencidas) : []);
    let adiantadas = a.adiantadas || 0;
    datas.forEach((dataStr, i) => {
      const d = new Date(`${dataStr}T00:00:00`);
      const parcela = {
        studentId: a.id,
        studentName: a.nome,
        installmentNum: i + 1,
        valuePlanned: Number(a.fee),
        valuePaid: 0,
        status: 'Pendente',
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        dueDate: `${dataStr}T00:00:00`,
        course: course || null,
        professorId: prof.id || null,
      };
      const cancelada = a.cancelado && dataStr >= a.cancelado;
      const paga = !cancelada && (
        (dataStr < hojeISO && !emAberto.has(dataStr)) ||
        (dataStr >= hojeISO && adiantadas > 0 && adiantadas-- > 0)
      );
      if (cancelada) parcela.status = 'cancelada';
      if (paga) {
        Object.assign(parcela, {
          status: 'Pago',
          valuePaid: Number(a.fee),
          paymentDate: dataStr < hojeISO ? dataStr : hojeISO,
          paymentMethod: 'PIX',
          bank: 'Asaas',
          paidAt: new Date(`${dataStr < hojeISO ? dataStr : hojeISO}T12:00:00Z`).getTime(),
        });
      }
      payments.push({ id: `${a.id}-p${pad(i + 1)}`, data: parcela });
    });
  }

  const ativos = ALUNOS.filter((a) => !a.cancelado);
  const turmas = TURMAS.map((t) => {
    const ids = ativos.filter((a) => a.turma === t.id).map((a) => a.id);
    const prof = profPorId[t.prof];
    return {
      id: t.id,
      data: {
        nome: t.nome, curso: t.curso, book: t.book, nivel: t.nivel,
        professor: prof.nome, professorId: prof.id,
        dias: t.dias.join(', '), horario: t.horario,
        horarios: t.dias.map((dia) => ({ dia, horario: t.horario })),
        maxAlunos: 8, totalAulas: 40,
        alunosIds: ids, alunosCount: ids.length,
        createdAt: '2026-01-05T12:00:00.000Z', updatedAt: '2026-01-05T12:00:00.000Z',
      },
    };
  });

  const professores = PROFESSORES.map((p) => ({
    id: p.id,
    data: { nome: p.nome, email: p.email, telefone: p.telefone, status: 'ativo', createdAt: criadoEm },
  }));

  const normalizar = (s) => s.normalize('NFD').replace(/\p{Mn}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const users = [
    ...contas.equipe.map((c) => ({ id: c.uid, data: { role: c.role, nome: c.nome, email: c.email } })),
    ...contas.professores.map((c) => ({
      id: c.uid,
      data: { role: 'professor', nome: c.nome, nomeKey: normalizar(c.nome), slug: c.slug, email: c.email },
    })),
  ];

  return { students, payments, turmas, professores, users };
}
