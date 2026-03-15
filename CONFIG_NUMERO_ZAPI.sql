-- =====================================================
-- Configurar número Z-API para Silva Engenharia
-- =====================================================

-- 1. Atualizar empresa com seu número WhatsApp
UPDATE public.empresas 
SET numero_whatsapp_zapi = '5564996760460'
WHERE id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';

-- 2. Verificar que foi atualizado
SELECT id, razao_social, numero_whatsapp_zapi 
FROM public.empresas 
WHERE id = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';

-- Resultado esperado: 
-- id: 85b50c5c-abf2-4bed-9854-a15fb0d60d2b
-- razao_social: Silva Engenharia Ltda
-- numero_whatsapp_zapi: 5564996760460 ✅
