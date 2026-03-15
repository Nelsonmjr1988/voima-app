/**
 * EvolutionAPI WhatsApp Integration
 * Integração com EvolutionAPI para envio de mensagens WhatsApp
 * 
 * Docs: https://github.com/EvolutionAPI/evolution-api
 */

import axios from 'axios';

interface EvolutionConfig {
  baseURL: string; // ex: https://api.evolutionapi.io/v1
  apiKey: string; // Bearer token para autenticação
  instanceName: string; // Nome da instância WhatsApp
}

export class EvolutionWhatsApp {
  private config: EvolutionConfig;
  private client: any;

  constructor(config: EvolutionConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Enviar mensagem de texto simples
   */
  async enviarTexto(numero: string, mensagem: string) {
    try {
      const response = await this.client.post(
        `/message/sendText/${this.config.instanceName}`,
        {
          number: numero.replace(/\D/g, ''), // Remove caracteres não-numéricos
          text: mensagem,
        }
      );
      return {
        sucesso: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar documento/PDF
   */
  async enviarDocumento(numero: string, pdfUrl: string, caption?: string) {
    try {
      const response = await this.client.post(
        `/message/sendMedia/${this.config.instanceName}`,
        {
          number: numero.replace(/\D/g, ''),
          mediatype: 'document',
          media: pdfUrl, // URL do PDF (pode ser local ou remoto)
          caption: caption || '',
          fileName: `documento_${Date.now()}.pdf`,
        }
      );
      return {
        sucesso: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erro ao enviar documento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar imagem
   */
  async enviarImagem(numero: string, imagemUrl: string, caption?: string) {
    try {
      const response = await this.client.post(
        `/message/sendMedia/${this.config.instanceName}`,
        {
          number: numero.replace(/\D/g, ''),
          mediatype: 'image',
          media: imagemUrl,
          caption: caption || '',
        }
      );
      return {
        sucesso: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erro ao enviar imagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar template (pré-aprovado no WhatsApp Business)
   */
  async enviarTemplate(numero: string, templateName: string, parametros: any[]) {
    try {
      const response = await this.client.post(
        `/message/sendTemplate/${this.config.instanceName}`,
        {
          number: numero.replace(/\D/g, ''),
          template: templateName,
          params: parametros,
        }
      );
      return {
        sucesso: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erro ao enviar template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar mensagem com botões
   */
  async enviarBotoes(
    numero: string,
    mensagem: string,
    botoes: Array<{ id: string; title: string }>
  ) {
    try {
      const response = await this.client.post(
        `/message/sendButtons/${this.config.instanceName}`,
        {
          number: numero.replace(/\D/g, ''),
          title: '',
          description: mensagem,
          buttons: botoes.map((b, i) => ({
            id: b.id,
            displayText: b.title,
          })),
        }
      );
      return {
        sucesso: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erro ao enviar botões:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obter status de mensagem
   */
  async obterStatusMensagem(messageId: string) {
    try {
      const response = await this.client.get(
        `/message/status/${this.config.instanceName}/${messageId}`
      );
      return {
        messageId,
        status: response.data.status, // 'PENDING', 'SENT', 'DELIVERED', 'READ', 'ERROR'
        timestamp: response.data.timestamp,
      };
    } catch (error: any) {
      console.error('Erro ao obter status:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obter QR Code para vincular instância
   */
  async obterQrCode() {
    try {
      const response = await this.client.get(
        `/instance/qrcode/${this.config.instanceName}`
      );
      return {
        qrCode: response.data.qrCode, // Base64 encoded image
        expiracaoEm: response.data.expiryIn,
      };
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar status da instância
   */
  async obterStatusInstancia() {
    try {
      const response = await this.client.get(
        `/instance/info/${this.config.instanceName}`
      );
      return {
        instancia: this.config.instanceName,
        status: response.data.instance.status, // 'connected', 'disconnected'
        numero: response.data.instance.number,
        ultimaConexao: response.data.instance.lastStatusUpdate,
      };
    } catch (error: any) {
      console.error('Erro ao verificar status:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Logout/Desconectar instância
   */
  async desconectar() {
    try {
      await this.client.post(`/instance/logout/${this.config.instanceName}`);
      return { sucesso: true, mensagem: 'Instância desconectada' };
    } catch (error: any) {
      console.error('Erro ao desconectar:', error.response?.data || error.message);
      throw error;
    }
  }
}

/**
 * Função helper para inicializar cliente
 */
export function inicializarEvolutionAPI() {
  const baseURL = process.env.EVOLUTION_API_URL || 'https://api.evolutionapi.io/v1';
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'voima-compras';

  if (!apiKey) {
    throw new Error('EVOLUTION_API_KEY não configurada em .env.local');
  }

  return new EvolutionWhatsApp({
    baseURL,
    apiKey,
    instanceName,
  });
}

/**
 * Exemplo de uso:
 * 
 * const evolution = inicializarEvolutionAPI();
 * 
 * // Enviar mensagem
 * await evolution.enviarTexto('5562984041234', 'Olá! Sua OC foi gerada.');
 * 
 * // Enviar PDF
 * await evolution.enviarDocumento('5562984041234', 'https://cdn.example.com/oc.pdf', 'Ordem de Compra');
 */
