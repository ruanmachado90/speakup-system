// Texto da aba "Como funciona" da renovação (docs/rematricula/PLANO_COMO_FUNCIONA.md).
// A direção pode ajustar o texto aqui sem mexer no componente.
//
// Nada de valor da campanha escrito à mão: use as variáveis abaixo, que vêm
// da configuração salva (o que não estiver configurado aparece "A definir").
//   {abertura} {encerramento} {fimBeneficio} {pagamentoBeneficio} {reajuste}
//   {beneficios} {planos} {formas} {diasVencimento} {ano}
// As do aluno ({responsavel}, {aluno}, {link}) ficam visíveis para a
// secretaria completar.
//
// Nomes de botão e de status seguem a tela: se mudarem lá, mudam aqui.

/** Etapas da campanha, na ordem. `id` casa com etapaAtual (utils/renovacaoGuia). */
export const ETAPAS = [
  {
    id: 'preparacao',
    titulo: 'Preparação',
    quando: 'até {abertura}',
    grupos: [
      {
        quem: 'Secretaria',
        tarefas: [
          'Conferir o cadastro de cada aluno ativo: nome do responsável, telefone com WhatsApp, curso e livro previstos para {ano} e mensalidade atual.',
          'Listar os alunos sem telefone válido; esses recebem o convite por e-mail ou pessoalmente.',
          'Levantar os alunos com parcela vencida e começar o contato de regularização **antes** da abertura.',
          'Abrir um link de teste e percorrer a renovação do começo ao fim.',
        ],
      },
      {
        quem: 'Direção',
        tarefas: [
          'Preencher a configuração da campanha: reajuste, descontos e prazos, planos, formas de pagamento, dias de vencimento e datas.',
          'Separar os casos que ficam fora do link automático: VIP, In Company, bolsistas e contratos que já cobrem parte de {ano}.',
          'Apresentar a campanha à equipe em reunião, com os professores.',
        ],
      },
      {
        quem: 'Professores',
        tarefas: [
          'Participar da reunião de apresentação da campanha.',
          'Indicar à secretaria os alunos com risco de não renovar (faltas frequentes, desmotivação, mudança de cidade, comentário da família).',
        ],
      },
    ],
  },
  {
    id: 'envio',
    titulo: 'Envio dos links',
    quando: '{abertura} e dias seguintes',
    grupos: [
      {
        quem: 'Secretaria',
        tarefas: [
          'Na aba Painel, selecionar os alunos e clicar em **Gerar convites**. Gerar não envia nada.',
          'Conferir os marcados com **Revisar valor** (lápis na coluna Convite) antes de enviar; eles ficam fora da fila até a revisão.',
          'Clicar em **Enviar por WhatsApp**. A fila mostra um contato por vez com a mensagem pronta. Irmãos com o mesmo telefone recebem uma única mensagem.',
          'Enviar em lotes diários, por curso ou turma, para distribuir as dúvidas ao longo da semana.',
          'Registrar com **Marcar como enviado** o que for enviado por fora do sistema (e-mail, presencial).',
        ],
      },
      {
        quem: 'Professores',
        tarefas: [
          'No dia do envio da turma, avisar os alunos em sala que o link chegou ao WhatsApp do responsável. Nas turmas Kids, reforçar o aviso na saída, com quem vier buscar a criança.',
        ],
      },
    ],
  },
  {
    id: 'acompanhamento',
    titulo: 'Acompanhamento',
    quando: 'até {encerramento}',
    grupos: [
      {
        quem: 'Secretaria (rotina diária)',
        tarefas: [
          'Conferir no painel quem respondeu, quem abriu e não respondeu e quem está aguardando regularização.',
          '**3 dias depois do envio**, link não aberto: reenviar com a mensagem "Lembrete".',
          '**7 dias depois do envio**, aberto e não respondido: contato pessoal, por ligação ou mensagem individual.',
          '**Uma semana antes de {fimBeneficio}**: lembrete geral do prazo do desconto.',
          '**Três dias antes de {encerramento}**: lembrete final.',
          'Toda segunda-feira, mandar a cada professor a lista dos seus alunos ainda sem retorno.',
        ],
      },
      {
        quem: 'Professores',
        tarefas: [
          'Ao receber a lista semanal, conversar com os alunos sem retorno ou com quem vier buscá-los. Perguntar se receberam o link e se há alguma dúvida.',
          'Repassar à secretaria qualquer sinal de que a família não pretende renovar, com o motivo, se souber.',
        ],
      },
      {
        quem: 'Direção',
        tarefas: ['Acompanhar os números do painel uma vez por semana: convites enviados, respostas e quem não renova.'],
      },
    ],
  },
  {
    id: 'encerramento',
    titulo: 'Encerramento',
    quando: '{encerramento}',
    grupos: [
      {
        quem: 'Secretaria',
        tarefas: [
          'Fazer o último contato com os alunos sem retorno.',
          'Marcar como **Não renovará**, com o motivo, quem não for continuar.',
          'Enviar à direção o resumo final do painel (botão **Exportar planilha**).',
        ],
      },
      { quem: 'Direção', tarefas: ['Decidir os casos que ainda estiverem pendentes.'] },
    ],
  },
  {
    id: 'virada',
    titulo: 'Virada do ano',
    quando: 'janeiro de {ano}',
    grupos: [
      { quem: 'Direção', tarefas: ['Fazer a virada do ano no sistema, que passa curso e mensalidade para {ano}.'] },
      {
        quem: 'Secretaria',
        tarefas: [
          'Lembrar os responsáveis de que o material didático é cobrado à parte da mensalidade.',
          'Para manter o desconto de renovação, a 1ª mensalidade precisa estar paga até {pagamentoBeneficio}.',
        ],
      },
    ],
  },
];

