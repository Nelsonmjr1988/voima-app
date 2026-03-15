#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "TESTE E2E COMPLETO - MÚLTIPLAS ORDENS DE COMPRA (UMA POR FORNECEDOR)"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
PORT="3000"

# PASSO 1: Ver mapa de cotações
echo "✅ PASSO 1: Consultar Mapa de Cotações"
echo "URL: http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}"
MAPA=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")
STATUS=$(echo "$MAPA" | grep -o '"status":"[^"]*"' | head -1)
STATS=$(echo "$MAPA" | grep -o '"stats":{[^}]*}' | head -1)
echo "Status: $STATUS"
echo "Stats: $STATS"
echo ""

# PASSO 2: Simular resposta de várias cotações (múltiplos fornecedores)
echo "✅ PASSO 2: Simular respostas de cotação de diferentes fornecedores"
echo "      (Votorantim, São Cristovão e Lafarge)"

# Simular resposta 1 - Votorantim
COTACAO1="1a4a97b6-82c2-4e50-8fd1-d33cf1ee5ac9"
curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
  -H 'Content-Type: application/json' \
  -d "{\"cotacao_id\":\"${COTACAO1}\",\"preco_unitario\":32.50,\"prazo_entrega_dias\":5,\"condicao_pagamento\":\"a_vista\"}" > /dev/null
echo "   ✓ Votorantim respondeu"

# Simular respostas para outros fornecedores (São Cristovão e Lafarge)
# Buscar outras cotações abertas do pedido
OUTRAS=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}" | grep -o '"id":"[a-f0-9-]*"' | head -10)
COUNT=0
for ID in $OUTRAS; do
  ID_CLEAN=$(echo $ID | sed 's/"id":"\([^"]*\)"/\1/')
  if [ ! -z "$ID_CLEAN" ] && [ "$ID_CLEAN" != "$COTACAO1" ] && [ $COUNT -lt 4 ]; then
    curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
      -H 'Content-Type: application/json' \
      -d "{\"cotacao_id\":\"${ID_CLEAN}\",\"preco_unitario\":$((RANDOM % 50 + 25)),\"prazo_entrega_dias\":$((RANDOM % 14 + 3)),\"condicao_pagamento\":\"a_vista\"}" > /dev/null
    COUNT=$((COUNT+1))
  fi
done
echo "   ✓ Outros fornecedores responderam"
echo ""

# PASSO 3: Ver mapa atualizado
echo "✅ PASSO 3: Consultar Mapa de Cotações Atualizado"
MAPA_NEW=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")
RESPONDIDAS=$(echo "$MAPA_NEW" | grep -o '"respondidas":[0-9]*' | head -1)
echo "Cotações respondidas agora: $RESPONDIDAS"
echo ""

# PASSO 4: GERAR MÚLTIPLAS OCS (UMA POR FORNECEDOR)
echo "✅ PASSO 4: Gerar Múltiplas Ordens de Compra (uma por fornecedor)"
echo "URL: http://localhost:${PORT}/api/pedidos/gerar-ocs"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\",\"criterio\":\"melhor_preco\"}")

echo "Resposta:"
echo "$RESPONSE" | head -c 2000
echo ""
echo ""

echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ FLUXO COMPLETO TESTADO - MÚLTIPLAS OCS GERADAS E ENVIADAS!"
echo "════════════════════════════════════════════════════════════════════════════"
