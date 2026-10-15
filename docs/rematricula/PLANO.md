# Rematrícula 2027 — planejamento

> Versão 2, de 14/10/2026, feita a partir do sistema real (código em `5849475` e dados de produção lidos sem gravar nada) e das decisões do Ruan.
> Substitui o plano escrito fora do projeto. Trabalho **uma etapa por vez**: cada etapa termina com testes passando, um commit e a aprovação do Ruan antes da próxima.

---

## 1. Objetivo

Renovar a matrícula dos alunos de 2026 para o ano letivo de 2027 sem quebrar nada do que já existe:

- a secretaria **seleciona** os alunos que vão renovar (Kids e Teens, principalmente) e envia a cada família **um link com os valores já reajustados** (reajuste de **7%**), pelo WhatsApp ou copiando o link;
- pelo link, a família escolhe o plano, a forma de pagamento e o dia de vencimento, e **assina o contrato de 2027 online**, com a ferramenta de contrato que já existe;
- quem preferir resolve no balcão, por um **modal de renovação** na ficha do aluno;
- **o aluno continua sendo o mesmo cadastro**: nada é apagado ou recriado, e tudo o que ele fez em 2026 (turmas, book, notas, frequência, mensalidade, parcelas) fica guardado como histórico.

---

## 2. Como o sistema é hoje (o que importa para a renovação)

| Assunto | Como está | Consequência para a renovação |
|---|---|---|
| Alunos | 253 no cadastro: **204 ativos** (89 Teens, 53 Kids, 2 Reforço, 60 adultos/VIP/outros) | Kids e Teens renovam pela campanha; adultos, em geral, têm contrato renovado de outra forma |
| Contrato no cadastro | `fee`, `installments`, `dueDate` (1º vencimento), `course`, `teacher`, `professorId` gravados direto no aluno, **sem ano** | Não existe "contrato de 2026" separado. A renovação precisa criar a noção de ano sem mudar o que os relatórios leem |
| Book do aluno | Mora na **turma** (`turmas.book`, `turmas.curso`, `turmas.nivel`); só 6 alunos têm `book` no cadastro | O histórico de 2026 precisa de uma **foto das turmas** antes de elas mudarem para 2027 |
| Turmas | 82, **sem campo de ano** | Em 2027 as turmas avançam de book; sem a foto, perde-se o que o aluno cursou em 2026 |
| Notas | Coleções `grades`/`avaliacoes` por semestre (`2026-1`, `2026-2`) | Já separadas por ano. Em 2027 o sistema passa a usar `2027-1` sozinho (pela data) |
| Aulas e chamadas | 1.348 aulas, todas de 2026, ligadas à turma e com data | Separáveis por ano pela data |
| Certificados | Código `SU-2026-...` | Já têm ano |
| Parcelas | `payments` com `dueDate`, `valuePlanned`, `status` (`Pendente`/`Pago`/`cancelada`), sem ano de contrato | As de 2027 precisam de marcação própria |
| Contrato de 12x iniciado no meio de 2026 | **64 ativos já têm parcelas em 2027**, sendo **47 Kids/Teens** (23 Kids, 24 Teens), com o contrato terminando entre janeiro e julho de 2027 (a maioria até abril) | Esses Kids/Teens também renovam: o contrato atual **termina em dezembro de 2026** e as parcelas dele em 2027 são canceladas **na efetivação** (seção 5.1) |
| Parcelas vencidas | **33 ativos** com parcela vencida em aberto | Renovam com "aguardando regularização" |
| Irmãos | **37 alunos** dividem o telefone do responsável | Mensagem única por família e desconto de irmão |
| Mensalidades | De R$ 0,50 a R$ 2.700 (VIP por hora, In Company); 2 sem valor | VIP, In Company e alguns adultos: valor revisado à mão antes do envio |
| Cursos | Nomes escritos de vários jeitos ("VIP-ADULTO", "VIP -  Adulto"...), 12 sem curso | O curso serve para filtro e seleção, não como chave de regra |
| Contatos | 162 com telefone do responsável, 196 com telefone do aluno, nenhum sem telefone | Todos alcançáveis por WhatsApp |
| Contrato online | `/contrato/:idDoAluno` mostra o contrato com os valores **do cadastro** e grava a assinatura em `contratos/{idDoAluno}` (**uma por aluno, para sempre**); gera PDF e envia por e-mail | Para 2027: mesmo texto e mesmo PDF, mas com os valores da renovação e assinatura **por ano** (`contratos/{idDoAluno}_2027`) |
| Calendário | Encerramento do ano letivo em **18/12/2026** | Marco para o fechamento do ano (etapa 6) |
| Cloud Functions | Node 20, que deixa de aceitar publicação em **30/10/2026** | A renovação **não usa Cloud Functions novas** |

