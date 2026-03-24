# Configuração de Secrets no Firebase Functions

## O Problema

A API key da Anthropic não deve ser commitada no código-fonte por questões de segurança. O GitHub bloqueia pushes que contenham secrets expostos.

## Solução Implementada

### Desenvolvimento Local

Um arquivo `.env` foi criado na pasta `functions/` com a chave de API. Este arquivo está listado no `.gitignore` e **não será commitado**.

```env
ANTHROPIC_API_KEY=sua-chave-aqui
```

### Produção (Firebase)

Para produção, você precisa configurar a secret usando o Firebase CLI:

#### Método 1: Firebase Secrets (Recomendado - Novo)

```bash
# Definir a secret
firebase functions:secrets:set ANTHROPIC_API_KEY

# Quando solicitado, cole sua API key
```

Depois, atualize o código em `functions/index.js` para usar secrets (se necessário):

```javascript
const { defineSecret } = require('firebase-functions/params');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

exports.askClaude = onRequest(
  { secrets: [anthropicApiKey] },
  async (request, response) => {
    const apiKey = anthropicApiKey.value();
    // ... resto do código
  }
);
```

#### Método 2: Variáveis de Ambiente (Alternativo)

No Console do Firebase:
1. Acesse **Functions** > **Sua função** > **Configuration**
2. Adicione a variável de ambiente:
   - Nome: `ANTHROPIC_API_KEY`
   - Valor: `sua-api-key`

## Verificação

Após configurar, teste a função:

```bash
# Deploy da função
firebase deploy --only functions

# Teste via curl ou pelo aplicativo
```

## Referências

- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env)
- [Migração de functions.config()](https://firebase.google.com/docs/functions/config-env#migrate-config)

## Status Atual

✅ API key removida do código-fonte
✅ `.env` criado e adicionado ao `.gitignore`
✅ Código atualizado para usar `process.env.ANTHROPIC_API_KEY`
⏳ **PENDENTE**: Configurar secret no Firebase (seguir Método 1 acima)
