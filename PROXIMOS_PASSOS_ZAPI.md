    # 🚀 Próximos Passos - Integração Z-API WhatsApp

## ✅ Já Concluído

1. **Webhook Simplificado** (`src/app/api/webhooks/z-api/route.ts`)
   - Recebe mensagem
   - Identifica empresa pelo número Z-API
   - Salva no histórico
   - Retorna empresa_id para o agent
   - Sem complicações! ✅

2. **Configurações de Ambiente** (`.env.local`)
   - `Z_API_INSTANCE_ID` ✅
   - `Z_API_TOKEN` ✅
   - `Z_API_ENDPOINT` ✅

3. **SQL Simplificado** (`SETUP_Z_API_SIMPLES.sql`)
   - Add field `numero_whatsapp_zapi` à tabela `empresas`
   - Tabela `whatsapp_mensagens` para histórico
   - Tabela `zapi_instance_status` para status
   - 60 linhas, muito limpo! ✅

---

## 🔨 Passos a Fazer

### **Passo 1: Executar migração SQL no Supabase**

Opção A (Painel Supabase):
1. Login em https://supabase.com
2. Vai para seu projeto
3. SQL Editor (lado esquerdo)
4. Nova query (botão azul)
5. Copiar todo conteúdo de `SETUP_Z_API_SIMPLES.sql`
6. Colar na query
7. Clique em "RUN"

Opção B (via \`psql\` - se tiver CLI):
```bash
psql postgresql://[user]:[password]@[host]/[database] < SETUP_Z_API_SIMPLES.sql
```

### **Passo 2: Configurar Z-API Webhook URL**

Como você não tem domínio ainda, use **ngrok** para expor localhost:

```bash
# 1. Instalar ngrok (se não tiver)
brew install ngrok

# 2. Expor porta 3000
ngrok http 3000
```

Isso gera uma URL like: `https://abc123-def456.ngrok.io`

Na Z-API (https://z-api.io):
1. Dashboard
2. Instância: `3EAADDCE71F5D2C80DAAB2694663CF7D`
3. Settings > Webhooks
4. Adicione URL:
   ```
   https://[seu-ngrok-url]/api/webhooks/z-api
   ```

Depois quando tiver domínio de produção, é só trocar a URL.

Eventos para habilitar:
- ✅ `MESSAGES_UPSERT` (mensagens novas)
- ✅ `MESSAGES_UPDATE` (status entrega)
- ✅ `INSTANCE_CONNECTED` (conectado)
- ✅ `INSTANCE_DISCONNECTED` (desconectado)

### **Passo 3: Adicionar número WhatsApp a uma empresa (teste)**

**IMPORTANTE**: Primeiro execute o SQL do Passo 1!

Depois, descubra qual é o UUID de uma empresa sua:

```sql
SELECT id, razao_social FROM public.empresas LIMIT 5;
```

Copie um `id` e execute:

```sql
UPDATE public.empresas 
SET numero_whatsapp_zapi = '5511987654321'  -- Seu número Z-API
WHERE id = 'coloque-o-uuid-aqui';

-- Verificar
SELECT id, razao_social, numero_whatsapp_zapi FROM public.empresas WHERE id = 'coloque-o-uuid-aqui';
```

Pronto! Agora a empresa tem um número WhatsApp associado.

### **Passo 4: Testar Webhook Localmente**

O servidor já está rodando em `localhost:3000`.

Simule um webhook POST (use o **mesmo número** que configurou no Passo 3):

```bash
curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "data": {
      "phone": "5511987654321",
      "message": "Olá, teste!",
      "senderName": "João",
      "to": "5511987654321"
    }
  }'
```

**Resposta esperada** (sucesso):
```json
{
  "success": true,
  "empresa_id": "abc-123...",
  "empresa_nome": "Sua Empresa LTDA",
  "mensagem_recebida": true
}
```

Se retornar `"warning": "Empresa não identificada"`, significa que o número em `"to"` não existe em nenhuma empresa. Confira o Passo 3!

Verifique a mensagem foi salva:
```sql
SELECT * FROM public.whatsapp_mensagens ORDER BY timestamp DESC LIMIT 1;
```

### **Passo 5: Conectar ao Agent**

No webhook, após identificar empresa:
1. Message está salva em `whatsapp_mensagens`
2. Tem `empresa_id`
3. Enviar para seu novo endpoint `/api/agent/respond` com:
   ```json
   {
     "empresa_id": "abc-123...",
     "usuario_id": null,
     "mensagem": "Mensagem do cliente",
     "contexto": "whatsapp"
   }
   ```

4. Agent processa e retorna resposta
5. Webhook envia de volta via Z-API

---

## 📋 Checklist

- [ ] Executar SQL no Supabase
- [ ] Verificar tabelas criadas:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'empresas' AND column_name LIKE '%whatsapp%';
  ```
- [ ] Configurar Z-API Webhook URL
- [ ] Adicionar número WhatsApp a teste empresa
- [ ] Testar com curl/Insomnia
- [ ] Integrar com agent
- [ ] Teste end-to-end

---

## 🎯 Resumo da Solução

```
Mensagem WhatsApp
       ↓
   Webhook recebe
       ↓
   Extrai: numero_zapi = "5511987654321"
       ↓
   Query: SELECT id FROM empresas WHERE numero_whatsapp_zapi = numero_zapi
       ↓
   Encontra: empresa_id = "abc-123"
       ↓
   Salva em whatsapp_mensagens
       ↓
   Passa para agent processar
       ↓
   Agent responde
       ↓
   Webhook envia de volta para cliente
```

**Simples. Limpo. Funciona.**

---

## 🔗 Referências

- [Z-API Documentação](https://z-api.io)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
