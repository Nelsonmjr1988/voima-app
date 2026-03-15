# 🚀 Deploy Vercel - Z-API WhatsApp Integration

## ✅ Pré-requisitos

- ✅ Código no GitHub (`https://github.com/Nelsonmjr1988/voima-app`)
- ✅ Supabase projet configurado
- ✅ Z-API credentials (já temos)
- ✅ Anthropic API key

## 📋 Passo 1: Preparar Variáveis de Ambiente

Reúna as seguintes informações:

### **Supabase** (https://supabase.com)
1. Login no seu projeto
2. Vá para **Settings** → **API**
3. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Anthropic** (https://console.anthropic.com/)
1. Login
2. Vá para **API Keys**
3. Crie uma nova key
4. Copie → `ANTHROPIC_API_KEY`

### **Z-API** (já temos)
```
Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN=44BAD21EEC9A41B0141E1142
Z_API_ENDPOINT=https://api.z-api.io
```

---

## 🎯 Passo 2: Deploy no Vercel

### **Via Interface Web (mais fácil)**

1. Acesse https://vercel.com
2. Clique **"Add New"** → **"Project"**
3. Selecione seu repositório: `voima-app`
4. Clique em **"Import"**

### **Configurar Environment Variables**

5. Clique em **"Environment Variables"**
6. Adicione cada uma:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | sua-url |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua-chave |
| `Z_API_INSTANCE_ID` | 3EAADDCE71F5D2C80DAAB2694663CF7D |
| `Z_API_TOKEN` | 44BAD21EEC9A41B0141E1142 |
| `Z_API_ENDPOINT` | https://api.z-api.io |
| `ANTHROPIC_API_KEY` | sua-chave |

7. Clique **"Deploy"**

Vercel vai construir e fazer deploy automaticamente. Aguarde ~3-5 minutos.

---

## 🔗 Passo 3: Webhook no Z-API

Após o deploy bem-sucedido, você terá uma URL como:
```
https://voima-app.vercel.app
```

Configure no painel Z-API:

1. Painel Z-API → Configurações
2. Webhooks → Novo webhook
3. URL: **`https://voima-app.vercel.app/api/webhooks/z-api`**
4. Eventos:
   - ✅ MESSAGES_UPSERT
   - ✅ MESSAGES_UPDATE
   - ✅ INSTANCE_CONNECTED
   - ✅ INSTANCE_DISCONNECTED
5. Salve

---

## ✅ Passo 4: Testar

Envie mensagem no WhatsApp para seu número `5564996760460`.

A resposta deve chegar automaticamente! 🎉

---

## 📊 Próximos Passos

- [ ] Deploy no Vercel
- [ ] Configurar environment variables
- [ ] Atualizar webhook no Z-API
- [ ] Enviar mensagem de teste
- [ ] Verificar se responde automaticamente

---

## 🆘 Troubleshooting

### "Deployment Failed"
- Verifique se todas as env variables estão corretas
- Verifique se `npm run build` funciona localmente

### "Webhook não recebendo mensagens"
- Verifique se a URL do webhook está correta no Z-API
- Teste com: `curl -X POST https://voima-app.vercel.app/api/webhooks/z-api/debug`

### "Empresa não identificada"
- Verifique se o número está configurado: `https://voima-app.vercel.app/api/webhooks/z-api/debug`

---

## 📞 Suporte

- Vercel Docs: https://vercel.com/docs
- Z-API Docs: https://z-api.io/docs
- Supabase Docs: https://supabase.com/docs
