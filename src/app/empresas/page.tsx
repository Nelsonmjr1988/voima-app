'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge, Button, Loading, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/sidebar';
import { Plus, X } from 'lucide-react';

export default function EmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', cidade: '', estado: 'GO',
    telefone: '', email: '', plano: 'basico' as const,
  });

  useEffect(() => { loadEmpresas(); }, []);

  async function loadEmpresas() {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setEmpresas(data || []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.razao_social || !form.cnpj) return alert('Razão Social e CNPJ são obrigatórios');
    setSaving(true);

    const { error } = await supabase.from('empresas').insert({
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      cnpj: form.cnpj,
      cidade: form.cidade || null,
      estado: form.estado || null,
      telefone: form.telefone || null,
      email: form.email || null,
      plano: form.plano,
      status: 'onboarding',
    });

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setShowForm(false);
      setForm({ razao_social: '', nome_fantasia: '', cnpj: '', cidade: '', estado: 'GO', telefone: '', email: '', plano: 'basico' });
      loadEmpresas();
    }
    setSaving(false);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle={`${empresas.length} empresas cadastradas`}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1" /> Nova Empresa
          </Button>
        }
      />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">Nova Empresa</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Razão Social *</label>
                <input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })}
                  className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="Ex: Silva Engenharia Ltda" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome Fantasia</label>
                <input value={form.nome_fantasia} onChange={e => setForm({ ...form, nome_fantasia: e.target.value })}
                  className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="Ex: Silva Engenharia" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CNPJ *</label>
                  <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Plano</label>
                  <select value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value as any })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600">
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="Catalão" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="GO" maxLength={2} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone / WhatsApp</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="(64) 99999-0000" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-voima-600" placeholder="contato@empresa.com" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="primary" className="flex-1" onClick={handleSubmit}>
                {saving ? 'Salvando...' : '✅ Cadastrar Empresa'}
              </Button>
              <Button onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {empresas.length === 0 ? (
        <EmptyState icon="🏢" title="Nenhuma empresa cadastrada" description="Clique em 'Nova Empresa' para cadastrar seu primeiro cliente." />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_80px_100px_100px_90px] gap-2 px-4 py-2.5 bg-dark-surface2 border-b border-dark-border">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Empresa</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cidade</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plano</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Desde</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider"></div>
          </div>
          {empresas.map((emp) => (
            <div key={emp.id} className="grid grid-cols-[2fr_1fr_80px_100px_100px_90px] gap-2 px-4 py-3 border-b border-dark-border last:border-0 table-row-hover transition-colors">
              <div>
                <div className="text-sm font-semibold">{emp.nome_fantasia || emp.razao_social}</div>
                <div className="text-[10px] text-gray-500">{emp.cnpj}</div>
              </div>
              <div className="text-xs text-gray-400 flex items-center">{emp.cidade}/{emp.estado}</div>
              <div className="flex items-center">
                <StatusBadge status={emp.plano === 'pro' ? 'selecionada' : emp.plano === 'enterprise' ? 'ordem_gerada' : 'enviada'} />
              </div>
              <div className="flex items-center"><StatusBadge status={emp.status} /></div>
              <div className="text-xs text-gray-500 flex items-center">{formatDate(emp.created_at)}</div>
              <div className="flex items-center">
                <Button size="sm" variant="ghost">Editar</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
