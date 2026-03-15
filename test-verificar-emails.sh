#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "VERIFICAR SE EMAILS ESTÃO SENDO ENVIADOS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Teste 1: Chamar enviar-oc-v2 diretamente com dados de teste
echo "✅ TESTE 1: Enviar OC via email (teste direto)"
echo ""

OC_ID="33dd579b-fba8-4e1f-8efa-0bd76f292cdf"  # OC que foi criada

ENVIO=$(curl -s -X POST "http://localhost:3000/api/pedidos/enviar-oc-v2" \
  -H 'Content-Type: application/json' \
  -d "{
    \"ordem_compra_id\": \"${OC_ID}\",
    \"email_fornecedor\": \"nelson_medeiros123@hotmail.com\",
    \"numero_whatsapp\": \"+55-61-99999-9999\",
    \"itens_oc\": [
      {
        \"descricao\": \"Cimento CP II-32\",
        \"quantidade\": 250,
        \"unidade\": \"SC\",
        \"preco_unitario\": 26,
        \"preco_total\": 6500
      }
    ]
  }")

echo "Resposta:"
echo "$ENVIO" | python3 -m json.tool 2>/dev/null || echo "$ENVIO"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "✅ TESTE 2: Gerar múltiplas OCs novamente (com emails)"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:3000/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"24dde8e0-d511-4135-887e-9565c29af6f5\"}")

echo "Resposta:"
echo "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(f\"Status: {d.get('mensagem')}\")
    print(f\"Total OCs: {d.get('total_ordens')}\")
    print()
    print('OCs criadas:')
    for oc in d.get('ordens_compra', []):
        print(f\"  - {oc.get('codigo')}: {oc.get('fornecedor')} - Email: {oc.get('email')}\")
except:
    print('Erro ao parsear resposta')
"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "📧 AGUARDE 5 segundos para emails serem enviados..."
sleep 5

echo ""
echo "✅ Teste concluído!"
echo ""
echo "📝 NOTAS:"
echo "  - Emails são enviados ASSINCRONAMENTE (não bloqueiam a resposta)"
echo "  - Para confirmar recebimento, verifique:"
echo "    1. Caixa de entrada: nelson_medeiros123@hotmail.com"
echo "    2. Pasta de spam/lixo"
echo "    3. Logs do servidor (npm run dev)"
echo ""
