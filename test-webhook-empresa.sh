#!/usr/bin/env bash

# ============================================================
# 🧪 TESTE: Fluxo Completo Webhook → Empresa → Banco
# ============================================================
# Este script testa se o mapeamento empresa-contato está funcionando

set -e

BASE_URL="http://localhost:3000"
EMPRESA_ID="85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
TELEFONE_TESTE="5585987654321"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🧪 TESTE: Webhook → Empresa → Identificação           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${NC}"

# ============================================================
# TESTE 1: Mapear contato na empresa
# ============================================================
echo -e "${BLUE}[TESTE 1] Mapear contato de teste${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/empresa/contatos-mapeados" \
  -H "Content-Type: application/json" \
  -d "{
    \"empresa_id\": \"$EMPRESA_ID\",
    \"telefone_contato\": \"$TELEFONE_TESTE\",
    \"nome_contato\": \"Teste Webhook\",
    \"tipo_contato\": \"cliente\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Contato mapeado com sucesso${NC}"
    echo "Response: $BODY"
    
    # Extrair ID do contato
    CONTATO_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
    echo "ID do contato: $CONTATO_ID"
else
    echo -e "${RED}❌ Falha ao mapear contato (Status: $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
    exit 1
fi

echo ""

# ============================================================
# TESTE 2: Listar contatos mapeados
# ============================================================
echo -e "${BLUE}[TESTE 2] Listar contatos mapeados${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s "$BASE_URL/api/empresa/contatos-mapeados?empresa_id=$EMPRESA_ID")

if echo "$RESPONSE" | grep -q "\"sucesso\":true"; then
    echo -e "${GREEN}✅ Contatos listados${NC}"
    echo "$RESPONSE" | head -c 200
    echo ""
else
    echo -e "${RED}❌ Falha ao listar${NC}"
fi

echo ""

# ============================================================
# TESTE 3: Simular webhook (mensagem chegando)
# ============================================================
echo -e "${BLUE}[TESTE 3] Simular webhook - Mensagem recebida${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEBHOOK_PAYLOAD="{
  \"event\": \"MESSAGES_UPSERT\",
  \"instance\": \"teste\",
  \"data\": {
    \"phone\": \"$TELEFONE_TESTE\",
    \"message\": \"Teste do webhook - Olá! Preciso de orçamento\",
    \"sender\": \"$TELEFONE_TESTE\",
    \"senderName\": \"Teste Webhook\",
    \"id\": \"msg-teste-$(date +%s)\",
    \"timestamp\": $(date +%s)
  }
}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/z-api" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Webhook recebeu e processou${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Webhook falhou (Status: $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi

echo ""

# ============================================================
# TESTE 4: Verificar se mensagem foi salva com empresa_id
# ============================================================
echo -e "${BLUE}[TESTE 4] Verificar se mensagem foi salva no banco${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Aguarde 2 segundos para o banco processar..."
sleep 2

# Consulta SQL
QUERY="
SELECT 
  id,
  telefone,
  nome_contato,
  mensagem,
  empresa_id,
  tipo,
  timestamp
FROM whatsapp_mensagens 
WHERE telefone = '$TELEFONE_TESTE'
ORDER BY timestamp DESC 
LIMIT 3
"

echo "SQL Query:"
echo "$QUERY"
echo ""
echo -e "${YELLOW}Para ver o resultado, execute no Supabase SQL Editor:${NC}"
echo "$QUERY"
echo ""
echo -e "${GREEN}✅ Se empresa_id NÃO FOR NULL → Mapeamento funcionou!${NC}"

echo ""

# ============================================================
# TESTE 5: Informações de Debugagem
# ============================================================
echo -e "${BLUE}[TESTE 5] Debug Info${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 Informações do Teste:"
echo "  Empresa ID: $EMPRESA_ID"
echo "  Telefone: $TELEFONE_TESTE"
echo "  Contato ID: $CONTATO_ID (se mapeado)"
echo ""

echo -e "${BLUE}Comandos úteis para verificar:${NC}"
echo ""
echo "1️⃣ Ver todos os contatos mapeados:"
echo "   curl '$BASE_URL/api/empresa/contatos-mapeados?empresa_id=$EMPRESA_ID'"
echo ""
echo "2️⃣ Ver mensagens recentes:"
echo "   SELECT * FROM whatsapp_mensagens ORDER BY timestamp DESC LIMIT 10;"
echo ""
echo "3️⃣ Ver mensagens com empresa mapeada:"
echo "   SELECT * FROM whatsapp_mensagens WHERE empresa_id IS NOT NULL;"
echo ""
echo "4️⃣ Ver contatos por empresa (view):"
echo "   SELECT * FROM view_contatos_por_empresa WHERE empresa_id = '$EMPRESA_ID';"
echo ""
echo "5️⃣ Testar função de identificação:"
echo "   SELECT * FROM obter_empresa_por_telefone('$TELEFONE_TESTE');"
echo ""

# ============================================================
# RESUMO
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TESTES CONCLUÍDOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Se tudo funcionou:"
echo "  ✅ Contato foi mapeado"
echo "  ✅ Webhook recebeu e processou"
echo "  ✅ Mensagem foi salva com empresa_id"
echo ""
echo "Próximo passo:"
echo "  → Criar endpoint para resposta automática do agente"
echo "  → Testar envio de resposta via Z-API"
echo ""
