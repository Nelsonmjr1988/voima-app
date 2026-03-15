# 📊 FLUXO DE CÁLCULO DE TOKENS - Anthropic Claude Haiku 4.5

## 1️⃣ COMO FUNCIONA O REGISTRO

### Passo 1: Llamada à API do Anthropic
```typescript
// Em cada endpoint que usa IA:
const result = await askHaiku(SYSTEM_PROMPT, userMessage);

// resultado contém:
{
  text: "resposta do claude",
  inputTokens: 150,      // tokens consumidos na ENTRADA
  outputTokens: 85       // tokens gerados na SAÍDA
}
```

### Passo 2: Cálculo do Custo Real
```typescript
const custo_total = (inputTokens * 0.000004) + (outputTokens * 0.000020)

// Exemplo real:
// Input: 150 tokens × R$ 0.000004 = R$ 0.0006
// Output: 85 tokens × R$ 0.000020 = R$ 0.0017
// TOTAL: R$ 0.0023 (menos de 0.0025 centavos!)
```

### Passo 3: Registro no Banco
```json
{
  "empresa_id": "uuid-da-empresa",
  "tipo": "agent_interpretation",
  "tokens_usados": 235,  // 150 + 85
  "custo_total": 0.0023,
  "meta_dados": {
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": 150,
    "output_tokens": 85,
    "preco_input": 0.000004,
    "preco_output": 0.000020
  },
  "mes_referencia": "2026-03",
  "data_consumo": "2026-03-14T15:30:00Z"
}
```

### Passo 4: Agregação Automática (via Trigger)
```sql
-- Trigger automático atualiza custos_mensais_empresa:
{
  "empresa_id": "uuid-da-empresa",
  "mes_referencia": "2026-03",
  "tokens_ai_agent": 0.0023,  -- soma todos 'agent_interpretation'
  "total_tokens_custo": 0.0023,
  ...
}
```

---

## 2️⃣ ENDPOINTS QUE REGISTRAM TOKENS

### 🔵 `/api/agent/interpret` - Interpretação de Pedidos
**O QUÊ**: Quando usuário envia "200 sc cimento"
**TOKENIZA**:
- ✅ 1ª chamada: Interpretar mensagem (todo item)
- ✅ 2ª chamada: Selecionar produto SINAPI (acumula)
- **TOTAL**: ~400-500 tokens por pedido

**REGISTRA COMO**: `tipo: 'agent_interpretation'`

```typescript
// ETAPA 1: Interpretar
const resultInterpret = await askHaiku(SYSTEM_PROMPT, message);
if (empresa_id) {
  await registrarTokensAnthropoic(empresa_id, resultInterpret.inputTokens, resultInterpret.outputTokens);
}

// ETAPA 2-N: Selecionar produtos (acumula em tokenAcc)
for (const item of items) {
  const selecao = await selecionarProduto(item, tokenAcc);
}

// FINAL: Registra tokens acumulados
if (empresa_id && tokenAcc.input > 0) {
  await registrarTokensAnthropoic(empresa_id, tokenAcc.input, tokenAcc.output);
}
```

### 🟠 `/api/agent/confirm` - Confirmar/Refinar Pedido
**O QUÊ**: Quando sistema pergunta confirmação ao usuário
**TOKENIZA**: Multi-turn conversation com contexto histórico
- ✅ Histórico de pedidos anteriores (contexto)
- ✅ Aprendizados (contexto)
- ✅ Dados SINAPI (contexto)
- **TOTAL**: ~300-800 tokens por confirmação

**REGISTRA COMO**: `tipo: 'agent_confirmation'`

```typescript
const resultConfirm = await askHaikuMultiturn(systemPrompt, messages);
if (empresa_id) {
  await registrarTokensAnthropoic(empresa_id, resultConfirm.inputTokens, resultConfirm.outputTokens);
}
```

### 🟢 `/api/cotacao/abrir` - (PENDENTE) Seleção de Fornecedores
**O QUÊ**: Quando gera cotação (ainda NÃO registra)
**TOKENIZA**: Mapear categoria SINAPI para fornecedor
- ⏳ NÃO IMPLEMENTADO AINDA
- Seria ~100-200 tokens

**REGISTRA COMO**: `tipo: 'supplier_selection'` (pronto para integrar)

---

## 3️⃣ GARANTINDO QUE SEMPRE REGISTRA

### ✅ OBRIGATÓRIO: Passar `empresa_id` em cada chamada

**NO FRONTEND** (app do usuário):
```typescript
const response = await fetch('/api/agent/interpret', {
  method: 'POST',
  body: JSON.stringify({
    message: "200 sc cimento",
    empresa_id: "ABC-123"  // ⚠️ NÃO ESQUECER
  })
});
```