### Pontos do código que a renovação pode quebrar (e a trava de cada um)

1. **Mudança de mensalidade** (`utils/mensalidade.js`): os modos "plano" e "correção" alteram toda parcela em aberto a partir de uma data, **incluindo as de 2027** já geradas com o reajuste. → Trava: parcelas da renovação (`anoLetivo: 2027`) ficam fora da alteração feita em 2026 (etapa 1).
2. **MRR** (`reportKPIs.js`) soma `student.fee`. Trocar o `fee` em novembro inflaria o MRR de novembro e dezembro. → O `fee` só muda na **virada do ano** (etapa 7); até lá, o valor de 2027 fica no registro da renovação.
3. **"Matrículas do mês"** usa `createdAt`. → A renovação nunca toca no `createdAt`; ganha um indicador próprio.
4. **Cancelamento** (`handleCancelEnrollment`) cancela as parcelas que vencem de hoje em diante. Para quem renovou, isso inclui as de 2027, o que está certo; o registro da renovação também precisa ser marcado como cancelado. → Ajuste na etapa 5.
5. **Contrato único por aluno**: a página de contrato diria "já assinado" para quem assinou em 2026. → Assinatura por ano (etapa 4).
6. **Bug no WhatsApp da cobrança**: lê `responsiblePhone`/`phone`, que não existem; o cadastro usa `responsibleContact`/`contact`. → Corrigido na etapa 3.

---

## 3. Decisões de desenho

1. **Sem Cloud Functions.** O sistema já tem páginas públicas que gravam direto no banco (`Registro`, `Contrato`). A renovação segue o mesmo padrão, com regras do Firestore que limitam o que a página pública pode gravar.
2. **A secretaria escolhe quem recebe.** Nada é enviado automaticamente: a tabela tem caixas de seleção e atalhos ("selecionar Kids", "selecionar Teens"); só os selecionados recebem convite.
3. **A família escolhe e assina; a secretaria efetiva.** O link grava as escolhas e a assinatura do contrato. As parcelas de 2027 são criadas pela secretaria com um clique ("Efetivar renovações"), em lote, recalculando os valores. Assim, ninguém altera um valor pelo link, e quem tem pendência não gera parcelas sem a secretaria ver.
4. **Um registro de renovação por aluno e ano**, separado do cadastro. O cadastro só recebe um resumo para filtros e etiquetas.
5. **O ano letivo passa a existir** em quatro lugares, sem mexer no resto: nas parcelas novas (`anoLetivo`), no contrato (`contratos/{id}_2027`), no histórico do aluno (`historicoAnual`) e nas fotos das turmas (`turmas-historico`).
6. **Tudo configurável** num documento da campanha: reajuste, descontos, regras de acúmulo, prazos, planos, formas de pagamento, dias de vencimento e textos. Nada fixo no código.
7. **Ambiente de teste antes de tudo**: emulador do Firebase com dados fictícios. Nenhuma etapa grava em produção até a publicação aprovada.

---

## 4. Modelo de dados

Todas as coleções novas ficam em `artifacts/speakup-manager/public/data/` (helper `col()`), como as demais.

### 4.1 `renovacao-campanhas/2027` — configuração (1 documento)

