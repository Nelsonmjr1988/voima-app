# 🔄 Fluxo Completo: Webhook → Agente → Resposta

## 🎯 RESUMO EXECUTIVO

Quando um usuário enviar uma mensagem WhatsApp:

```
1️⃣  CLIENTE envia mensagem no WhatsApp
        ↓
2️⃣  Z-API recebe e envia pro WEBHOOK
        ↓
3️⃣  WEBHOOK identifica EMPRESA pelo telefone
        ↓
4️⃣  AGENTE (Claude Haiku) processa a mensagem
        ↓
5️⃣  Z-API ENVIA resposta pro cliente
        ↓
6️⃣  HISTÓRICO fica registrado no banco ✅
```

---

## 📱 Exemplo Prático

### Cliente/Fornecedor Envia Mensagem

```
De: +55 11 98765-4321 (João - Cliente)
Para: +55 11 99999-9999 (Seu número Z-API)
Mensagem: "Olá, preciso de orçamento para 500kg de areia"
Hora: 14:30
```

---

## 🔄 Fluxo Técnico Detalhado

### ETAPA 1: Webhook Recebe Mensagem

```
POST /api/webhooks/z-api
└─ Body: {
     event: "MESSAGES_UPSERT",
     data: {
       phone: "5511987654321",  // Cliente
       message: "Olá, preciso de orçamento...",
       sender: "5511987654321",
       senderName: "João Silva"
     }
   }
```

**O que acontece:**
1. Webhook recebe evento
2. **Identifica empresa** usando `obter_empresa_por_telefone()`
   - Busca em `empresa_contatos_mapeamento`
   - Encontra: Empresa A, Cliente João Silva
3. **Preenche** `empresa_id` automaticamente (trigger)
4. **Salva** em `whatsapp_mensagens`

**Resultado no banco:**
```sql
INSERT INTO whatsapp_mensagens:
├─ telefone: "5511987654321"
├─ nome_contato: "João Silva"
├─ mensagem: "Olá, preciso de orçamento..."
├─ tipo: "entrada"
├─ empresa_id: "85b50c5c-...EMPRESA-A" ✅ IDENTIFICADA!
├─ timestamp: 14:30
└─ metadata: { tipo_contato: "cliente" }
```

---

### ETAPA 2: Agente Processa Mensagem

#### Opção A: Processamento Automático (Recomendado)

Criar novo endpoint que faz isso automaticamente:

```
POST /api/agent/webhook-resposta

Body:
{
  "empresa_id": "85b50c5c-...-EMPRESA-A",
  "telefone_cliente": "5511987654321",
  "mensagem": "Olá, preciso de orçamento para 500kg de areia",
  "nome_cliente": "João Silva"
}
```

**O que faz:**
1. Chama Claude Haiku (agente IA)
2. Agente pensa sobre a mensagem
3. Retorna resposta + ação necessária

**Resposta esperada:**
```json
{
  "resposta_cliente": "Olá João! Obrigado por buscar a VOIMA. Nosso preço para areia está em R$ 45,00 a tonelada. Quer cotação formal?",
  "acao": "cotacao",
  "produtos_detectados": ["areia"],
  "quantidade": "500 kg",
  "empresa_id": "85b50c5c-..."
}
```

---

#### Opção B: Processamento Manual (Para Controle)

O gestor podem:
1. Ver mensagem em dashboard
2. Clicar em "Responder com IA"
3. Revisar resposta da IA
4. Enviar pro cliente

---

### ETAPA 3: Z-API Envia Resposta

Depois que agente processa:

```
POST /api/whatsapp/enviar-texto
├─ telefone: "5511987654321"
├─ mensagem: "Olá João! Nosso preço está em R$ 45,00 / ton..."
├─ empresa_id: "85b50c5c-EMPRESA-A"
└─ tipo: "resposta_agente"
```

Z-API envia via `enviarTexto()`:

```
Para: +55 11 98765-4321 (João volta a receber)
Mensagem: [resposta do agente]
```

---

### ETAPA 4: Histórico Registrado ✅

**Banco de dados fica com:**

```
whatsapp_mensagens:
├─ Mensagem 1 (Entrada):
│  ├─ De: +55 11 98765-4321 (João)
│  ├─ Para: +55 11 99999-9999 (seu número)
│  ├─ Tipo: entrada
│  ├─ Empresa: EMPRESA-A ✅
│  └─ Timestamp: 14:30

├─ Mensagem 2 (Saída):
│  ├─ De: +55 11 99999-9999 (seu número)
│  ├─ Para: +55 11 98765-4321 (João)
│  ├─ Tipo: saida
│  ├─ Empresa: EMPRESA-A ✅
│  └─ Timestamp: 14:31
```

**Dashboard pode mostrar:**
```
CHAT COM: João Silva (+55 11 98765-4321)
EMPRESA: EMPRESA-A

[14:30] João: "Preço da areia?"
[14:31] Agente: "R$ 45,00 a tonelada. Interessado?"
[14:32] João: "Manda cotação"
[14:33] Agente: "Enviando cotação..."
```

---

## 🛠️ Como Configurar

### Passo 1: Mapear Contatos da Empresa

**Editar sua empresa - Adicionar contatos:**

```bash
curl -X POST http://localhost:3000/api/empresa/contatos-mapeados \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
    "telefone_contato": "5511987654321",
    "nome_contato": "João Silva",
    "tipo_contato": "cliente"
  }'
```

