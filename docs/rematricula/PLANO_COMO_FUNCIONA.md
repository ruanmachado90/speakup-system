# Renovação 2027 · Aba "Como funciona"

Complemento do `PLANO.md`. Guia operacional da campanha dentro da página "Renovação 2027", para secretaria, professores e direção: **o que fazer, quando e em que situação**.

Implementado em 20/10/2026. Este arquivo registra o pedido e as decisões; o texto que vai para a tela fica em `src/content/renovacaoGuia.js`.

## Onde está no código

| Peça | Arquivo |
|---|---|
| Abas "Painel" e "Como funciona" | `src/pages/Renovacao.jsx` |
| Componente da aba | `src/components/renovacao/ComoFunciona.jsx` |
| Texto (etapas, checklist, situações, mensagens, dúvidas, status) | `src/content/renovacaoGuia.js` |
| Regras puras (valores da campanha, etapa do dia, cópia) | `src/utils/renovacaoGuia.js` + `src/__tests__/renovacaoGuia.test.js` |
| Checklist salvo | `renovacao-campanhas/{ano}` → `guia.checklist.{itemId}: { feito, por, em }` (`marcarItemGuia` em `useCampanhaRenovacao`) |

## Regras

- **Nenhum valor da campanha escrito no texto.** Variáveis: `{abertura}` `{encerramento}` `{fimBeneficio}` `{pagamentoBeneficio}` `{reajuste}` `{beneficios}` `{planos}` `{formas}` `{diasVencimento}` `{ano}` `{anoAtual}`. Um teste falha se aparecer percentual, ano, data ou R$ no texto.
- **Não configurado** aparece com o selo amarelo "A definir"; na cópia, como `[a definir]`.
- **Campos do aluno** (`{responsavel}`, `{aluno}`, `{link}`) ficam visíveis, em azul, para a secretaria completar.
- **Etapa do dia** (horário de Brasília): Preparação até a abertura; Envio nos 7 primeiros dias; Acompanhamento até o encerramento; Encerramento do dia do encerramento até 31/12; Virada a partir de 1º de janeiro do ano letivo. Sem datas, Preparação.
- **Checklist** grava só o item marcado (não sobrescreve os outros). A configuração da campanha não toca em `guia`. Hoje admin e secretaria gravam pela regra geral de `artifacts/.../data`; se a campanha ganhar regra "só admin" (PLANO.md §7), liberar `guia` à secretaria.
- **Situações do convite**: mesmos nomes e cores da coluna Convite do painel (`SITUACAO_CONVITE`); todo `STATUS` tem explicação (teste).

## Estrutura da aba

1. Resumo da campanha (datas, reajuste, descontos, planos, formas, vencimentos, etapa atual).
2. Checklist da preparação.
3. Etapas da campanha (a atual aberta).
4. Quem faz o quê (secretaria, professores, direção) e o aviso de que professores não tratam de valores.
5. Situações especiais.
6. Mensagens prontas com "Copiar" (o convite usa o texto salvo na campanha).
7. Respostas para dúvidas frequentes com "Copiar".
8. O que significa cada situação do convite.

## Diferenças em relação ao pedido original

- Nomes de botão e status seguem a tela: "Enviar por WhatsApp" (não "Enviar em sequência"), "Efetivado" (não "Confirmado"); entram "Respondido", "Expirado" e "Cancelado".
- Mensagem do prazo do desconto: o prazo é o fim da campanha e exige a 1ª mensalidade paga até `primeiraParcelaPagaAte`; saiu o "depois continua aberta sem o benefício".
- VIP, In Company e bolsistas recebem convite, mas com "Revisar valor" e fora da fila até a direção definir o valor.
- **Visão dos professores não feita.** Eles têm login, mas não leem a renovação (regras). Opção barata para depois: botão "Lista por professor" no painel, gerando o texto para a secretaria enviar.
- O guia já descreve efetivação, página da família e virada do ano, que chegam nas etapas 4–7 do PLANO.md.