**NO BACKEND** (se chamar internamente):
```typescript
// Em /api/pedidos/gerar-ocs ou outro endpoint
const result = await fetch('/api/agent/interpret', {
  body: JSON.stringify({
    message: "...",
    empresa_id: req.body.empresa_id  // ⚠️ SEMPRE passar
  })
});
```

### ⚠️ FALLBACK: Caso empresa_id não seja passado
```typescript
// Se empresa_id não vem:
if (!empresa_id) {
  console.warn('Token registrado SEM empresa_id');
  // Ainda registra, mas com empresa_id = null
  // Problema: Não consegue atribuir custo
}
```

### 🔍 VERIFICAR NO DASHBOARD
```sql
-- Para ver tokens registrados de uma empresa:
SELECT 
  empresa_id,
  mes_referencia,
  COUNT(*) as num_chamadas,
  SUM(tokens_usados) as total_tokens,
  SUM(custo_total) as custo_total_mes
FROM tokens_consumidos
WHERE mes_referencia = '2026-03'
GROUP BY empresa_id, mes_referencia
ORDER BY custo_total_mes DESC;
```

---

## 4️⃣ EXEMPLO REAL: Pedido com 3 Itens

### Cenário: Usuário envia "200 sc cimento, 1 m3 areia, 50 bc tijolos"

**Fase 1: Interpretar** (~120 tokens)
```
Input: System prompt (50) + mensagem (70) = 120 tokens
Output: JSON com 3 itens = ~80 tokens
CUSTO: (120 × 0.000004) + (80 × 0.000020) = R$ 0.00228
```

**Fase 2: Buscar SINAPI por item** (~90 tokens × 3 = 270)
```
Item 1 (cimento):
  Input: System prompt (50) + lista de 8 produtos (40) = 90
  Output: JSON escolhido = ~40 tokens
  CUSTO: R$ 0.000544

Item 2 (areia): R$ 0.000544
Item 3 (tijolos): R$ 0.000544
SUBTOTAL FASE 2: R$ 0.001632
```

**TOTAL DO PEDIDO:**
```
Fase 1: R$ 0.00228
Fase 2: R$ 0.001632
════════════════
TOTAL: R$ 0.003912 (~0.4 centavos por pedido)
```

**Registrado no banco:**
```json
{
  "empresa_id": "85b50c5c-...",
  "tipo": "agent_interpretation",
  "tokens_usados": 560,
  "custo_total": 0.003912,
  "meta_dados": {
    "input_tokens": 450,
    "output_tokens": 110
  },
  "mes_referencia": "2026-03"
}
```

---

## 5️⃣ CHECKLIST: GARANTIR REGISTRO EM 100% DOS CASOS

- [ ] Frontend sempre passa `empresa_id` na chamada?
- [ ] Backend sempre passa `empresa_id` quando chama `/api/agent/*`?
- [ ] Endpoints `/api/agent/interpret` registram?
- [ ] Endpoints `/api/agent/confirm` registram?
- [ ] `/api/cotacao/abrir` pronto para registrar?
- [ ] Dashboard mostra custos por empresa?
- [ ] Novos endpoints que usarem IA adicionam registro?

---

## 6️⃣ PRÓXIMOS PASSOS

### Integrar `/api/cotacao/abrir`
```typescript
// Adicionar após askHaiku em seleção de fornecedor:
const result = await askHaiku(systemPrompt, message);
if (empresa_id) {
  await registrarTokensAnthropoic(empresa_id, result.inputTokens, result.outputTokens);
}
```

### Integrar em `/api/pedidos/gerar-ocs`
```typescript
// Se chamar agente internamente para confirmar:
const result = await fetch('/api/agent/confirm', {
  method: 'POST',
  body: JSON.stringify({
    ..., 
    empresa_id: pedido.empresa_id  // ⚠️ PASSAR
  })
});
```

---

## 📈 VISUALIZAR CONSUMO

**Comando para ver tudo de uma empresa:**
```sql
SELECT 
  DATE_TRUNC('day', data_consumo) as dia,
  tipo,
  COUNT(*) as chamadas,
  AVG(tokens_usados) as media_tokens,
  SUM(custo_total) as custo_dia
FROM tokens_consumidos
WHERE empresa_id = '85b50c5c-...' AND mes_referencia = '2026-03'
GROUP BY 1, 2
ORDER BY dia DESC;
```

**Resultado esperado:**
```
dia        | tipo                   | chamadas | media_tokens | custo_dia
2026-03-14 | agent_interpretation   | 45       | 380          | R$ 0.85
2026-03-14 | agent_confirmation     | 12       | 520          | R$ 0.12
TOTAL                                         | 57           | R$ 0.97
```
