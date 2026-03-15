const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam vars. Verifique .env.local (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const CSV_PATH = path.join(__dirname, '..', 'sinapi.csv');
if (!fs.existsSync(CSV_PATH)) {
  console.error('❌ sinapi.csv não encontrado na raiz do projeto');
  process.exit(1);
}

function categorizar(d) {
  d = d.toUpperCase();
  if (d.includes('ACO CA-') || d.includes('VERGALHAO')) return 'estrutural_aco';
  if (d.includes('CIMENTO')) return 'cimento';
  if (d.includes('AREIA') || d.includes('BRITA')) return 'agregado';
  if (d.includes('ARGAMASSA')) return 'argamassa';
  if (d.includes('BLOCO') || d.includes('TIJOLO')) return 'alvenaria';
  if (d.includes('TUBO PVC') || d.includes('ESGOTO')) return 'hidraulico';
  if (d.includes('FIO') || d.includes('CABO') || d.includes('ELETRODUTO')) return 'eletrico';
  if (d.includes('TINTA') || d.includes('VERNIZ')) return 'pintura';
  if (d.includes('TELHA')) return 'cobertura';
  if (d.includes('PORTA') || d.includes('JANELA')) return 'esquadria';
  if (d.includes('PISO') || d.includes('CERAMICA')) return 'revestimento';
  if (d.includes('MADEIRA') || d.includes('FORMA')) return 'madeira';
  if (d.includes('CONCRETO')) return 'concreto';
  return 'outros';
}

function gerarPalavras(desc) {
  return [...new Set(desc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(p => p.length > 2)
    .filter(p => !['para','com','sem','por','que','nao','dos','das','uso','tipo'].includes(p)))].slice(0,15);
}

async function importar() {
  console.log('🚀 Importando SINAPI...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const sep = lines[0].includes('\t') ? '\t' : ';';
  console.log('📊 ' + lines.length + ' linhas, separador: ' + (sep === '\t' ? 'TAB' : ';'));

  const items = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(sep).map(c => c.trim());
    const codigo = parseInt(cols[0]);
    const descricao = cols[1];
    const unidade = cols[2] ? cols[2].trim() : null;
    const precoStr = cols[cols.length - 1];
    if (!codigo || !descricao) continue;
    let preco = null;
    if (precoStr) { preco = parseFloat(precoStr.replace(/\./g,'').replace(',','.')); if (isNaN(preco)) preco = null; }
    items.push({
      codigo_sinapi: codigo, descricao_basica: descricao.trim(), unidade: unidade,
      categoria: categorizar(descricao), palavras_chave: gerarPalavras(descricao),
      preco_referencia: preco, preco_estado: 'GO', preco_atualizado_em: new Date().toISOString().split('T')[0],
    });
  }
  console.log('✅ ' + items.length + ' insumos parseados');

  const BATCH = 500;
  let ok = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const res = await fetch(SUPABASE_URL + '/rest/v1/produtos_sinapi', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(batch),
    });
    if (res.ok) { ok += batch.length; process.stdout.write('\r⏳ ' + ok + '/' + items.length); }
    else { const err = await res.text(); console.error('\n❌ Erro: ' + err.slice(0,300)); }
  }
  console.log('\n✅ ' + ok + ' insumos importados!');
}

importar().catch(function(e) { console.error('❌', e); process.exit(1); });
