# ✅ Z-API + Empresa Mapping - Respostas Suas Perguntas

## 🎯 PERGUNTA 1: "Teremos o número que o agente estará?"

### ✅ SIM! Você terá um número WhatsApp dedicado

```
Seu número Z-API: +55 11 99999-9999
├─ Clientes enviam mensagens PARA esse número
├─ Agente respon DE esse número
└─ Tudo registrado no banco ✅
```

**Exemplo do que acontece:**

```
🧑‍💼 Joao Silva (+55 11 98765-4321)
  ↓ Envia: "Preço da areia?"
  → SEU NÚMERO (+55 11 99999-9999)
  ↓ Agente responde: "R$ 45 por ton"
  → JOÃO recebe
```

---

## 🎯 PERGUNTA 2: "Precisamos saber sempre qual empresa?"

### ✅ SIM! Sistema identifica automaticamente

Você está certo! Quando mensagem chega precisa saber de **qual empresa** é. Implementamos isso assim:

### 🔄 Fluxo Automático

```
1. Cliente envia mensagem
   ↓ (De: +55 11 98765-4321)
   
2. Webhook recebe
   └─ "De quem é essa mensagem?" 
   
3. Sistema procura em empresa_contatos_mapeamento
   ├─ Telefone: 5585987654321 → EMPRESA-A
   ├─ Telefone: 5585987654322 → EMPRESA-B
   └─ Telefone: 5585987654321 → João Silva (CLIENTE)
   
4. ENCONTRA: EMPRESA-A ✅
   
5. Salva no banco COM empresa_id
   └─ whatsapp_mensagens.empresa_id = "EMPRESA-A"
```

---

## 🛠️ Como Funciona (Técnico)

### Passo 1: Mapear Contatos da Empresa

**Quando você edita a empresa, precisa adicionar os contatos:**

```bash
POST /api/empresa/contatos-mapeados

{
  "empresa_id": "sua-empresa-uuid",
  "telefone_contato": "5585987654321",  # Telefone do cliente/fornecedor
  "nome_contato": "João Silva",
  "tipo_contato": "cliente"  # ou "fornecedor", "interno"
}
```

**Resultado:**
```
Tabela empresa_contatos_mapeamento:
├─ id: 1
├─ empresa_id: "EMPRESA-A"
├─ telefone_contato: "5585987654321"
├─ nome_contato: "João Silva"
├─ tipo_contato: "cliente"
└─ ativo: true
```

### Passo 2: Webhook Recebe Mensagem

Quando João envia mensagem:

```
Evento Z-API:
{
  event: "MESSAGES_UPSERT",
  data: {
    phone: "5585987654321",  # ← Sistema busca aqui!
    message: "Preço da areia?",
    sender: "5585987654321"
  }
}
```

### Passo 3: Sistema Identifica Empresa

```sql
-- Função SQL automática
SELECT obter_empresa_por_telefone('5585987654321')

Resultado:
├─ empresa_id: "EMPRESA-A" ✅
├─ nome_empresa: "Sua Empresa"
├─ tipo_contato: "cliente"
└─ encontrado: true
```

### Passo 4: Salva no Banco COM Empresa

```sql
INSERT INTO whatsapp_mensagens:
{
  telefone: "5585987654321",
  nome_contato: "João Silva",
  mensagem: "Preço da areia?",
  tipo: "entrada",
  empresa_id: "EMPRESA-A",  ✅ PREENCHIDO AUTOMATICAMENTE!
  timestamp: now()
}
```

---

## 📋 Arquivos Criados

| Arquivo | O que faz |
|---------|-----------|
| `SETUP_Z_API_EMPRESA_MAPPING.sql` | Cria tabelas + funções para identificar empresa |
| `/api/empresa/contatos-mapeados` | API para ADD/EDIT/DELETE contatos |
| `FLUXO_WEBHOOK_AGENTE_COMPLETO.md` | Documentação completa do fluxo |
| `test-webhook-empresa.sh` | Script para testar tudo |

---

## 🚀 Como Começar AGORA

### ✅ PASSO 1: Executar SQL

```sql
-- Copiar conteúdo de:
SETUP_Z_API_EMPRESA_MAPPING.sql

-- Colar em: Supabase → SQL Editor → Run
```

Isso cria:
- ✅ Tabela `empresa_contatos_mapeamento`
- ✅ Função `obter_empresa_por_telefone()`
- ✅ Trigger automático

### ✅ PASSO 2: Mapear Seus Contatos

```bash
# Adicionar contato
curl -X POST http://localhost:3000/api/empresa/contatos-mapeados \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
    "telefone_contato": "5585987654321",
    "nome_contato": "João Silva",
    "tipo_contato": "cliente"
  }'
```

### ✅ PASSO 3: Testar

```bash
# Script automático que testa tudo
chmod +x test-webhook-empresa.sh
bash test-webhook-empresa.sh
```

---

## 🔍 Verificar se Funcionou

### Opção A: Via API

```bash
# Ver contatos da empresa
curl "http://localhost:3000/api/empresa/contatos-mapeados?empresa_id=85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
```

### Opção B: Via SQL (Supabase)

