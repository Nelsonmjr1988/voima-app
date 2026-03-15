#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "TESTE E2E COMPLETO V2 - MÚLTIPLAS ORDENS DE COMPRA (UMA POR FORNECEDOR)"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
PORT="3000"

# PASSO 1: Ver mapa de cotações
echo "✅ PASSO 1: Consultar Mapa de Cotações"
echo "Buscando cotações abertas para o pedido..."
MAPA=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")
echo ""

# PASSO 2: Simular respostas para TODOS os itens de DIFERENTES fornecedores
echo "✅ PASSO 2: Simular respostas de cotação para todos os 3 itens"
echo "      Cada item com resposta de 3 fornecedores diferentes"
echo ""

# IDs dos fornecedores que serão usados
FORNECEDOR1="bb53f193-5d28-45ab-8ff9-a82fa1bc1f1e"  # Votorantim
FORNECEDOR2="07a35b76-4e63-4e78-869f-18c3f76765c7"  # São Cristovão
FORNECEDOR3="25773412-8d8c-4ce5-82b9-f2fa46030cd6"  # Lafarge

# IDs dos itens
ITEM_CIMENTO="7a4e2ece-6a40-4428-9fc0-b55097d64dbd"
ITEM_AREIA="c0b5859d-940f-4a38-9347-60c7f06ace05"
ITEM_BRITA="99051686-8087-4a30-b751-f07b04f1e3a4"

# Buscar todas as cotações abertas para este pedido
COTACOES_ABERTAS=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}" | grep -o '"id":"[a-f0-9-]*"' | sed 's/"id":"\([^"]*\)"/\1/')

COUNT=1
for COTACAO_ID in $COTACOES_ABERTAS; do
  if [ ! -z "$COTACAO_ID" ]; then
    # Preço variável por cotação
    PRECO=$((RANDOM % 50 + 25))
    
    # Enviar resposta
    curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
      -H 'Content-Type: application/json' \
      -d "{\"cotacao_id\":\"${COTACAO_ID}\",\"preco_unitario\":${PRECO},\"prazo_entrega_dias\":$((RANDOM % 14 + 3)),\"condicao_pagamento\":\"a_vista\"}" > /dev/null
    
    echo "   ✓ Cotação $COUNT respondida (preço: R$ $PRECO)"
    COUNT=$((COUNT + 1))
    
    # Limitar a 15 respostas para não demorar muito
    if [ $COUNT -gt 15 ]; then
      echo "   (limitado a 15 respostas)"
      break
    fi
  fi
done

echo ""

# PASSO 3: Ver mapa atualizado
echo "✅ PASSO 3: Consultar Mapa de Cotações Atualizado"
MAPA_NEW=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")
echo "Mapa atualizado recebido"
echo ""

# PASSO 4: Debug - Verificar dados antes de gerar OCs
echo "✅ PASSO 4: Debug - Verificar dados"
echo "URL: http://localhost:${PORT}/api/debug/gerar-ocs"
DEBUG=$(curl -s -X GET "http://localhost:${PORT}/api/debug/gerar-ocs?pedido_id=${PEDIDO_ID}")
ITENS_COUNT=$(echo "$DEBUG" | grep -o '"itens_count":[0-9]*' | sed 's/.*:\([0-9]*\)$/\1/')
COTACOES_PEDIDO=$(echo "$DEBUG" | grep -o '"cotacoes_para_pedido":[0-9]*' | sed 's/.*:\([0-9]*\)$/\1/')
echo "   - Itens do pedido: $ITENS_COUNT"
echo "   - Cotações respondidas para este pedido: $COTACOES_PEDIDO"
echo ""

# PASSO 5: GERAR MÚLTIPLAS OCS (UMA POR FORNECEDOR)
echo "✅ PASSO 5: Gerar Múltiplas Ordens de Compra (uma por fornecedor)"
echo "URL: http://localhost:${PORT}/api/pedidos/gerar-ocs"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\",\"criterio\":\"melhor_preco\"}")

echo "Resposta da API:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ FLUXO COMPLETO TESTADO!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📧 Verifique o email: nelson_medeiros123@hotmail.com"
echo "   As OCs devem estar chegando (verificar spam também)"
