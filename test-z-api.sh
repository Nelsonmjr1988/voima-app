#!/bin/bash
# =================================================
# Script de Teste Z-API WhatsApp
# =================================================
# Executa testes dos endpoints Z-API

BASE_URL="http://localhost:3000"

echo "🚀 Iniciando testes Z-API WhatsApp..."
echo "================================"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir resultado
print_result() {
    local test_name=$1
    local response=$2
    local status=$3
    
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        echo "Response: $response"
    else
        echo -e "${RED}❌ $test_name (Status: $status)${NC}"
        echo "Response: $response"
    fi
    echo "---"
}

# =================================================
# TESTE 1: Obter informações da instância
# =================================================
echo -e "${BLUE}[TESTE 1] Verificar conexão da instância${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/whatsapp/instance-info")
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_result "Instância Info" "$BODY" "$HTTP_STATUS"

# Extrair se está conectado
if echo "$BODY" | grep -q "connected"; then
    echo -e "${GREEN}✓ WhatsApp está conectado!${NC}"
else
    echo -e "${YELLOW}⚠️ WhatsApp não está conectado. Pode precisar fazer login.${NC}"
fi
echo ""

# =================================================
# TESTE 2: Webhook de teste
# =================================================
echo -e "${BLUE}[TESTE 2] Testar webhook receiver${NC}"
WEBHOOK_PAYLOAD='{
  "event": "MESSAGES_UPSERT",
  "instance": "test",
  "data": {
    "phone": "5511987654321",
    "message": "Teste de webhook",
    "sender": "5511998765432",
    "senderName": "Cliente Teste",
    "id": "msg-test-123",
    "timestamp": 1699000000
  }
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/z-api" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_result "Webhook Receiver" "$BODY" "$HTTP_STATUS"
echo ""

# =================================================
# TESTE 3: Enviar mensagem de texto
# =================================================
echo -e "${BLUE}[TESTE 3] Enviar OC via WhatsApp${NC}"

OC_PAYLOAD='{
  "oc_id": "550e8400-e29b-41d4-a716-446655440000",
  "telefone": "5511987654321",
  "nome_cliente": "Cliente Teste",
  "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/whatsapp/enviar-oc" \
  -H "Content-Type: application/json" \
  -d "$OC_PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_result "Enviar OC" "$BODY" "$HTTP_STATUS"

# Extrair message_id se sucesso
if [ "$HTTP_STATUS" = "200" ]; then
    MESSAGE_ID=$(echo "$BODY" | grep -o '"message_id":"[^"]*' | cut -d'"' -f4)
    echo "Message ID capturado: $MESSAGE_ID"
    echo ""
    
    # =================================================
    # TESTE 4: Verificar status da mensagem
    # =================================================
    if [ ! -z "$MESSAGE_ID" ]; then
        echo -e "${BLUE}[TESTE 4] Verificar status da mensagem${NC}"
        RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/whatsapp/status/$MESSAGE_ID")
        HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
        BODY=$(echo "$RESPONSE" | sed '$d')
        
        print_result "Status da Mensagem" "$BODY" "$HTTP_STATUS"
    fi
else
    echo -e "${YELLOW}⚠️ Envio de OC falhou. Verifique a instância ${NC}"
fi
echo ""

# =================================================
# TESTE 5: Enviar Cotação
# =================================================
echo -e "${BLUE}[TESTE 5] Enviar Cotação via WhatsApp${NC}"

COTACAO_PAYLOAD='{
  "cotacao_id": "660e8400-e29b-41d4-a716-446655440001",
  "telefone": "5511987654321",
  "nome_cliente": "Cliente Teste",
  "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/whatsapp/enviar-cotacao" \
  -H "Content-Type: application/json" \
  -d "$COTACAO_PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

print_result "Enviar Cotação" "$BODY" "$HTTP_STATUS"
echo ""

# =================================================
# RESUMO
# =================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 RESUMO DOS TESTES${NC}"
echo -e "${BLUE}========================================${NC}"

echo "✓ Testes concluídos!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure o webhook no dashboard Z-API"
echo "2. Use a URL: https://seu-dominio.com/api/webhooks/z-api"
echo "3. Aguarde mensagens via webhook"
echo ""
echo "🔗 Documentação: Veja Z_API_WEBHOOK_SETUP.md"
echo ""

# =================================================
# TESTES MANUAIS (descomente conforme necessário)
# =================================================

# Se quiser testar com um número real, descomente:
# curl -X POST http://localhost:3000/api/whatsapp/enviar-oc \
#   -H "Content-Type: application/json" \
#   -d '{
#     "oc_id": "SEU-OC-ID",
#     "telefone": "seu-numero-aqui",
#     "nome_cliente": "Seu Nome",
#     "empresa_id": "sua-empresa-id"
#   }'
