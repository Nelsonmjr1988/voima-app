-- ====================================
-- TABELAS PARA RASTREAMENTO DE TOKENS
-- ====================================

-- Tabela de registro de consumo de tokens (AI/API)
CREATE TABLE IF NOT EXISTS tokens_consumidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tipo VARCHAR(50) NOT NULL, -- 'agent_interpretation', 'email', 'whatsapp'
  tokens_usados INTEGER NOT NULL DEFAULT 0,
  custo_unitario DECIMAL(10,6) NOT NULL, -- R$ por token (ex: 0.0015)
  custo_total DECIMAL(12,2) NOT NULL,
  pedido_id UUID REFERENCES pedidos_compra(id),
  cotacao_id UUID REFERENCES cotacoes(id),
  meta_dados JSONB, -- { "model": "gpt-4", "prompt_tokens": 100, "completion_tokens": 50 }
  data_consumo TIMESTAMP DEFAULT NOW(),
  mes_referencia VARCHAR(7), -- 'YYYY-MM' para fácil agrupamento
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nota: Usando 'lancamentos_financeiros' que já existe no Supabase
-- Tabela já tem: tipo, valor, data_referencia, origem, etc.

-- Tabela de custos agregados por empresa/mês (cache para performance)
CREATE TABLE IF NOT EXISTS custos_mensais_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  mes_referencia VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  
  -- Gastos reais (de lançamentos)
  total_material DECIMAL(12,2) DEFAULT 0,
  total_mao_obra DECIMAL(12,2) DEFAULT 0,
  total_impostos DECIMAL(12,2) DEFAULT 0,
  total_frete DECIMAL(12,2) DEFAULT 0,
  total_outros DECIMAL(12,2) DEFAULT 0,
  
  -- Consumo de tokens
  tokens_ai_agent DECIMAL(12,2) DEFAULT 0,
  tokens_email DECIMAL(12,2) DEFAULT 0,
  tokens_whatsapp DECIMAL(12,2) DEFAULT 0,
  total_tokens_custo DECIMAL(12,2) DEFAULT 0,
  
  -- Totais
  custo_operacional DECIMAL(12,2) DEFAULT 0,
  custo_total_mes DECIMAL(12,2) DEFAULT 0,
  
  quantidade_pedidos INTEGER DEFAULT 0,
  quantidade_cotacoes INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(empresa_id, mes_referencia)
);

-- Tabela de configuração de preços de tokens por tipo de operação
CREATE TABLE IF NOT EXISTS token_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_operacao VARCHAR(100) NOT NULL, -- 'agent_interpretation', 'email_send', 'whatsapp_send'
  modelo_ai VARCHAR(50), -- 'gpt-3.5-turbo', 'gpt-4', NULL para não-AI
  preco_por_token DECIMAL(10,6) NOT NULL, -- Preço em R$
  preco_fixo DECIMAL(12,2), -- Algumas operações têm custo fixo (ex: SMS)
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_tokens_consumidos_empresa_mes ON tokens_consumidos(empresa_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_custos_mensais_empresa_mes ON custos_mensais_empresa(empresa_id, mes_referencia);

-- ====================================
-- DADOS INICIAIS - Tabela Preços
-- ====================================

INSERT INTO token_pricing (tipo_operacao, modelo_ai, preco_por_token, preco_fixo, descricao) VALUES
  ('agent_interpretation', 'claude-haiku-4-5-input', 0.000004, NULL, 'Tokens de entrada Claude Haiku 4.5 ($0.80 per 1M = R$ 0.000004)'),
  ('agent_interpretation', 'claude-haiku-4-5-output', 0.000020, NULL, 'Tokens de saída Claude Haiku 4.5 ($4.00 per 1M = R$ 0.000020)'),
  ('email_send', NULL, 0, 0.50, 'Envio de email com PDF anexo via Resend'),
  ('whatsapp_send', NULL, 0, 1.00, 'Envio de mensagem WhatsApp via EvolutionAPI')
ON CONFLICT DO NOTHING;

-- ====================================
-- FUNÇÕES PARA ATUALIZAR CUSTOS
-- ====================================

-- ====================================
-- TRIGGER PARA ATUALIZAR CUSTOS
-- ====================================

CREATE OR REPLACE FUNCTION atualizar_custos_lancamentos_financeiros()
RETURNS TRIGGER AS $$
DECLARE
  v_mes_referencia VARCHAR(7);
BEGIN
  -- Extrair mês YYYY-MM de data_referencia
  v_mes_referencia := TO_CHAR(NEW.data_referencia, 'YYYY-MM');
  
  -- Atualizar tabela de custos agregados da lancamentos_financeiros
  INSERT INTO custos_mensais_empresa (
    empresa_id, mes_referencia, 
    total_material, total_mao_obra, total_impostos, total_frete, total_outros
  )
  SELECT 
    NEW.empresa_id,
    v_mes_referencia,
    COALESCE(SUM(CASE WHEN tipo = 'material' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'mao_obra' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'imposto' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'transporte' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo IN ('encargo', 'equipamento', 'administrativo', 'outro') THEN valor ELSE 0 END), 0)
  FROM lancamentos_financeiros
  WHERE empresa_id = NEW.empresa_id AND TO_CHAR(data_referencia, 'YYYY-MM') = v_mes_referencia
  GROUP BY empresa_id
  ON CONFLICT (empresa_id, mes_referencia) DO UPDATE SET
    total_material = EXCLUDED.total_material,
    total_mao_obra = EXCLUDED.total_mao_obra,
    total_impostos = EXCLUDED.total_impostos,
    total_frete = EXCLUDED.total_frete,
    total_outros = EXCLUDED.total_outros,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela lancamentos_financeiros (tabela existente)
DROP TRIGGER IF EXISTS trigger_atualizar_custos_lancamentos ON lancamentos_financeiros;
CREATE TRIGGER trigger_atualizar_custos_lancamentos
AFTER INSERT OR UPDATE ON lancamentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION atualizar_custos_lancamentos_financeiros();

-- ====================================
-- TRIGGER PARA ATUALIZAR CUSTOS (Tokens)
-- ====================================

CREATE OR REPLACE FUNCTION atualizar_custos_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar custos_mensais_empresa com consumo de tokens
  INSERT INTO custos_mensais_empresa (
    empresa_id, mes_referencia,
    tokens_ai_agent, tokens_email, tokens_whatsapp, total_tokens_custo
  )
  SELECT
    NEW.empresa_id,
    NEW.mes_referencia,
    COALESCE(SUM(CASE WHEN tipo = 'agent_interpretation' THEN custo_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'email_send' THEN custo_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'whatsapp_send' THEN custo_total ELSE 0 END), 0),
    COALESCE(SUM(custo_total), 0)
  FROM tokens_consumidos
  WHERE empresa_id = NEW.empresa_id AND mes_referencia = NEW.mes_referencia
  GROUP BY empresa_id, mes_referencia
  ON CONFLICT (empresa_id, mes_referencia) DO UPDATE SET
    tokens_ai_agent = EXCLUDED.tokens_ai_agent,
    tokens_email = EXCLUDED.tokens_email,
    tokens_whatsapp = EXCLUDED.tokens_whatsapp,
    total_tokens_custo = EXCLUDED.total_tokens_custo,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_custos_tokens ON tokens_consumidos;
CREATE TRIGGER trigger_atualizar_custos_tokens
AFTER INSERT OR UPDATE ON tokens_consumidos
FOR EACH ROW
EXECUTE FUNCTION atualizar_custos_tokens();
