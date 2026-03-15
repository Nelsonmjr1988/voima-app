'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { StatusBadge, Button, Loading, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, Send, CheckCircle, Eye, X, FileText } from 'lucide-react';

interface Ordem {
  id: string; codigo: string; status: string; valor_total: number;
  data_emissao: string; data_entrega_prevista: string; condicao_pagamento: string;
  fornecedores?: { nome_fantasia: string; email: string };
  pedidos_compra?: { codigo: string };
  obras?: { nome: string };
  empresas?: { nome_fantasia: string };
}

const STATUS_FLOW: Record<string, string> = {
  emitida: 'confirmada',
  confirmada: 'em_entrega',
  em_entrega: 'entregue',
  entregue: 'paga',
};

const STATUS_LABELS: Record<string, string> = {
  emitida: 'Marcar Confirmada',
  confirmada: 'Marcar Em Entrega',
  em_entrega: 'Marcar Entregue',
  entregue: 'Marcar Paga',
};

export default function OrdensPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ordem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ordens_compra')
      .select('*, fornecedores(nome_fantasia, email), pedidos_compra(codigo), obras(nome), empresas(nome_fantasia)')
      .order('created_at', { ascending: false })
      .limit(100);
    setOrdens(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const avancarStatus = async (ordem: Ordem) => {
    const novoStatus = STATUS_FLOW[ordem.status];
    if (!novoStatus) return;
    setActionLoading(ordem.id);
    try {
      const sb = supabase as any;
      const { error } = await sb.from('ordens_compra')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', ordem.id);
      if (error) throw error;
      showToast(`Status atualizado para: ${novoStatus}`);
      await load();
      setSelected(prev => prev ? { ...prev, status: novoStatus } : null);
    } catch (e: any) { showToast(e.message, 'err'); }
    finally { setActionLoading(null); }
  };

  const reenviarEmail = async (ordem: Ordem) => {
    if (!ordem.fornecedores?.email) { showToast('Fornecedor sem email cadastrado', 'err'); return; }
    setActionLoading('email-' + ordem.id);
    try {
      const res = await fetch('/api/pedidos/enviar-oc-v2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordem_compra_id: ordem.id, email_fornecedor: ordem.fornecedores.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      showToast(`OC reenviada para ${ordem.fornecedores.email}`);
    } catch (e: any) { showToast(e.message, 'err'); }
    finally { setActionLoading(null); }
  };

  const stats = {
    total: ordens.length,
    emitidas: ordens.filter(o => o.status === 'emitida').length,
    em_entrega: ordens.filter(o => o.status === 'em_entrega').length,
    valor: ordens.reduce((s, o) => s + (o.valor_total || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === 'ok' ? 'bg-voima-500 text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Ordens de Compra" subtitle="Acompanhe o status das ordens emitidas" />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total OCs', value: stats.total, icon: '📦', color: 'text-white' },
          { label: 'Emitidas', value: stats.emitidas, icon: '📤', color: 'text-blue-400' },
          { label: 'Em Entrega', value: stats.em_entrega, icon: '🚚', color: 'text-amber-400' },
          { label: 'Valor Total', value: formatCurrency(stats.valor), icon: '💰', color: 'text-voima-500' },
        ].map(s => (
          <div key={s.label} className="bg-dark-surface border border-dark-border rounded-xl p-4 flex justify-between items-start">
            <div>
              <div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            </div>
            <span className="text-2xl opacity-40">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading ? <div className="p-16"><Loading /></div> : ordens.length === 0 ? (
          <EmptyState icon={<Package size={32} />} title="Nenhuma OC emitida" description="As OCs aparecerão após aprovação das cotações" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['OC', 'Fornecedor', 'Pedido', 'Valor', 'Entrega Prev.', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordens.map((o, i) => (
                <tr key={o.id} className={`border-b border-dark-border/50 hover:bg-dark-surface2 transition-colors ${i % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="px-4 py-3 font-mono text-voima-500 font-bold text-xs whitespace-nowrap">{o.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-semibold text-white">{o.fornecedores?.nome_fantasia || '—'}</div>
                    <div className="text-[11px] text-gray-500">{o.fornecedores?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.pedidos_compra?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-white whitespace-nowrap">{formatCurrency(o.valor_total || 0)}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">
                    {o.data_entrega_prevista ? formatDate(o.data_entrega_prevista) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(o)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Detalhes">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => reenviarEmail(o)} disabled={!!actionLoading}
                        className="p-1.5 rounded-lg hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-40" title="Reenviar email">
                        <Send size={13} />
                      </button>
                      {STATUS_FLOW[o.status] && (
                        <button onClick={() => avancarStatus(o)} disabled={!!actionLoading}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 whitespace-nowrap">
                          <CheckCircle size={10} />
                          {actionLoading === o.id ? '...' : STATUS_LABELS[o.status]}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalhe */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <div>
                <div className="font-mono text-voima-500 font-bold text-lg">{selected.codigo}</div>
                <div className="text-gray-400 text-sm mt-0.5">{selected.fornecedores?.nome_fantasia}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Fornecedor', value: selected.fornecedores?.nome_fantasia },
                { label: 'Email', value: selected.fornecedores?.email },
                { label: 'Pedido vinculado', value: selected.pedidos_compra?.codigo },
                { label: 'Obra', value: selected.obras?.nome },
                { label: 'Valor total', value: formatCurrency(selected.valor_total || 0) },
                { label: 'Condição pagamento', value: selected.condicao_pagamento || '—' },
                { label: 'Emissão', value: selected.data_emissao ? formatDate(selected.data_emissao) : '—' },
                { label: 'Entrega prevista', value: selected.data_entrega_prevista ? formatDate(selected.data_entrega_prevista) : '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-dark-border/40">
                  <span className="text-[12px] text-gray-500">{row.label}</span>
                  <span className="text-[13px] font-semibold text-white">{row.value || '—'}</span>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="default" className="flex-1" onClick={() => reenviarEmail(selected)}>
                  <Send size={13} className="mr-2" /> Reenviar Email
                </Button>
                {STATUS_FLOW[selected.status] && (
                  <Button variant="primary" className="flex-1" onClick={() => avancarStatus(selected)}>
                    <CheckCircle size={13} className="mr-2" />
                    {actionLoading ? '...' : STATUS_LABELS[selected.status]}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
