# 📖 Guia de Instalação Z-API WhatsApp - VOIMA

## 📋 Checklist de Instalação

- [ ] Atualizar variáveis de ambiente (.env.local)
- [ ] Executar migration SQL
- [ ] Atualizar dependências (se necessário)
- [ ] Testar conexão
- [ ] Configurar webhook no Z-API Dashboard
- [ ] Testar envio de mensagens

---

## ✅ Passo 1: Variáveis de Ambiente

Edite o arquivo `.env.local` (ou crie um novo):

```bash
# Arquivo: .env.local

# Supabase (já deve existir)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key

# Anthropic Claude (já deve existir)
ANTHROPIC_API_KEY=sk-ant-...

# 🆕 Adicione Z-API:
Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN=44BAD21EEC9A41B0141E1142
Z_API_BASE_URL=https://api.z-api.io
```

**Salve e reinicie o servidor:**
```bash
npm run dev
```

---

## ✅ Passo 2: Criar Tabelas no Banco

### Opção A: Via SQL Editor (Recomendado)

1. Abra [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegue para SQL Editor
3. Copie o conteúdo de `SETUP_Z_API_WHATSAPP.sql`
4. Cole no SQL Editor
5. Clique em "Executar"

### Opção B: Via CLI (Alternativo)

```bash
# Se tiver supabase cli instalado
supabase migration new setup_z_api_whatsapp

# Cole o conteúdo de SETUP_Z_API_WHATSAPP.sql no arquivo criado
# Depois execute:
supabase migration up
```

**Verifique se as tabelas foram criadas:**
```sql
-- No Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'whatsapp_%' OR tablename = 'instance_status';
```

Resultado esperado:
```
whatsapp_mensagens
whatsapp_contatos
instance_status
whatsapp_templates
```

---

## ✅ Passo 3: Verificar Instalação

### Teste 1: Verificar se servidor está rodando
```bash
curl http://localhost:3000/api/whatsapp/instance-info
```

Resultado esperado (mesmo que desconectado):
```json
{
  "sucesso": true,
  "instance_id": "3EAADDCE71F5D2C80DAAB2694663CF7D",
  "status": "disconnected",
  "conectado": false
}
```

### Teste 2: Executar script de testes
```bash
chmod +x test-z-api.sh
./test-z-api.sh
```

Este script testará automaticamente:
- ✓ Conexão da instância
- ✓ Webhook receiver
- ✓ Envio de OC
- ✓ Verificação de status

---

## ✅ Passo 4: Fazer Login no WhatsApp

Se estiver desconectado, você precisa fazer login:

1. **Obter QR Code:**
```bash
curl http://localhost:3000/api/whatsapp/instance-info
```

Procure por `"qrcode": "data:image/png;base64,..."` no response

2. **Scannear com WhatsApp:**
   - Abra WhatsApp no seu celular
   - Vá para: Configurações → Aparelhos Conectados → Conectar Aparelho
   - Scaneie o QR Code

3. **Confirmar conexão:**
```bash
# Aguarde 10-15 segundos, depois execute:
curl http://localhost:3000/api/whatsapp/instance-info
```

Se vir `"conectado": true` → ✅ Conectado!

---

## ✅ Passo 5: Configurar Webhook no Z-API

### Encontrar sua URL Pública

**Em desenvolvimento local (ngrok):**
```bash
# Terminal novo
ngrok http 3000

# Resultado será algo como:
# https://abc-123-def-456.ngrok.io
```

**Em produção:**
- Use seu domínio: `https://seu-dominio.com`

### Configurar no Dashboard Z-API

1. Acesse [Z-API Dashboard](https://dashboard.z-api.io)
2. Selecione sua instância
3. Vá para: Webhooks ou Configurações
4. Adicione novo webhook:
   - **URL:** `https://seu-url-aqui/api/webhooks/z-api`
   - **Eventos:** Marque todos:
     - ✅ MESSAGES_UPSERT
     - ✅ MESSAGES_UPDATE
     - ✅ QRCODE
     - ✅ INSTANCE_CONNECTED
     - ✅ INSTANCE_DISCONNECTED
   - Clique em "Testar" (deve retornar 200 OK)

---

## ✅ Passo 6: Testar Envio de Mensagens

### Teste 1: Enviar OC
```bash
curl -X POST http://localhost:3000/api/whatsapp/enviar-oc \
  -H "Content-Type: application/json" \
  -d '{
    "oc_id": "550e8400-e29b-41d4-a716-446655440000",
    "telefone": "5585987654321",
    "nome_cliente": "João Silva",
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
  }'
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "message_id": "msg_xyz",
  "telefone": "5585987654321",
  "oc_numero": "OC-2024-001"
}
```

### Teste 2: Enviar Cotação
```bash
curl -X POST http://localhost:3000/api/whatsapp/enviar-cotacao \
  -H "Content-Type: application/json" \
  -d '{
    "cotacao_id": "660e8400-e29b-41d4-a716-446655440001",
    "telefone": "5585987654321",
    "nome_cliente": "João Silva",
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
  }'
```

### Teste 3: Verificar Status de Envio
```bash
curl http://localhost:3000/api/whatsapp/status/msg_xyz
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "message_id": "msg_xyz",
  "status": "delivered",
  "detalhes": {...}
}
```

---

## 🐛 Troubleshooting

### Problema: "Instance not connected"

```json
{"erro": "Instance not connected"}
```

**Solução:**
1. Verifique se QR Code foi escaneado
2. Confirme login no WhatsApp Web
3. Redirija a autenticação Z-API

```bash
# Obter novo QR Code
curl http://localhost:3000/api/whatsapp/instance-info

# E scaneie o QR Code exibido
```

---

### Problema: Webhook não recebe mensagens

**Checklist:**
1. [ ] URL do webhook está correta no Z-API Dashboard?
2. [ ] Endpoint responde com 200 OK?
3. [ ] Servidor está rodando (`npm run dev`)?
4. [ ] Se ngrok, ngrok ainda está rodando?

**Testar webhook manually:**
```bash
# Testar se seu webhook responde
curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'

# Deve retornar: {"success":true,"event_logged":true}
```

---

### Problema: Erro "Variáveis não configuradas"

```
Error: Z_API_INSTANCE_ID e Z_API_TOKEN não configurados
```

**Solução:**
1. Verifique `.env.local`
2. Confirm as variáveis estão exatamente assim:
   - `Z_API_INSTANCE_ID` (sem quebra de linha)
   - `Z_API_TOKEN` (sem espaços extras)
3. Reinicie o servidor: `Ctrl+C`, depois `npm run dev`

---

## ✨ Pronto para Produção!

Quando tudo estiver funcionando:

1. Atualize `.env.local` na produção com URL real
2. Configure webhook com domínio real (não ngrok)
3. Teste envio/recebimento de mensagens
4. Monitor logs em tempo real

---

## 📚 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/z-api-whatsapp.ts` | Cliente Z-API (core) |
| `src/app/api/webhooks/z-api/route.ts` | Webhook receiver |
| `src/app/api/whatsapp/enviar-oc/route.ts` | Enviar OC via WhatsApp |
| `src/app/api/whatsapp/enviar-cotacao/route.ts` | Enviar cotação via WhatsApp |
| `SETUP_Z_API_WHATSAPP.sql` | Migration do banco |
| `Z_API_WEBHOOK_SETUP.md` | Detalhes de webhook |
| `test-z-api.sh` | Script de testes |

---

## 🆘 Suporte

- **Documentação Z-API:** https://docs.z-api.io/
- **Incluir logs ao reportar bugs:**
  ```bash
  # Veja logs do servidor
  npm run dev  # Todos os logs aparecerão no terminal
  ```

- **Status incidents:** https://status.z-api.io/

---

## 🎯 Próximos Passos

1. ✅ Integração básica completa
2. ⏳ Implementar resposta automática a mensagens recebidas
3. ⏳ Dashboard para visualizar histórico de mensagens
4. ⏳ Templates de mensagens reutilizáveis

---

✅ **Instalação concluída com sucesso!**
