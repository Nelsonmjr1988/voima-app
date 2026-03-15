#!/bin/bash

echo "Enviando OC para email: nelson_medeiros123@hotmail.com..."
echo ""

response=$(curl -s -X POST http://localhost:3001/api/pedidos/enviar-oc \
  -H 'Content-Type: application/json' \
  -d '{"ordem_compra_id":"c71e404d-4d54-4f09-9f82-e20a72021db2","email_fornecedor":"nelson_medeiros123@hotmail.com"}')

# Limitar o tamanho da resposta
echo "$response" | head -c 1000
echo ""
echo "..."
echo ""

# Verificar se tem etapa no resultado
if echo "$response" | grep -q "etapa"; then
  echo "✅ Requisição processada com sucesso!"
else
  echo "⚠️ Resposta inesperada"
fi
