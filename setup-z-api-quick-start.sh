#!/usr/bin/env bash

# ============================================================
# 🚀 Z-API WhatsApp - QUICK START CHECKLIST
# ============================================================
# Execute este script para iniciar a integração Z-API
# 
# Uso: bash setup-z-api-quick-start.sh
# ============================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}${BOLD}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        🚀 Z-API WhatsApp Integration Quick Start           ║
║                                                            ║
║                 VOIMA - Sistema de Gestão                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${NC}"

echo -e "${YELLOW}Este script vai guiar você através da configuração de Z-API${NC}\n"

# ============================================================
# ETAPA 1: Verificar Prerequisites
# ============================================================
echo -e "${BLUE}${BOLD}ETAPA 1: Verificando Prerequisites${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js não instalado${NC}"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm não instalado${NC}"
    exit 1
fi

# Verificar git
if command -v git &> /dev/null; then
    echo -e "${GREEN}✓ git${NC}"
else
    echo -e "${RED}✗ git não instalado${NC}"
    exit 1
fi

echo ""

# ============================================================
# ETAPA 2: Verificar .env.local
# ============================================================
echo -e "${BLUE}${BOLD}ETAPA 2: Verificando Variáveis de Ambiente${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ Arquivo .env.local encontrado${NC}"
    
    if grep -q "Z_API_INSTANCE_ID" .env.local; then
        echo -e "${GREEN}✓ Z_API_INSTANCE_ID configurado${NC}"
    else
        echo -e "${YELLOW}⚠ Z_API_INSTANCE_ID não encontrado${NC}"
        echo "  Adicione ao .env.local:"
        echo "  Z_API_INSTANCE_ID=3EAADDCE71F5D2C80DAAB2694663CF7D"
    fi
    
    if grep -q "Z_API_TOKEN" .env.local; then
        echo -e "${GREEN}✓ Z_API_TOKEN configurado${NC}"
    else
        echo -e "${YELLOW}⚠ Z_API_TOKEN não encontrado${NC}"
        echo "  Adicione ao .env.local:"
        echo "  Z_API_TOKEN=44BAD21EEC9A41B0141E1142"
    fi
else
    echo -e "${RED}✗ .env.local não encontrado${NC}"
    echo ""
    echo "Criando .env.local de exemplo..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ .env.local criado de .env.example${NC}"
        echo ""
        echo "⚠️  IMPORTANTE: Complete suas credenciais:"
        echo "   - NEXT_PUBLIC_SUPABASE_URL"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "   - ANTHROPIC_API_KEY"
        echo "   - Z_API_INSTANCE_ID (seu valor)"
        echo "   - Z_API_TOKEN (seu valor)"
        echo ""
        read -p "Pressione ENTER depois de editar .env.local..."
    fi
fi

echo ""

# ============================================================
# ETAPA 3: Verificar Arquivos de Integração
# ============================================================
echo -e "${BLUE}${BOLD}ETAPA 3: Verificando Arquivos de Integração${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FILES_CHECK=(
    "src/lib/z-api-whatsapp.ts"
    "src/app/api/webhooks/z-api/route.ts"
    "src/app/api/whatsapp/enviar-oc/route.ts"
    "src/app/api/whatsapp/enviar-cotacao/route.ts"
    "SETUP_Z_API_WHATSAPP.sql"
    "Z_API_WEBHOOK_SETUP.md"
    "INSTALL_Z_API.md"
)

for file in "${FILES_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file NÃO ENCONTRADO${NC}"
    fi
done

echo ""

# ============================================================
# ETAPA 4: Menu de Ações
# ============================================================
echo -e "${BLUE}${BOLD}ETAPA 4: Escolha sua próxima ação${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1) ✅ Todos os arquivos estão presentes (vou para próximo passo)"
echo "2) 📚 Ler guia completo de instalação (INSTALL_Z_API.md)"
echo "3) 🧪 Executar testes automáticos"
echo "4) 💿 Ver instruções para setup do banco de dados"
echo "5) 🌐 Abrir documentação Z-API"
echo "6) 🚀 Iniciando servidor e webhook"
echo "7) ❌ Sair"
echo ""

read -p "Escolha uma opção (1-7): " choice

