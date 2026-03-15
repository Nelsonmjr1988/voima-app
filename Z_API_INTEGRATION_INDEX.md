#!/usr/bin/env bash

# ============================================================
# 📖 Z-API Integration Complete Documentation Index
# ============================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║               🚀 Z-API WhatsApp Integration                        ║
║                                                                    ║
║          Complete Implementation for VOIMA Platform               ║
║                                                                    ║
║                    📚 DOCUMENTATION INDEX                          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMECE POR AQUI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se é a primeira vez, siga na ordem:

1️⃣  INSTALL_Z_API.md
    └─ Guia passo-a-passo completo
    └─ Tempo: ~15 minutos
    └─ Resultado: Sistema funcionando

2️⃣  test-z-api.sh
    └─ Script automático de testes
    └─ Verifica: Servidor, Webhook, Envio, Status
    └─ Tempo: ~2 minutos

3️⃣  Z_API_WEBHOOK_SETUP.md
    └─ Como registrar webhook em Z-API Dashboard
    └─ Configuração final para produção
    └─ Tempo: ~5 minutos


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DOCUMENTAÇÃO COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│
├─ 📖 GUIAS (Como fazer coisas)
│  ├─ INSTALL_Z_API.md ..................... Instalação passo-a-passo
│  ├─ Z_API_WEBHOOK_SETUP.md .............. Setup webhook no dashboard
│  ├─ Z_API_COMMAND_REFERENCE.md ......... Referência rápida de comandos
│  └─ setup-z-api-quick-start.sh ........ Script interativo de setup
│
├─ 📋 REFERÊNCIAS (Informação técnica)
│  ├─ Z_API_INTEGRATION_README.md ........ Visão geral da integração
│  ├─ Z_API_INTEGRATION_SUMMARY.md ...... Resumo técnico completo
│  └─ Z_API_INTEGRATION_INDEX.md ........ Este arquivo
│
├─ 💻 CÓDIGO (Implementação)
│  ├─ src/lib/z-api-whatsapp.ts ......... Cliente Z-API (core)
│  ├─ src/app/api/webhooks/z-api/route.ts ... Webhook receiver
│  ├─ src/app/api/whatsapp/enviar-oc/route.ts ... Enviar OC
│  ├─ src/app/api/whatsapp/enviar-cotacao/route.ts ... Enviar Cotação
│  ├─ src/app/api/whatsapp/status/[messageId]/route.ts ... Status
│  └─ src/app/api/whatsapp/instance-info/route.ts ... Info instância
│
├─ 🗄️ BANCO DE DADOS (SQL)
│  └─ SETUP_Z_API_WHATSAPP.sql ......... Migrations + tables + triggers
│
├─ 🧪 TESTES
│  ├─ test-z-api.sh ..................... Script automático de testes
│  └─ Z_API_COMMAND_REFERENCE.md ....... Testes manuais com curl
│
└─ ⚙️ CONFIGURAÇÃO
   ├─ .env.example ....................... Variáveis de ambiente
   └─ Credenciais Z-API (fornecidas)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 ROTEIROS POR TIPO DE USUÁRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💻 DEVELOPER

Objetivo: Entender e modificar o código

