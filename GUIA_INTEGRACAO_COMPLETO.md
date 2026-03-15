# 🚀 Integração Z-API + Agent - Guia Completo

## ✅ Status Atual

```
✅ Webhook criado e testado
✅ Banco de dados configurado
✅ Agent responder criado
⏳ ngrok pendente (para receber webhooks)
⏳ Integração Z-API (para enviar respostas)
```

## 🔧 Passo 1: Instalar ngrok

### Opção A: via Homebrew (recomendado)

```bash
# Se tiver permissão:
brew install ngrok/ngrok/ngrok

# Se pedir senha, faça manualmente:
# 1. Acesse https://ngrok.com/download
# 2. Baixe para Mac
# 3. Descompacte
# 4. Mova para /usr/local/bin:
#    sudo mv ~/Downloads/ngrok /usr/local/bin/
```

### Opção B: Download manual

```bash
# 1. Visite https://ngrok.com/download
# 2. Baixe ngrok para macOS
# 3. Descompacte
# 4. Execute:
cd ~/Downloads
unzip ngrok-v3-stable-darwin-amd64.zip
sudo mv ngrok /usr/local/bin/
```

### Verificar instalação

```bash
ngrok --version
# Deve mostrar: ngrok version 3.x.x
```

## 🌐 Passo 2: Expor servidor local

```bash
# Terminal 1: Manter rodando
ngrok http 3000

# Você verá:
# Forwarding: https://abc123-def456.ngrok.io -> http://localhost:3000
# 
# Copie: https://abc123-def456.ngrok.io
```

## ⚙️ Passo 3: Configurar Webhook no Z-API

1. Acesse https://z-api.io
2. Vá para Instância: `3EAADDCE71F5D2C80DAAB2694663CF7D`
3. **Webhooks** → **+ Novo Webhook**
4. Configure:

```
URL: https://[seu-ngrok-url]/api/webhooks/z-api

Eventos (ativar todos):
✅ MESSAGES_UPSERT
✅ MESSAGES_UPDATE  
✅ INSTANCE_CONNECTED
✅ INSTANCE_DISCONNECTED

Teste: Clique em "Teste"
```

5. Salve

## 🧪 Passo 4: Testar Fluxo Completo

### Teste 1: Agent responder (local)

```bash
curl -X POST http://localhost:3000/api/agent/respond \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
    "telefone_cliente": "5564996760460",
    "mensagem": "Olá, qual é o horário de funcionamento?"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "resposta": "Olá! Estamos abertos de segunda a sexta, das 8h às 18h.",
  "metadata": {
    "input_tokens": 245,
    "output_tokens": 18,
    "custo_real": 0.000089
  }
}
```

### Teste 2: Webhook + Agent (end-to-end)

```bash
curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "data": {
      "phone": "5564996760460",
      "message": "Preciso de uma cotação",
      "senderName": "Nelson",
      "to": "5564996760460"
    }
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
  "empresa_nome": "Silva Engenharia Ltda",
  "mensagem_recebida": true,
  "processada_pelo_agent": true
}
```

## 📊 Fluxo Completo (Real)

```
Cliente envia: "Olá"
         ↓
Z-API recebe
         ↓
Envia para: https://seu-ngrok/api/webhooks/z-api
         ↓
Webhook identifica empresa
         ↓
Webhook chama agent: /api/agent/respond
         ↓
Agent processa com Claude
         ↓
Agent retorna: "Olá! Como posso ajudá-lo?"
         ↓
Webhook envia via Z-API para cliente
         ↓
Cliente recebe resposta! ✅
```

## 📝 Arquivos Criados

- ✅ `src/app/api/agent/respond/route.ts` - Agent responder
- ✅ `src/app/api/webhooks/z-api/route.ts` - Webhook (atualizado)
- ✅ `src/app/api/webhooks/z-api/debug/route.ts` - Debug
- ✅ `src/app/api/empresas/listar/route.ts` - Listar empresas
- ✅ `SETUP_Z_API_SIMPLES.sql` - Migração SQL

## 🔗 Endpoints Disponíveis

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/webhooks/z-api` | POST | Recebe webhooks da Z-API |
| `/api/webhooks/z-api` | GET | Status do webhook |
| `/api/webhooks/z-api/debug` | GET | Debug (mensagens, empresas, status) |
| `/api/agent/respond` | POST | Processa mensagem com Claude |
| `/api/agent/respond` | GET | Status do agent |
| `/api/empresas/listar` | GET | Lista empresas com números configurados |

## 🎯 Checklist

- [ ] ngrok instalado (`ngrok --version`)
- [ ] ngrok rodando (`ngrok http 3000`)
- [ ] Webhook configurado no Z-API
- [ ] Teste local do agent (curl)
- [ ] Teste do webhook (curl)
- [ ] Enviar mensagem real no WhatsApp
- [ ] Receber resposta automática

## 🚨 Troubleshooting

### "Empresa não identificada"
- Verifique se o número está configurado: `curl http://localhost:3000/api/webhooks/z-api/debug`
- Verifique o UUID da empresa

### "Agent não retorna"
- Verifique logs do terminal (npm run dev)
- Teste diretamente: `curl http://localhost:3000/api/agent/respond ...`
- Verifique chave Anthropic em `.env.local`

### ngrok não conecta
- Certifique-se que npm run dev está rodando em outra aba
- Tente: `ngrok http 3000 --log=stdout`

## 📞 Próximos Passos

1. Instalar ngrok
2. Configurar Z-API webhooks
3. Enviar mensagem real no WhatsApp
4. Receber resposta automática
5. Celebrar! 🎉
