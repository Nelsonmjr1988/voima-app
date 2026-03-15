# 📋 Fluxo de Ordens de Compra (OC) - VOI​MA

## 🎯 Objetivo
Gerar e enviar automaticamente **uma Ordem de Compra por fornecedor**, agrupando todos os itens que aquele fornecedor cotou com o melhor preço.

---

## 📊 Nova Lógica de OC

### Exemplo Prático:

**Pedido: PC-0023**
- Item 1: Cimento (250 SC)
- Item 2: Areia Fina (10 M³)
- Item 3: Brita 1 (5 M³)

**Cotações Recebidas:**
| Item | Fornecedor | Preço Unitário |
|------|-----------|--------|
| Cimento | Votorantim | R$ 32,50 ⭐ (melhor) |
| Cimento | São Cristovão | R$ 33,00 |
| Cimento | Lafarge | R$ 34,00 |
| Areia | São Cristovão | R$ 150,00 ⭐ (melhor) |
| Areia | Votorantim | R$ 155,00 |
| Brita | Lafarge | R$ 1000,00 ⭐ (melhor) |
| Brita | Votorantim | R$ 1050,00 |

### Resultado: 3 Ordens de Compra Geradas

**OC-001 (Votorantim)**
- Cimento: 250 SC @ R$ 32,50 = R$ 8.125,00
- **Total: R$ 8.125,00**

**OC-002 (São Cristovão)**
- Areia Fina: 10 M³ @ R$ 150,00 = R$ 1.500,00
- **Total: R$ 1.500,00**

**OC-003 (Lafarge)**
- Brita 1: 5 M³ @ R$ 1.000,00 = R$ 5.000,00
- **Total: R$ 5.000,00**

**Resumo:**
- Total do Pedido: R$ 14.625,00
- 3 OCs enviadas
- Cada fornecedor recebe apenas sua OC com seus itens

---

## 🔄 Fluxo de Aprovação

### Antes (Versão Antiga)
```
Pedido → Cotação → Respostas → Selecionar 1 Cotação → Gerar 1 OC
```

### Agora (Nova Versão) ✅
```
Pedido → Cotação → Respostas → Agrupar por Fornecedor (melhor preço) → Gerar N OCs (uma por fornecedor)
```

---

## 🛠️ Endpoints

### 1. **POST `/api/pedidos/gerar-ocs`**
Gera múltiplas OCs automaticamente (uma por fornecedor)

**Request:**
```json
{
  "pedido_id": "24dde8e0-d511-4135-887e-9565c29af6f5",
  "criterio": "melhor_preco"
}
```

**Response:**
```json
{
  "etapa": "ordensGeradas",
  "pedido_codigo": "PC-0023",
  "total_ordens": 3,
  "ordens_compra": [
    {
      "id": "oc-001",
      "codigo": "OC-0001",
      "fornecedor": "Votorantim",
      "valor_total": 8125.00,
      "quantidade_itens": 1
    },
    {
      "id": "oc-002",
      "codigo": "OC-0002",
      "fornecedor": "São Cristovão",
      "valor_total": 1500.00,
      "quantidade_itens": 1
    },
    {
      "id": "oc-003",
      "codigo": "OC-0003",
      "fornecedor": "Lafarge",
      "valor_total": 5000.00,
      "quantidade_itens": 1
    }
  ],
  "valor_total_pedido": 14625.00,
  "mensagem": "3 Ordem(ns) de Compra gerada(s) e enviada(s)"
}
```

### 2. **POST `/api/pedidos/enviar-oc-v2`**
Envia OC por email e WhatsApp (chamado automaticamente)

**Request:**
```json
{
  "ordem_compra_id": "oc-001",
  "email_fornecedor": "votorantim@email.com",
  "numero_whatsapp": "+5511999999999",
  "itens_oc": [
    {
      "descricao": "Cimento CP II-32",
      "quantidade": 250,
      "unidade": "SC",
      "preco_unitario": 32.50,
      "preco_total": 8125.00
    }
  ]
}
```

---

## 📧 PDF da OC

### Melhorias no PDF:
✅ Cabeçalho profissional com logo e status  
✅ Informações de pedido, OC e datas  
✅ Tabela clara com itens e preços  
✅ Totalizador destacado em laranja  
✅ Observações e condições importantes  
✅ Rodapé com data de geração  

### Dados no PDF:
- Número da OC
- Número do Pedido
- Data de Emissão
- Data de Validade (7 dias)
- Empresa e Obra
- Fornecedor
- Tabela de itens com:
  - Descrição
  - Quantidade
  - Unidade
  - Preço Unitário
  - Preço Total
- Valor Total destacado

---

## 🧪 Teste Rápido

```bash
# Rodar teste E2E completo com múltiplas OCs
bash test-e2e-multiplas-ocs.sh
```

---

## ✨ Benefícios

1. **Menos Confusão:** Cada fornecedor recebe apenas sua OC
2. **Otimização de Custos:** Sempre o melhor preço por item
3. **Automação Completa:** Sem intervenção manual
4. **Rastreamento:** Múltiplas OCs para múltiplos fornecedores
5. **Escalabilidade:** Funciona com qualquer quantidade de itens/fornecedores

---

## 📝 Endpoint Legado (Ainda Compatível)

POST `/api/pedidos/aprovar` (versão antiga)
- Gera apenas 1 OC
- Mantido para compatibilidade
- Recomenda-se usar novo fluxo

---

**Versão:** 2.0  
**Data:** 13 de Março de 2026  
**Sistema:** VOIMA - Gestão de Compras
