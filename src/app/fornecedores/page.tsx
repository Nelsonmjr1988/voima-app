'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusBadge, Button, Loading, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/sidebar';
import { Plus, X, Star } from 'lucide-react';

export default function FornecedoresPage() {
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', tipo: 'varejo' as const,
    cidade: '', estado: 'GO', contato_nome: '', telefone_whatsapp: '', email: '',
    categorias: '' // comma separated
  });

  useEffect(() => { loadFornecedores(); }, []);

  async function loadFornecedores() {
    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .order('score_geral', { ascending: false });
    setFornecedores(data || []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.razao_social) return alert('Razão Social é obrigatória');
    setSaving(true);

    const cats = form.categorias.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

    const fornecedorData = {
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      cnpj: form.cnpj || null,
      tipo: form.tipo,
      cidade: form.cidade || null,
      estado: form.estado || null,
      contato_nome: form.contato_nome || null,
      telefone_whatsapp: form.telefone_whatsapp || null,
      email: form.email || null,
      categorias: cats,
      status: 'ativo',
    } as any;

    const { error } = await (supabase as any).from('fornecedores').insert(fornecedorData);

    if (error) alert('Erro: ' + error.message);
    else {
      setShowForm(false);
      setForm({ razao_social: '', nome_fantasia: '', cnpj: '', tipo: 'varejo', cidade: '', estado: 'GO', contato_nome: '', telefone_whatsapp: '', email: '', categorias: '' });
      loadFornecedores();
    }
    setSaving(false);
  }

  if (loading) return <Loading />;

  const byTipo = {
    industria: fornecedores.filter(f => f.tipo === 'industria').length,
    distribuidor: fornecedores.filter(f => f.tipo === 'distribuidor').length,
    varejo: fornecedores.filter(f => f.tipo === 'varejo').length,
    representante: fornecedores.filter(f => f.tipo === 'representante').length,
  };

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${fornecedores.length} cadastrados na base`}
        actions={<Button variant="primary" onClick={() => setShowForm(true)}><Plus size={14} className="mr-1" /> Novo Fornecedor</Button>}
      />

      {/* Counters by type */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Indústria', count: byTipo.industria, color: 'text-red-400' },
          { label: 'Distribuidor', count: byTipo.distribuidor, color: 'text-blue-400' },
          { label: 'Representante', count: byTipo.representante, color: 'text-purple-400' },
          { label: 'Varejo', count: byTipo.varejo, color: 'text-amber-400' },
        ].map((t) => (
          <div key={t.label} className="bg-dark-surface border border-dark-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-extrabold ${t.color}`}>{t.count}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">Novo Fornecedor</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Razão Social *</label>
                <input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome Fantasia</label>
                  <input value={form.nome_fantasia} onChange={e => setForm({ ...form, nome_fantasia: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as any })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600">
                    <option value="industria">Indústria</option>
                    <option value="distribuidor">Distribuidor</option>
                    <option value="representante">Representante</option>
                    <option value="varejo">Varejo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CNPJ</label>
                  <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">UF</label>
                  <input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" maxLength={2} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contato (nome)</label>
                <input value={form.contato_nome} onChange={e => setForm({ ...form, contato_nome: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                  <input value={form.telefone_whatsapp} onChange={e => setForm({ ...form, telefone_whatsapp: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="(62) 99999-0000" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categorias (separadas por vírgula)</label>
                <input value={form.categorias} onChange={e => setForm({ ...form, categorias: e.target.value })} className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="cimento, areia, brita, aco" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="primary" className="flex-1" onClick={handleSubmit}>{saving ? 'Salvando...' : '✅ Cadastrar Fornecedor'}</Button>
              <Button onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {fornecedores.length === 0 ? (
        <EmptyState icon="🏭" title="Nenhum fornecedor cadastrado" description="Cadastre seus primeiros fornecedores para começar a cotar." />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_100px_70px_80px_80px_80px] gap-2 px-4 py-2.5 bg-dark-surface2 border-b border-dark-border">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fornecedor</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cotações</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Compras</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resposta</div>
          </div>
          {fornecedores.map((f) => (
            <div key={f.id} className="grid grid-cols-[2fr_100px_70px_80px_80px_80px] gap-2 px-4 py-3 border-b border-dark-border last:border-0 table-row-hover transition-colors">
              <div>
                <div className="text-sm font-semibold">{f.nome_fantasia || f.razao_social}</div>
                <div className="text-[10px] text-gray-500">{f.cidade}/{f.estado} • {(f.categorias || []).join(', ')}</div>
              </div>
              <div className="flex items-center"><StatusBadge status={f.tipo} /></div>
              <div className="flex items-center gap-1">
                <Star size={12} className={f.score_geral >= 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-600'} />
                <span className={`text-sm font-bold ${f.score_geral >= 4 ? 'text-emerald-400' : f.score_geral >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                  {Number(f.score_geral).toFixed(1)}
                </span>
              </div>
              <div className="text-sm font-semibold flex items-center">{f.total_cotacoes}</div>
              <div className="text-sm font-semibold text-voima-400 flex items-center">{f.total_compras}</div>
              <div className="text-sm flex items-center" style={{ color: Number(f.taxa_resposta) >= 90 ? '#22c55e' : '#f59e0b' }}>
                {Number(f.taxa_resposta).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