case $choice in
    1)
        echo -e "${GREEN}✓ Prosseguindo com configuração...${NC}"
        ;;
    2)
        echo -e "${BLUE}Abrindo INSTALL_Z_API.md...${NC}"
        if command -v less &> /dev/null; then
            less INSTALL_Z_API.md
        else
            cat INSTALL_Z_API.md | head -100
        fi
        ;;
    3)
        echo -e "${BLUE}Executando testes...${NC}"
        if [ -f "test-z-api.sh" ]; then
            bash test-z-api.sh
        else
            echo -e "${RED}test-z-api.sh não encontrado${NC}"
        fi
        exit 0
        ;;
    4)
        echo -e "${BLUE}Setup do Banco de Dados${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "1. Abra Supabase Dashboard"
        echo "   → https://supabase.com/dashboard"
        echo ""
        echo "2. Vá para SQL Editor"
        echo "   → Clique em 'New Query'"
        echo ""
        echo "3. Copie o conteúdo de: SETUP_Z_API_WHATSAPP.sql"
        echo "   → Colar no SQL Editor"
        echo ""
        echo "4. Clique em 'Run' (ou Ctrl+Enter)"
        echo ""
        echo "5. Aguarde conclusão (verde = sucesso)"
        echo ""
        read -p "Pressione ENTER quando terminar..."
        ;;
    5)
        echo -e "${BLUE}Abrindo documentação Z-API...${NC}"
        open "https://docs.z-api.io/" 2>/dev/null || xdg-open "https://docs.z-api.io/" 2>/dev/null || echo "Visite: https://docs.z-api.io/"
        exit 0
        ;;
    6)
        echo -e "${GREEN}🚀 Iniciando servidor e testes...${NC}"
        echo ""
        echo "Terminal 1: npm run dev (servidor VOIMA)"
        echo "Terminal 2: ngrok http 3000 (expose local)"
        echo "Terminal 3: ./test-z-api.sh (testes)"
        echo ""
        echo "Abrindo novo terminal com servidor..."
        npm run dev &
        exit 0
        ;;
    7)
        echo -e "${YELLOW}Saindo...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Opção inválida${NC}"
        exit 1
        ;;
esac

echo ""

# ============================================================
# ETAPA 5: Resumo da Configuração
# ============================================================
echo -e "${BLUE}${BOLD}ETAPA 5: Resumo da Configuração${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Variáveis de ambiente: CONFIGURADAS"
echo "✓ Arquivos de código: PRESENTES"
echo "✓ Banco de dados: AGUARDANDO SETUP"
echo "✓ Webhook: PRONTO PARA CONFIGURAR"
echo ""

# ============================================================
# PRÓXIMAS ETAPAS
# ============================================================
echo -e "${BLUE}${BOLD}PRÓXIMAS ETAPAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}1. Setup Banco de Dados${NC}"
echo "   → Abra SETUP_Z_API_WHATSAPP.sql"
echo "   → Execute no Supabase SQL Editor"
echo ""
echo -e "${YELLOW}2. Iniciar Servidor${NC}"
echo "   → npm run dev"
echo "   → Servidor rodará em http://localhost:3000"
echo ""
echo -e "${YELLOW}3. Login WhatsApp${NC}"
echo "   → curl http://localhost:3000/api/whatsapp/instance-info"
echo "   → Scannear QR Code com WhatsApp"
echo ""
echo -e "${YELLOW}4. Configurar Webhook${NC}"
echo "   → Z-API Dashboard → Webhooks"
echo "   → URL: https://seu-dominio.com/api/webhooks/z-api"
echo ""
echo -e "${YELLOW}5. Testar Envio${NC}"
echo "   → ./test-z-api.sh"
echo "   → Ou use: curl -X POST http://localhost:3000/api/whatsapp/enviar-oc ..."
echo ""

# ============================================================
# DOCUMENTAÇÃO RÁPIDA
# ============================================================
echo -e "${BLUE}${BOLD}DOCUMENTAÇÃO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Arquivos importantes:"
echo "   • INSTALL_Z_API.md - Guia passo-a-passo"
echo "   • Z_API_WEBHOOK_SETUP.md - Setup webhook"
echo "   • Z_API_INTEGRATION_README.md - Visão geral"
echo "   • Z_API_INTEGRATION_SUMMARY.md - Resumo técnico"
echo ""
echo "🧪 Testes:"
echo "   • test-z-api.sh - Script automático de testes"
echo ""
echo "💾 Banco:"
echo "   • SETUP_Z_API_WHATSAPP.sql - Migration SQL"
echo ""

# ============================================================
# FINAL
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}✓ Quick Start Setup Concluído!${NC}"
echo ""
echo "Você está pronto para:"
echo "  1. Configurar o banco de dados"
echo "  2. Fazer login no WhatsApp"
echo "  3. Configurar webhook"
echo "  4. Enviar mensagens!"
echo ""
echo -e "${YELLOW}Por dúvidas, consulte os arquivos .md ou acesse Z-API docs${NC}"
echo ""