```sql
-- Ver mensagens recentes
SELECT 
  timestamp,
  telefone,
  nome_contato,
  mensagem,
  tipo,
  empresa_id  -- ← Deve estar preenchido agora!
FROM whatsapp_mensagens
ORDER BY timestamp DESC
LIMIT 20;

-- Ver contatos mapeados
SELECT * FROM empresa_contatos_mapeamento;

-- Ver mensagens com empresa identificada
SELECT * FROM view_contatos_por_empresa;
```

---

## 💡 Exemplo Completo Passo-a-Passo

### Cenário: João Silva envia mensagem

#### 1️⃣ Você adiciona João ao sistema
```bash
POST /api/empresa/contatos-mapeados
{
  "empresa_id": "85b50c5c-...",
  "telefone_contato": "5585987654321",
  "nome_contato": "João Silva",
  "tipo_contato": "cliente"
}
```

#### 2️⃣ João envia mensagem no WhatsApp
```
De: +55 85 98765-4321
Para: +55 85 99999-9999 (seu número)
Mensagem: "Oi, preciso de orçamento"
```

#### 3️⃣ Z-API envia webhook
```
POST /api/webhooks/z-api
{
  event: "MESSAGES_UPSERT",
  data: {
    phone: "5585987654321",
    message: "Oi, preciso de orçamento"
  }
}
```

#### 4️⃣ Sistema identifica empresa
```
Busca em empresa_contatos_mapeamento
Telefone 5585987654321 → João Silva → EMPRESA-A
```

#### 5️⃣ Salva no banco
```sql
INSERT INTO whatsapp_mensagens:
├─ telefone: "5585987654321"
├─ nome_contato: "João Silva"
├─ empresa_id: "85b50c5c-..."  ✅ IDENTIFICADA!
├─ tipo: "entrada"
└─ mensagem: "Oi, preciso de orçamento"
```

#### 6️⃣ Dashboard mostra:
```
CHAT COM: João Silva (Cliente)
EMPRESA: Sua Empresa

[14:30] João: "Oi, preciso de orçamento"
```

---

## 🎯 Resumo da Solução

| Pergunta | Resposta | Implementação |
|----------|----------|----------------|
| **Teremos número?** | ✅ SIM | Z-API instância dedica |
| **Identifica empresa?** | ✅ SIM | `empresa_contatos_mapeamento` |
| **Automático?** | ✅ SIM | Trigger + Função SQL |
| **Agente responde certo?** | ✅ SIM | Com `empresa_id` preenchido |

---

## 📞 Como Editar Empresa (Sua Dúvida Original)

Quando você clica em "Editar Empresa":

```
Tela de Edição:
├─ Nome da Empresa
├─ CNP
├─ 🆕 Contatos WhatsApp
│   ├─ [+] Adicionar contato
│   ├─ João Silva: 5585987654321 [Editar] [Deletar]
│   ├─ Maria Santos: 5585987654322 [Editar] [Deletar]
│   └─ Fornecedor XYZ: 5585987654323 [Editar] [Deletar]
└─ [Salvar]
```

**O que acontece:**
- Você mapeia contatos ↔ empresa
- Quando webhook recebe, sabe qual empresa responder
- Agente responde **direcionado à empresa correta**

---

## ✨ Próximos Passos

1. ✅ **Hoje**: Executar SQL + Mapear contatos
2. ✅ **Teste**: `bash test-webhook-empresa.sh`
3. ⏳ **Depois**: Auto-resposta do agente
4. ⏳ **Depois**: Dashboard de chats

---

## 🆘 Se Algo Não Funcionar

### "Contato não foi mapeado"
```bash
# Verificar
curl "http://localhost:3000/api/empresa/contatos-mapeados?empresa_id=..."

# Se vazio, adicione:
curl -X POST http://localhost:3000/api/empresa/contatos-mapeados \
  -H "Content-Type: application/json" \
  -d '{"empresa_id":"...","telefone_contato":"558...","nome_contato":"...","tipo_contato":"cliente"}'
```

### "Banco não está salvando"
```sql
-- Verificar se tabela existe
SELECT * FROM empresa_contatos_mapeamento;

-- Se erro, executar:
SETUP_Z_API_EMPRESA_MAPPING.sql
```

### "Empresa_id está NULL"
```sql
-- Significa mapeamento não funcionou
-- Solução: Adicionar contato primeiro

-- Ver contatos
SELECT * FROM empresa_contatos_mapeamento;

-- Se vazio, adicione:
INSERT INTO empresa_contatos_mapeamento 
VALUES (DEFAULT, 'empresa-uuid', '558...', 'Nome', 'cliente', true, NULL, NOW(), NOW());
```

---

## 📚 Documentação Completa

Leia para entender melhor:
- `FLUXO_WEBHOOK_AGENTE_COMPLETO.md` - Fluxo passo-a-passo
- `INSTALL_Z_API.md` - Setup geral
- `Z_API_WEBHOOK_SETUP.md` - Webhook no dashboard

---

**Status: ✅ Sistema Pronto para Identificar Empresa Automaticamente**

Agora quando qualquer pessoa enviar mensagem, o sistema sabe **de qual empresa** é! 🚀
