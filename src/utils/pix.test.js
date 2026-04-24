import { gerarPixPayload } from './pix';

describe('gerarPixPayload', () => {
  it('gera payload PIX válido com dados mínimos', () => {
    const payload = gerarPixPayload({
      chave: 'ruan@speakupcataguases.com',
      valor: 123.45,
      nome: 'Aluno Teste',
      cidade: 'Cataguases',
      descricao: 'Mensalidade'
    });
    expect(typeof payload).toBe('string');
    expect(payload).toContain('ruan@speakupcataguases.com');
    expect(payload).toContain('Aluno Teste'.substring(0, 25));
    expect(payload).toContain('Cataguases'.substring(0, 15));
    expect(payload).toContain('Mensalidade');
    expect(payload.length).toBeGreaterThan(20);
  });

  it('trunca nome e cidade se necessário', () => {
    const payload = gerarPixPayload({
      chave: 'ruan@speakupcataguases.com',
      valor: 10,
      nome: 'Nome Muito Muito Muito Grande Para Pix',
      cidade: 'Cidade Muito Muito Longa',
      descricao: ''
    });
    expect(payload).toContain('Nome Muito Muito Muito Gran');
    expect(payload).toContain('Cidade Muito Mui');
  });
});
