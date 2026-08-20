// Feriados nacionais do Brasil, calculados pra qualquer ano — nunca precisa
// editar isso manualmente. Feriados móveis (Carnaval, Sexta-feira Santa,
// Corpus Christi) são derivados da data da Páscoa via algoritmo de
// Meeus/Jones/Butcher (calendário gregoriano).

export function formatarISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function somarDias(data, dias) {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

// Feriados fixos (mesma data todo ano)
const FERIADOS_FIXOS = [
  { mes: 1, dia: 1, nome: 'Confraternização Universal' },
  { mes: 4, dia: 21, nome: 'Tiradentes' },
  { mes: 5, dia: 1, nome: 'Dia do Trabalho' },
  { mes: 9, dia: 7, nome: 'Independência do Brasil' },
  { mes: 10, dia: 12, nome: 'Nossa Senhora Aparecida' },
  { mes: 11, dia: 2, nome: 'Finados' },
  { mes: 11, dia: 15, nome: 'Proclamação da República' },
  { mes: 11, dia: 20, nome: 'Consciência Negra' },
  { mes: 12, dia: 25, nome: 'Natal' },
];

// Retorna todos os feriados nacionais de um ano: [{ data: 'YYYY-MM-DD', nome }]
export function gerarFeriadosNacionais(ano) {
  const pascoa = calcularPascoa(ano);
  const feriados = FERIADOS_FIXOS.map((f) => ({
    data: formatarISO(new Date(ano, f.mes - 1, f.dia)),
    nome: f.nome,
  }));

  feriados.push({ data: formatarISO(somarDias(pascoa, -47)), nome: 'Carnaval' });
  feriados.push({ data: formatarISO(somarDias(pascoa, -2)), nome: 'Sexta-feira Santa' });
  feriados.push({ data: formatarISO(somarDias(pascoa, 60)), nome: 'Corpus Christi' });

  return feriados.sort((a, b) => a.data.localeCompare(b.data));
}

// Verifica se uma data (YYYY-MM-DD) cai dentro de um intervalo { inicio, fim } (inclusive)
export function dataNoIntervalo(dataISO, inicio, fim) {
  return dataISO >= inicio && dataISO <= fim;
}

const DIA_SEMANA_NUM = {
  domingo: 0,
  segunda: 1, 'segunda-feira': 1,
  terca: 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2,
  quarta: 3, 'quarta-feira': 3,
  quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5,
  sabado: 6, 'sábado': 6,
};

function normalizarDiaNome(dia = '') {
  return dia.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function calcularHorasEntre(inicio, fim) {
  const [hIni, mIni] = inicio.split(':').map(Number);
  const [hFim, mFim] = fim.split(':').map(Number);
  return Math.max(0, ((hFim * 60 + mFim) - (hIni * 60 + mIni)) / 60);
}

/**
 * Previsão de aulas/horas restantes de uma turma até o fim do ano letivo.
 * Cruza os dias da semana da turma (turma.horarios) com o calendário letivo
 * do ano (calendarioLetivo/{ano}, via useCalendarioLetivo) + feriados nacionais.
 *
 * Retorna null quando o calendário letivo do ano ainda não foi cadastrado
 * (não dá pra prever sem saber quando o ano letivo termina).
 */
export function calcularPrevisaoAulas(horarios, calendarioAno, hojeISO = formatarISO(new Date())) {
  if (!calendarioAno?.fimAno) return null;
  if (!Array.isArray(horarios) || !horarios.length) return { aulas: 0, horas: 0, fimAno: calendarioAno.fimAno };

  const duracaoPorDiaSemana = new Map(); // número do dia (0-6) -> duração em horas
  horarios.forEach((h) => {
    const num = DIA_SEMANA_NUM[normalizarDiaNome(h.dia)];
    if (num === undefined) return;
    const duracao = h.horario && h.horarioFim ? calcularHorasEntre(h.horario, h.horarioFim) : 0;
    duracaoPorDiaSemana.set(num, duracao);
  });
  if (!duracaoPorDiaSemana.size) return { aulas: 0, horas: 0, fimAno: calendarioAno.fimAno };

  const ano = Number((calendarioAno.fimAno || hojeISO).slice(0, 4));
  const feriados = new Set(gerarFeriadosNacionais(ano).map((f) => f.data));
  const naoLetivos = calendarioAno.recesso || [];

  const cursor = new Date(hojeISO);
  const fim = new Date(calendarioAno.fimAno);
  let aulas = 0;
  let horas = 0;
  while (cursor <= fim) {
    const diaSemana = cursor.getDay();
    if (duracaoPorDiaSemana.has(diaSemana)) {
      const iso = formatarISO(cursor);
      const ehNaoLetivo = feriados.has(iso) || naoLetivos.some((r) => dataNoIntervalo(iso, r.inicio, r.fim));
      if (!ehNaoLetivo) {
        aulas += 1;
        horas += duracaoPorDiaSemana.get(diaSemana);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { aulas, horas, fimAno: calendarioAno.fimAno };
}
