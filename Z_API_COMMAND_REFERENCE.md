#!/usr/bin/env bash

# ============================================================
# 📋 Z-API Command Reference - Guia Rápido de Comandos
# ============================================================
# Use este arquivo como referência rápida para comandos Z-API
#
# Copie e cole os comandos no seu terminal
# ============================================================

# ============================================================
# 🔧 SETUP INICIAL
# ============================================================

# Copiar .env.example para .env.local
cp .env.example .env.local

# Editar .env.local com suas credenciais
nano .env.local  # ou use seu editor favorito (code, vim, etc)

# Verificar se variáveis estão corretas
grep -E "Z_API_" .env.local

# ============================================================
# 🚀 INICIAR SERVIDOR
# ============================================================

# Iniciar servidor em desenvolvimento
npm run dev

# Verificar se servidor está rodando
curl http://localhost:3000/api/health

# ============================================================
# 🔐 FAZER LOGIN WHATSAPP
# ============================================================

# Obter QR Code para login
curl http://localhost:3000/api/whatsapp/instance-info

# Depois de scannear, verificar se conectado
curl http://localhost:3000/api/whatsapp/instance-info | grep -E "conectado|status"

# Desconectar WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/instance-info \
  -H "Content-Type: application/json" \
  -d '{"acao":"desconectar"}'

# ============================================================
# 📤 ENVIAR MENSAGENS
# ============================================================

# Enviar OC via WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/enviar-oc \
  -H "Content-Type: application/json" \
  -d '{
    "oc_id": "550e8400-e29b-41d4-a716-446655440000",
    "telefone": "5585987654321",
    "nome_cliente": "João Silva",
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
  }'

# Enviar Cotação via WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/enviar-cotacao \
  -H "Content-Type: application/json" \
  -d '{
    "cotacao_id": "660e8400-e29b-41d4-a716-446655440001",
    "telefone": "5585987654321",
    "nome_cliente": "João Silva",
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
  }'

# ============================================================
# ✓ VERIFICAR STATUS
# ============================================================

# Verificar status de uma mensagem
curl http://localhost:3000/api/whatsapp/status/msg_xyz123

# Verificar info da instância
curl http://localhost:3000/api/whatsapp/instance-info

# Testar webhook (simular entrada de mensagem)
curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "instance": "test",
    "data": {
      "phone": "5511987654321",
      "message": "Teste de webhook",
      "sender": "5511998765432",
      "senderName": "Cliente Teste",
      "id": "msg-test-123"
    }
  }'

# ============================================================
# 🗄️ CONSULTAS BANCO DE DADOS (Supabase)
# ============================================================

# Ver todas as mensagens recebidas
# SELECT * FROM whatsapp_mensagens WHERE tipo = 'entrada' ORDER BY timestamp DESC;

# Ver status da instância
# SELECT * FROM instance_status;

# Ver contatos com WhatsApp confirmado
# SELECT * FROM whatsapp_contatos WHERE numero_whatsapp_confirmado = TRUE;

# Ver mensagens não lidas
# SELECT * FROM view_whatsapp_nao_lidas;

# Ver mensagens de uma OC específica
# SELECT * FROM whatsapp_mensagens WHERE oc_id = 'seu-oc-id';

# ============================================================
# 🌐 CONFIGURAÇÃO WEBHOOK
# ============================================================

# Se usar ngrok para expor local (desenvolvimento):
ngrok http 3000

# Resultado será: https://abc-123-def-456.ngrok.io
# Use essa URL para configurar webhook em Z-API Dashboard

# Testar webhook público
curl -X POST https://abc-123-def-456.ngrok.io/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'

# ============================================================
# 🧪 TESTES
# ============================================================

# Executar script de testes automático
bash test-z-api.sh

# Executar testes com detalhes
bash -x test-z-api.sh

# ============================================================
# 📊 MONITORAMENTO
# ============================================================

# Ver logs em tempo real (com grep para Z-API)
npm run dev | grep -E "Z-API|webhook|WhatsApp"

# Contar mensagens por tipo
# SELECT tipo, COUNT(*) FROM whatsapp_mensagens GROUP BY tipo;

# Contar mensagens por data
# SELECT DATE(timestamp), COUNT(*) FROM whatsapp_mensagens GROUP BY DATE(timestamp);

# ============================================================
# 🔍 TROUBLESHOOTING
# ============================================================

# Verificar se Node.js está instalado
node -v
npm -v

# Verificar se servidor está rodando
netstat -tuln | grep 3000  # macOS/Linux
netstat -ano | grep 3000   # Windows