```js
{
  anoLetivo: 2027,
  status: 'rascunho' | 'aberta' | 'encerrada',
  abertura: '2026-11-16',            // meio de novembro (data exata a confirmar)
  encerramento: '2026-12-15',        // meio de dezembro (data exata a confirmar)
  reajustePct: 7,
  arredondamento: 'centavos',
  planos: [
    { id: '12x',       rotulo: '12 parcelas',    pagamentos: 12, meses: [1,2,3,4,5,6,7,8,9,10,11,12], descontoPct: 0 },
    { id: 'semestral', rotulo: 'Semestralidade', pagamentos: 2,  meses: [1, 7], descontoPct: 5 },   // janeiro e julho
    { id: 'avista',    rotulo: 'À vista',        pagamentos: 1,  meses: [1],    descontoPct: 10 },
  ],
  // Nenhum desconto acumula (decisão do Ruan): vale UM só por renovação (seção 5.2).
  descontoRenovacaoNoPrazo: {
    pct: 3.5, planos: ['12x'],
    respostaAte: '2026-12-15',          // renovar dentro da campanha
    primeiraParcelaPagaAte: '2027-01-10' // e pagar a 1ª mensalidade até 10/01; senão, valor cheio no ano
  },
  descontoIrmao: { pct: 10 },        // aplicado à mão pela secretaria, aluno a aluno
  formasPagamento: ['PIX', 'Boleto', 'Dinheiro'],
  diasVencimento: [5, 10, 15],
  primeiroVencimento: '2027-01',
  mensagemWhatsApp: '...',           // modelo com {responsavel}, {aluno}, {link}, {prazo}
  textoPagina: '...',
  atualizadoEm, atualizadoPor,
}
```

Leitura pública só deste documento (não tem dado pessoal); gravação só admin.

### 4.2 `renovacoes/{codigo}` — uma renovação por aluno e ano

O **código** é aleatório (32 caracteres) e vira o ID do documento e o final do link. O link **nunca** leva o ID do aluno, porque hoje o cadastro de aluno é legível por quem tiver o ID, inclusive o CPF.

```js
{
  codigo, anoLetivo: 2027, studentId,
  // foto para a página pública (só o que a família pode ver)
  alunoNome, responsavelNome, menorDeIdade, cursoAtual, turmasAtuais: ['Teens 3 — seg/qua 18h'],
  mensalidadeAtualCentavos,  // fee no momento da geração
  mensalidadeBaseCentavos,   // = atual; a secretaria ajusta antes do envio (VIP, In Company, adultos)
  mensalidadeNovaCentavos,   // base + 7%; recalculada se a base mudar
  parcelasAntigas: { cancelar, bloqueiam },   // contrato de 2026 que invade 2027 (os 47); canceladas na efetivação
  descontoIrmao: true|false, // marcado à mão pela secretaria
  temPendencia: true|false,  // sem valores detalhados
  revisarValor: true|false,  // some quando a secretaria confere o valor
  // NADA de telefone, e-mail da equipe ou anotação aqui: quem tem o link lê
  // o documento inteiro (etapa 4). Telefone sai do aluno na hora do envio;
  // `por` no histórico é o uid.
  status: 'gerada' | 'enviada' | 'aberta' | 'respondida' | 'aguardando_regularizacao'
        | 'efetivada' | 'nao_renovara' | 'expirada' | 'cancelada',
  enviadaEm, enviosQtd, abertaEm,
  resposta: {                // gravado UMA vez pela página pública (ou pelo modal de balcão)
    planoId, formaPagamento, diaVencimento,
    respondidaEm,            // = horário do servidor (as regras exigem), base para o prazo do desconto
    canal: 'link' | 'balcao',
  },
  efetivacao: {              // gravado pela secretaria ao efetivar
    valores: { mensalidade, parcelas, valorParcela, ultimaParcela, total, descontosAplicados },
    paymentIds, efetivadaEm, efetivadaPor,
  },
  historico: [ { evento, em, por } ],
  criadaEm, criadaPor,
}
```

**`renovacoes-notas/{codigo}`** (só a equipe lê; implementado na etapa 3): `{ codigo, anoLetivo, studentId, motivo, observacao, em, por }` — motivo de "não renovará" (lista `MOTIVOS_CANCELAMENTO`). Apagada ao desfazer.

### 4.3 `contratos/{idDoAluno}_2027` — contrato de 2027

Mesmo formato da assinatura que a página de contrato já grava hoje (nome, CPF, data, IP), mais `anoLetivo`, `renovacaoId` e os valores do plano escolhido. O contrato sem sufixo (`contratos/{idDoAluno}`) continua sendo o de 2026.

### 4.4 Mudanças em coleções existentes

- **`payments`**: as parcelas de 2027 continuam saindo de `montarParcelas`, com três campos a mais: `anoLetivo: 2027`, `origem: 'renovacao'`, `renovacaoId`. Parcelas antigas sem `anoLetivo` continuam valendo pelo ano do vencimento.
- **`students`**: dois campos novos, só por acréscimo:
  - `renovacoes: { '2027': { status, codigo, mensalidade, plano, efetivadaEm } }` — resumo para etiqueta e filtro na tela de Alunos;
  - `historicoAnual: [ { ano: 2026, ... } ]` — preenchido no fechamento do ano (seção 4.5).
  - **Não mudam durante a campanha**: `fee`, `installments`, `dueDate`, `course`, `createdAt`. Só mudam na virada (etapa 7), com entrada em `historicoMensalidade`.
