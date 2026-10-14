import { decidirAmbiente, PROJETO_EMULADOR } from '../config/ambiente';

describe('decidirAmbiente', () => {
  it('emulador ligado no computador local', () => {
    expect(decidirAmbiente({ env: { VITE_USE_EMULATOR: 'true', DEV: true }, hostname: 'localhost' }))
      .toEqual({ emulador: true, producaoLocal: false });
    expect(decidirAmbiente({ env: { VITE_USE_EMULATOR: 'true', DEV: true }, hostname: '127.0.0.1' }).emulador).toBe(true);
  });

  it('npm run dev:producao: local, sem emulador → aviso de produção', () => {
    expect(decidirAmbiente({ env: { DEV: true }, hostname: 'localhost' }))
      .toEqual({ emulador: false, producaoLocal: true });
  });

  it('site publicado: produção sem aviso', () => {
    expect(decidirAmbiente({ env: { DEV: false, PROD: true }, hostname: 'gestao.speakupcataguases.com' }))
      .toEqual({ emulador: false, producaoLocal: false });
  });

  it('emulador ligado fora do computador local para o app (build publicado errado)', () => {
    expect(() => decidirAmbiente({ env: { VITE_USE_EMULATOR: 'true' }, hostname: 'gestao.speakupcataguases.com' }))
      .toThrow(/emulador/i);
  });

  it('só "true" liga o emulador', () => {
    expect(decidirAmbiente({ env: { VITE_USE_EMULATOR: 'false', DEV: true }, hostname: 'localhost' }).emulador).toBe(false);
    expect(decidirAmbiente({ env: { VITE_USE_EMULATOR: '1', DEV: true }, hostname: 'localhost' }).emulador).toBe(false);
  });

  it('o projeto do emulador é demo- (o Firebase nunca liga demo a recursos reais)', () => {
    expect(PROJETO_EMULADOR.startsWith('demo-')).toBe(true);
  });
});