# Verificar se ngrok está rodando
curl http://127.0.0.1:4040/api/tunnels  # ngrok UI local

# Limpar cache e reinstalar dependências
rm -rf node_modules package-lock.json
npm install
npm run dev

# Testar variáveis de ambiente
echo $Z_API_INSTANCE_ID
echo $Z_API_TOKEN

# Verificar conexão com Supabase
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# ============================================================
# 📱 TESTE DE INTEGRAÇÃO COMPLETA
# ============================================================

# 1. Verificar conexão
curl http://localhost:3000/api/whatsapp/instance-info

# 2. Testar webhook
curl -X POST http://localhost:3000/api/webhooks/z-api \
  -H "Content-Type: application/json" \
  -d '{"event":"MESSAGES_UPSERT","data":{"message":"teste"}}'

# 3. Enviar mensagem
curl -X POST http://localhost:3000/api/whatsapp/enviar-oc \
  -H "Content-Type: application/json" \
  -d '{
    "oc_id": "550e8400-e29b-41d4-a716-446655440000",
    "telefone": "5585987654321",
    "nome_cliente": "Teste",
    "empresa_id": "85b50c5c-abf2-4bed-9854-a15fb0d60d2b"
  }' > /tmp/response.json && cat /tmp/response.json

# 4. Verificar status
MESSAGE_ID=$(cat /tmp/response.json | grep -o '"message_id":"[^"]*' | cut -d'"' -f4)
curl http://localhost:3000/api/whatsapp/status/$MESSAGE_ID

# ============================================================
# 💡 DICAS IMPORTANTES
# ============================================================

# Sempre reiniciar servidor após editar .env.local
# Ctrl+C para parar
# npm run dev para iniciar novamente

# Para copiar payload JSON em curl, use:
# jq . < arquivo.json
# para visualizar e validar JSON

# Para ver headers da resposta:
curl -i http://localhost:3000/api/whatsapp/instance-info

# Para ver apenas headers:
curl -I http://localhost:3000/api/whatsapp/instance-info

# Para salvar resposta em arquivo:
curl http://localhost:3000/api/whatsapp/instance-info > output.json

# Para converter JSON para variáveis (bash):
eval $(curl -s http://localhost:3000/api/whatsapp/instance-info | jq -r \
  'to_entries | .[] | "export \(.key)=\(.value)"')

# ============================================================
# 📚 DOCUMENTAÇÃO
# ============================================================

# Ler guia completo (menos)
less INSTALL_Z_API.md

# Ver primeiras linhas
head -50 Z_API_WEBHOOK_SETUP.md

# Ver quantidade de linhas
wc -l Z_API_INTEGRATION_README.md

# Pesquisar em documentação
grep -r "webhook" *.md

# ============================================================
# 🌐 REFERÊNCIAS ÚTEIS
# ============================================================

# Z-API Documentação
# https://docs.z-api.io/

# Z-API Dashboard
# https://dashboard.z-api.io/

# Z-API Status
# https://status.z-api.io/

# Supabase
# https://supabase.com/dashboard

# Anthropic Claude
# https://console.anthropic.com/

# ngrok
# https://ngrok.com/

# ============================================================
# 🎯 CHECKLIST DE DEPLOYMENT
# ============================================================

# [ ] Variáveis de ambiente configuradas
# [ ] Banco de dados migrado
# [ ] Servidor testado localmente
# [ ] Webhook testado
# [ ] Integração com OC funcionando
# [ ] Integração com Cotação funcionando
# [ ] Webhook configurado no Z-API Dashboard
# [ ] Teste end-to-end: envio + recebimento
# [ ] Logs analisados em produção
# [ ] Monitoramento de erros configurado
# [ ] Backup do banco configurado
# [ ] URL HTTPS pronta para produção

# ============================================================
# 📞 SUPORTE RÁPIDO
# ============================================================

# Erro: "Instance not connected"
# Solução: Scannear QR Code com WhatsApp

# Erro: "Variáveis não configuradas"
# Solução: Verificar .env.local e reiniciar servidor

# Erro: Webhook não recebe mensagens
# Solução: Testar URL pública e confirmar no dashboard Z-API

# Erro: 403 Unauthorized
# Solução: Verificar credenciais Z_API_INSTANCE_ID e Z_API_TOKEN

# ============================================================
# ✨ FIM DO GUIA
# ============================================================

echo "✅ Guia de referência carregado!"
echo "Copie e cole os comandos conforme necessário"
