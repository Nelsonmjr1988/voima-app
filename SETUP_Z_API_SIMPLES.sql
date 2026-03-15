-- =====================================================
-- ✅ Z-API WhatsApp - Solução Simplificada
-- =====================================================
-- Adiciona APENAS o necessário à tabela empresas
-- Nenhuma tabela extra, nenhuma complicação!

-- =====================================================
-- 1. Adicionar campo de número WhatsApp à empresa
-- =====================================================
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS numero_whatsapp_zapi VARCHAR(20);

-- Criar índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_empresas_numero_whatsapp 
ON public.empresas(numero_whatsapp_zapi);

-- =====================================================
-- 2. Tabela simples: Histórico de mensagens WhatsApp
-- =====================================================
-- SÓ para guardar histórico de conversation
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    telefone_cliente VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_empresa 
ON public.whatsapp_mensagens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_telefone 
ON public.whatsapp_mensagens(telefone_cliente);
CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp 
ON public.whatsapp_mensagens(timestamp DESC);

-- =====================================================
-- 3. Tabela: Status da instância Z-API
-- =====================================================
-- Rastreador simples do status de conexão
CREATE TABLE IF NOT EXISTS public.zapi_instance_status (
    id BIGSERIAL PRIMARY KEY,
    instance_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'disconnected',
    numero_whatsapp VARCHAR(20),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Exemplo: Atualizar empresa com número
-- =====================================================
/*
UPDATE public.empresas 
SET numero_whatsapp_zapi = '+55 11 99999-9999'
WHERE id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';

-- Verificar
SELECT id, razao_social, numero_whatsapp_zapi 
FROM public.empresas;
*/

-- =====================================================
-- ✅ PRONTO!
-- =====================================================
-- Agora o webhook pode fazer:
-- 1. Recebe mensagem no número +55 11 99999-9999
-- 2. Busca: SELECT id FROM empresas WHERE numero_whatsapp_zapi = '+55 11 99999-9999'
-- 3. Tem empresa_id
-- 4. Passa pro agent
-- 5. Fim!
