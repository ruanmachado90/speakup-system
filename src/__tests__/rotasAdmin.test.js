/**
 * @jest-environment node
 */
import { ROTAS_ADMIN, paginaDaUrl } from '../utils/rotasAdmin';

describe('rotas do painel admin', () => {
  it('toda página tem URL única', () => {
    const urls = Object.values(ROTAS_ADMIN);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('URL → página, ida e volta', () => {
    Object.entries(ROTAS_ADMIN).forEach(([pagina, url]) => {
      expect(paginaDaUrl(url)).toBe(pagina);
    });
  });

  it('barra no fim não muda a página', () => {
    expect(paginaDaUrl('/alunos/')).toBe('students');
  });

  it('URL desconhecida cai no Dashboard', () => {
    expect(paginaDaUrl('/qualquer-coisa')).toBe('dashboard');
  });

  it('não colide com as rotas públicas e do professor', () => {
    const outras = ['/login', '/professor-login', '/registro', '/contrato', '/recibo', '/pagamento', '/notas', '/professor'];
    Object.values(ROTAS_ADMIN).forEach((url) => expect(outras).not.toContain(url));
  });
});
