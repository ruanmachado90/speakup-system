/**
 * @jest-environment node
 */
import { estruturaDeCustos, grupoDe, resumirPeriodo } from '../utils/despesasAnalise';
import { resolverParametros } from '../config/parametros';

const d = (over = {}) => ({ value: 100, tipoSaida: 'operacional', status: 'pago', ...over });

describe('grupoDe — plano de contas de escola de idiomas', () => {
  it('separa folha docente de equipe administrativa', () => {
    expect(grupoDe(d({ category: 'Professores' }))).toBe('docente');
    expect(grupoDe(d({ category: 'Equipe administrativa' }))).toBe('equipe');
  });

  it("o antigo 'Salários' fica num grupo sem faixa, para reclassificar", () => {
    expect(grupoDe(d({ category: 'Salários' }))).toBe('pessoalLegado');
  });

  it('imposto vai pelo tipo de saída, não pela categoria', () => {
    expect(grupoDe(d({ category: 'Serviços', tipoSaida: 'imposto' }))).toBe('impostos');
  });

  it('categoria personalizada cai no grupo pela palavra-chave', () => {
    expect(grupoDe(d({ category: 'Contador' }))).toBe('administrativo');
    expect(grupoDe(d({ category: 'Energia elétrica' }))).toBe('ocupacao');
    expect(grupoDe(d({ category: 'Outro', description: 'Google Ads da campanha' }))).toBe('marketing');
  });

  it('sem pista nenhuma cai em Outros', () => {
    expect(grupoDe(d({ category: 'Xyz', description: 'abc' }))).toBe('outros');
  });
});

describe('estruturaDeCustos', () => {
  const pagas = [
    d({ category: 'Professores', value: 10000 }),
    d({ category: 'Aluguel', value: 3000 }),
    d({ category: 'Marketing', value: 2000 }),
    d({ category: 'Retirada', value: 5000, tipoSaida: 'retiradaSocio' }),
  ];

  it('retirada de sócio não entra na estrutura operacional', () => {
    const r = estruturaDeCustos(pagas, 20000);
    expect(r.linhas.find((l) => l.id === 'docente').valor).toBe(10000);
    expect(r.linhas.reduce((s, l) => s + l.valor, 0)).toBe(15000);
  });

  it('compara com a faixa do setor quando há receita', () => {
    const r = estruturaDeCustos(pagas, 20000);
    // 10000/20000 = 50% da receita, acima da faixa 30–40% da folha docente
    expect(r.linhas.find((l) => l.id === 'docente')).toMatchObject({ pct: 50, status: 'acima' });
    // 3000/20000 = 15%, topo da faixa 10–15% de ocupação
    expect(r.linhas.find((l) => l.id === 'ocupacao')).toMatchObject({ status: 'dentro' });
    expect(r.acima.map((l) => l.id)).toContain('docente');
  });

  it('sem receita mostra participação no custo, sem faixa', () => {
    const r = estruturaDeCustos(pagas, 0);
    expect(r.modo).toBe('saidas');
    expect(r.linhas.find((l) => l.id === 'docente').status).toBeNull();
  });

  it('orçamento próprio tem precedência sobre a faixa do setor', () => {
    const r = estruturaDeCustos(pagas, 20000, { docente: 12000, marketing: 1000 });
    const docente = r.linhas.find((l) => l.id === 'docente');
    // 50% da receita estouraria a faixa, mas está dentro do orçamento de 12.000
    expect(docente).toMatchObject({ meta: 12000, status: 'dentro' });
    expect(Math.round(docente.orcamentoPct)).toBe(83);
    expect(r.linhas.find((l) => l.id === 'marketing').status).toBe('acima');
  });

  it('barra e marcadores ficam na MESMA régua com orçamento', () => {
    // 10.000 gastos num orçamento de 12.000 = 83,3%. Escala local = 105.
    const [l] = estruturaDeCustos([d({ category: 'Professores', value: 10000 })], 20000, { docente: 12000 }).linhas
      .filter((x) => x.id === 'docente');
    expect(l.barra.preenchido).toBeCloseTo((100 / 1.05) * (10 / 12), 4);
    expect(l.barra.marcadores).toHaveLength(1);
    // O limite do orçamento tem que ficar à DIREITA do preenchido quando está dentro.
    expect(l.barra.marcadores[0]).toBeGreaterThan(l.barra.preenchido);
  });

  it('estourando o orçamento, o preenchido passa do marcador e nada vaza da barra', () => {
    const [l] = estruturaDeCustos([d({ category: 'Marketing', value: 3000 })], 20000, { marketing: 1000 }).linhas
      .filter((x) => x.id === 'marketing');
    expect(l.barra.marcadores[0]).toBeLessThan(l.barra.preenchido);
    expect(l.barra.preenchido).toBeLessThanOrEqual(100);
  });

  it('sem orçamento, marcadores são os dois limites da faixa do setor', () => {
    const r = estruturaDeCustos(pagas, 20000);
    const l = r.linhas.find((x) => x.id === 'ocupacao');
    expect(l.barra.marcadores).toHaveLength(2);
    expect(l.barra.marcadores[0]).toBeLessThan(l.barra.marcadores[1]);
    expect(l.barra.marcadores[1]).toBeLessThanOrEqual(100);
  });

  it('sem receita não há marcador: não existe referência para comparar', () => {
    const r = estruturaDeCustos(pagas, 0);
    expect(r.linhas.every((l) => l.barra.marcadores.length === 0)).toBe(true);
  });

  it('grupo sem gasto aparece se tiver orçamento definido', () => {
    const r = estruturaDeCustos([], 0, { tecnologia: 500 });
    expect(r.linhas.find((l) => l.id === 'tecnologia')).toMatchObject({ valor: 0, meta: 500 });
  });
});

describe('resumirPeriodo', () => {
  it('separa custo operacional de retirada e investimento', () => {
    const r = resumirPeriodo([
      d({ value: 1000, recorrente: true }),
      d({ value: 500, tipoSaida: 'imposto' }),
      d({ value: 3000, tipoSaida: 'retiradaSocio' }),
      d({ value: 2000, tipoSaida: 'investimento' }),
    ], [d({ value: 900 })]);
    expect(r).toMatchObject({
      total: 6500,
      custoOperacional: 1500,
      fixos: 1000,
      totalAnterior: 900,
    });
    expect(r.foraOperacional).toEqual({ retiradaSocio: 3000, investimento: 2000 });
  });
});

describe('resolverParametros — orçamento', () => {
  it('ignora valor inválido, zero e negativo', () => {
    const p = resolverParametros({ orcamentoDespesas: { docente: 1000, equipe: 0, ocupacao: -5, material: 'abc' } });
    expect(p.orcamentoDespesas).toEqual({ docente: 1000 });
  });

  it('sem nada salvo devolve orçamento vazio', () => {
    expect(resolverParametros(null).orcamentoDespesas).toEqual({});
  });
});