- **`turmas`**: não muda na campanha. As turmas só avançam para 2027 depois da foto do fechamento.

### 4.5 Histórico de 2026 (gravado no fechamento do ano)

**No aluno**, `historicoAnual` recebe uma entrada:

```js
{
  ano: 2026,
  turmas: [ { turmaId, nome, curso, book, nivel, professor, horario } ],
  curso, mensalidade, // fee em vigor no fim do ano
  frequencia: { aulasDadas, presencas, faltas, justificadas, percentual },
  notas: { '2026-1': { media, conceito }, '2026-2': { media, conceito } },
  situacao: 'concluiu' | 'cancelou' | 'em_andamento',
  financeiro: { parcelas, pagas, emAberto, valorEmAberto },
  certificados: ['SU-2026-...'],
  renovacao2027: 'efetivada' | 'nao_renovara' | 'sem_resposta',
  registradoEm, registradoPor,
}
```

**Por turma**, `turmas-historico/{turmaId}_2026` guarda a foto: nome, curso, book, nível, professor, horários, alunos, aulas dadas e frequência média.

Os dados de origem (aulas, notas, certificados, parcelas) **continuam onde estão**; a foto é para consulta rápida e para não perder o book e o professor quando a turma mudar em 2027.

---

## 5. Regras de negócio

### 5.1 Quem recebe o convite

A secretaria **seleciona** na tabela. A lista mostra todos os ativos, com atalhos e estas marcações:

| Grupo | Como aparece |
|---|---|
| Kids e Teens sem parcelas em 2027 | Prontos para renovar o ano inteiro (12 meses) |
| **Kids e Teens com contrato indo até 2027 (47)** | Renovam como os demais (janeiro a dezembro de 2027, valor novo). O contrato atual **termina em dezembro de 2026**: na **efetivação**, as parcelas dele com vencimento em 2027 que ainda estão em aberto viram `cancelada` (motivo "substituída pela renovação 2027"), no mesmo lote que cria as novas. Se a família **não** renovar, nada é cancelado e o contrato atual segue como está. Parcela de 2027 **já paga** (pagamento adiantado) não é cancelada: a efetivação para e mostra o caso à secretaria, que decide (abater na primeira parcela nova ou devolver) |
| Com parcela vencida (33) | Podem receber; a renovação fica "Aguardando regularização" até a secretaria confirmar |
| VIP, In Company, alguns adultos | `revisarValor`: a secretaria confirma ou ajusta a mensalidade base antes de enviar |
| Adultos em geral | Fora por padrão (contrato renovado de outra forma); a secretaria pode selecionar se quiser |
| Cancelados | Não aparecem (se voltarem, é reativação, que já existe) |

### 5.2 Valores

Contas em **centavos inteiros**; formatação só na tela.

```
mensalidadeNova  = arredondar(mensalidadeBase × 1,07, centavos)
bruto do ano     = mensalidadeNova × 12
desconto         = UM só (nenhum desconto acumula — decisão do Ruan)
total do plano   = bruto − desconto
valorPagamento   = total ÷ nº de pagamentos do plano (centavos que sobram vão para o último)
```

Qual desconto vale (nunca mais de um):

| Plano | Descontos possíveis | Vale |
|---|---|---|
| 12 parcelas | renovação no prazo (3,5%), irmão (10%, se marcado) | o maior dos que se aplicam |
| Semestralidade | do plano (5%), irmão (10%, se marcado) | o maior |
| À vista | do plano (10%), irmão (10%, se marcado) | o maior (10%) |

- A página mostra, em cada plano, o desconto que vale e o total; o desconto escolhido fica registrado em `descontoAplicado`.
- **Irmão**: a secretaria marca à mão em quais renovações se aplica (a escola decide caso a caso).
- **Renovação no prazo** (12x): duas condições.
  1. Renovar dentro da campanha: `resposta.respondidaEm` (horário do servidor) até o fim da campanha, no fuso de Brasília. Atendida essa, as parcelas de 2027 são **geradas com o desconto**.
  2. **Pagar a 1ª mensalidade de 2027 até 10/01/2027.** Quem não pagar até lá perde o desconto: as parcelas da renovação ainda em aberto (incluindo a 1ª) passam ao **valor cheio** do ano. A conferência é feita em 11/01 por uma ação da secretaria, com prévia e registro no histórico (etapa 7).
  - Quem escolher **vencimento no dia 15** vê na página: "Para manter o desconto, pague a 1ª mensalidade até 10/01".
