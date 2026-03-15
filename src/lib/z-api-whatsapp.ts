/**
 * Cliente Z-API para WhatsApp
 * Documentação: https://docs.z-api.io/
 */

const Z_API_BASE_URL = process.env.Z_API_BASE_URL || 'https://api.z-api.io';
const Z_API_INSTANCE_ID = process.env.Z_API_INSTANCE_ID;
const Z_API_TOKEN = process.env.Z_API_TOKEN;

export interface ZApiMensagem {
  phone: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
}

export interface ZApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface ZApiWebhookPayload {
  event: string;
  instance: string;
  data: {
    id?: string;
    phone?: string;
    message?: string;
    sender?: string;
    senderName?: string;
    timestamp?: number;
    messageTimestamp?: number;
    type?: string;
    status?: string;
    [key: string]: any;
  };
}

class ZApiWhatsApp {
  private baseUrl: string;
  private instanceId: string;
  private token: string;

  constructor() {
    if (!Z_API_INSTANCE_ID || !Z_API_TOKEN) {
      throw new Error('Z_API_INSTANCE_ID e Z_API_TOKEN não configurados');
    }
    this.baseUrl = Z_API_BASE_URL;
    this.instanceId = Z_API_INSTANCE_ID;
    this.token = Z_API_TOKEN;
  }

  /**
   * URL base para a instância
   */
  private getInstanceUrl(): string {
    return `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}`;
  }

  /**
   * Enviar mensagem de texto simples
   */
  async enviarTexto(phone: string, message: string): Promise<ZApiResponse> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.formatarTelefone(phone),
          message: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Z-API erro:', response.status, data);
        return {
          success: false,
          error: data.message || 'Erro ao enviar mensagem',
          details: data,
        };
      }

      console.log('✅ Mensagem enviada:', data);
      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (err: any) {
      console.error('❌ Exception Z-API:', err);
      return {
        success: false,
        error: err.message || 'Erro desconhecido',
      };
    }
  }

  /**
   * Enviar documento/PDF
   */
  async enviarDocumento(
    phone: string,
    pdfUrl: string,
    caption?: string
  ): Promise<ZApiResponse> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/send-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.formatarTelefone(phone),
          document: pdfUrl,
          caption: caption || 'Documento enviado',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Z-API document error:', response.status, data);
        return {
          success: false,
          error: data.message || 'Erro ao enviar documento',
          details: data,
        };
      }

      console.log('✅ Documento enviado:', data);
      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (err: any) {
      console.error('❌ Exception Z-API document:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Enviar imagem
   */
  async enviarImagem(
    phone: string,
    imagemUrl: string,
    caption?: string
  ): Promise<ZApiResponse> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/send-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.formatarTelefone(phone),
          image: imagemUrl,
          caption: caption,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Erro ao enviar imagem',
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Enviar mensagem com botões
   */
  async enviarBotoes(
    phone: string,
    message: string,
    botoes: Array<{ id: string; title: string }>
  ): Promise<ZApiResponse> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/send-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.formatarTelefone(phone),
          message: message,
          options: botoes.map((b) => ({
            id: b.id,
            title: b.title,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Erro ao enviar botões',
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Obter status de uma mensagem
   */
  async obterStatusMensagem(messageId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.getInstanceUrl()}/chat-messages/${messageId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Erro ao obter status:', response.status);
        return null;
      }

      return await response.json();
    } catch (err: any) {
      console.error('Exception ao obter status:', err);
      return null;
    }
  }

  /**
   * Obter status da instância
   */
  async obterStatusInstancia(): Promise<any> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/instance-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (err: any) {
      console.error('Exception ao obter status instância:', err);
      return null;
    }
  }

  /**
   * Desconectar WhatsApp
   */
  async desconectar(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getInstanceUrl()}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
      return false;
    }
  }

  /**
   * Formatar número de telefone para Z-API (55 + DDD + número)
   */
  private formatarTelefone(phone: string): string {
    // Remove caracteres especiais
    const cleaned = phone.replace(/\D/g, '');

    // Se não tem 55 no início, adiciona
    if (!cleaned.startsWith('55')) {
      return '55' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validar webhooks assinados por Z-API
   */
  static validarWebhook(signature: string, body: string, token: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', token)
      .update(body)
      .digest('hex');

    return hash === signature;
  }
}

/**
 * Instância singleton de Z-API
 */
let zApiInstance: ZApiWhatsApp | null = null;

export function inicializarZApi(): ZApiWhatsApp {
  if (!zApiInstance) {
    zApiInstance = new ZApiWhatsApp();
  }
  return zApiInstance;
}

export default ZApiWhatsApp;
