# 🚀 Deploy Vercel - Passo a Passo Simples

## ✅ Tenha isso pronto:

```
NEXT_PUBLIC_SUPABASE_URL = https://bhgwizuonupjceckxjba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3dpenVvbnVwamNlY2t4amJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzE3MjQsImV4cCI6MjA4ODg0NzcyNH0.BEHORjz-ZEUW11T8a-ZVPJFszzKWgMaLSFAMBXDgCSk

Z_API_INSTANCE_ID = 3EAADDCE71F5D2C80DAAB2694663CF7D
Z_API_TOKEN = 44BAD21EEC9A41B0141E1142
Z_API_ENDPOINT = https://api.z-api.io

ANTHROPIC_API_KEY = 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
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

#### Coluna 1: Nome | Coluna 2: Valor

```
NEXT_PUBLIC_SUPABASE_URL | https://bhgwizuonupjceckxjba.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3dpenVvbnVwamNlY2t4amJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzE3MjQsImV4cCI6MjA4ODg0NzcyNH0.BEHORjz-ZEUW11T8a-ZVPJFszzKWgMaLSFAMBXDgCSk

Z_API_INSTANCE_ID | 3EAADDCE71F5D2C80DAAB2694663CF7D

Z_API_TOKEN | 44BAD21EEC9A41B0141E1142

Z_API_ENDPOINT | https://api.z-api.io

ANTHROPIC_API_KEY | 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
```

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
