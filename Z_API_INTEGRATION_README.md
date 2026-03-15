# 🚀 Z-API WhatsApp Integration - README

## 📌 O que foi implementado

✅ **Cliente Z-API** (`src/lib/z-api-whatsapp.ts`)
- Enviar mensagens de texto
- Enviar documentos/PDFs
- Verificar status de mensagens
- Obter informações da instância

✅ **Webhook Receiver** (`src/app/api/webhooks/z-api/route.ts`)
- Recebe mensagens de clientes via WhatsApp
- Salva no banco automaticamente
- Processa eventos de conexão/desconexão
- Rastreia status de entrega

✅ **Endpoints de Envio**
- `POST /api/whatsapp/enviar-oc` - Envia Ordem de Compra
- `POST /api/whatsapp/enviar-cotacao` - Envia Cotação com opções
- `GET /api/whatsapp/status/{messageId}` - Verificar status
- `GET /api/whatsapp/instance-info` - Info da instância

✅ **Banco de Dados**
- Tabelas para mensagens, contatos, status de instância
- Triggers automáticos para updated_at
- Views para consultas comuns
- Tudo em: `SETUP_Z_API_WHATSAPP.sql`

---

## 🚀 Quick Start

### 1. Configurar Ambiente
```bash
# Editar .env.local
Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN=44BAD21EEC9A41B0141E1142
Z_API_BASE_URL=https://api.z-api.io
```

### 2. Executar Migration SQL
```sql
-- Copiar conteúdo de SETUP_Z_API_WHATSAPP.sql
-- Colar no Supabase SQL Editor
-- Executar
```

### 3. Testar
```bash
chmod +x test-z-api.sh
./test-z-api.sh
```

### 4. Fazer Login
```bash
# Obter QR Code
curl http://localhost:3000/api/whatsapp/instance-info

# Scannear no WhatsApp
```

### 5. Configurar Webhook
- Z-API Dashboard → Webhooks
- URL: `https://seu-dominio.com/api/webhooks/z-api`
- Eventos: MESSAGES_UPSERT, MESSAGES_UPDATE, QRCODE, INSTANCE_*
- Salvar

---

## 📁 Estrutura de Arquivos

```
src/
├── lib/
│   └── z-api-whatsapp.ts           → Cliente Z-API (core)
│
└── app/
    └── api/
        ├── webhooks/
        │   └── z-api/
        │       └── route.ts         → Webhook receiver
        │
        └── whatsapp/
            ├── enviar-oc/
            │   └── route.ts         → Enviar OC
            ├── enviar-cotacao/
            │   └── route.ts         → Enviar cotação
            ├── status/
            │   └── [messageId]/
            │       └── route.ts     → Verificar status
            └── instance-info/
                └── route.ts         → Info da instância

Docs/
├── SETUP_Z_API_WHATSAPP.sql        → Migration do banco
├── Z_API_WEBHOOK_SETUP.md          → Setup webhook
├── INSTALL_Z_API.md                → Guia instalação completo
├── test-z-api.sh                   → Script de testes
└── Z_API_INTEGRATION_README.md     → Este arquivo
```

---

## 🔄 Fluxo de Operação

### Enviar Mensagem
```
Seu código
    ↓
POST /api/whatsapp/enviar-oc
    ↓
Z-API Client (z-api-whatsapp.ts)
    ↓
Z-API Servers
    ↓
WhatsApp
    ↓
Cliente recebe mensagem ✓
```

### Receber Mensagem
```
Cliente reply no WhatsApp
    ↓
Z-API Servers
    ↓
POST /api/webhooks/z-api
    ↓
Webhook Handler
    ↓
Salva no banco de dados
    ↓
Disponível em: SELECT * FROM whatsapp_mensagens
```

---

## 💻 Exemplos de Uso

### Enviar OC
```javascript
const response = await fetch('http://localhost:3000/api/whatsapp/enviar-oc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    oc_id: 'uuid-da-ordem',
    telefone: '5585987654321',
    nome_cliente: 'João Silva',
    empresa_id: 'uuid-empresa'
  })
});

const data = await response.json();
console.log(data.message_id); // message_xyz123
```

### Verificar Status
```javascript
const status = await fetch(
  'http://localhost:3000/api/whatsapp/status/message_xyz123'
);
const data = await status.json();
console.log(data.status); // 'delivered', 'read', etc
```

### Consultar Mensagens Recebidas
```sql
SELECT * FROM whatsapp_mensagens 
WHERE tipo = 'entrada' AND status_entrega != 'lida'
ORDER BY timestamp DESC;
```

---

## 🔐 Variáveis de Ambiente

```
Z_API_INSTANCE_ID      → ID da instância Z-API
Z_API_TOKEN            → Token de autenticação
Z_API_BASE_URL         → URL base (default: https://api.z-api.io)
```

Todas em: `.env.local`

---

## 🗄️ Tabelas do Banco

### `whatsapp_mensagens`
Armazena todas as mensagens (entrada e saída)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | PK |
| empresa_id | UUID | FK empresa |
| oc_id | UUID | FK ordem |
| cotacao_id | UUID | FK cotação |
| telefone | VARCHAR | Número cliente |
| mensagem | TEXT | Conteúdo |
| tipo | VARCHAR | 'entrada' ou 'saida' |
| message_id | VARCHAR | ID Z-API (unique) |
| status_entrega | VARCHAR | 'enviada', 'lida', 'erro' |
| timestamp | TIMESTAMP | Horário |

### `whatsapp_contatos`
Armazena contatos com número confirmado

### `instance_status`
Rastreia status de conexão (conectado/desconectado)

### `whatsapp_templates`
Templates de mensagens pré-fabricadas (opcional)

---

## ✅ Checklist de Setup

- [ ] Adicionar variáveis `.env.local`
- [ ] Executar `SETUP_Z_API_WHATSAPP.sql`
- [ ] Fazer login WhatsApp (QR Code)
- [ ] Testar com script `test-z-api.sh`
- [ ] Configurar webhook Z-API Dashboard
- [ ] Testar envio/recebimento
- [ ] Integrar em workflows (OC, Cotação, etc)

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| "Instance not connected" | Scannear QR Code com WhatsApp |
| "Variáveis não configuradas" | Verificar `.env.local` e reiniciar servidor |
| Webhook não recebe | Confirmar URL e que servidor está rodando |
| 403 Unauthorized | Verificar credenciais Z-API |

Mais detalhes: `INSTALL_Z_API.md`

---

## 📞 Links Úteis

- **Documentação Z-API:** https://docs.z-api.io/
- **Dashboard Z-API:** https://dashboard.z-api.io/
- **Status página:** https://status.z-api.io/
- **Suporte:** suporte@z-api.io

---

## 🎯 Next Steps

1. ✅ Implementação básica
2. ⏳ Auto-responder a mensagens
3. ⏳ Dashboard de mensagens
4. ⏳ Integração com AI (responder com Claude Haiku)
5. ⏳ Relatórios de comunicação

---

**Status:** ✅ Pronto para uso
**Última atualização:** 2024
**Versão:** 1.0.0