- **A página mostra; a efetivação recalcula.** Se algo mudou (prazo passou, base ajustada, irmão marcado/desmarcado), a efetivação usa o valor recalculado e mostra a diferença à secretaria antes de gravar.

### 5.3 Datas dos pagamentos

- **12 parcelas**: `datasDasParcelas('2027-01-<dia>', 12)` → janeiro a dezembro de 2027 (dia 31 e fevereiro já tratados por `addMonthsClamped`).
- **Semestralidade**: 2 pagamentos, no dia escolhido de janeiro e de julho de 2027.
- **À vista**: um pagamento no dia escolhido de janeiro de 2027.
- Todos começam em **janeiro de 2027**, inclusive os 47 (o contrato antigo deles termina em dezembro de 2026).

### 5.4 Pendência

- Calculada na geração (só sim/não para a página) e **de novo na efetivação**.
- Com pendência na efetivação → `aguardando_regularizacao`; a secretaria efetiva depois que a família quitar.

### 5.5 Status e transições

```
gerada → enviada → aberta → respondida → efetivada
                                   └→ aguardando_regularizacao → efetivada
qualquer status antes de efetivada → nao_renovara | cancelada
fim da campanha: gerada/enviada/aberta → expirada
```

Reabrir uma resposta (família quer trocar o plano) só antes da efetivação, registrado no histórico.

---

## 6. Telas

### 6.1 "Renovação 2027" (novo item do menu, admin e secretaria)

- **Configuração** (só admin): todos os campos de 4.1, com pré-visualização em 3 alunos reais.
- **Indicadores**: selecionados, enviadas, abertas sem resposta, respondidas a efetivar, efetivadas, aguardando regularização, não renovarão, sem retorno, **taxa de renovação**, receita 2027 contratada.
- **Tabela**: caixa de seleção, aluno e responsável, turma atual, contrato atual vai até, mensalidade atual → nova, irmão, pendência, status, ações. Filtros por status, curso (Kids, Teens, adultos), professor, pendência, "revisar valor", "contrato até 2027".
- **Ações por aluno**: gerar convite, copiar link, WhatsApp, ver resposta e contrato, ajustar mensalidade base (antes da resposta), "não renovará" (com motivo, sem cancelar 2026), efetivar, reabrir resposta.
- **Em lote** (sobre os selecionados): gerar convites (blocos de 400, sem duplicar), enviar em sequência, copiar todos os links, exportar planilha, efetivar respondidas.

### 6.2 Fila de envio por WhatsApp

Um contato por vez, mensagem pronta e editável, botões "Abrir WhatsApp e ir para o próximo" (Enter), "Pular" e "Sem WhatsApp". Cada envio fica registrado. Irmãos com o mesmo telefone recebem **uma** mensagem com um link por filho. Telefone: `responsibleContact` (menor de idade ou com responsável) senão `contact`.

### 6.3 Página da família `/renovar/:codigo`

(`/renovacao` já é a página da secretaria.)

Pensada para celular, no visual do `Registro.jsx`:
1. Saudação, aluno, turma atual, mensalidade atual → nova (com a frase do reajuste) e descontos disponíveis, com o prazo.
2. Aviso discreto se houver pendência.
3. Escolhas: plano (cartões com total e economia), forma de pagamento e dia de vencimento (chips), resumo com os vencimentos.
4. **Contrato de 2027**: o mesmo texto do contrato online atual, já com os valores do plano escolhido; nome, CPF e "Li e concordo" — grava `contratos/{idDoAluno}_2027` e a resposta juntos.
5. Comprovante: "Recebemos sua renovação", botão para baixar o contrato em PDF (o mesmo `gerarContratoPDF`) e envio da cópia por e-mail, como hoje.

Link inválido, campanha fechada ou já respondida: mensagens próprias.

### 6.4 Modal "Renovar para 2027" (balcão)

