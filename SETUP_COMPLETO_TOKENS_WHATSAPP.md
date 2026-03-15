# Setup Completo - Plataforma VOIMA + App Usuário + Tokens

## 📋 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│           VOIMA ADMIN DASHBOARD                         │
│  (Controla todas as empresas, pedidos globais)         │
│  - Obras de todas as empresas                          │
│  - Pedidos centralizados                               │
│  - Compras efetuadas (agregadas)                       │
│  - Dashboard de Custos de Tokens por Empresa            │
└────────────────────────────────────────────────────────┘
           ↓ API / Supabase ↓
┌─────────────────────────────────────────────────────────┐
│  APP WEB DO USUÁRIO (Multi-empresa)                    │
│  - Dashboard individual (Obras, Compras, Lançamentos)  │
│  - Central de compras (Chat inteligente)               │
│  - Gestão de fornecedores                              │
│  - Controle financeiro (Lançamentos)                   │
└────────────────────────────────────────────────────────┘
           ↓ WhatsApp API ↓
┌─────────────────────────────────────────────────────────┐
│           EVOLUTION API (WhatsApp)                      │
│  - Envio de OCs direto no WhatsApp                     │
│  - Cotações interativas                                │
│  - Resposta de fornecedores                            │
└────────────────────────────────────────────────────────┘
```

## 🔧 PASSO 1: Banco de Dados (Supabase)

### 1.1 Executar Script SQL

Acesse sua instância Supabase SQL Editor e execute o arquivo:
```bash
SETUP_TOKENS_TRACKING.sql
```

Isso cria:
- `tokens_consumidos` - Registra cada uso de token (AI, Email, WhatsApp)
- `lancamentos` - Despesas/receitas da empresa
- `custos_mensais_empresa` - Cache agregado para performance
- `token_pricing` - Tabela de preços dos serviços

### 1.2 Verificar Tabelas

```sql
-- Visualizar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%token%';

-- Verificar preços configurados
SELECT * FROM token_pricing;
```

---

## 🌐 PASSO 2: EvolutionAPI (WhatsApp)

### 2.1 Opções de Instalação

#### Opção A: SaaS (Recomendado para começar)
```
URL: https://api.evolutionapi.io (ou sua instância)
Site: https://evolutionapi.io
```

1. Crie conta em evolutionapi.io
2. Crie uma instância
3. Gere API Key (Bearer Token)

#### Opção B: Self-Hosted (Docker)
```bash
docker run -d \
  -e DB_HOST=seu_postgres \
  -e DB_NAME=evolution \
  -e REDIS_HOST=seu_redis \
  -p 3333:3333 \
  atikitech/evolution-api:latest
```

### 2.2 Configurar .env.local

Adicione ao seu `.env.local`:

```env
# EvolutionAPI Configuration
EVOLUTION_API_URL=https://api.evolutionapi.io/v1
EVOLUTION_API_KEY=seu_api_key_aqui
EVOLUTION_INSTANCE_NAME=voima-compras

# Se estiver usando self-hosted:
# EVOLUTION_API_URL=http://localhost:3333/v1
# EVOLUTION_API_KEY=sua_chave_gerada
```

### 2.3 Obter QR Code (Vincular WhatsApp)

```bash
# Fazer requisição para obter QR Code
curl -X GET https://api.evolutionapi.io/v1/instance/qrcode/voima-compras \
  -H "Authorization: Bearer SUA_CHAVE"

# Vai retornar um QR Code em base64
# Escanear com seu WhatsApp Business para vincular a instância
```

---

## 📱 PASSO 3: Endpoints - Tokens

### 3.1 Registrar Consumo de Token

```bash
POST /api/tokens
Content-Type: application/json

{
  "empresa_id": "xxxxx",
  "tipo": "agent_interpretation", // ou "email_send", "whatsapp_send"
  "tokens_usados": 150,
  "meta_dados": {
    "model": "gpt-3.5-turbo",
    "prompt_tokens": 100,
    "completion_tokens": 50
  },
  "pedido_id": "xxxxx"
}

// Response:
{
  "sucesso": true,
  "custo_registrado": "0.23",
  "registro_id": "xxxxx"
}
```

### 3.2 Consultar Custos (Admin)

```bash
GET /api/tokens/custos/{empresa_id}?mes=2026-03

