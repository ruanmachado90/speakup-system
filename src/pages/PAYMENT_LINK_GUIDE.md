# Guia do Sistema de Links de Pagamento PIX

## Como Usar

### 1. Gerar um Link de Pagamento

1. Vá até a página **Financeiro**
2. Localize o pagamento na tabela
3. Clique no ícone de **engrenagem (⚙️)** ao lado do pagamento
4. Preencha as informações do PIX:
   - **URL do QR Code**: URL pública da imagem do QR Code
   - **Código PIX**: Código PIX copia e cola
5. Clique em **Salvar Informações PIX**
6. Após salvar, clique no ícone de **link (🔗)** para copiar o link
7. Envie o link para o cliente

### 2. Cliente Acessa o Link

- O cliente pode acessar de qualquer dispositivo (computador, celular, tablet)
- Não precisa fazer login
- Página é responsiva e otimizada para mobile
- Cliente pode escanear o QR Code ou copiar o código PIX

## Requisitos da URL do QR Code

### ✅ URL Válida

A URL do QR Code **DEVE**:
- Começar com `https://` (não `http://`)
- Apontar diretamente para uma imagem
- Terminar com extensão de imagem: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- Ser **publicamente acessível** (sem autenticação)
- Permitir **CORS** (cross-origin requests)

### ❌ URLs que NÃO Funcionam

- `http://exemplo.com/qrcode.png` ❌ (deve ser HTTPS)
- `https://drive.google.com/file/d/xxxxx` ❌ (não é link direto)
- `https://exemplo.com/api/qrcode` ❌ (sem extensão de imagem)
- URLs que requerem login ❌
- URLs privadas/protegidas ❌

### ✅ Exemplos de URLs Válidas

```
https://i.imgur.com/abc123.png
https://exemplo.com/qrcodes/pix123.jpg
https://cdn.exemplo.com/imagens/qrcode.png
https://firebasestorage.googleapis.com/xxx/qrcode.png
```

## Hospedagem de QR Codes

### Opções Recomendadas

1. **Firebase Storage** (Recomendado para este projeto)
   - Já integrado no projeto
   - Configurar regras para leitura pública
   - URL automático com HTTPS

2. **Imgur**
   - Upload gratuito
   - URL direto para imagem
   - Suporte HTTPS

3. **Cloudinary**
   - CDN rápido
   - Otimização automática
   - URL confiável

4. **Servidor próprio**
   - Certifique-se de:
     - Usar HTTPS (certificado SSL)
     - Configurar CORS headers
     - Ter backup/redundância

## Validações Automáticas

O sistema agora valida automaticamente:

1. **URL formato correto**: Verifica se é uma URL válida
2. **HTTPS obrigatório**: Rejeita URLs HTTP
3. **Extensão de imagem**: Avisa se URL não parece ser imagem
4. **Carregamento real**: Testa se a imagem carrega antes de salvar
5. **Preview em tempo real**: Mostra erro se imagem não carregar
6. **Timeout**: 10 segundos para carregar (evita travamento)

## Solução de Problemas

### Erro: "Não foi possível carregar a imagem do QR Code"

**Causas comuns:**
1. URL não é pública (requer autenticação)
2. Servidor está fora do ar
3. CORS bloqueado pelo servidor
4. URL não aponta para imagem
5. Conexão lenta/instável

**Solução:**
1. Abra a URL diretamente no navegador
2. Verifique se a imagem carrega sem login
3. Confirme que é uma URL HTTPS
4. Teste com serviço confiável (Imgur, Firebase Storage)
5. Verifique console do navegador (F12) para detalhes

### Erro: "URL do QR Code inválida"

**Causa:** URL mal formatada

**Solução:**
- Certifique-se de incluir `https://`
- Copie a URL completa
- Não use links encurtados (bit.ly, etc.)

### Preview mostra erro no modal

**Causa:** URL não carrega ou não é acessível

**Solução:**
- **NÃO salve** se preview mostrar erro
- Corrija a URL primeiro
- Teste em outro navegador
- Use serviço de hospedagem confiável

### QR Code muito grande no celular

**Status:** ✅ Resolvido
- Sistema agora é ultra-responsivo
- QR Code ajusta automaticamente
- Texto otimizado para mobile
- Botões touch-friendly

## Segurança

### ☑️ Implementado

- ✅ Apenas leitura pública (não permite edição)
- ✅ Escrita requer autenticação
- ✅ HTTPS obrigatório
- ✅ Validação antes de salvar
- ✅ Timeout para prevenir travamento
- ✅ Logs para auditoria

### ⚠️ Considerações

- QR Codes são públicos (qualquer um com link pode ver)
- Não inclua informações sensíveis na descrição
- Use códigos PIX temporários quando possível
- Monitore acessos através dos logs

## Debug e Logs

### Console do Navegador

O sistema registra logs úteis:

```javascript
// Quando busca pagamento
"Buscando pagamento ID: xxx"
"Documento existe? true"
"URL do QR Code: https://..."

// Quando carrega QR Code
"QR Code carregado com sucesso!"
// ou
"Erro ao carregar QR Code: https://..."

// No modal de configuração
"Testando carregamento da imagem..."
"Imagem carregou com sucesso!"
// ou
"Falha ao carregar imagem: https://..."
```

### Como Ver os Logs

1. Abra a página de pagamento
2. Pressione **F12** (Developer Tools)
3. Vá na aba **Console**
4. Procure pelos logs acima
5. Copie informações relevantes para reportar problemas

## Melhorias Futuras (Sugestões)

- [ ] Upload direto de QR Code no sistema
- [ ] Geração automática de QR Code
- [ ] Histórico de acessos ao link
- [ ] Notificação quando pagamento for pago
- [ ] Link com expiração automática
- [ ] QR Code dinâmico (atualiza automaticamente)

## Suporte

Se encontrar problemas:

1. **Verifique os logs** no console (F12)
2. **Teste a URL** diretamente no navegador
3. **Valide o formato** da URL (https://, extensão)
4. **Use preview** no modal antes de salvar
5. **Reporte** com detalhes: URL, mensagem erro, screenshot dos logs

---

**Última Atualização:** 2025
**Versão:** 1.0