Na ficha do aluno, para quem renova pessoalmente: as mesmas escolhas, com `canal: 'balcao'`, e já efetiva na hora (ou deixa aguardando, se houver pendência). O contrato pode ser assinado no próprio link (enviado na hora) ou impresso, se a família pedir. Usa o mesmo cálculo e a mesma função de efetivação do lote.

### 6.5 Ajustes em telas existentes

- **Alunos**: etiqueta "Renovou 2027" / "Aguardando" / "Não renovará" e filtro; contrato assinado passa a considerar o ano vigente.
- **Ficha do aluno**: seção "Histórico" com os anos (após o fechamento).
- **Dashboard**: card "Renovação 2027: X%".

---

## 7. Segurança (regras do Firestore)

- `renovacao-campanhas/{ano}`: `get` público; gravação só admin.
- `renovacoes/{codigo}`:
  - `get` público pelo código, **sem `list`** (ninguém lista os convites);
  - a página pública só pode gravar `resposta` (uma vez, com `status` passando de `enviada`/`aberta` para `respondida`), `abertaEm`/`status: 'aberta'`, com `respondidaEm == request.time` e tipos validados; nenhum outro campo;
  - o resto, só admin e secretaria.
- `contratos/{idDoAluno}_2027`: criado pela página junto com a resposta (a regra de contratos já aceita criação pública; validar que a renovação correspondente existe e está sendo respondida).
- `payments` das renovações: só admin e secretaria (como hoje).
- Validação das regras no emulador, com casos de ataque (gravar valor, trocar aluno, responder duas vezes, listar convites, assinar contrato de outro aluno).

---

## 8. Etapas

| # | Etapa | O que entrega | Pronto quando |
|---|---|---|---|
| 0 | **Ambiente de teste** | Java 21; emulador de Firestore e Auth no projeto `demo-speakup`; `npm run dev` no emulador e `npm run dev:producao` com faixa vermelha; login de teste (admin/secretaria) só no emulador; e-mail desligado no emulador; script com dados fictícios espelhando os casos reais (irmãos, vencidos, contrato até 2027, VIP, sem curso) | Rodar o sistema local não grava nada na produção (conferido lendo a produção antes e depois) |
| 1 | **Base e travas** | `utils/renovacao.js` (cálculos, escolha do desconto único, datas dos 3 planos, parcelas antigas de 2027 a cancelar, pendência, status) com testes; trava em `mensalidade.js` para não tocar parcelas da renovação | `npm test` verde, incluindo fevereiro, dia 31, centavos, prazo do desconto, "nunca dois descontos", parcela antiga já paga e a trava da mensalidade |
| 2 | **Painel: configuração e lista** | Menu "Renovação 2027", configuração da campanha, tabela com seleção e valores calculados, atalhos Kids/Teens, "revisar valor", contrato até 2027 | A secretaria vê os alunos com os valores certos **antes** de qualquer envio |
| 3 | **Convites e envio** | Gerar convites dos selecionados (lote, sem duplicar), copiar link, fila de WhatsApp com irmãos agrupados, copiar todos, exportar planilha, "não renovará"; correção do telefone da cobrança | No emulador, 30 envios em sequência, todos registrados |
| 4 | **Página da família, contrato e regras** | `/renovar/:codigo` com escolhas e contrato de 2027 (texto, assinatura por ano, PDF, e-mail); regras do Firestore e testes de ataque; tela de Alunos lendo o contrato do ano | Responder pelo link grava só a resposta e o contrato de 2027; as tentativas de ataque são recusadas; layout validado em 390 px |
| 5 | **Efetivação** | "Efetivar renovações" em lote: no mesmo lote, cancela as parcelas antigas de 2027 em aberto e cria as novas; modal de balcão, aguardando regularização, etiquetas em Alunos, card no Dashboard, ajuste no cancelamento | No emulador: efetivar gera as parcelas de 2027 sem tocar `fee`/`createdAt`; quem tinha contrato até 2027 fica só com as parcelas novas; parcela antiga já paga trava a efetivação e aparece para a secretaria; repetir não duplica; os números do painel batem com a contagem manual |
| — | **Publicação e campanha** | Publicar regras e app; abrir a campanha no meio de novembro | Aprovação do Ruan |
| 6 | **Fechamento do ano letivo 2026** (a partir de 18/12) | Foto das turmas (`turmas-historico`) e `historicoAnual` de cada aluno; renovações sem resposta → `expirada`; relatório final | Ficha do aluno mostra 2026 completo; nenhuma turma alterada ainda |
| 7 | **Virada para 2027** (janeiro) | Prévia e aplicação: `fee`/`installments`/`dueDate` dos renovados (com `historicoMensalidade`); lista dos não renovados para cancelamento com motivo; montagem das turmas 2027 | Executa uma vez, com prévia antes de gravar; relatórios de janeiro corretos |
| 7b | **Conferência do desconto** (11/01/2027) | Lista de quem renovou no 12x com desconto e **não pagou a 1ª mensalidade até 10/01**; com a confirmação da secretaria, as parcelas em aberto da renovação desses alunos passam ao valor cheio (registro no histórico da renovação e em `historicoMensalidade`) | Prévia antes de gravar; quem pagou até 10/01 não é tocado; executar de novo não altera nada |

