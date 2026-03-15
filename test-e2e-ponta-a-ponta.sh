#!/bin/bash

PORT="3000"
BASE="http://localhost:${PORT}"

echo "════════════════════════════════════════════════════════"
echo "  VOIMA - TESTE E2E PONTA A PONTA"
echo "════════════════════════════════════════════════════════"
echo ""

# ── PASSO 1: Criar Pedido ────────────────────────────────
echo "▶ PASSO 1: Criar pedido de compra..."
PEDIDO=$(curl -s -X POST "$BASE/api/pedidos" \
  -H 'Content-Type: application/json' \
  -d '{
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b",
    "obra_id": "926f3c00-9405-4850-81e1-afc4f9729ac1",
    "mensagem_original": "Teste E2E: cimento, areia e brita",
    "itens": [
      { "descricao": "Cimento CP II-32", "quantidade": 100, "unidade": "SC", "preco_ref_sinapi": 36 },
      { "descricao": "Areia Fina",       "quantidade": 5,   "unidade": "M3", "preco_ref_sinapi": 40 },
      { "descricao": "Brita 1",          "quantidade": 2,   "unidade": "M3", "preco_ref_sinapi": 55 }
    ]
  }')

echo "$PEDIDO" | python3 -m json.tool 2>/dev/null || echo "$PEDIDO"
echo ""

PEDIDO_ID=$(echo "$PEDIDO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('pedido_id',''))" 2>/dev/null)

if [ -z "$PEDIDO_ID" ] || [ "$PEDIDO_ID" = "None" ]; then
  echo "❌ Falhou no PASSO 1 - pedido_id não retornado"
  exit 1
fi
echo "✅ Pedido criado: $PEDIDO_ID"
echo ""

# ── PASSO 2: Ver cotações geradas ───────────────────────
echo "▶ PASSO 2: Verificar cotações geradas..."
sleep 1
MAPA=$(curl -s "$BASE/api/cotacoes/mapa/$PEDIDO_ID")
TOTAL_COT=$(echo "$MAPA" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(len(i.get('cotacoes',[])) for i in d.get('itens_mapa',[])))" 2>/dev/null)
echo "✅ $TOTAL_COT cotações geradas para os fornecedores"
echo ""

# ── PASSO 3: Responder cotações ─────────────────────────
echo "▶ PASSO 3: Simulando respostas dos fornecedores..."
python3 << PYEOF
import json, urllib.request, sys

base = "http://localhost:3000"
pedido_id = "${PEDIDO_ID}"

with urllib.request.urlopen(f"{base}/api/cotacoes/mapa/{pedido_id}") as r:
    mapa = json.loads(r.read())

respondidas = 0
for item in mapa.get('itens_mapa', []):
    for i, cot in enumerate(item.get('cotacoes', [])[:3]):
        cid = cot.get('id')
        if not cid:
            continue
        preco = round(28 + (i * 7) + (hash(cid) % 10), 2)
        body = json.dumps({
            "cotacao_id": cid,
            "preco_unitario": preco,
            "prazo_entrega_dias": 3 + i,
            "condicao_pagamento": "a_vista"
        }).encode()
        req = urllib.request.Request(
            f"{base}/api/cotacoes/responder-v2",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as r:
                respondidas += 1
                print(f"  ✅ {item['descricao'][:30]} - Fornecedor {i+1} → R$ {preco}")
        except Exception as e:
            print(f"  ❌ Erro: {e}")

print(f"\n✅ {respondidas} cotações respondidas")
PYEOF

echo ""

# ── PASSO 4: Gerar OCs ──────────────────────────────────
echo "▶ PASSO 4: Gerar Ordens de Compra (melhor preço por fornecedor)..."
OCS=$(curl -s -X POST "$BASE/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"$PEDIDO_ID\"}")

echo "$OCS" | python3 -m json.tool 2>/dev/null || echo "$OCS"
echo ""

TOTAL_OCS=$(echo "$OCS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_ordens',0))" 2>/dev/null)
VALOR=$(echo "$OCS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('valor_total_pedido',0))" 2>/dev/null)

echo ""
echo "════════════════════════════════════════════════════════"
if [ "$TOTAL_OCS" -gt 0 ] 2>/dev/null; then
  echo "  ✅ SUCESSO - $TOTAL_OCS OC(s) geradas | Total: R$ $VALOR"
  echo "  📧 Emails sendo enviados para easytecnologiati@gmail.com"
else
  echo "  ❌ Algo falhou - verifique os logs acima"
fi
echo "════════════════════════════════════════════════════════"
