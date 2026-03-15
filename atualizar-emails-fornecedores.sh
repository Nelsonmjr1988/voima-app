#!/bin/bash

echo "Atualizando emails dos fornecedores..."
echo ""

# Usar a API Supabase diretamente para atualizar fornecedores
SUPABASE_URL="https://bhgwizuonupjceckxjba.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3dpenVvbnVwamNlY2t4amJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3MTcyNCwiZXhwIjoyMDg4ODQ3NzI0fQ.yMkOzLQU64uHk7Dj5JSz7TjcpRJ0SBXNj_PZ81yyGeA"
EMAIL="nelson_medeiros123@hotmail.com"

# Buscar todos os fornecedores com seus nomes
echo "Buscando fornecedores..."
FORNECEDORES=$(curl -s "${SUPABASE_URL}/rest/v1/fornecedores?select=id,nome_fantasia" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}")

echo "$FORNECEDORES" | grep -i "votorantim\|são cristovão\|lafarge\|cristovao" > /tmp/fornecedores_check.json

# Atualizar os 3 fornecedores principais com o email
FORNECEDOR_IDS=(
  "07a35b76-4e63-4e78-869f-18c3f76765c7"
  "0da08bb9-fbdd-4c82-b08a-eb4de77f6471"
  "25773412-8d8c-4ce5-82b9-f2fa46030cd6"
)

for ID in "${FORNECEDOR_IDS[@]}"; do
  echo "Atualizando fornecedor: $ID"
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/fornecedores?id=eq.${ID}" \
    -H "apikey: ${API_KEY}" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\"}" > /dev/null
  echo "   ✓ Email atualizado para: $EMAIL"
done

echo ""
echo "✅ Fornecedores atualizados!"
