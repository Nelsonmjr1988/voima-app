// Script de teste para verificar se itens foram inseridos
const supabaseUrl = 'https://nceuycytqvfzddvcnghr.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZXV5Y3l0cXZmemRkdmNuZ2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTc0NzUzMCwiZXhwIjoxNzI1MzY3NTMwfQ.M-n_wJVeExhk4nTZEJEfmDZJvPIW1WJfMOHZ-EiwMsE';
const pcId = '26e29d5f-7bd6-4c5b-93a0-1b4ef06e8a63'; // PC-0022

async function verificarItens() {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/itens_pedido_compra?pedido_compra_id=eq.${pcId}&select=*`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      }
    );
    
    if (!res.ok) {
      console.error('Erro na requisição:', res.status, await res.text());
      return;
    }
    
    const itens = await res.json();
    console.log(`\n✅ Total de itens encontrados: ${itens.length}\n`);
    
    if (itens.length > 0) {
      itens.forEach((item, i) => {
        console.log(`${i+1}. ${item.descricao_padronizada}`);
        console.log(`   Quantidade: ${item.quantidade} ${item.unidade}`);
        console.log(`   Preço ref: R$ ${item.preco_referencia_sinapi || 'N/A'}`);
        console.log(`   Status: ${item.status}\n`);
      });
    } else {
      console.log('❌ Nenhum item encontrado!');
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

verificarItens();
