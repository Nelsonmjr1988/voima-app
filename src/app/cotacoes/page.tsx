'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { StatusBadge, Button, Loading, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, ChevronDown, ChevronRight, Package, Star } from 'lucide-react';

interface Cotacao {
  id: string; codigo: string; status: string; preco_unitario: number; preco_total: number;
  prazo_entrega_dias: number; data_resposta: string; data_envio: string;
  fornecedores?: { nome_fantasia: string; email: string };
  itens_pedido_compra?: { descricao_padronizada: string; quantidade: number; unidade: string; pedido_compra_id: string };
}

interface PedidoGroup {
  pedido_id: string; pedido_codigo: string; empresa: string; obra: string;
  cotacoes: Cotacao[];
}

export default function CotacoesPage() {
  const [groups, setGroups] = useState<PedidoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cotacoes } = await supabase
      .from('cotacoes')
      .select('*, fornecedores(nome_fantasia, email), itens_pedido_compra(descricao_padronizada, quantidade, unidade, pedido_compra_id)')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!cotacoes) { setLoading(false); return; }

    // Agrupar por pedido
    const pedidoIds = Array.from(new Set(cotacoes.map((c: any) => c.itens_pedido_compra?.pedido_compra_id).filter(Boolean)));
    const { data: pedidos } = await supabase
      .from('pedidos_compra')
      .select('id, codigo, obras(nome), empresas(nome_fantasia)')
      .in('id', pedidoIds);

    const pedidoMap: Record<string, any> = {};
    (pedidos || []).forEach((p: any) => { pedidoMap[p.id] = p; });

    const groupMap: Record<string, PedidoGroup> = {};
    cotacoes.forEach((c: any) => {
      const pid = c.itens_pedido_compra?.pedido_compra_id;
      if (!pid) return;
      if (!groupMap[pid]) {
        const p = pedidoMap[pid];
        groupMap[pid] = {
          pedido_id: pid,
          pedido_codigo: p?.codigo || '—',
          empresa: p?.empresas?.nome_fantasia || '—',
          obra: p?.obras?.nome || '—',
          cotacoes: [],
        };
      }
      groupMap[pid].cotacoes.push(c);
    });

    setGroups(Object.values(groupMap));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const gerarOC = async (pedidoId: string) => {
    setActionLoading(pedidoId);
    try {
      const res = await fetch('/api/pedidos/gerar-ocs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: pedidoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      showToast(`${json.total_ordens} OC(s) gerada(s)! Total: ${formatCurrency(json.valor_total_pedido)}`);
      await load();
    } catch (e: any) { showToast(e.message, 'err'); }
    finally { setActionLoading(null); }
  };

  const stats = {
    total: groups.reduce((s, g) => s + g.cotacoes.length, 0),
    respondidas: groups.reduce((s, g) => s + g.cotacoes.filter(c => c.status === 'respondida').length, 0),
    pedidos: groups.length,
    aguardando: groups.reduce((s, g) => s + g.cotacoes.filter(c => c.status === 'enviada').length, 0),
  };

  // Melhor preço por item dentro de um grupo
  const getBestPerItem = (cotacoes: Cotacao[]) => {
    const byItem: Record<string, Cotacao[]> = {};
    cotacoes.filter(c => c.status === 'respondida').forEach(c => {
      const key = c.itens_pedido_compra?.descricao_padronizada || c.id;
      if (!byItem[key]) byItem[key] = [];
      byItem[key].push(c);
    });
    const bestIds = new Set<string>();
    Object.values(byItem).forEach(arr => {
      const best = arr.reduce((a, b) => (a.preco_unitario || 999999) < (b.preco_unitario || 999999) ? a : b);
      bestIds.add(best.id);
    });
    return bestIds;
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === 'ok' ? 'bg-voima-500 text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Mapa de Cotações" subtitle="Visualize e gerencie as respostas dos fornecedores" />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Cotações', value: stats.total, icon: '📊', color: 'text-white' },
          { label: 'Respondidas', value: stats.respondidas, icon: '✅', color: 'text-voima-500' },
          { label: 'Aguardando', value: stats.aguardando, icon: '⏳', color: 'text-amber-400' },
          { label: 'Pedidos Ativos', value: stats.pedidos, icon: '📋', color: 'text-blue-400' },
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

      {loading ? <div className="p-16"><Loading /></div> : groups.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border rounded-xl">
          <EmptyState icon={<FileText size={32} />} title="Nenhuma cotação" description="As cotações aparecerão quando pedidos forem aprovados e disparados" />
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const isOpen = expanded.has(g.pedido_id);
            const respondidas = g.cotacoes.filter(c => c.status === 'respondida');
            const bestIds = getBestPerItem(g.cotacoes);
            const temRespostas = respondidas.length > 0;
            const isLoading = actionLoading === g.pedido_id;

            return (
              <div key={g.pedido_id} className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
                {/* Header do grupo */}
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-dark-surface2 transition-colors" onClick={() => toggle(g.pedido_id)}>
                  <div className="flex items-center gap-4">
                    <div className="text-gray-500">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-voima-500 font-bold text-sm">{g.pedido_codigo}</span>
                        <span className="text-[12px] font-semibold text-white">{g.empresa}</span>
                        <span className="text-[12px] text-gray-500">· {g.obra}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {g.cotacoes.length} cotações · {respondidas.length} respondidas
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold">
                        {respondidas.length} ✓
                      </span>
                      <span className="text-[11px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold">
                        {g.cotacoes.filter(c => c.status === 'enviada').length} ⏳
                      </span>
                    </div>
                    {temRespostas && (
                      <Button variant="primary" size="sm" onClick={() => gerarOC(g.pedido_id)}>
                        <Package size={12} className="mr-1.5" />
                        {isLoading ? 'Gerando...' : 'Gerar OC'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cotações expandidas */}
                {isOpen && (
                  <div className="border-t border-dark-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-surface2/50">
                          {['Item', 'Fornecedor', 'Preço Unit.', 'Preço Total', 'Prazo', 'Status', ''].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {g.cotacoes.map(c => {
                          const isBest = bestIds.has(c.id);
                          return (
                            <tr key={c.id} className={`border-t border-dark-border/40 transition-colors ${isBest ? 'bg-voima-500/5' : 'hover:bg-dark-surface2/50'}`}>
                              <td className="px-4 py-3 text-[12px] text-gray-300">{c.itens_pedido_compra?.descricao_padronizada || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="text-[13px] font-semibold text-white">{c.fornecedores?.nome_fantasia || '—'}</div>
                                <div className="text-[11px] text-gray-500">{c.fornecedores?.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isBest && <Star size={11} className="text-voima-500 fill-voima-500" />}
                                  <span className={`text-[13px] font-bold ${isBest ? 'text-voima-500' : 'text-white'}`}>
                                    {c.preco_unitario ? formatCurrency(c.preco_unitario) : '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[13px] text-white">{c.preco_total ? formatCurrency(c.preco_total) : '—'}</td>
                              <td className="px-4 py-3 text-[12px] text-gray-400">{c.prazo_entrega_dias ? `${c.prazo_entrega_dias}d` : '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                              <td className="px-4 py-3">
                                {isBest && <span className="text-[10px] font-bold text-voima-500 bg-voima-500/10 px-2 py-0.5 rounded-md">MELHOR</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