// Response:
{
  "empresa_id": "xxxxx",
  "mes_referencia": "2026-03",
  "custos_tokens": {
    "total_tokens_custo": 1250.50,
    "tokens_ai_agent": 800.00,
    "tokens_email": 250.50,
    "tokens_whatsapp": 200.00
  },
  "resumo": {
    "total_tokens_mes": 1250.50,
    "total_operacional": 8540.00,
    "total_mes": 9790.50
  }
}
```

---

## 💸 PASSO 4: Endpoints - Lançamentos

### 4.1 Criar Lançamento (Material, MO, Impostos, etc)

```bash
POST /api/lancamentos
Content-Type: application/json

{
  "empresa_id": "xxxxx",
  "obra_id": "xxxxx",
  "tipo": "material", // material, mao_obra, imposto, frete, outro
  "descricao": "Cimento Portland CP II-32 - 200 sacos",
  "valor": 7400.00,
  "categoria": "Cimento",
  "comprovante_url": "https://cdn.example.com/nf.pdf"
}

// Response:
{
  "sucesso": true,
  "lancamento_id": "xxxxx",
  "mensagem": "Lançamento de material criado"
}
```

### 4.2 Listar Lançamentos do Mês

```bash
GET /api/lancamentos?empresa_id=xxxxx&mes=2026-03

// Response:
{
  "empresa_id": "xxxxx",
  "mes": "2026-03",
  "total_lancamentos": 8,
  "totais": {
    "material": 18500.00,
    "mao_obra": 12300.00,
    "imposto": 3100.00,
    "frete": 1200.00
  },
  "lancamentos": [
    {
      "id": "xxxxx",
      "tipo": "material",
      "descricao": "...",
      "valor": 7400.00,
      "created_at": "2026-03-14T..."
    }
  ]
}
```

---

## 📱 PASSO 5: WhatsApp Integration

### 5.1 Enviar OC via WhatsApp

```bash
POST /api/whatsapp/enviar-oc
Content-Type: application/json

{
  "numero_whatsapp": "5562984041234",
  "oc_codigo": "OC-0073",
  "fornecedor_nome": "Votorantim Cimentos",
  "valor_total": 6500.00,
  "pdf_url": "https://cdn.example.com/oc-0073.pdf"
}

// Response:
{
  "sucesso": true,
  "oc_codigo": "OC-0073",
  "messageId": "msg_xxxxx",
  "numero_destino": "5562984041234",
  "pdf_enviado": true
}
```

### 5.2 Enviar Cotação com Opções

```bash
PUT /api/whatsapp/enviar-cotacao
Content-Type: application/json

{
  "numero_whatsapp": "5562984041234",
  "pedido_codigo": "PC-0028",
  "fornecedores_opcoes": [
    { "nome": "Votorantim", "preco": 26.00 },
    { "nome": "Dist. Goiás", "preco": 25.50 },
    { "nome": "Rede Construct", "preco": 26.50 }
  ]
}

// Response:
{
  "sucesso": true,
  "pedido_codigo": "PC-0028",
  "opcoes_enviadas": 3
}
```

---

## 💡 EXEMPLO DE USO - Fluxo Completo

### Quando um pedido é criado:

```typescript
// 1. Pedido criado
const pedido = await criarPedido({ ... });

// 2. Registrar token gasto na interpretação (se usou AI)
await fetch('/api/tokens', {
  method: 'POST',
  body: JSON.stringify({
    empresa_id: pedido.empresa_id,
    tipo: 'agent_interpretation',
    tokens_usados: 142,
    pedido_id: pedido.id,
  })
});

// 3. Criar lançamento de material
await fetch('/api/lancamentos', {
  method: 'POST',
  body: JSON.stringify({
    empresa_id: pedido.empresa_id,
    tipo: 'material',
    descricao: 'Purchase Order - Cimento',
    valor: 7400,
  })
});

// 4. Gerar OC
const oc = await gerarOC(pedido.id);

// 5. Enviar PDF + Registrar token de email
await fetch('/api/tokens', {
  method: 'POST',
  body: JSON.stringify({
    empresa_id: pedido.empresa_id,
    tipo: 'email_send',
    pedido_id: pedido.id,
  })
});

// 6. Enviar OC também por WhatsApp + Registrar token
await fetch('/api/whatsapp/enviar-oc', {
  method: 'POST',
  body: JSON.stringify({
    numero_whatsapp: fornecedor.telefone,
    oc_codigo: oc.codigo,
    pdf_url: oc.pdf_url,
  })
});