/**
 * Checklist da preparação. O progresso fica no documento da campanha
 * (`guia.checklist.{id}`), igual para todos. Não reaproveitar um `id` para
 * outra tarefa: a marcação antiga passaria para ela.
 */
export const CHECKLIST_PREPARACAO = [
  { id: 'config', quem: 'Direção', texto: 'Configuração da campanha preenchida (datas, reajuste, descontos, planos, formas e vencimentos).' },
  { id: 'casos-especiais', quem: 'Direção', texto: 'Casos fora do link automático separados (VIP, In Company, bolsistas, contratos que cobrem {ano}).' },
  { id: 'reuniao', quem: 'Direção', texto: 'Campanha apresentada à equipe em reunião, com os professores.' },
  { id: 'cadastros', quem: 'Secretaria', texto: 'Cadastros dos alunos ativos conferidos (responsável, WhatsApp, curso, mensalidade).' },
  { id: 'sem-telefone', quem: 'Secretaria', texto: 'Lista dos alunos sem telefone válido pronta.' },
  { id: 'pendencias', quem: 'Secretaria', texto: 'Contato de regularização iniciado com quem tem parcela vencida.' },
  { id: 'teste', quem: 'Secretaria', texto: 'Link de teste aberto e renovação percorrida do começo ao fim.' },
  { id: 'riscos', quem: 'Professores', texto: 'Alunos com risco de não renovar indicados à secretaria.' },
];

/** Cards "Quem faz o quê". */
export const PAPEIS = [
  {
    quem: 'Secretaria',
    texto: 'Cadastro, geração e envio dos convites, lembretes, regularização de pendências, atendimento presencial e por WhatsApp, registro dos motivos de quem não renova.',
  },
  {
    quem: 'Professores',
    texto: 'Aviso em sala, conversa com alunos sem retorno, identificação de risco de não renovação e repasse de informações à secretaria.',
  },
  {
    quem: 'Direção',
    texto: 'Configuração da campanha, casos especiais (VIP, In Company, bolsistas), tentativa de retenção, acompanhamento dos números e virada do ano.',
  },
];

export const AVISO_PROFESSORES = 'Os professores não tratam de valores, descontos ou pendências financeiras. Dúvidas desse tipo vão para a secretaria.';

/** Situações especiais (accordion). */
export const SITUACOES = [
  {
    titulo: 'Responsável com parcela vencida',
    texto: 'Ele pode garantir a vaga pelo link, mas a renovação fica em **Aguardando regularização** e o desconto de renovação no prazo vale só para quem está em dia. A secretaria negocia, recebe, dá baixa nas parcelas no Financeiro e só então efetiva a renovação. Sem regularizar, a renovação segue sem esse desconto, salvo acordo: na efetivação, a secretaria pode **manter o desconto** quando houver negociação. As parcelas de {ano} são geradas na efetivação.',
  },
  {
    titulo: 'Renovação presencial',
    texto: 'A secretaria abre o link do aluno na recepção e preenche junto com o responsável. O aceite do contrato é feito pelo próprio responsável, com nome e CPF dele.',
  },
  {
    titulo: 'Troca de plano ou de curso',
    texto: 'Orientar o responsável antes de ele responder e ajustar o convite no painel. Depois de respondido, só a direção altera.',
  },
  {
    titulo: 'Alteração depois de responder',
    texto: 'Dia de vencimento, plano ou forma de pagamento: só a direção altera. A secretaria registra o pedido e encaminha.',
  },
  {
    titulo: 'Família que não vai renovar',
    texto: 'A secretaria encaminha o caso à direção, que decide se tenta a retenção. Depois, marca **Não renovará** com o motivo (o ícone na coluna Convite). Isso não cancela nada de {anoAtual}.',
  },
  {
    titulo: 'Aluno sem telefone',
    texto: 'Enviar o texto por e-mail ou entregar o link pessoalmente (use **Copiar links**) e registrar com **Marcar como enviado**.',
  },
  {
    titulo: 'Irmãos',
    texto: 'Uma única mensagem com o link de cada filho. Cada aluno responde separadamente. O desconto de irmão é marcado à mão no painel (ícone de irmão na coluna Convite).',
  },
  {
    titulo: 'VIP, In Company e bolsistas',
    texto: 'Aparecem com **Revisar valor** e ficam fora da fila até a revisão. A direção define o valor de cada caso antes do envio.',
  },
];