**Response:**
```json
{
  "sucesso": true,
  "contato": {
    "id": 123,
    "empresa_id": "85b50c5c-...",
    "telefone_contato": "5511987654321",
    "nome_contato": "João Silva",
    "tipo_contato": "cliente",
    "ativo": true
  }
}
```

### Passo 2: Verificar Mapeamento

```bash
curl "http://localhost:3000/api/empresa/contatos-mapeados?empresa_id=85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
```

**Response:**
```json
{
  "sucesso": true,
  "total": 5,
  "contatos": [
    {
      "id": 123,
      "telefone_contato": "5511987654321",
      "nome_contato": "João Silva",
      "tipo_contato": "cliente",
      "ativo": true
    },
    // ... mais contatos
  ]
}
```

### Passo 3: Executar Migration SQL

```sql
-- Executar no Supabase SQL Editor
-- Conteúdo de: SETUP_Z_API_EMPRESA_MAPPING.sql
```

Isso vai criar:
- ✅ Tabela `empresa_contatos_mapeamento`
- ✅ Função `obter_empresa_por_telefone()`
- ✅ Trigger automático para preenchimento de `empresa_id`

### Passo 4: Webhook Está Pronto!

Agora quando mensagem chegar:
```
Webhook → Identifica Empresa → Salva com empresa_id ✅
```

---

## 📊 Consultas Úteis (SQL)

### Ver todas as mensagens de uma empresa

```sql
SELECT 
  timestamp,
  nome_contato,
  tipo,
  mensagem
FROM whatsapp_mensagens
WHERE empresa_id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b'
ORDER BY timestamp DESC
LIMIT 20;
```

### Ver contatos de uma empresa com histórico

```sql
SELECT * FROM view_contatos_por_empresa
WHERE empresa_id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b'
ORDER BY ultima_mensagem DESC;
```

### Ver mensagens não mapeadas (empresa = NULL)

```sql
SELECT 
  timestamp,
  telefone,
  nome_contato,
  mensagem
FROM whatsapp_mensagens
WHERE empresa_id IS NULL AND tipo = 'entrada'
ORDER BY timestamp DESC;
```

---

## 🎯 O Que Você Precisa Fazer Agora

### ✅ Passo 1: Atualizar Banco (Execute SQL)
```
SETUP_Z_API_EMPRESA_MAPPING.sql
```

### ✅ Passo 2: Mapear Seus Contatos

Para cada cliente/fornecedor, execute:
```bash
POST /api/empresa/contatos-mapeados

{
  "empresa_id": "sua-empresa-id",
  "telefone_contato": "5585987654321",
  "nome_contato": "Nome do Cliente",
  "tipo_contato": "cliente"
}
```

### ✅ Passo 3: Testar Webhook

Quando receber mensagem WhatsApp:
1. Webhook detecta
2. Identifica empresa
3. Salva no banco **com empresa_id**

### ✅ Passo 4: Verificar Dados

```bash
# Ver contatos da sua empresa
curl "http://localhost:3000/api/empresa/contatos-mapeados?empresa_id=85b50c5c-abf2-4bed-9854-a15fb0d60d2b"

# Ver mensagens recentes
SELECT * FROM whatsapp_mensagens ORDER BY timestamp DESC LIMIT 10;
```

---

## 🚀 Próxima Fase: Resposta Automática

Depois de isso funcionar, vamos criar:

```
/api/agent/webhook-resposta

Que vai:
1. Receber mensagem do webhook
2. Processar com Claude Haiku
3. Enviar resposta automática via Z-API
4. Registrar tudo no banco
```

---

## 💡 Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                 CLIENTE (WhatsApp)                      │
│                  João Silva                             │
│              +55 11 98765-4321                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Envia mensagem
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Z-API                                │
│            (Seu número +55 11 99999-9999)              │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Webhook POST
                         ▼
┌─────────────────────────────────────────────────────────┐
│        /api/webhooks/z-api (seu servidor)              │
│                                                         │
│ 1. Recebe: phone, message, sender                      │
│ 2. Busca: obter_empresa_por_telefone()                 │
│ 3. Encontra: EMPRESA-A                                 │
│ 4. Salva: whatsapp_mensagens (com empresa_id) ✅       │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ 
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Banco de Dados                        │
│                  (Supabase)                             │
│                                                         │
│  whatsapp_mensagens:                                   │
│  ├─ De: +55 11 98765-4321                             │
│  ├─ Mensagem: "Preço da areia?"                       │
│  ├─ Empresa_id: EMPRESA-A ✅                           │
│  └─ Tipo: entrada                                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Resultado Final

Quando tudo funcionar:

✅ **Cliente envia mensagem** → Webhook recebe
✅ **Webhook identifica empresa** → Salva com empresa_id
✅ **Agente processa** → Gera resposta
✅ **Z-API envia resposta** → Cliente recebe
✅ **Histórico registrado** → Dashboard mostra tudo

**Seu sistema está automático! 🚀**

---

## 📞 Dúvidas Frequentes

**P: E se o telefone não estiver mapeado?**
R: Empresa aparece como NULL. Depois você mapeia manualmente.

**P: Posso ter vários contatos?**
R: Sim! Cada contato → empresa diferente ou mesma empresa.

**P: Como editar mapeamento?**
R: Use `PUT /api/empresa/contatos-mapeados`

**P: Posso deletar contato?**
R: Use `DELETE /api/empresa/contatos-mapeados` (soft delete)

---

**Status: ✅ Sistema Pronto para Receber Mensagens**