Calendário: etapas 0 a 5 até o início de novembro, para abrir a campanha no meio de novembro; etapa 6 entre 18 e 23/12; etapa 7 na primeira semana de janeiro.

---

## 9. Testes por etapa

- **Jest** para tudo que calcula ou decide (valores, descontos e acúmulo, datas, meses a renovar, elegibilidade, transições de status, trava da mensalidade, montagem do histórico).
- **Emulador** para fluxos completos: selecionar → gerar → enviar → responder e assinar → efetivar → cancelar; regras do Firestore com tentativas de ataque.
- **Checagem de produção (só leitura)** antes e depois de cada publicação: contagem de alunos, parcelas e soma de `fee` dos ativos (o MRR não pode mudar com a renovação).

---

## 10. O que fica de fora (por enquanto)

- Envio automático de WhatsApp ou e-mail em massa (precisa da API paga do WhatsApp Business).
- Correção da regra `students` com leitura pública (tarefa de segurança separada; a página de contrato atual depende dela).
- Gráficos por professor e evolução diária (podem entrar depois que a campanha estiver rodando).

### Lista para o próximo ano (pedido do Ruan, 15/10/2026)

1. **Padronizar os nomes dos cursos**: uma lista fechada e bem definida (hoje o mesmo curso aparece escrito de vários jeitos, como "VIP-ADULTO", "VIP -  Adulto", "VIP - Adulto", e 12 alunos estão sem curso). Inclui migrar os cadastros atuais para os nomes novos.
2. **Tabela de preços fixos por curso**: a mensalidade passa a vir do curso (não digitada aluno a aluno), e os descontos (plano, renovação, irmão) são aplicados sobre ela. Casos especiais (VIP por hora, In Company) continuam com valor próprio.
3. Com os dois itens acima, a próxima renovação calcula tudo direto pela tabela, sem a etapa de "revisar valor".

---

## 11. Decisões

### Definidas pelo Ruan (14/10/2026)

| # | Assunto | Decisão |
|---|---|---|
| 1 | Arredondamento | Centavos |
| 2 | Renovação no prazo | 3,5% de desconto nas mensalidades (12x) — metade do reajuste (alterado em 15/10): renovar até o **fim da campanha** **e pagar a 1ª mensalidade até 10/01/2027**; quem pagar depois fica com o valor cheio no ano |
| 3 | Planos | 12x (valor cheio), semestralidade com 5% (**2 pagamentos: janeiro e julho**), à vista com 10% |
| 4 | Pagamento | PIX, Boleto e Dinheiro; vencimento nos dias 5, 10 e 15 |
| 5 | Quem renova | Kids e Teens renovam; adultos em geral não (contrato renovado de outra forma). A secretaria **seleciona** os alunos e envia pelo WhatsApp ou copiando o link |
| 6 | Kids/Teens com contrato até 2027 (47) | O contrato atual **termina em dezembro de 2026**; as parcelas dele em 2027 são **canceladas** e o contrato novo começa em **janeiro de 2027**, no valor novo |
| 7 | Descontos | **Nenhum desconto acumula** (vale um só) |
| 8 | Irmãos | 10%; **a escola decide caso a caso** onde aplicar (marcação manual) |
| 9 | VIP, In Company e alguns adultos | Valor revisado à mão |
| 10 | Datas | Do meio de novembro ao meio de dezembro |
| 11 | Contrato | Online, com a ferramenta que já existe; impresso só se alguém pedir na secretaria |

### Ainda em aberto (não bloqueiam as etapas 0 e 1)

1. **Datas exatas** de abertura e encerramento (o Ruan vai definir).