/**
 * Mensagens prontas. `modelo: 'convite'` usa o texto salvo na configuração
 * da campanha (o mesmo da fila do WhatsApp).
 */
export const MENSAGENS = [
  { id: 'convite', titulo: 'Convite', nota: 'O mesmo texto da fila do WhatsApp; edite na configuração da campanha.', modelo: 'convite' },
  {
    id: 'lembrete',
    titulo: 'Lembrete (3 dias depois do envio)',
    texto: [
      'Olá, {responsavel}! Passando para lembrar que a renovação de matrícula de {aluno} para {ano} está aberta até {encerramento}. O link é este: {link}',
      'Qualquer dúvida, estamos à disposição.',
      'Equipe SpeakUp',
    ].join('\n'),
  },
  {
    id: 'prazo-desconto',
    titulo: 'Prazo do desconto',
    texto: [
      'Olá, {responsavel}! O desconto de renovação de {aluno} vale para quem concluir até {fimBeneficio} e pagar a 1ª mensalidade até {pagamentoBeneficio}. Link: {link}',
      'Equipe SpeakUp',
    ].join('\n'),
  },
  {
    id: 'lembrete-final',
    titulo: 'Lembrete final',
    texto: [
      'Olá, {responsavel}! A renovação de matrícula para {ano} encerra em {encerramento}. Para garantir a vaga de {aluno}, basta concluir pelo link: {link}',
      'Se preferir, podemos fazer junto com você aqui na escola.',
      'Equipe SpeakUp',
    ].join('\n'),
  },
  {
    id: 'lembrete-pagamento',
    titulo: 'Lembrete do 1º pagamento (início de janeiro)',
    texto: [
      'Olá, {responsavel}! A 1ª mensalidade de {ano} de {aluno} já está disponível. Para manter o desconto de renovação, o pagamento precisa ser feito até {pagamentoBeneficio}.',
      'Qualquer dúvida, estamos à disposição.',
      'Equipe SpeakUp',
    ].join('\n'),
  },
  {
    id: 'pendencia',
    titulo: 'Pendência',
    texto: [
      'Olá, {responsavel}! Recebemos a renovação de {aluno} para {ano}. Para concluirmos e garantir o desconto de renovação, precisamos regularizar as mensalidades em aberto. Podemos conversar sobre a melhor forma?',
      'Equipe SpeakUp',
    ].join('\n'),
  },
];

/** Respostas para dúvidas frequentes (accordion com "Copiar"). */
export const DUVIDAS = [
  { pergunta: 'Por que a mensalidade aumentou?', resposta: 'A mensalidade de {ano} tem o reajuste anual de {reajuste}, previsto em contrato.' },
  { pergunta: 'Quais são os descontos?', resposta: '{beneficios}' },
  { pergunta: 'Quais são os planos?', resposta: 'Os planos disponíveis são: {planos}.' },
  { pergunta: 'Posso escolher outro dia de vencimento?', resposta: 'Sim. Os dias disponíveis são {diasVencimento}.' },
  { pergunta: 'Quais formas de pagamento são aceitas?', resposta: '{formas}.' },
  { pergunta: 'O livro está incluído?', resposta: 'Não. O material didático é cobrado à parte da mensalidade.' },
  { pergunta: 'Posso mudar de plano?', resposta: 'Sim. Fale com a secretaria antes de concluir a renovação.' },
  { pergunta: 'Já respondi e quero mudar algo.', resposta: 'Fale com a secretaria. A alteração é feita pela direção.' },
  { pergunta: 'O link não abre.', resposta: 'A secretaria confere a situação do convite no painel e reenvia o link.' },
];

/**
 * O que significa cada situação do convite. As chaves são os valores de
 * STATUS (utils/renovacao.js); o rótulo vem de SITUACAO_CONVITE, o mesmo
 * da tabela do painel.
 */
export const SIGNIFICADO_STATUS = {
  gerada: ['Convite criado, ainda não enviado.', 'Enviar pela fila do WhatsApp.'],
  enviada: ['Mensagem enviada ao responsável.', 'Aguardar; lembrete 3 dias depois.'],
  aberta: ['O responsável abriu o link e não concluiu.', 'Contato pessoal 7 dias depois do envio.'],
  respondida: ['O responsável escolheu o plano e assinou o contrato.', 'Efetivar.'],
  aguardando_regularizacao: ['Vaga garantida, mas há parcelas vencidas.', 'Negociar, dar baixa e efetivar.'],
  efetivada: ['Renovação concluída e parcelas de {ano} geradas.', 'Nada.'],
  nao_renovara: ['A família informou que não continua.', 'Registrar o motivo e encaminhar à direção.'],
  expirada: ['A campanha acabou sem resposta.', 'Decisão da direção.'],
  cancelada: ['Convite cancelado pela escola.', 'Nada.'],
};
