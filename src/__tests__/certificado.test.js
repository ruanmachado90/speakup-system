/**
 * @jest-environment node
 */
import {
  gerarCodigoCertificado,
  normalizarCodigo,
  nivelDoAluno,
  tituloDoNivel,
  montarCertificado,
  urlVerificacao,
  dataBR,
} from '../utils/certificado';

describe('código do certificado', () => {
  it('formato SU-ANO-6 caracteres, sem caracteres ambíguos', () => {
    for (let i = 0; i < 200; i += 1) {
      const c = gerarCodigoCertificado(2026);
      expect(c).toMatch(/^SU-2026-[2-9A-HJKMNP-Z]{6}$/);
      expect(normalizarCodigo(c)).toBe(c);
    }
  });

  it('não é sequencial nem repete em lote', () => {
    const codigos = new Set(Array.from({ length: 500 }, () => gerarCodigoCertificado(2026)));
    expect(codigos.size).toBe(500);
  });

  it('determinístico quando recebe os bytes (teste)', () => {
    expect(gerarCodigoCertificado(2026, [0, 1, 2, 3, 4, 5])).toBe('SU-2026-234567');
  });

  it('normaliza o que a pessoa digita e recusa lixo', () => {
    expect(normalizarCodigo('  su-2026-k7qx4m ')).toBe('SU-2026-K7QX4M');
    expect(normalizarCodigo('SU-2026-K7QX4')).toBeNull();
    expect(normalizarCodigo('SU-2026-K7QX4O')).toBeNull(); // O não existe no alfabeto
    expect(normalizarCodigo('../../students')).toBeNull();
    expect(normalizarCodigo('')).toBeNull();
  });

  it('URL de verificação usa o domínio de produção', () => {
    expect(urlVerificacao('SU-2026-K7QX4M')).toBe('https://gestao.speakupcataguases.com/verificar/SU-2026-K7QX4M');
  });
});

describe('nível do aluno', () => {
  it('usa o nível da turma', () => {
    expect(nivelDoAluno({}, { nivel: 'b1' })).toBe('B1');
  });
  it('sem turma, deduz de curso + book', () => {
    expect(nivelDoAluno({ course: 'TEENS', book: '4' }, null)).toBe('B1');
    expect(nivelDoAluno({ course: 'GENERAL ENGLISH', book: 6 }, {})).toBe('C1');
  });
  it('KIDS/desconhecido devolve vazio (quem emite escolhe)', () => {
    expect(nivelDoAluno({ course: 'KIDS', book: 2 }, { nivel: '' })).toBe('');
    expect(nivelDoAluno({}, null)).toBe('');
  });
  it('títulos por nível', () => {
    expect(tituloDoNivel('B1')).toBe('B1 Intermediate English');
    expect(tituloDoNivel('zz')).toBe('');
  });
});

describe('montarCertificado', () => {
  const aluno = { id: 's1', name: ' Maria da Silva ', cpf: '123' };
  const agora = new Date(2026, 8, 24, 22, 30);

  it('grava só o necessário e nunca CPF/contato', () => {
    const { dados, codigo } = montarCertificado({ aluno, titulo: 'B1 Intermediate English', nivel: 'B1', emitidoPor: 'u1', agora });
    expect(codigo).toMatch(/^SU-2026-/);
    expect(dados).toEqual({
      codigo, studentId: 's1', nome: 'Maria da Silva', titulo: 'B1 Intermediate English', nivel: 'B1',
      dataEmissao: '2026-09-24', status: 'valido', emitidoPor: 'u1', criadoEm: agora.getTime(),
    });
    expect(JSON.stringify(dados)).not.toContain('123');
  });

  it('recusa sem título, sem nome ou data inválida', () => {
    expect(montarCertificado({ aluno, titulo: '' }).erro).toMatch(/título/);
    expect(montarCertificado({ aluno: { id: 'x' }, titulo: 'B1' }).erro).toMatch(/nome/);
    expect(montarCertificado({ aluno, titulo: 'B1', dataEmissao: '24/09/2026' }).erro).toMatch(/Data/);
  });

  it('ano do código acompanha a data de emissão', () => {
    expect(montarCertificado({ aluno, titulo: 'B1', dataEmissao: '2025-12-20', agora }).codigo).toMatch(/^SU-2025-/);
  });
});

describe('dataBR', () => {
  it('converte ISO', () => expect(dataBR('2026-09-24')).toBe('24/09/2026'));
  it('entrada ruim vira vazio', () => expect(dataBR('x')).toBe(''));
});
