// Valores INICIAIS da campanha de renovação. Só servem para criar o documento
// `renovacao-campanhas/{ano}` na primeira vez; a partir daí vale o que estiver
// salvo (editável na tela de configuração). Decisões do Ruan em 14/10/2026 —
// ver docs/rematricula/PLANO.md, seção 11.

/**
 * Textos da página da família (`/renovar/:codigo`), editáveis na configuração.
 * Campanhas criadas antes do campo existir usam estes.
 */
export const PAGINA_FAMILIA_PADRAO = {
  apresentacao: 'A renovação dentro do prazo é importante para o planejamento do próximo ano: a organização das turmas, o ajuste da grade horária e a preparação dos nossos professores, para manter e elevar a qualidade do ensino que você já conhece.',
  atendimento: 'De segunda a sexta-feira, das 13h às 17h20.',
  whatsapp: '32999414548',
  assinatura: 'A direção',
};

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
    pct: 3.5,                                // metade do reajuste (decisão de 15/10/2026)
    planos: ['12x'],
    respostaAte: null,                       // = encerramento da campanha
    primeiraParcelaPagaAte: '2027-01-10',    // senão, valor cheio no ano (etapa 7b)
    // Só para quem está em dia com as mensalidades do ano atual (decisão de
    // 23/10/2026, como na carta de 2026). Negociável: a secretaria pode manter
    // o desconto na efetivação.
    exigeEmDia: true,
  },
  descontoIrmao: { pct: 10 },                // marcado à mão pela secretaria
  formasPagamento: ['PIX', 'Boleto', 'Dinheiro'],
  diasVencimento: [5, 10, 15],
  // Mensalidade fora desta faixa (ou curso VIP/In Company) pede revisão manual
  // da secretaria antes do envio.
  faixaMensalidadeRegular: { min: 100, max: 400 },
  cursosRevisaoManual: ['VIP', 'COMPANY'],   // trecho no nome do curso, sem acento/caixa
  paginaFamilia: PAGINA_FAMILIA_PADRAO,
  // Texto do WhatsApp (editável). Campos: {responsavel} {alunos} {ano} {prazo} {links}
  mensagemWhatsApp: [
    'Olá, {responsavel}!',
    '',
    'A renovação de matrícula de {alunos} para {ano} na SpeakUp English School está aberta até {prazo}.',
    'Pelo link abaixo você confere os valores, escolhe a forma de pagamento e assina o contrato:',
    '{links}',
    '',
    'Qualquer dúvida, estamos à disposição.',
    'Equipe SpeakUp',
  ].join('\n'),
};
