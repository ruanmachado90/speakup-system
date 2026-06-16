 /**
  * @jest-environment node
  */
 /**
 * Testes unitários para src/utils/turmas.js
 * Cobre: normalizarString, normalizarDias, contarDiasAula, calcularHorasAula,
 *        buildProfessorSlug, escapeHtml
 * E para as funções de validação extraídas de Turmas.jsx.
 */

import {
  normalizarString,
  normalizarDias,
  contarDiasAula,
  calcularHorasAula,
  buildProfessorSlug,
  escapeHtml,
} from '../utils/turmas';

// ---------------------------------------------------------------------------
// normalizarString
// ---------------------------------------------------------------------------
describe('normalizarString', () => {
  it('remove acentos e converte para minúsculas', () => {
    expect(normalizarString('Terça-Feira')).toBe('terca-feira');
    expect(normalizarString('Sábado')).toBe('sabado');
  });

  it('remove espaços iniciais/finais', () => {
    expect(normalizarString('  Quarta  ')).toBe('quarta');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizarString('')).toBe('');
    expect(normalizarString()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// normalizarDias
// ---------------------------------------------------------------------------
describe('normalizarDias', () => {
  it('converte abreviações para nome canônico com acento', () => {
    expect(normalizarDias('seg')).toBe('Segunda');
    expect(normalizarDias('ter')).toBe('Terça');
    expect(normalizarDias('sab')).toBe('Sábado');
  });

  it('converte lista com múltiplos dias', () => {
    expect(normalizarDias('Segunda, Quarta, Sexta')).toBe('Segunda, Quarta, Sexta');
    expect(normalizarDias('seg, qua, sex')).toBe('Segunda, Quarta, Sexta');
  });

  it('normaliza entrada com variantes de escrita', () => {
    expect(normalizarDias('segunda-feira, terça-feira')).toBe('Segunda, Terça');
  });

  it('retorna vazio para entrada vazia', () => {
    expect(normalizarDias('')).toBe('');
    expect(normalizarDias()).toBe('');
  });

  it('mantém dias já no formato correto', () => {
    const input = 'Segunda, Terça, Quarta';
    expect(normalizarDias(input)).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// contarDiasAula
// ---------------------------------------------------------------------------
describe('contarDiasAula', () => {
  it('conta corretamente vários dias', () => {
    expect(contarDiasAula('Segunda, Quarta, Sexta')).toBe(3);
    expect(contarDiasAula('Terça')).toBe(1);
  });

  it('retorna 0 para entrada vazia', () => {
    expect(contarDiasAula('')).toBe(0);
    expect(contarDiasAula()).toBe(0);
  });

  it('não conta entradas em branco', () => {
    expect(contarDiasAula('Segunda, , Sexta')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// calcularHorasAula
// ---------------------------------------------------------------------------
describe('calcularHorasAula', () => {
  it('calcula corretamente duração em horas', () => {
    expect(calcularHorasAula('14:00 - 15:30')).toBe(1.5);
    expect(calcularHorasAula('08:00 - 09:00')).toBe(1);
    expect(calcularHorasAula('19:00 - 20:30')).toBe(1.5);
  });

  it('retorna 0 para horário inválido', () => {
    expect(calcularHorasAula('')).toBe(0);
    expect(calcularHorasAula('invalido')).toBe(0);
    expect(calcularHorasAula()).toBe(0);
  });

  it('retorna 0 se fim for antes do início', () => {
    expect(calcularHorasAula('10:00 - 09:00')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildProfessorSlug
// ---------------------------------------------------------------------------
describe('buildProfessorSlug', () => {
  it('converte nome para slug URL-amigável', () => {
    expect(buildProfessorSlug('Ruan Machado')).toBe('ruan-machado');
    expect(buildProfessorSlug('Bárbara Dias')).toBe('barbara-dias');
    expect(buildProfessorSlug('Fernando Machado')).toBe('fernando-machado');
  });

  it('lida com múltiplos espaços', () => {
    // múltiplos espaços são colapsados em um único traço
    expect(buildProfessorSlug('Vera  Machado')).toBe('vera-machado');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(buildProfessorSlug('')).toBe('');
    expect(buildProfessorSlug()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapa todos os caracteres HTML perigosos', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapa ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapa aspas simples', () => {
    expect(escapeHtml("it's fine")).toBe("it&#039;s fine");
  });

  it('não altera texto sem caracteres especiais', () => {
    expect(escapeHtml('Turma Manhã')).toBe('Turma Manhã');
  });

  it('converte valores não-string para string antes de escapar', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// validateForm (lógica extraída de Turmas.jsx - testada isoladamente)
// ---------------------------------------------------------------------------
const NIVEIS = ['A1', 'A2', 'A2+', 'B1', 'B2', 'B2+', 'C1'];
const PROFESSORES = ['Ruan Machado', 'Bárbara Dias', 'Fernando Machado', 'Vera Machado', 'Bruna Amorim'];
const DIAS_DISPONIVEIS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function validateForm(form) {
  const errors = {};
  if (!form.nome?.trim()) errors.nome = 'Nome da turma é obrigatório';
  else if (form.nome.length < 3) errors.nome = 'Nome deve ter pelo menos 3 caracteres';
  else if (form.nome.length > 50) errors.nome = 'Nome muito longo (máx. 50 caracteres)';
  if (!form.nivel) errors.nivel = 'Selecione um nível';
  else if (!NIVEIS.includes(form.nivel)) errors.nivel = 'Nível inválido';
  if (!form.professor) errors.professor = 'Selecione um professor';
  else if (!PROFESSORES.includes(form.professor)) errors.professor = 'Professor inválido';
  if (!form.horario?.trim()) errors.horario = 'Horário é obrigatório';
  else if (!/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(form.horario.trim())) errors.horario = 'Formato inválido (ex: 14:00 - 15:30)';
  if (!form.dias?.trim()) errors.dias = 'Dias da semana são obrigatórios';
  else {
    const diasForm = form.dias.split(',').map(d => d.trim()).filter(Boolean);
    const invalidos = diasForm.filter(d => !DIAS_DISPONIVEIS.includes(d));
    if (invalidos.length > 0) errors.dias = `Dias inválidos: ${invalidos.join(', ')}`;
  }
  if (form.maxAlunos < 1 || form.maxAlunos > 30) errors.maxAlunos = 'Máximo de alunos deve ser entre 1 e 30';
  return errors;
}

const FORM_VALIDO = {
  nome: 'Turma Inglês A1',
  nivel: 'A1',
  professor: 'Ruan Machado',
  horario: '14:00 - 15:30',
  dias: 'Segunda, Quarta',
  maxAlunos: 15,
};

describe('validateForm', () => {
  it('não retorna erros para formulário válido', () => {
    expect(Object.keys(validateForm(FORM_VALIDO))).toHaveLength(0);
  });

  describe('campo nome', () => {
    it('exige nome preenchido', () => {
      const r = validateForm({ ...FORM_VALIDO, nome: '' });
      expect(r.nome).toBeDefined();
    });

    it('exige mínimo de 3 caracteres', () => {
      const r = validateForm({ ...FORM_VALIDO, nome: 'AB' });
      expect(r.nome).toMatch(/3 caracteres/);
    });

    it('rejeita nomes com mais de 50 caracteres', () => {
      const r = validateForm({ ...FORM_VALIDO, nome: 'A'.repeat(51) });
      expect(r.nome).toMatch(/50/);
    });
  });

  describe('campo nivel', () => {
    it('exige nível selecionado', () => {
      const r = validateForm({ ...FORM_VALIDO, nivel: '' });
      expect(r.nivel).toBeDefined();
    });

    it('rejeita nível não cadastrado', () => {
      const r = validateForm({ ...FORM_VALIDO, nivel: 'D1' });
      expect(r.nivel).toBe('Nível inválido');
    });
  });

  describe('campo professor', () => {
    it('exige professor selecionado', () => {
      const r = validateForm({ ...FORM_VALIDO, professor: '' });
      expect(r.professor).toBeDefined();
    });

    it('rejeita professor não cadastrado', () => {
      const r = validateForm({ ...FORM_VALIDO, professor: 'João Desconhecido' });
      expect(r.professor).toBe('Professor inválido');
    });
  });

  describe('campo horario', () => {
    it('exige horário preenchido', () => {
      const r = validateForm({ ...FORM_VALIDO, horario: '' });
      expect(r.horario).toBeDefined();
    });

    it('rejeita formato inválido', () => {
      const r = validateForm({ ...FORM_VALIDO, horario: '14h às 15h' });
      expect(r.horario).toMatch(/Formato inválido/);
    });

    it('aceita formato HH:MM - HH:MM', () => {
      const r = validateForm({ ...FORM_VALIDO, horario: '8:00 - 9:30' });
      expect(r.horario).toBeUndefined();
    });
  });

  describe('campo dias', () => {
    it('exige dias selecionados', () => {
      const r = validateForm({ ...FORM_VALIDO, dias: '' });
      expect(r.dias).toBeDefined();
    });

    it('rejeita dias inválidos na lista', () => {
      const r = validateForm({ ...FORM_VALIDO, dias: 'Segunda, Domingo' });
      expect(r.dias).toMatch(/Dias inválidos/);
    });
  });

  describe('campo maxAlunos', () => {
    it('rejeita zero', () => {
      const r = validateForm({ ...FORM_VALIDO, maxAlunos: 0 });
      expect(r.maxAlunos).toBeDefined();
    });

    it('rejeita acima de 30', () => {
      const r = validateForm({ ...FORM_VALIDO, maxAlunos: 31 });
      expect(r.maxAlunos).toBeDefined();
    });

    it('aceita 1 e 30', () => {
      expect(validateForm({ ...FORM_VALIDO, maxAlunos: 1 }).maxAlunos).toBeUndefined();
      expect(validateForm({ ...FORM_VALIDO, maxAlunos: 30 }).maxAlunos).toBeUndefined();
    });
  });
});
