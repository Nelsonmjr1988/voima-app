#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "TESTE SIMULAR RESPOSTAS - PARA CADA ITEM (CIMENTO, AREIA, BRITA)"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
PORT="3000"

# Obter mapa de cotações para extrair IDs
echo "✅ ETAPA 1: Obter mapa de cotações"
MAPA=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")

echo ""
echo "✅ ETAPA 2: Extrair IDs das cotações por item"
echo ""

# Processar com jq na forma melhor
COTACOES_JSON=$(echo "$MAPA" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for item in data.get('itens_mapa', []):
        print(f\"ITEM: {item['descricao']}\")
        for i, cot in enumerate(item.get('cotacoes', [])[:4]):  # Primeiras 4 cotações
            print(f\"  ID:{cot['id']}|FORNECEDOR:{cot['fornecedor']}\")
except Exception as e:
    print(f\"Erro: {e}\", file=sys.stderr)
")

echo "$COTACOES_JSON"

echo ""
echo "✅ ETAPA 3: Responder cotações manualmente"
echo ""

# IDs das cotações para CIMENTO (já respondidas)
echo "Respondendo cotações do Cimento..."
CIMENTO_COTS=$(
  echo "$MAPA" | python3 -c "
import json, sys
data = json.load(sys.stdin)
cimento_item = [i for i in data.get('itens_mapa', []) if 'Cimento' in i['descricao']]
if cimento_item:
    for cot in cimento_item[0]['cotacoes'][:3]:  # Primeiras 3
        print(cot['id'])
" 2>/dev/null || echo "")

COUNT=1
for COT_ID in $CIMENTO_COTS; do
  if [ ! -z "$COT_ID" ] && [ ${#COT_ID} -eq 36 ]; then
    PRECO=$((25 + COUNT))
    curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
      -H 'Content-Type: application/json' \
      -d "{\"cotacao_id\":\"${COT_ID}\",\"preco_unitario\":${PRECO},\"prazo_entrega_dias\":5,\"condicao_pagamento\":\"a_vista\"}" > /dev/null
    echo "  ✓ Cotação Cimento #$COUNT respondida (preço: R$ $PRECO)"
    COUNT=$((COUNT + 1))
    sleep 0.5
  fi
done

# Responder cotações de AREIA
echo ""
echo "Respondendo cotações da Areia..."
AREIA_COTS=$(
  echo "$MAPA" | python3 -c "
import json, sys
data = json.load(sys.stdin)
areia_item = [i for i in data.get('itens_mapa', []) if 'Areia' in i['descricao']]
if areia_item:
    for cot in areia_item[0]['cotacoes'][:3]:  # Primeiras 3
        print(cot['id'])
" 2>/dev/null || echo "")

COUNT=1
for COT_ID in $AREIA_COTS; do
  if [ ! -z "$COT_ID" ] && [ ${#COT_ID} -eq 36 ]; then
    PRECO=$((50 + COUNT * 5))
    curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
      -H 'Content-Type: application/json' \
      -d "{\"cotacao_id\":\"${COT_ID}\",\"preco_unitario\":${PRECO},\"prazo_entrega_dias\":5,\"condicao_pagamento\":\"a_vista\"}" > /dev/null
    echo "  ✓ Cotação Areia #$COUNT respondida (preço: R$ $PRECO)"
    COUNT=$((COUNT + 1))
    sleep 0.5
  fi
done

# Responder cotações de BRITA
echo ""
echo "Respondendo cotações da Brita..."
BRITA_COTS=$(
  echo "$MAPA" | python3 -c "
import json, sys
data = json.load(sys.stdin)
brita_item = [i for i in data.get('itens_mapa', []) if 'Brita' in i['descricao']]
if brita_item:
    for cot in brita_item[0]['cotacoes'][:3]:  # Primeiras 3
        print(cot['id'])
" 2>/dev/null || echo "")

COUNT=1
for COT_ID in $BRITA_COTS; do
  if [ ! -z "$COT_ID" ] && [ ${#COT_ID} -eq 36 ]; then
    PRECO=$((40 + COUNT * 3))
    curl -s -X POST "http://localhost:${PORT}/api/cotacoes/responder-v2" \
      -H 'Content-Type: application/json' \
      -d "{\"cotacao_id\":\"${COT_ID}\",\"preco_unitario\":${PRECO},\"prazo_entrega_dias\":5,\"condicao_pagamento\":\"a_vista\"}" > /dev/null
    echo "  ✓ Cotação Brita #$COUNT respondida (preço: R$ $PRECO)"
    COUNT=$((COUNT + 1))
    sleep 0.5
  fi
done

echo ""
echo "✅ ETAPA 4: Verificar debug depois de respostas"
sleep 2
DEBUG=$(curl -s -X GET "http://localhost:${PORT}/api/debug/gerar-ocs-detalhado?pedido_id=${PEDIDO_ID}")
echo "$DEBUG" | python3 -m json.tool | grep -A50 "detalhe_por_item"

echo ""
echo "✅ ETAPA 5: Gerar OCs"
RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\",\"criterio\":\"melhor_preco\"}")

echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
