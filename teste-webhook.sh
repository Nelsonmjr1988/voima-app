#!/bin/bash

# =====================================================
# Teste Webhook Z-API com seu número
# =====================================================

echo "🧪 Testando webhook com número: 5564996760460"
echo ""

curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "data": {
      "phone": "5564996760460",
      "message": "Olá, teste do webhook!",
      "senderName": "Nelson",
      "to": "5564996760460"
    }
  }'

echo ""
echo ""
echo "🧪 Teste concluído!"
echo ""
echo "✅ Se retornar empresa_id, tudo funcionou!"
echo "⚠️  Se retornar 'Empresa não identificada', execute o SQL em CONFIG_NUMERO_ZAPI.sql"
