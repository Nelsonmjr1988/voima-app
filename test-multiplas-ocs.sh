#!/bin/bash

echo "════════════════════════════════════════════════════"
echo "TESTE E2E - GERAR MÚLTIPLAS OCS POR FORNECEDOR"
echo "════════════════════════════════════════════════════"
echo ""

PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
PORT="3000"

echo "📋 Gerando múltiplas Ordens de Compra (uma por fornecedor)..."
echo "URL: http://localhost:${PORT}/api/pedidos/gerar-ocs"
echo "Pedido: $PEDIDO_ID"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\",\"criterio\":\"melhor_preco\"}")

echo "Resposta:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ TESTE DE MÚLTIPLAS OCS CONCLUÍDO!"
echo "════════════════════════════════════════════════════"
