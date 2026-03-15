-- ====================================
-- UPDATE PARA TOKENS TRACKING
-- ====================================
-- Este script atualiza o setup anterior com as correções:
-- 1. Remove duplicação de tabela 'lancamentos'
-- 2. Atualiza preços do Anthropic Claude Haiku
-- 3. Reconstrói triggers corretamente

-- DROP das triggers antigas (se existirem)
DROP TRIGGER IF EXISTS trigger_atualizar_custos_lancamentos ON lancamentos_financeiros;
DROP TRIGGER IF EXISTS trigger_atualizar_custos_tokens ON tokens_consumidos;

-- DROP das funções antigas (se existirem)
DROP FUNCTION IF EXISTS atualizar_custos_mensais();
DROP FUNCTION IF EXISTS atualizar_custos_lancamentos_financeiros();
DROP FUNCTION IF EXISTS atualizar_custos_tokens();

-- LIMPAR preços antigos (OpenAI)
DELETE FROM token_pricing WHERE tipo_operacao = 'agent_interpretation';

-- INSERIR preços corretos do Anthropic Claude Haiku
INSERT INTO token_pricing (tipo_operacao, modelo_ai, preco_por_token, preco_fixo, descricao) VALUES
  ('agent_interpretation', 'claude-haiku-4-5-input', 0.000004, NULL, 'Tokens de entrada Claude Haiku 4.5 ($0.80 per 1M = R$ 0.000004)'),
  ('agent_interpretation', 'claude-haiku-4-5-output', 0.000020, NULL, 'Tokens de saída Claude Haiku 4.5 ($4.00 per 1M = R$ 0.000020)')
ON CONFLICT DO NOTHING;

-- ====================================
-- RECONSTRUIR TRIGGERS CORRIGIDOS
-- ====================================

-- FUNÇÃO: Atualizar custos de lancamentos_financeiros
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

-- TRIGGER: lancamentos_financeiros
CREATE TRIGGER trigger_atualizar_custos_lancamentos
AFTER INSERT OR UPDATE ON lancamentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION atualizar_custos_lancamentos_financeiros();

-- FUNÇÃO: Atualizar custos de tokens
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

-- TRIGGER: tokens_consumidos
CREATE TRIGGER trigger_atualizar_custos_tokens
AFTER INSERT OR UPDATE ON tokens_consumidos
FOR EACH ROW
EXECUTE FUNCTION atualizar_custos_tokens();

-- ====================================
-- UPDATE CONCLUÍDO
-- ====================================
-- ✅ Preços do Anthropic atualizados
-- ✅ Funções triggers recriadas
-- ✅ Duplicação removida
-- Agora pronto para registrar custos reais!
