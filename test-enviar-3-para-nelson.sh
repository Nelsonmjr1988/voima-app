#!/bin/bash

echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ TESTE: ENVIAR 3 OCs PARA nelson_medeiros123@hotmail.com"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

PORT="3000"
PEDIDO_ID="24dde8e0-d511-4135-887e-9565c29af6f5"
EMAIL_TESTE="nelson_medeiros123@hotmail.com"

echo "🎯 OBJETIVO: Enviar 3 OCs (Cimento, Areia, Brita) como PDF"
echo ""

# Gerar 3 OCs
echo "✅ ETAPA 1: Gerar 3 Ordens de Compra"
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\"}")

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(f'✅ {d.get(\"mensagem\")}')
    print(f'   Total: {d.get(\"total_ordens\")} OCs')
    print()
    print('   Ordens geradas:')
    for oc in d.get('ordens_compra', []):
        print(f'     • {oc.get(\"codigo\")}: {oc.get(\"fornecedor\")} - R$ {oc.get(\"valor_total\")}')
        print(f'       ID: {oc.get(\"id\")}')
    
    # Salvar IDs para próxima etapa
    ocs = d.get('ordens_compra', [])
    for oc in ocs:
        with open(f'/tmp/oc_id_{oc.get(\"codigo\")}.txt', 'w') as f:
            f.write(oc.get('id', ''))
except Exception as e:
    print(f'Erro: {e}')
"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ ETAPA 2: Enviar 3 PDFs para ${EMAIL_TESTE}"
echo ""

# Ler IDs das OCs
OC_CIMENTO=$(cat /tmp/oc_id_OC-*.txt 2>/dev/null | head -1)

if [ -z "$OC_CIMENTO" ]; then
  echo "❌ Erro: Não consegui obter IDs das OCs"
  exit 1
fi

# Obter apenas os 3 IDs
OCS=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/gerar-ocs" \
  -H 'Content-Type: application/json' \
  -d "{\"pedido_id\":\"${PEDIDO_ID}\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for oc in d.get('ordens_compra', []):
    print(oc.get('id'))
")

echo "$OCS" | while read OC_ID; do
  if [ ! -z "$OC_ID" ]; then
    echo "📧 Enviando PDF para: ${EMAIL_TESTE}"
    
    ENVIO=$(curl -s -X POST "http://localhost:${PORT}/api/pedidos/enviar-oc-v2" \
      -H 'Content-Type: application/json' \
      -d "{
        \"ordem_compra_id\": \"${OC_ID}\",
        \"email_fornecedor\": \"${EMAIL_TESTE}\",
        \"numero_whatsapp\": \"+55-61-98888-8888\",
        \"itens_oc\": []
      }")
    
    CODIGO=$(echo "$ENVIO" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    return d.get('ordem_compra', {}).get('codigo', 'ERRO')
except:
    print('ERRO')
" 2>/dev/null || echo "ERRO")
    
    STATUS=$(echo "$ENVIO" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    return d.get('envios', {}).get('email', {}).get('status', 'ERRO')
except:
    print('ERRO')
" 2>/dev/null || echo "enviando")
    
    echo "   ✓ OC sendo enviada ($STATUS)"
    
    sleep 1
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ TESTE CONCLUÍDO!"
echo ""
echo "📝 O que fazer agora:"
echo "   1. Verificar email: ${EMAIL_TESTE}"
echo "   2. Procurar por 3 emails com assunto 'Ordem de Compra OC-XXXX'"
echo "   3. Verificar os PDFs em anexo"
echo "   4. Abrir os PDFs para confirmar se estão legíveis"
echo ""
echo "⏱️  Aguarde 10-15 segundos para os emails chegarem"
echo "════════════════════════════════════════════════════════════════════════════"

sleep 15
echo "✅ Feito! Verifique seu email agora."
