// Valores INICIAIS da campanha de renovação. Só servem para criar o documento
// `renovacao-campanhas/{ano}` na primeira vez; a partir daí vale o que estiver
// salvo (editável na tela de configuração). Decisões do Ruan em 14/10/2026 —
// ver docs/rematricula/PLANO.md, seção 11.

export const CAMPANHA_PADRAO_2027 = {
  anoLetivo: 2027,
  status: 'rascunho',
  abertura: null,                 // meio de novembro (data exata a definir)
  encerramento: null,             // meio de dezembro (data exata a definir)
  reajustePct: 7,
  arredondamento: 'centavos',     // 'centavos' | 'real'
  planos: [
    { id: '12x', rotulo: '12 parcelas', meses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], descontoPct: 0 },
    { id: 'semestral', rotulo: 'Semestralidade', meses: [1, 7], descontoPct: 5 },
    { id: 'avista', rotulo: 'À vista', meses: [1], descontoPct: 10 },
  ],
  // Nenhum desconto acumula: vale o maior que se aplica ao plano.
  descontoRenovacaoNoPrazo: {
    pct: 5,
    planos: ['12x'],
    respostaAte: null,                       // = encerramento da campanha
    primeiraParcelaPagaAte: '2027-01-10',    // senão, valor cheio no ano (etapa 7b)
  },
  descontoIrmao: { pct: 10 },                // marcado à mão pela secretaria
  formasPagamento: ['PIX', 'Boleto', 'Dinheiro'],
  diasVencimento: [5, 10, 15],
  // Mensalidade fora desta faixa (ou curso VIP/In Company) pede revisão manual
  // da secretaria antes do envio.
  faixaMensalidadeRegular: { min: 100, max: 400 },
  cursosRevisaoManual: ['VIP', 'COMPANY'],   // trecho no nome do curso, sem acento/caixa
};
