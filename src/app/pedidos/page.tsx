'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { StatusBadge, Button, Loading, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart, Eye, CheckCircle, Send, Package, X } from 'lucide-react';

interface Item { id: string; descricao_padronizada: string; quantidade: number; unidade: string; preco_referencia_sinapi: number; }
interface Pedido {
  id: string; codigo: string; status: string; valor_estimado: number;
  mensagem_original: string; created_at: string;
  obras?: { nome: string }; empresas?: { nome_fantasia: string };
  _itens?: Item[];
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pedidos_compra')
      .select('*, obras(nome), empresas(nome_fantasia)')
      .order('created_at', { ascending: false })
      .limit(100);
    setPedidos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (p: Pedido) => {
    const { data: itens } = await supabase.from('itens_pedido_compra').select('*').eq('pedido_compra_id', p.id);
    setSelected({ ...p, _itens: itens || [] });
  };

  const runAction = async (label: string, fn: () => Promise<Response>) => {
    setActionLoading(label);
    try {
      const res = await fn();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      showToast(json.mensagem || `${label} realizado!`);
      await load();
      setSelected(null);
    } catch (e: any) { showToast(e.message, 'err'); }
    finally { setActionLoading(null); }
  };

  const aprovar = (p: Pedido) => runAction('Aprovando', () =>
    fetch('/api/pedidos/aprovar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido_id: p.id }) }));
  const cotar = (p: Pedido) => runAction('Cotando', () =>
    fetch('/api/pedidos/cotar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido_compra_id: p.id }) }));
  const gerarOC = (p: Pedido) => runAction('Gerando OC', () =>
    fetch('/api/pedidos/gerar-ocs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido_id: p.id }) }));

  const stats = {
    total: pedidos.length,
    aguardando: pedidos.filter(p => p.status === 'aguardando_aprovacao').length,
    cotando: pedidos.filter(p => p.status === 'cotando').length,
    concluidos: pedidos.filter(p => ['ordem_gerada', 'entregue'].includes(p.status)).length,
  };

  const actionsByStatus: Record<string, { label: string; Icon: any; fn: (p: Pedido) => void }[]> = {
    aguardando_aprovacao: [{ label: 'Aprovar', Icon: CheckCircle, fn: aprovar }],
    aprovado: [{ label: 'Disparar Cotação', Icon: Send, fn: cotar }],
    cotando: [{ label: 'Gerar OC', Icon: Package, fn: gerarOC }],
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === 'ok' ? 'bg-voima-500 text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Pedidos de Compra" subtitle="Gerencie e acompanhe todos os pedidos"
        action={<Button variant="primary" onClick={() => window.location.href = '/chat'}>+ Novo Pedido</Button>} />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: '📋', color: 'text-white' },
          { label: 'Aguardando', value: stats.aguardando, icon: '⏳', color: 'text-amber-400' },
          { label: 'Em Cotação', value: stats.cotando, icon: '💬', color: 'text-blue-400' },
          { label: 'Concluídos', value: stats.concluidos, icon: '✅', color: 'text-voima-500' },
        ].map(s => (
          <div key={s.label} className="bg-dark-surface border border-dark-border rounded-xl p-4 flex justify-between items-start">
            <div>
              <div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            </div>
            <span className="text-2xl opacity-40">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading ? <div className="p-16"><Loading /></div> : pedidos.length === 0 ? (
          <EmptyState icon={<ShoppingCart size={32} />} title="Nenhum pedido" description="Crie um pedido pelo Chat Voima" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Código', 'Empresa / Obra', 'Solicitação', 'Valor Ref.', 'Status', 'Data', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <tr key={p.id} className={`border-b border-dark-border/50 hover:bg-dark-surface2 transition-colors ${i % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="px-4 py-3 font-mono text-voima-500 font-bold text-xs whitespace-nowrap">{p.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-semibold text-white">{p.empresas?.nome_fantasia || '—'}</div>
                    <div className="text-[11px] text-gray-500">{p.obras?.nome || '—'}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-[12px] text-gray-400 line-clamp-1 italic">"{p.mensagem_original}"</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white whitespace-nowrap">{formatCurrency(p.valor_estimado || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(p)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Ver detalhes">
                        <Eye size={13} />
                      </button>
                      {(actionsByStatus[p.status] || []).map(a => (
                        <button key={a.label} onClick={() => a.fn(p)} disabled={actionLoading !== null}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-voima-500/10 text-voima-500 hover:bg-voima-500/20 transition-colors disabled:opacity-40 whitespace-nowrap">
                          <a.Icon size={10} />
                          {actionLoading ? '...' : a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <div>
                <div className="font-mono text-voima-500 font-bold text-lg">{selected.codigo}</div>
                <div className="text-gray-400 text-sm mt-0.5">{selected.empresas?.nome_fantasia} · {selected.obras?.nome}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-dark-surface2 border border-dark-border rounded-xl p-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Solicitação original</div>
                <p className="text-gray-300 text-sm italic">"{selected.mensagem_original}"</p>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">Itens do pedido</div>
                <div className="space-y-2">
                  {selected._itens?.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between bg-dark-surface2 border border-dark-border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-600 w-4">{i + 1}</span>
                        <span className="text-sm text-white font-medium">{item.descricao_padronizada}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">{item.quantidade} {item.unidade}</span>
                        <span className="text-white font-semibold">{formatCurrency((item.preco_referencia_sinapi || 0) * item.quantidade)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="bg-voima-500/10 border border-voima-500/20 rounded-lg px-4 py-2">
                    <span className="text-[11px] text-gray-400 mr-2">VALOR ESTIMADO</span>
                    <span className="text-voima-500 font-bold">{formatCurrency(selected.valor_estimado || 0)}</span>
                  </div>
                </div>
              </div>
              {(actionsByStatus[selected.status] || []).length > 0 && (
                <div className="flex gap-3 pt-2">
                  {(actionsByStatus[selected.status] || []).map(a => (
                    <Button key={a.label} variant="primary" onClick={() => a.fn(selected)} className="flex-1">
                      <a.Icon size={14} className="mr-2" />
                      {actionLoading ? 'Processando...' : a.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
