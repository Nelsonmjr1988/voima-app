export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string;
          inscricao_estadual: string | null;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          telefone: string | null;
          email: string | null;
          contrato_social_url: string | null;
          cartao_cnpj_url: string | null;
          autorizacao_url: string | null;
          plano: 'basico' | 'pro' | 'enterprise';
          status: 'onboarding' | 'ativo' | 'inativo' | 'suspenso';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>;
      };
      usuarios: {
        Row: {
          id: string;
          empresa_id: string;
          auth_user_id: string | null;
          nome: string;
          cpf: string | null;
          email: string | null;
          telefone_whatsapp: string;
          cargo: 'proprietario' | 'engenheiro' | 'administrativo' | 'mestre_obra';
          pode_solicitar: boolean;
          pode_aprovar: boolean;
          limite_aprovacao: number;
          status: 'ativo' | 'inativo';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>;
      };
      obras: {
        Row: {
          id: string;
          empresa_id: string;
          responsavel_id: string | null;
          nome: string;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          tipo: 'publica' | 'privada';
          modalidade_licitacao: string | null;
          numero_contrato: string | null;
          valor_contrato: number;
          bdi_percentual: number | null;
          data_inicio: string | null;
          data_fim_prevista: string | null;
          data_fim_real: string | null;
          percentual_executado: number;
          status: 'ativa' | 'pausada' | 'concluida' | 'cancelada';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['obras']['Insert']>;
      };
      fornecedores: {
        Row: {
          id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string | null;
          tipo: 'industria' | 'distribuidor' | 'representante' | 'varejo';
          cidade: string | null;
          estado: string | null;
          raio_atendimento_km: number | null;
          contato_nome: string | null;
          telefone_whatsapp: string | null;
          email: string | null;
          categorias: string[];
          score_preco: number;
          score_entrega: number;
          score_geral: number;
          total_cotacoes: number;
          total_compras: number;
          taxa_resposta: number;
          status: 'ativo' | 'inativo';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fornecedores']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fornecedores']['Insert']>;
      };
      pedidos_compra: {
        Row: {
          id: string;
          codigo: string;
          empresa_id: string;
          obra_id: string;
          solicitante_id: string;
          aprovador_id: string | null;
          mensagem_original: string | null;
          valor_estimado: number | null;
          valor_final: number | null;
          status: 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'cotando' | 'ordem_gerada' | 'parcial_entregue' | 'entregue' | 'cancelado';
          data_solicitacao: string;
          data_aprovacao: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pedidos_compra']['Row'], 'id' | 'created_at' | 'updated_at' | 'codigo'> & {
          id?: string;
          codigo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pedidos_compra']['Insert']>;
      };
      cotacoes: {
        Row: {
          id: string;
          codigo: string;
          item_pedido_id: string;
          fornecedor_id: string;
          canal_envio: 'whatsapp' | 'email' | 'telefone';
          mensagem_enviada: string | null;
          data_envio: string;
          data_resposta: string | null;
          preco_unitario: number | null;
          preco_total: number | null;
          prazo_entrega_dias: number | null;
          condicao_pagamento: string | null;
          observacoes_fornecedor: string | null;
          status: 'enviada' | 'respondida' | 'sem_resposta' | 'selecionada' | 'recusada' | 'expirada';
          data_expiracao: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cotacoes']['Row'], 'id' | 'created_at' | 'codigo'> & {
          id?: string;
          codigo?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cotacoes']['Insert']>;
      };
      ordens_compra: {
        Row: {
          id: string;
          codigo: string;
          pedido_compra_id: string;
          cotacao_id: string | null;
          fornecedor_id: string;
          empresa_id: string;
          obra_id: string;
          valor_total: number;
          condicao_pagamento: string | null;
          data_emissao: string;
          data_entrega_prevista: string | null;
          data_entrega_real: string | null;
          nota_fiscal_numero: string | null;
          nota_fiscal_url: string | null;
          comprovante_pagamento_url: string | null;
          avaliacao_entrega: number | null;
          avaliacao_observacao: string | null;
          status: 'emitida' | 'confirmada' | 'em_entrega' | 'entregue' | 'paga' | 'cancelada';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ordens_compra']['Row'], 'id' | 'created_at' | 'updated_at' | 'codigo'> & {
          id?: string;
          codigo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ordens_compra']['Insert']>;
      };
      lancamentos_financeiros: {
        Row: {
          id: string;
          empresa_id: string;
          obra_id: string;
          usuario_id: string | null;
          ordem_compra_id: string | null;
          tipo: 'material' | 'mao_obra' | 'encargo' | 'imposto' | 'equipamento' | 'transporte' | 'administrativo' | 'outro';
          descricao: string | null;
          valor: number;
          data_referencia: string;
          data_lancamento: string;
          comprovante_url: string | null;
          origem: 'manual' | 'ordem_compra' | 'importacao';
          observacoes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lancamentos_financeiros']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lancamentos_financeiros']['Insert']>;
      };
      produtos_sinapi: {
        Row: {
          id: string;
          codigo_sinapi: number;
          descricao_basica: string;
          unidade: string | null;
          categoria: string | null;
          informacoes_gerais: string | null;
          palavras_chave: string[];
          preco_referencia: number | null;
          preco_estado: string;
          preco_atualizado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['produtos_sinapi']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['produtos_sinapi']['Insert']>;
      };
      mensagens_log: {
        Row: {
          id: string;
          canal: 'whatsapp' | 'email' | 'telefone';
          direcao: 'entrada' | 'saida';
          remetente_contato: string | null;
          destinatario_contato: string | null;
          conteudo_texto: string | null;
          conteudo_midia_url: string | null;
          fornecedor_id: string | null;
          usuario_id: string | null;
          cotacao_id: string | null;
          vinculacao_status: 'automatica' | 'manual' | 'pendente' | 'ignorada';
          vinculacao_metodo: string | null;
          processado: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mensagens_log']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mensagens_log']['Insert']>;
      };
    };
  };
};
