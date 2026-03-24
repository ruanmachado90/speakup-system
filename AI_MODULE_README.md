# 🤖 Módulo de IA Gerencial - SpeakUp

Sistema de análises gerenciais em tempo real usando Anthropic Claude AI.

## 📁 Arquitetura

```
src/
├── config/
│   └── aiConfig.js          # Configurações centralizadas (endpoints, prompts, mensagens)
├── hooks/
│   └── useAI.js             # Hook customizado para lógica de chat
├── pages/
│   └── AIManager.jsx        # Interface visual do chat
functions/
└── index.js                 # Cloud Function (proxy seguro para API da Anthropic)
```

## 🔧 Como Funciona

### 1. **Frontend (AIManager.jsx)**
- Interface de chat simples e limpa
- 6 prompts rápidos para análises comuns
- Auto-scroll e estados de loading
- **Responsabilidade**: Apenas UI e interação do usuário

### 2. **Lógica de Negócio (useAI.js)**
- Gerencia estado do chat
- Controla requisições HTTP
- Tratamento de erros e timeouts
- Construção do contexto com dados do sistema
- **Responsabilidade**: Toda a lógica do chat

### 3. **Configuração (aiConfig.js)**
- Endpoints da API
- Mensagens do sistema
- Quick prompts configuráveis
- Função para construir system prompt
- **Responsabilidade**: Configurações centralizadas

### 4. **Backend (functions/index.js)**
- Cloud Function que age como proxy seguro
- Protege API key da Anthropic
- CORS configurado
- Validações robustas
- Logs detalhados
- **Responsabilidade**: Segurança e proxy da API

## 🚀 Fluxo de Dados

```
Usuário digita mensagem
    ↓
AIManager.jsx (UI)
    ↓
useAI.js (envia requisição)
    ↓
Firebase Cloud Function (proxy)
    ↓
Anthropic Claude API
    ↓
Resposta retorna pelo mesmo caminho
    ↓
AIManager.jsx (renderiza resposta)
```

## 📝 Variáveis de Ambiente

A Cloud Function usa estas configurações (em `functions/index.js`):

```javascript
ANTHROPIC_API_KEY  // Pode ser movida para Firebase Config para maior segurança
API_URL            // https://api.anthropic.com/v1/messages
MODEL              // claude-sonnet-4-20250514
MAX_TOKENS         // 2000
```

### Para usar Firebase Config (recomendado em produção):

```bash
# Definir variável de ambiente
firebase functions:config:set anthropic.api_key="sua-chave-aqui"

# Acessar no código
functions.config().anthropic.api_key
```

## 🛠️ Como Modificar

### Adicionar novos prompts rápidos

Edite `src/config/aiConfig.js`:

```javascript
export const AI_CONFIG = {
  QUICK_PROMPTS: [
    {
      id: "novo_prompt",
      title: "🎯 Título do Prompt",
      prompt: "Instrução completa para a IA..."
    },
    // ... outros prompts
  ]
};
```

E adicione o ícone em `src/pages/AIManager.jsx`:

```javascript
const ICONS_MAP = {
  novo_prompt: <IconComponent size={16} />,
  // ... outros ícones
};
```

### Alterar modelo da IA

Edite `functions/index.js`:

```javascript
const CONFIG = {
  MODEL: "claude-3-5-sonnet-20241022", // ou outro modelo
  MAX_TOKENS: 4000, // ajuste conforme necessário
};
```

### Customizar system prompt

Edite a função `buildSystemPrompt` em `src/config/aiConfig.js`.

### Mudar timeout de requisições

Edite `src/config/aiConfig.js`:

```javascript
export const AI_CONFIG = {
  REQUEST_TIMEOUT: 90000, // 90 segundos (em ms)
};
```

## 🔒 Segurança

- ✅ API key nunca exposta no frontend
- ✅ Cloud Function como proxy seguro
- ✅ CORS configurado (pode ser restrito a domínios específicos)
- ✅ Validações de input no backend
- ✅ Rate limiting pelo Firebase (automático)

### Para produção, reforce a segurança:

1. **Restringir CORS** em `functions/index.js`:
```javascript
const CONFIG = {
  ALLOWED_ORIGINS: "https://speakup-system.web.app",
};
```

2. **Mover API Key para Firebase Config**:
```bash
firebase functions:config:set anthropic.api_key="sua-chave"
```

3. **Adicionar autenticação** (opcional):
```javascript
// Verificar token Firebase Auth antes de processar
const idToken = req.headers.authorization;
const decodedToken = await admin.auth().verifyIdToken(idToken);
```

## 📊 Monitoramento

### Logs da Cloud Function

```bash
# Ver logs em tempo real
firebase functions:log

# Ver logs específicos da função
firebase functions:log --only chatWithAI
```

### Métricas no Firebase Console

- Invocações por dia
- Tempo de execução médio
- Taxa de erro
- Uso de memória

## 🧪 Testes

### Testar Cloud Function localmente

```bash
# Instalar dependências do Firebase
cd functions
npm install

# Iniciar emulador
cd ..
firebase emulators:start --only functions
```

### Testar com script

Use o `test-ai-function.js` na raiz:

```bash
node test-ai-function.js
```

## 📦 Deploy

```bash
# Build do frontend
npm run build

# Deploy completo
firebase deploy

# Deploy apenas da função
firebase deploy --only functions

# Deploy apenas do hosting
firebase deploy --only hosting
```

## 💡 Dicas de Manutenção

1. **Sempre teste localmente primeiro** com o emulador do Firebase
2. **Commit frequente** após mudanças funcionais
3. **Monitore os logs** regularmente para identificar erros
4. **Atualize o modelo da IA** periodicamente para melhorias
5. **Revise os custos** da Anthropic API no dashboard deles

## 🐛 Troubleshooting

### Erro: "CORS policy blocked"
- Verifique se a Cloud Function tem CORS habilitado
- Confirme se o endpoint está correto

### Erro: "API key invalid"
- Verifique se a API key está correta em `functions/index.js`
- Confirme se a key não expirou

### Erro: Timeout
- Aumente `REQUEST_TIMEOUT` em `aiConfig.js`
- Reduza `MAX_TOKENS` em `functions/index.js`
- Simplifique o system prompt

### IA não responde corretamente
- Revise o `buildSystemPrompt` em `aiConfig.js`
- Certifique-se que os dados estão sendo passados corretamente
- Teste o prompt diretamente na API da Anthropic

## 📚 Recursos

- [Documentação Anthropic Claude](https://docs.anthropic.com/claude/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [React Hooks Best Practices](https://react.dev/reference/react)

---

**Última atualização**: Janeiro 2025
**Versão do Claude**: Sonnet 4 (claude-sonnet-4-20250514)
