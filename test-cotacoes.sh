#!/bin/bash

# 1. Simular respostas dos fornecedores
echo "=== SIMULANDO RESPOSTAS DOS FORNECEDORES ==="
curl -s -X POST http://localhost:3000/api/cotacoes/simular-respostas \
  -H "Content-Type: application/json" \
  -d '{
    "pedido_id": "24dde8e0-d511-4135-887e-9565c29af6f5"
  }' | head -100

echo -e "\n\n=== AGUARDE 2 SEGUNDOS ==="
sleep 2

echo -e "\n\n=== CONSULTANDO MAPA DE COTAÇÕES ==="
curl -s http://localhost:3000/api/cotacoes/mapa/24dde8e0-d511-4135-887e-9565c29af6f5