await fetch('/api/tokens', {
  method: 'POST',
  body: JSON.stringify({
    empresa_id: pedido.empresa_id,
    tipo: 'whatsapp_send',
    pedido_id: pedido.id,
  })
});
```

---

## 📊 PASSO 6: Dashboard de Custos (Admin)

### Acessar Dashboard:

```
http://localhost:3000/admin/custos-tokens
```

Mostra:
- ✅ Total de custos com tokens (AI, Email, WhatsApp)
- ✅ Custos operacionais (Material, MO, Impostos)
- ✅ Custo total por empresa
- ✅ Atividades (pedidos, cotações)
- ✅ Breakdown por canal
- ✅ Alertas de custos elevados

---

## 🛠️ PASSO 7: Configurar Preços (Token Pricing)

Se precisar ajustar preços:

```sql
UPDATE token_pricing 
SET preco_por_token = 0.002 
WHERE tipo_operacao = 'agent_interpretation' 
AND modelo_ai = 'gpt-4';

UPDATE token_pricing 
SET preco_fixo = 0.75 
WHERE tipo_operacao = 'email_send';

UPDATE token_pricing 
SET preco_fixo = 1.50 
WHERE tipo_operacao = 'whatsapp_send';
```

---

## 📝 Tabela de Preços Padrão

| Tipo | Preço | Descrição |
|------|-------|-----------|
| agent_interpretation (GPT-3.5) | R$ 0.0015/token | Interpretação de pedidos |
| agent_interpretation (GPT-4) | R$ 0.0030/token | Interpretação complexa |
| email_send | R$ 0.50/email | Envio com PDF anexo (Resend) |
| whatsapp_send | R$ 1.00/mensagem | Envio WhatsApp (EvolutionAPI) |

---

## 🔍 Query Úteis para Análise

### Custos por empresa em um mês:
```sql
SELECT 
  e.nome_fantasia,
  cme.total_tokens_custo,
  cme.custo_operacional,
  cme.custo_total_mes
FROM custos_mensais_empresa cme
JOIN empresas e ON e.id = cme.empresa_id
WHERE cme.mes_referencia = '2026-03'
ORDER BY cme.custo_total_mes DESC;
```

### Top consumidores de tokens:
```sql
SELECT 
  e.nome_fantasia,
  tc.tipo,
  COUNT(*) as quantidade,
  SUM(tc.tokens_usados) as total_tokens,
  SUM(tc.custo_total) as total_custo
FROM tokens_consumidos tc
JOIN empresas e ON e.id = tc.empresa_id
WHERE tc.mes_referencia = '2026-03'
GROUP BY e.id, e.nome_fantasia, tc.tipo
ORDER BY total_custo DESC;
```

### Lançamentos por categoria:
```sql
SELECT 
  e.nome_fantasia,
  o.nome as obra,
  l.tipo,
  SUM(l.valor) as total
FROM lancamentos l
JOIN empresas e ON e.id = l.empresa_id
LEFT JOIN obras o ON o.id = l.obra_id
WHERE l.mes_referencia = '2026-03'
GROUP BY e.id, e.nome_fantasia, o.id, o.nome, l.tipo
ORDER BY total DESC;
```

---

## ✅ Checklist de Deploy

- [ ] Executar SETUP_TOKENS_TRACKING.sql no Supabase
- [ ] Configurar EvolutionAPI (SaaS ou self-hosted)
- [ ] Adicionar variáveis em .env.local
- [ ] Testar endpoints de tokens com Postman
- [ ] Testar WhatsApp (enviar OC de teste)
- [ ] Acessar dashboard de custos
- [ ] Treinar equipe no app do usuário
- [ ] Monitorar custos na primeira semana

---

## 📞 Troubleshooting

### WhatsApp não recebe mensagens
- Verificar se instância está conectada: `GET /api/whatsapp/status`
- QR Code expirado? Gerar novo
- Número sem formatação? Endpoint adiciona automaticamente

### Tokens não aparecem no dashboard
- Verificar se função trigger está ativa: `SELECT * FROM pg_trigger;`
- Registros em tokens_consumidos? `SELECT COUNT(*) FROM tokens_consumidos;`
- Mes_referencia correto? Deve ser YYYY-MM

### Email não enviado
- Verificar RESEND_API_KEY em .env
- Domínio verificado no Resend? (Para produção)
- Modo teste só envia para: delivered@resend.dev

---

## 🎯 Próximos Passos

1. Configurar webhooks do WhatsApp para receber respostas
2. Implementar dashboard em tempo real (Socket.io)
3. Adicionar relatórios mensais em PDF
4. Integrar com sistema contábil (ERP)
5. Criar alertas automáticos de custos

---

**Status**: ✅ PRONTO PARA USAR
**Última atualização**: 14 de Março de 2026
**Versão**: 1.0
