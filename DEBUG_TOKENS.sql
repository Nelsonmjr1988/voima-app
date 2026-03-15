-- ====================================
-- DEBUG: VERIFICAR TOKENS REGISTRADOS
-- ====================================

-- 1️⃣ Ver TODAS as linhas em tokens_consumidos
SELECT 
  id,
  empresa_id,
  tipo,
  tokens_usados,
  custo_total,
  mes_referencia,
  created_at
FROM tokens_consumidos
ORDER BY created_at DESC
LIMIT 20;

-- 2️⃣ Ver agregações em custos_mensais_empresa
SELECT 
  id,
  empresa_id,
  mes_referencia,
  tokens_ai_agent,
  tokens_email,
  tokens_whatsapp,
  total_tokens_custo,
  updated_at
FROM custos_mensais_empresa
ORDER BY updated_at DESC;

-- 3️⃣ Ver se a empresa do teste existe
SELECT id, nome_fantasia, status
FROM empresas
WHERE id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';

-- 4️⃣ Contar quantos tokens foram registrados por tipo
SELECT 
  tipo,
  COUNT(*) as total_registros,
  SUM(tokens_usados) as total_tokens,
  SUM(custo_total) as total_custo
FROM tokens_consumidos
GROUP BY tipo;

-- 5️⃣ Ver preços cadastrados
SELECT 
  tipo_operacao,
  modelo_ai,
  preco_por_token,
  preco_fixo,
  descricao
FROM token_pricing
WHERE tipo_operacao = 'agent_interpretation'
ORDER BY created_at DESC;
