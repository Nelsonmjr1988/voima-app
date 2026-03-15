-- =====================================================
-- Setup Z-API WhatsApp Tables
-- =====================================================
-- Execute no Supabase SQL Editor
-- Cria tabelas para armazenar mensagens e status WhatsApp

-- Tabela: whatsapp_mensagens
-- Armazena todas as mensagens (entrada e saída)
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    oc_id UUID REFERENCES ordens(id) ON DELETE SET NULL,
    cotacao_id UUID,
    telefone VARCHAR(20) NOT NULL,
    nome_contato VARCHAR(255),
    mensagem TEXT,
    tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
    message_id VARCHAR(255) UNIQUE,
    status_entrega VARCHAR(50) DEFAULT 'pendente',
    -- status_entrega: 'pendente', 'enviada', 'lida', 'entregue', 'erro'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_empresa 
    ON whatsapp_mensagens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_telefone 
    ON whatsapp_mensagens(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_message_id 
    ON whatsapp_mensagens(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_oc 
    ON whatsapp_mensagens(oc_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_cotacao 
    ON whatsapp_mensagens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_tipo 
    ON whatsapp_mensagens(tipo);

-- Tabela: whatsapp_contatos
-- Armazena contatos de clientes/fornecedores com WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_contatos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('cliente', 'fornecedor', 'interno')),
    numero_whatsapp_confirmado BOOLEAN DEFAULT FALSE,
    ultima_mensagem_em TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_empresa 
    ON whatsapp_contatos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_telefone 
    ON whatsapp_contatos(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_tipo 
    ON whatsapp_contatos(tipo);

-- Tabela: instance_status
-- Rastreia status da conexão Z-API
CREATE TABLE IF NOT EXISTS instance_status (
    id BIGSERIAL PRIMARY KEY,
    instance_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected',
    -- status: 'connected', 'disconnected', 'error'
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instance_status_instance 
    ON instance_status(instance_id);

-- Tabela: whatsapp_templates (Opcional - para mensagens pré-fabricadas)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    conteudo TEXT NOT NULL,
    categoria VARCHAR(50),
    -- categoria: 'oc', 'cotacao', 'confirmacao', 'notificacao'
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: atualizar updated_at em whatsapp_mensagens
CREATE OR REPLACE FUNCTION atualizar_updated_at_whatsapp_mensagens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_whatsapp_mensagens
    BEFORE UPDATE ON whatsapp_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at_whatsapp_mensagens();

-- Trigger: atualizar updated_at em whatsapp_contatos
CREATE OR REPLACE FUNCTION atualizar_updated_at_whatsapp_contatos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_whatsapp_contatos
    BEFORE UPDATE ON whatsapp_contatos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at_whatsapp_contatos();

-- Trigger: atualizar last_update em instance_status
CREATE OR REPLACE FUNCTION atualizar_last_update_instance_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_last_update_instance_status
    BEFORE UPDATE ON instance_status
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_last_update_instance_status();

-- Inserir templates de exemplo
INSERT INTO whatsapp_templates (nome, descricao, conteudo, categoria, ativo)
VALUES
    (
        'OC Enviada',
        'Mensagem quando OC é enviada',
        '📋 *Ordem de Compra #{{numero_oc}}*\n\n*Cliente:* {{cliente}}\n*Total:* R$ {{total}}\n\nVoima Engenharia',
        'oc',
        TRUE
    ),
    (
        'Cotação Enviada',
        'Mensagem quando cotação é enviada',
        '💰 *Cotação #{{numero_cotacao}}*\n\n*Item:* {{item}}\n\nOpções disponíveis!\n\nVoima Engenharia',
        'cotacao',
        TRUE
    ),
    (
        'Confirmação de Recebimento',
        'Confirmar que cliente recebeu mensagem',
        'Obrigado! Recebemos sua resposta. ✓\n\nVoima Engenharia',
        'confirmacao',
        TRUE
    )
ON CONFLICT DO NOTHING;

-- VIEW: Mensagens não lidas
CREATE OR REPLACE VIEW view_whatsapp_nao_lidas AS
SELECT 
    id,
    empresa_id,
    telefone,
    nome_contato,
    mensagem,
    tipo,
    timestamp,
    message_id
FROM whatsapp_mensagens
WHERE tipo = 'entrada'
  AND status_entrega != 'lida'
ORDER BY timestamp DESC;

-- RLS Policies (Row Level Security)
-- Permitir que cada empresa veja apenas suas mensagens

ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_mensagens_rls
    ON whatsapp_mensagens
    FOR SELECT
    USING (empresa_id IN (
        SELECT id FROM empresas WHERE id = current_setting('app.current_empresa_id')::uuid
    ));

-- =====================================================
-- Testes / Verificação
-- =====================================================
-- Descomente para testar:

/*
-- Inserir contato de teste
INSERT INTO whatsapp_contatos (empresa_id, nome, telefone, tipo, numero_whatsapp_confirmado)
SELECT 
    '85b50c5c-abf2-4bed-9854-a15fb0d60d2b'::uuid,
    'Cliente Teste',
    '5511987654321',
    'cliente',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_contatos WHERE telefone = '5511987654321'
);

-- Ver contatos criados
SELECT * FROM whatsapp_contatos ORDER BY created_at DESC LIMIT 5;

-- Ver status da instância
SELECT * FROM instance_status;

-- Ver mensagens recentes
SELECT id, telefone, nome_contato, tipo, status_entrega, timestamp 
FROM whatsapp_mensagens 
ORDER BY timestamp DESC 
LIMIT 10;
*/

-- =====================================================
-- Permissões (Supabase RLS)
-- =====================================================
-- Se suas tabelas tiverem RLS habilitado, ajuste as policies conforme necessário

GRANT INSERT, UPDATE, SELECT ON whatsapp_mensagens TO authenticated;
GRANT SELECT ON view_whatsapp_nao_lidas TO authenticated;
GRANT INSERT, UPDATE, SELECT ON whatsapp_contatos TO authenticated;
