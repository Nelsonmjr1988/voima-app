-- =====================================================
-- 📱 Z-API EMPRESA MAPPING - Identificar Empresa por Telefone
-- =====================================================
-- Execute DEPOIS de SETUP_Z_API_WHATSAPP.sql
-- Cria mapeamento empresa ↔ contatos para webhook

-- =====================================================
-- 1. Adicionar número Z-API na tabela empresas
-- =====================================================

-- Adicionar coluna se não existir
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS numero_whatsapp_zapi VARCHAR(20),
ADD COLUMN IF NOT EXISTS zapi_numero_formatado VARCHAR(20);

-- =====================================================
-- 2. Tabela: empresa_contatos_mapeamento
-- =====================================================
-- Mapeia: Telefone do Contato → Empresa
-- Quando webhook recebe mensagem de um telefone, 
-- procura aqui para identificar a empresa

CREATE TABLE IF NOT EXISTS empresa_contatos_mapeamento (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    telefone_contato VARCHAR(20) UNIQUE NOT NULL,
    nome_contato VARCHAR(255),
    tipo_contato VARCHAR(50) CHECK (tipo_contato IN ('cliente', 'fornecedor', 'interno')),
    ativo BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mapeamento_telefone 
    ON empresa_contatos_mapeamento(telefone_contato);
CREATE INDEX IF NOT EXISTS idx_mapeamento_empresa 
    ON empresa_contatos_mapeamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mapeamento_ativo 
    ON empresa_contatos_mapeamento(ativo);

-- =====================================================
-- 3. Função: Identificar Empresa por Telefone
-- =====================================================

CREATE OR REPLACE FUNCTION obter_empresa_por_telefone(p_telefone VARCHAR(20))
RETURNS TABLE (
    empresa_id UUID,
    nome_empresa VARCHAR,
    tipo_contato VARCHAR,
    encontrado BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ecm.empresa_id,
        e.nome,
        ecm.tipo_contato,
        TRUE AS encontrado
    FROM empresa_contatos_mapeamento ecm
    JOIN empresas e ON e.id = ecm.empresa_id
    WHERE normalizar_telefone(ecm.telefone_contato) = normalizar_telefone(p_telefone)
      AND ecm.ativo = TRUE
    LIMIT 1;
    
    -- Se não encontrar, retorna vazio
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 4. Função: Normalizar Telefone
-- =====================================================
-- Remove tudo exceto números

CREATE OR REPLACE FUNCTION normalizar_telefone(p_telefone VARCHAR(20))
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN regexp_replace(p_telefone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. View: Contatos Mapeados por Empresa
-- =====================================================

CREATE OR REPLACE VIEW view_contatos_por_empresa AS
SELECT 
    ecm.id,
    ecm.empresa_id,
    e.nome AS nome_empresa,
    ecm.telefone_contato,
    ecm.nome_contato,
    ecm.tipo_contato,
    ecm.ativo,
    COUNT(wm.id) AS mensagens_recebidas,
    MAX(wm.timestamp) AS ultima_mensagem
FROM empresa_contatos_mapeamento ecm
JOIN empresas e ON e.id = ecm.empresa_id
LEFT JOIN whatsapp_mensagens wm ON wm.telefone = ecm.telefone_contato 
    AND wm.tipo = 'entrada'
GROUP BY ecm.id, ecm.empresa_id, e.nome, ecm.telefone_contato, 
    ecm.nome_contato, ecm.tipo_contato, ecm.ativo
ORDER BY ultima_mensagem DESC NULLS LAST;

-- =====================================================
-- 6. Atualizar whatsapp_mensagens - Adicionar empresa_id automaticamente
-- =====================================================

-- Trigger para preencher empresa_id baseado no telefone
CREATE OR REPLACE FUNCTION preencher_empresa_id_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
    -- Se empresa_id está NULL, tenta identificar
    IF NEW.empresa_id IS NULL THEN
        SELECT ecm.empresa_id INTO NEW.empresa_id
        FROM empresa_contatos_mapeamento ecm
        WHERE normalizar_telefone(ecm.telefone_contato) = normalizar_telefone(NEW.telefone)
          AND ecm.ativo = TRUE
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trigger_preencher_empresa_id ON whatsapp_mensagens;
CREATE TRIGGER trigger_preencher_empresa_id
    BEFORE INSERT ON whatsapp_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION preencher_empresa_id_whatsapp();

-- =====================================================
-- 7. Política RLS para whatsapp_mensagens
-- =====================================================

ALTER TABLE empresa_contatos_mapeamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mapeamento_rls ON empresa_contatos_mapeamento;
CREATE POLICY mapeamento_rls
    ON empresa_contatos_mapeamento
    FOR SELECT
    USING (empresa_id IN (
        SELECT id FROM empresas 
        WHERE id = (current_setting('app.current_empresa_id', true)::uuid)
    ));

-- =====================================================
-- 8. EXEMPLO DE UTILIZAÇÃO
-- =====================================================

/*
-- Inserir contatos de uma empresa
INSERT INTO empresa_contatos_mapeamento (empresa_id, telefone_contato, nome_contato, tipo_contato)
VALUES 
    ('85b50c5c-abf2-4bed-9854-a15fb0d60d2b'::uuid, '5511987654321', 'João Silva', 'cliente'),
    ('85b50c5c-abf2-4bed-9854-a15fb0d60d2b'::uuid, '5511987654322', 'Maria Santos', 'fornecedor');

-- Identificar empresa por telefone
SELECT * FROM obter_empresa_por_telefone('5511987654321');

-- Ver contatos de uma empresa
SELECT * FROM view_contatos_por_empresa 
WHERE nome_empresa = 'Sua Empresa';

-- Atualizar número Z-API da empresa
UPDATE empresas 
SET numero_whatsapp_zapi = '+55 11 99999-9999'
WHERE id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b'::uuid;

-- Ver todas as mensagens com empresa identificada
SELECT empresa_id, telefone, mensagem, tipo, timestamp
FROM whatsapp_mensagens 
WHERE empresa_id IS NOT NULL
ORDER BY timestamp DESC;
*/

-- =====================================================
-- 9. Permissões
-- =====================================================

GRANT INSERT, UPDATE, SELECT ON empresa_contatos_mapeamento TO authenticated;
GRANT EXECUTE ON FUNCTION obter_empresa_por_telefone(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION normalizar_telefone(VARCHAR) TO authenticated;
GRANT SELECT ON view_contatos_por_empresa TO authenticated;

-- =====================================================
-- ✅ SETUP CONCLUÍDO
-- =====================================================
-- Próximos passos:
-- 1. Inserir contatos em empresa_contatos_mapeamento
-- 2. Atualizar webhook para usar obter_empresa_por_telefone()
-- 3. Agente responde direcionado à empresa corretaEOF
