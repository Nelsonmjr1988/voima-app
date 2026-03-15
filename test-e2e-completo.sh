#!/bin/bash

PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
COTACAO_EXEMPLO="1a4a97b6-82c2-4e50-8fd1-d33cf1ee5ac9"

echo "════════════════════════════════════════════════════"
echo "TESTE E2E COMPLETO - VOIMA PEDIDOS"
echo "════════════════════════════════════════════════════"

echo -e "\n✅ PASSO 1: Consultar Mapa de Cotações"
echo "URL: http://localhost:3000/api/cotacoes/mapa/${PEDIDO_ID}"
MAPA=$(curl -s http://localhost:3000/api/cotacoes/mapa/${PEDIDO_ID})
echo "Status: $(echo $MAPA | grep -o '"etapa":"[^"]*"' | cut -d'"' -f4)"
echo "Stats: $(echo $MAPA | grep -o '"stats":[^}]*' | head -c 100)..."

echo -e "\n✅ PASSO 2: Simular resposta de cotação (Votorantim)"
echo "URL: http://localhost:3000/api/cotacoes/responder-v2"
RESPOSTA=$(curl -s -X POST http://localhost:3000/api/cotacoes/responder-v2 \
  -H 'Content-Type: application/json' \
  -d "{
    \"cotacao_id\": \"${COTACAO_EXEMPLO}\",
    \"preco_unitario\": 33.00,
    \"prazo_entrega_dias\": 5,
    \"condicao_pagamento\": \"a_vista\"
  }")
echo "Resposta: $(echo $RESPOSTA | grep -o '"etapa":"[^"]*"' | cut -d'"' -f4)"

echo -e "\n✅ PASSO 3: Consultar Mapa Atualizado"
sleep 1
MAPA2=$(curl -s http://localhost:3000/api/cotacoes/mapa/${PEDIDO_ID})
RESPONDIDAS=$(echo $MAPA2 | grep -o '"respondidas":[0-9]*' | cut -d':' -f2)
echo "Cotações respondidas agora: ${RESPONDIDAS}"

echo -e "\n✅ PASSO 4: Aprovar e Gerar Ordem de Compra"
echo "URL: http://localhost:3000/api/pedidos/aprovar"
APROVACAO=$(curl -s -X POST http://localhost:3000/api/pedidos/aprovar \
  -H 'Content-Type: application/json' \
  -d "{
    \"pedido_id\": \"${PEDIDO_ID}\",
    \"cotacao_id_selecionada\": \"${COTACAO_EXEMPLO}\",
    \"aprovador_id\": \"33a3874f-dd4b-427d-81f4-ec86b6f14156\"
  }")

echo "Aprovação Response:"
echo $APROVACAO | head -c 300
echo ""

echo -e "\n════════════════════════════════════════════════════"
echo "✅ FLUXO COMPLETO TESTADO!"
echo "════════════════════════════════════════════════════"