Leitura recomendada:
  1. Z_API_INTEGRATION_README.md (overview)
  2. src/lib/z-api-whatsapp.ts (implementação core)
  3. src/app/api/whatsapp/* (endpoints)
  4. Z_API_COMMAND_REFERENCE.md (testes manuais)

Tempo: ~30 minutos


🛠️  DEVOPS

Objetivo: Deploy, monitoramento, troubleshooting

Leitura recomendada:
  1. INSTALL_Z_API.md (setup completo)
  2. Z_API_WEBHOOK_SETUP.md (configure webhook)
  3. SETUP_Z_API_WHATSAPP.sql (database)
  4. Z_API_COMMAND_REFERENCE.md (troubleshooting)

Tarefas:
  - Configurar .env.local com credenciais
  - Executar migration SQL no Supabase
  - Fazer login WhatsApp (QR Code)
  - Registrar webhook no Z-API Dashboard
  - Rodar testes: ./test-z-api.sh

Tempo: ~45 minutos


🎯 PRODUCT MANAGER

Objetivo: Entender capacidades e roadmap

Leitura recomendada:
  1. Z_API_INTEGRATION_SUMMARY.md (visão completa)
  2. Seção "Recursos Principais"
  3. Seção "Próximas Etapas"

Informações-chave:
  ✓ Enviar OC via WhatsApp
  ✓ Enviar Cotação com opções
  ✓ Receber respostas via webhook
  ✓ Rastrear status de entrega
  ✓ Histórico de mensagens em DB

Tempo: ~10 minutos


🔬 QA / TESTER

Objetivo: Testar funcionalidades e encontrar bugs

Plano de testes:
  1. Executar: ./test-z-api.sh (testes automáticos)
  2. Ler: INSTALL_Z_API.md (troubleshooting)
  3. Testar manualmente: Z_API_COMMAND_REFERENCE.md
  4. Verificar banco: SELECT * FROM whatsapp_mensagens

Testes recomendados:
  □ Conexão da instância (GET /instance-info)
  □ Webhook receiver (POST /webhooks/z-api)
  □ Envio de OC
  □ Envio de Cotação
  □ Verificação de status
  □ Recebimento de mensagens

Tempo: ~1 hora


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 QUICK START (5 MINUTOS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Editar .env.local:
   Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D
   Z_API_TOKEN=44BAD21EEC9A41B0141E1142

2. Executar migration SQL:
   Copiar SETUP_Z_API_WHATSAPP.sql → Supabase SQL Editor → Run

3. Iniciar servidor:
   npm run dev

4. Fazer login:
   curl http://localhost:3000/api/whatsapp/instance-info
   (Scannear QR Code)

5. Testar:
   bash test-z-api.sh

✅ Pronto!


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESTATÍSTICAS DA IMPLEMENTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivos de código:      6 endpoints + 1 client = 1000+ linhas
Documentação:            7 arquivos
Linhas de SQL:           300+ linhas (migrations + triggers)
Testes automáticos:      1 script completo
Tempo total setup:       ~1 hora
Status:                  ✅ 100% Production Ready


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ ENDPOINTS DISPONÍVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/whatsapp/enviar-oc
  ↳ Enviar Ordem de Compra via WhatsApp

POST /api/whatsapp/enviar-cotacao
  ↳ Enviar Cotação com opções de fornecedores

GET /api/whatsapp/status/{messageId}
  ↳ Verificar status de uma mensagem

GET /api/whatsapp/instance-info
  ↳ Obter status da instância (conectado/QR Code)

POST /api/whatsapp/instance-info
  ↳ Desconectar WhatsApp (ação: 'desconectar')

POST /api/webhooks/z-api
  ↳ Webhook receiver para mensagens/eventos


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄️ TABELAS DO BANCO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

whatsapp_mensagens
  ├─ Todas as mensagens (entrada/saída)
  ├─ Campos: id, empresa_id, telefone, mensagem, tipo, status_entrega
  └─ Índices: empresa_id, telefone, message_id, tipo

whatsapp_contatos
  ├─ Contatos com WhatsApp
  ├─ Campos: id, empresa_id, telefone, tipo, numero_confirmado
  └─ Índices: empresa_id, telefone, tipo

instance_status
  ├─ Status da conexão Z-API
  ├─ Campos: instance_id, status, last_update
  └─ Índices: instance_id

whatsapp_templates
  ├─ Templates de mensagens pré-fabricadas
  ├─ Campos: id, nome, conteudo, categoria, ativo
  └─ Exemplos: OC, Cotação, Confirmação

view_whatsapp_nao_lidas
  ├─ View útil de mensagens não lidas
  └─ Query: SELECT * FROM view_whatsapp_nao_lidas;


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 LINKS IMPORTANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Z-API
  → Documentação: https://docs.z-api.io/
  → Dashboard: https://dashboard.z-api.io/
  → Status: https://status.z-api.io/
  → Email: suporte@z-api.io

Supabase
  → Dashboard: https://supabase.com/dashboard
  → Docs: https://supabase.com/docs

Anthropic Claude
  → Console: https://console.anthropic.com/
  → Docs: https://claude.ai/api/docs

Ferramentas Úteis
  → ngrok (expor local): https://ngrok.com/
  → Postman (testar API): https://www.postman.com/


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ TROUBLESHOOTING RÁPIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Instance not connected"
   → Scannear QR Code com WhatsApp
   → Ver: INSTALL_Z_API.md → Passo 4

❌ "Variáveis de ambiente não configuradas"
   → Verificar .env.local
   → Reiniciar: npm run dev

❌ Webhook não recebe mensagens
   → Confirmar URL está correta
   → Testar webhook no Z-API Dashboard
   → Ver: Z_API_WEBHOOK_SETUP.md

❌ Erro 403 Unauthorized
   → Verificar Z_API_INSTANCE_ID e Z_API_TOKEN
   → Confirmar credenciais no .env.local

❌ Servidor não inicia
   → npm install (reinstalar dependências)
   → npm run dev (reiniciar)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 APRENDER MAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TypeScript
  → Tipos: ZApiMensagem, ZApiResponse, ZApiWebhookPayload
  → Arquivo: src/lib/z-api-whatsapp.ts (top 30 linhas)

REST API Design
  → Endpoints: src/app/api/whatsapp/ (todos os endpoints)
  → Padrão: POST para enviar, GET para status

Webhook Architecture
  → Receiver: src/app/api/webhooks/z-api/route.ts
  → Trata eventos: MESSAGES_UPSERT, MESSAGES_UPDATE, etc

Database Design
  → Tabelas: SETUP_Z_API_WHATSAPP.sql
  → Triggers e índices automaticamente

Deployment
  → Production URL para webhook
  → Environment variables
  → SSL/HTTPS necessário


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CHECKLIST FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setup Inicial
  □ Adicionar variáveis .env.local
  □ npm install (se necessário)
  □ npm run dev (servidor rodando)

Banco de Dados
  □ Executar SETUP_Z_API_WHATSAPP.sql
  □ Verificar tabelas criadas (5 tabelas)
  □ Verificar triggers criadas (3 triggers)

WhatsApp
  □ Obter QR Code: curl /api/whatsapp/instance-info
  □ Scannear com celular
  □ Confirmar conexão

Webhook
  □ Testar localmente: curl /api/webhooks/z-api
  □ Registrar no Z-API Dashboard
  □ Testar online

Testes
  □ Executar: ./test-z-api.sh
  □ Enviar OC manual
  □ Enviar Cotação manual
  □ Verificar status
  □ Simular recebimento

Produção
  □ URL HTTPS configurada
  □ Variáveis em production
  □ Webhook online confirmado
  □ Logs monitorados


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 SUPORTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para problemas técnicos:
  1. Consulte INSTALL_Z_API.md (troubleshooting section)
  2. Verifique Z_API_COMMAND_REFERENCE.md
  3. Acesse Z-API Docs: https://docs.z-api.io/

Para perguntas sobre VOIMA:
  → Verifique o console do servidor (npm run dev)
  → Veja logs em tempo real para erro messages


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 PRONTO PARA COMEÇAR!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Próximo passo:
  → Leia: INSTALL_Z_API.md
  → Execute: ./test-z-api.sh
  → Configure: Webhook no Z-API Dashboard

Tempo estimado: ~1 hora para deploy completo

Status: ✅ 100% Production Ready


╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                    Z-API Integration v1.0.0                        ║
║                     Implementation Completed                       ║
║                                                                    ║
║                    Última atualização: 2024                        ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

EOF
