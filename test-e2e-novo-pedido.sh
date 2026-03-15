#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "TESTE E2E COMPLETO - NOVO PEDIDO DE COMPRA"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

PORT="3000"

# PASSO 1: Criar novo pedido de compra
echo "✅ PASSO 1: Criar novo pedido de compra"
echo ""

PEDIDO=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos" \
  -H 'Content-Type: application/json' \
  -d '{
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
    "obra_id": "926f3c00-9405-4850-81e1-afc4f9729ac1",
    "mensagem_original": "Teste E2E: 100 cimento, 5m3 areia, 2m3 brita",
    "itens": [
      { "descricao": "Cimento CP II-32", "quantidade": 100, "unidade": "SC", "preco_ref_sinapi": 36 },
      { "descricao": "Areia Fina", "quantidade": 5, "unidade": "M3", "preco_ref_sinapi": 40 },
      { "descricao": "Brita 1", "quantidade": 2, "unidade": "M3", "preco_ref_sinapi": 55 }
    ]
  }')

echo "Resposta:" 
echo "$PEDIDO" | python3 -m json.tool 2>/dev/null | head -30
echo ""

PEDIDO_ID=$(echo "$PEDIDO" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('pedido_id', 'ERROR'))" 2>/dev/null)
echo "Pedido ID: $PEDIDO_ID"
echo ""

if [ "$PEDIDO_ID" = "ERROR" ] || [ -z "$PEDIDO_ID" ]; then
  echo "❌ Erro ao criar pedido"
  exit 1
fi

# PASSO 2: Esperar alguns segundos
echo "Aguardando 3 segundos..."
sleep 3

# PASSO 3: Ver mapa de cotações
echo ""
echo "✅ PASSO 2: Consultar mapa de cotações para responder"
MAPA=$(curl -s -X GET "http://localhost:${PORT}/api/cotacoes/mapa/${PEDIDO_ID}")

# Simular respostas para todos os itens
echo "✅ PASSO 3: Responder cotações para todos os 3 itens"
echo ""

# Extrair e responder cotações usando Python
python3 << 'PYEND'
import json
import urllib.request
import sys

try:
    # Get mapa
    with urllib.request.urlopen("http://localhost:3000/api/cotacoes/mapa/" + sys.argv[1]) as response:
        mapa = json.loads(response.read())
    
    for item in mapa.get('itens_mapa', []):
        print(f"  Item: {item['descricao']} - {len(item['cotacoes'])} cotações")
        
        # Responder primeiras 3 cotações de cada item
        for i, cot in enumerate(item['cotacoes'][:3]):
            if cot['id']:
                preco = 30 + (i * 5)  # Preços variados
                body = json.dumps({
                    "cotacao_id": cot['id'],
                    "preco_unitario": preco,
                    "prazo_entrega_dias": 5,
                    "condicao_pagamento": "a_vista"
                }).encode('utf-8')
                
                req = urllib.request.Request(
                    "http://localhost:3000/api/cotacoes/responder-v2",
                    data=body,
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                
                try:
                    with urllib.request.urlopen(req) as response:
                        print(f"    ✓ Cotação respondida (preço: R$ {preco})")
                except Exception as e:
                    print(f"    ✗ Erro: {e}")
                    
except Exception as e:
    print(f"Erro: {e}")
    sys.exit(1)
PYEND "$PEDIDO_ID"

echo ""

# PASSO 4: Gerar OCs
echo "✅ PASSO 4: Gerar Múltiplas Ordens de Compra"
echo ""

OCS=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\"}")

echo "$OCS" | python3 -m json.tool 2>/dev/null || echo "$OCS"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ TESTE E2E COMPLETO!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📧 Emails devem ter sido enviados para os fornecedores selecionados"
echo "   (verifique a pasta de spam se não encontrar)"
