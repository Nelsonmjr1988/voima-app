/**
 * Hook para Integração de Tokens + Lançamentos
 * Usado no componente CompraObraApp para rastrear custos
 */

import { useCallback } from 'react';

interface TokenConfig {
  empresaId: string;
  baseUrl?: string;
}

export function useTokenTracking(config: TokenConfig) {
  const baseUrl = config.baseUrl || 'http://localhost:3000';

  /**
   * Registrar consumo de token quando IA interpreta pedido
   */
  const registrarTokensInterpretacao = useCallback(
    async (tokens_usados: number, pedido_id?: string) => {
      try {
        const response = await fetch(`${baseUrl}/api/tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: config.empresaId,
            tipo: 'agent_interpretation',
            tokens_usados,
            pedido_id,
            meta_dados: {
              model: 'gpt-3.5-turbo',
              fonte: 'compra_obra_app',
            },
          }),
        });

        if (!response.ok) {
          console.error('Erro ao registrar tokens de interpretação');
          return null;
        }

        const data = await response.json();
        console.log(`✅ ${tokens_usados} tokens registrados - Custo: R$ ${data.custo_registrado}`);
        return data;
      } catch (err) {
        console.error('Erro ao registrar tokens:', err);
        return null;
      }
    },
    [config.empresaId, baseUrl]
  );

  /**
   * Registrar gasto com material/mão-obra/impostos
   */
  const registrarLancamento = useCallback(
    async (dados: {
      obra_id?: string;
      tipo: 'material' | 'mao_obra' | 'imposto' | 'frete' | 'outro';
      descricao: string;
      valor: number;
      categoria?: string;
      comprovante_url?: string;
    }) => {
      try {
        const response = await fetch(`${baseUrl}/api/lancamentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: config.empresaId,
            ...dados,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao registrar lançamento:', error);
          return null;
        }

        const data = await response.json();
        console.log(`✅ Lançamento registrado: ${dados.descricao} - R$ ${dados.valor}`);
        return data;
      } catch (err) {
        console.error('Erro ao registrar lançamento:', err);
        return null;
      }
    },
    [config.empresaId, baseUrl]
  );

  /**
   * Registrar token de email quando OC é enviada
   */
  const registrarTokenEmail = useCallback(
    async (pedido_id?: string) => {
      try {
        const response = await fetch(`${baseUrl}/api/tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: config.empresaId,
            tipo: 'email_send',
            pedido_id,
          }),
        });

        if (!response.ok) {
          console.error('Erro ao registrar token de email');
          return null;
        }

        const data = await response.json();
        console.log(`✅ Email com PDF registrado - Custo: R$ ${data.custo_registrado}`);
        return data;
      } catch (err) {
        console.error('Erro ao registrar token de email:', err);
        return null;
      }
    },
    [config.empresaId, baseUrl]
  );

  /**
   * Registrar token de WhatsApp quando OC é enviada
   */
  const registrarTokenWhatsApp = useCallback(
    async (pedido_id?: string) => {
      try {
        const response = await fetch(`${baseUrl}/api/tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: config.empresaId,
            tipo: 'whatsapp_send',
            pedido_id,
          }),
        });

        if (!response.ok) {
          console.error('Erro ao registrar token de WhatsApp');
          return null;
        }

        const data = await response.json();
        console.log(`✅ WhatsApp registrado - Custo: R$ ${data.custo_registrado}`);
        return data;
      } catch (err) {
        console.error('Erro ao registrar token de WhatsApp:', err);
        return null;
      }
    },
    [config.empresaId, baseUrl]
  );

  /**
   * Enviar OC via WhatsApp
   */
  const enviarOcWhatsApp = useCallback(
    async (dados: {
      numero_whatsapp: string;
      oc_codigo: string;
      fornecedor_nome: string;
      valor_total: number;
      pdf_url: string;
    }) => {
      try {
        const response = await fetch(`${baseUrl}/api/whatsapp/enviar-oc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao enviar OC:', error);
          return null;
        }

        const data = await response.json();
        console.log(`✅ OC ${dados.oc_codigo} enviada para ${dados.numero_whatsapp}`);

        // Registrar token de WhatsApp automaticamente
        await registrarTokenWhatsApp();

        return data;
      } catch (err) {
        console.error('Erro ao enviar OC WhatsApp:', err);
        return null;
      }
    },
    [baseUrl, registrarTokenWhatsApp]
  );

  /**
   * Obter custos do mês da empresa
   */
  const obterCustosMes = useCallback(
    async (mes?: string) => {
      try {
        const mesParam = mes || new Date().toISOString().slice(0, 7);
        const response = await fetch(
          `${baseUrl}/api/tokens/custos/${config.empresaId}?mes=${mesParam}`
        );

        if (!response.ok) {
          console.error('Erro ao obter custos');
          return null;
        }

        return await response.json();
      } catch (err) {
        console.error('Erro ao obter custos:', err);
        return null;
      }
    },
    [config.empresaId, baseUrl]
  );

  return {
    registrarTokensInterpretacao,
    registrarLancamento,
    registrarTokenEmail,
    registrarTokenWhatsApp,
    enviarOcWhatsApp,
    obterCustosMes,
  };
}

/**
 * ============================================
 * EXEMPLO DE USO NO CompraObraApp
 * ============================================
 * 
 * import { useTokenTracking } from '@/lib/token-tracking-hook';
 * 
 * export default function CompraObraApp() {
 *   const { 
 *     registrarTokensInterpretacao,
 *     registrarLancamento,
 *     enviarOcWhatsApp
 *   } = useTokenTracking({
 *     empresaId: 'empresa-123' // Do usuário logado
 *   });
 * 
 *   const handleChatSend = async () => {
 *     // ... parsing do mensagem ...
 *     
 *     // 1. Quando IA interpreta material
 *     await registrarTokensInterpretacao(142); // 142 tokens usados
 *     
 *     // 2. Quando cotação é confirmada
 *     await registrarLancamento({
 *       tipo: 'material',
 *       descricao: 'Cimento CP II-32 - 200 sacos',
 *       valor: 7400,
 *       categoria: 'Cimento'
 *     });
 *   };
 * 
 *   const handleEnviarOc = async (oc) => {
 *     // Enviar OC no WhatsApp
 *     await enviarOcWhatsApp({
 *       numero_whatsapp: fornecedor.telefone,
 *       oc_codigo: oc.codigo,
 *       fornecedor_nome: fornecedor.nome,
 *       valor_total: oc.valor_total,
 *       pdf_url: oc.pdf_url
 *     });
 *     // Token de WhatsApp é registrado automaticamente
 *   };
 * }
 */
