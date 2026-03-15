# 🚀 Deploy Vercel - Passo a Passo Simples

## ✅ Tenha isso pronto:

```
NEXT_PUBLIC_SUPABASE_URL = (copie do Supabase Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (copie do Supabase Settings → API)

Z_API_INSTANCE_ID = 3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN = (seu token Z-API)
Z_API_ENDPOINT = https://api.z-api.io

ANTHROPIC_API_KEY = (gere em https://console.anthropic.com/)
```

---

## 🎯 Processso Deploy (Exato):

### **1. Abra https://vercel.com**
- Faça login (use GitHub)

### **2. Clique "Add New" → "Project"**

### **3. Selecione seu repositório**
- Procure: `voima-app`
- Clique em "Import"

### **4. Página de Configuração vai abrir**
- Deixe Framework como: **Next.js**
- Deixe Build Command como padrão
- **NÃO adicione env vars aqui** (vamos fazer separado)

### **5. Clique "Deploy"**
- Aguarde terminar o build
- Vai dar um erro ou warning sobre env vars (é normal)

### **6. Após deploy, vá para "Settings" → "Environment Variables"**

### **7. Adicione EXATAMENTE essas variáveis:**

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bhgwizuonupjceckxjba.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (seu token) |
| `Z_API_INSTANCE_ID` | `3EAADDCE71F5D2C80DAAB2694663CF7D` |
| `Z_API_TOKEN` | `44BAD21E...` (seu token) |
| `Z_API_ENDPOINT` | `https://api.z-api.io` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (seu token) |

### **8. Após adicionar cada uma, clique o botão "Save"**

### **9. Vá para "Deployments" e clique em "Redeploy"**
- Vercel vai fazer rebuild com as variáveis
- Aguarde completar (~3-5 minutos)

### **10. Pronto! Você terá uma URL como:**
```
https://voima-app.vercel.app
```

---

## ✅ Verificar se está funcionando

```bash
curl https://voima-app.vercel.app/api/webhooks/z-api/debug
```

Deve retornar JSON com status do webhook.

---

## 🔗 Configurar Webhook no Z-API

1. Painel Z-API
2. Instâncias → `3EAADDCE71F5D2C80DAAB2694663CF7D`
3. Webhooks → Novo
4. URL: `https://voima-app.vercel.app/api/webhooks/z-api`
5. Eventos:
   - ✅ MESSAGES_UPSERT
   - ✅ MESSAGES_UPDATE
   - ✅ INSTANCE_CONNECTED
   - ✅ INSTANCE_DISCONNECTED
6. Salve

---

## 🎉 Pronto!

Agora quando receber mensagem no WhatsApp, será respondida automaticamente!

Dúvidas? Verifique os logs: **Vercel Dashboard → Deployments → Logs**
