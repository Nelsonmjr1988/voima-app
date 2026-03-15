# 🔗 Configuração de Webhook Z-API WhatsApp

## Visão Geral

O sistema VOIMA agora está integrado com Z-API para gerenciar mensagens de WhatsApp. Um webhook foi criado para receber mensagens e eventos em tempo real.

## 📋 Pré-requisitos

- ✅ Conta Z-API ativa
- ✅ Instância WhatsApp criada
- ✅ Instance ID e Token obtidos
- ✅ Servidor VOIMA rodando (deve estar acessível pela internet)

## 🔑 Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN=44BAD21EEC9A41B0141E1142
Z_API_BASE_URL=https://api.z-api.io
```

## 🔐 Endpoints da API

### 1. **Enviar OC via WhatsApp** 📦
```
POST /api/whatsapp/enviar-oc

Body:
{
  "oc_id": "uuid-da-ordem",
  "telefone": "5511999999999",
  "nome_cliente": "XYZ Empresa",
  "empresa_id": "uuid-empresa"
}

Response:
{
  "sucesso": true,
  "message_id": "msg123",
  "telefone": "5511999999999",
  "oc_numero": "OC-2024-001"
}
```

### 2. **Enviar Cotação via WhatsApp** 💰
```
POST /api/whatsapp/enviar-cotacao

Body:
{
  "cotacao_id": "uuid-cotacao",
  "telefone": "5511999999999",
  "nome_cliente": "XYZ Empresa",
  "empresa_id": "uuid-empresa"
}

Response:
{
  "sucesso": true,
  "message_id": "msg456",
  "telefone": "5511999999999",
  "opcoes_count": 3
}
```

### 3. **Obter Status da Mensagem** ✓
```
GET /api/whatsapp/status/{messageId}

Response:
{
  "sucesso": true,
  "message_id": "msg123",
  "status": "delivered",
  "detalhes": {...}
}
```

### 4. **Informações da Instância** ℹ️
```
GET /api/whatsapp/instance-info

Response:
{
  "sucesso": true,
  "status": "connected",
  "conectado": true,
  "numero": "5511987654321"
}
```

### 5. **Webhook de Entrada** 🔔
```
POST /api/webhooks/z-api

Z-API envia (listener):
- Mensagens recebidas (MESSAGES_UPSERT)
- Status de entrega (MESSAGES_UPDATE)
- QR Code para login (QRCODE)
- Conexão/desconexão (INSTANCE_CONNECTED/DISCONNECTED)
```

## 📱 Configurar Webhook no Z-API Dashboard

### Passo 1: Acessar Dashboard
1. Acesse [Z-API Dashboard](https://dashboard.z-api.io)
2. Faça login com suas credenciais
3. Selecione a instância desejada

### Passo 2: Configurar Webhook

1. No menu lateral, procure por **"Webhook"** ou **"Configurações"**
2. Clique em **"Adicionar Webhook"** ou **"Nova Webhook"**
3. Preencha os campos:

- **URL**: `https://seu-dominio.com/api/webhooks/z-api`
  - Substitua `seu-dominio.com` pelo domínio real do VOIMA
  - Em desenvolvimento local: use ferramentas como **ngrok**

- **Eventos** (marque todos necessários):
  - ✅ `MESSAGES_UPSERT` (mensagens recebidas)
  - ✅ `MESSAGES_UPDATE` (status de entrega)
  - ✅ `QRCODE` (QR code para login)
  - ✅ `INSTANCE_CONNECTED` (conectado)
  - ✅ `INSTANCE_DISCONNECTED` (desconectado)

4. Clique em **"Salvar"** ou **"Confirmar"**

### Passo 3: Testar Webhook

1. Na mesma página, procure por "Teste de Webhook" ou "Test Webhook"
2. Clique em "Enviar Teste"
3. Você deve ver:
   - Status: `200 OK`
   - A URL deve responder rapidamente
   - No console do VOIMA, você verá logs como: "🔔 Webhook Z-API recebido"

## 🌐 Usar em Produção com ngrok (Desenvolvimento)

Se está testando em desenvolvimento local:

```bash
# Terminal 1: Ter VOIMA rodando
npm run dev  # Roda em http://localhost:3000

# Terminal 2: Expor com ngrok
ngrok http 3000

# Isso gera URL como: https://xxxx-xx-xxxx-xxxx.ngrok.io
# Use isso no webhook Z-API:
# https://xxxx-xx-xxxx-xxxx.ngrok.io/api/webhooks/z-api
```

## 📊 Monitoramento

### Logs no Console
```bash
# Webhook recebido
🔔 Webhook Z-API recebido: {event: 'MESSAGES_UPSERT', phone: '5511987654321'}

# Mensagem salva
✅ Mensagem salva no banco

# Erro de envio
❌ Z-API erro: 403 {message: 'Instance not connected'}
```

### Verificar Status
```bash
# Obter status atual
curl http://localhost:3000/api/whatsapp/instance-info

# Resultado se conectado:
{"sucesso": true, "status": "connected", "conectado": true}
```

## 🐛 Troubleshooting

### ❌ "Instance not connected"
- [ ] Verificar se QR Code foi escaneado
- [ ] Chamar GET `/api/whatsapp/instance-info` para obter QR Code
- [ ] Scanear QR Code com WhatsApp no celular registrado

### ❌ Webhook não recebe mensagens
- [ ] Verificar se URL do webhook está correta
- [ ] Testar webhook no dashboard Z-API
- [ ] Verificar logs no console do VOIMA
- [ ] Se em ngrok, verificar se ngrok ainda está rodando

### ❌ Mensagens enviadas mas não chegam
- [ ] Verificar se número tem WhatsApp (Z-API valida)
- [ ] Verificar formato: deve ser `55 + DDD + número`
- [ ] Consultar status: GET `/api/whatsapp/status/{messageId}`
- [ ] Verificar limites de taxa (rate limit) da Z-API

## 📞 Suporte Z-API

- Documentação: https://docs.z-api.io/
- Status: https://status.z-api.io/
- Email: suporte@z-api.io

## 📝 Exemplo de Integração Completa

```typescript
// Enviar OC + receber resposta via webhook

// 1. Endpont HTTP para enviar OC
const response = await fetch('http://localhost:3000/api/whatsapp/enviar-oc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    oc_id: 'abc123',
    telefone: '5511987654321',
    nome_cliente: 'Cliente XYZ',
    empresa_id: 'emp123'
  })
});

// 2. Webhook recebe resposta do cliente
// POST /api/webhooks/z-api → Salva no banco
// Você pode consultar respostas em: SELECT * FROM whatsapp_mensagens

// 3. Verificar se foi entregue
const status = await fetch(
  'http://localhost:3000/api/whatsapp/status/msg-id-aqui'
);
```

---

✅ **Status**: Integração pronta para produção
