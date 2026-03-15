'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { StatusBadge, Loading } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, ShoppingCart, BarChart2, FileText, Building2, LogOut } from 'lucide-react';

interface Empresa { id: string; nome_fantasia: string; razao_social: string; cidade: string; estado: string; }
interface Pedido { id: string; codigo: string; status: string; valor_estimado: number; mensagem_original: string; created_at: string; obras?: { nome: string }; }
interface Ordem { id: string; codigo: string; status: string; valor_total: number; data_emissao: string; fornecedores?: { nome_fantasia: string }; obras?: { nome: string }; }

function PortalContent() {
  const params = useSearchParams();
  const empresaId = params.get('empresa');
  const token = params.get('token');

  const [tab, setTab] = useState<'dashboard' | 'pedidos' | 'ordens' | 'obras'>('dashboard');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) { setInvalid(true); setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: emp }, { data: ped }, { data: ord }, { data: obr }] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', empresaId).single(),
        supabase.from('pedidos_compra').select('*, obras(nome)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(50),
        supabase.from('ordens_compra').select('*, fornecedores(nome_fantasia), obras(nome)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(50),
        supabase.from('obras').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      ]);
      if (!emp) { setInvalid(true); return; }
      setEmpresa(emp);
      setPedidos(ped || []);
      setOrdens(ord || []);
      setObras(obr || []);
    } catch { setInvalid(true); }
    finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-screen bg-[#07080b] flex items-center justify-center"><Loading /></div>;

  if (invalid || !empresa) return (
    <div className="min-h-screen bg-[#07080b] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-white">Link inválido ou expirado</h1>
        <p className="text-gray-500">Solicite um novo link de acesso pelo WhatsApp.</p>
      </div>
    </div>
  );

  const stats = {
    pedidosAtivos: pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status)).length,
    ordensEmitidas: ordens.filter(o => ['emitida', 'confirmada', 'em_entrega'].includes(o.status)).length,
    totalGasto: ordens.filter(o => o.status === 'paga').reduce((s, o) => s + (o.valor_total || 0), 0),
    obrasAtivas: obras.filter(o => o.status === 'ativa').length,
  };

  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: BarChart2 },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
    { id: 'ordens', label: 'Ordens de Compra', icon: Package },
    { id: 'obras', label: 'Obras', icon: Building2 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      {/* Header */}
      <div className="border-b border-[#1c2030] bg-[#0d1117]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-voima-500 to-emerald-600 flex items-center justify-center">
              <span className="text-black font-extrabold text-sm">V</span>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 uppercase tracking-widest">Portal do Cliente</div>
              <div className="text-[15px] font-bold text-white">{empresa.nome_fantasia}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-gray-500">{empresa.cidade}, {empresa.estado}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-voima-500 text-voima-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pedidos Ativos', value: stats.pedidosAtivos, icon: '📋', color: 'text-blue-400' },
                { label: 'OCs Emitidas', value: stats.ordensEmitidas, icon: '📦', color: 'text-amber-400' },
                { label: 'Total Pago', value: formatCurrency(stats.totalGasto), icon: '💳', color: 'text-voima-500' },
                { label: 'Obras Ativas', value: stats.obrasAtivas, icon: '🏗️', color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#0d1117] border border-[#1c2030] rounded-xl p-4 flex justify-between items-start">
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
                    <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                  </div>
                  <span className="text-2xl opacity-40">{s.icon}</span>
                </div>
              ))}
            </div>

            {/* Últimos pedidos */}
            <div className="bg-[#0d1117] border border-[#1c2030] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1c2030] flex items-center justify-between">
                <span className="text-[13px] font-bold text-white">Últimos Pedidos</span>
                <button onClick={() => setTab('pedidos')} className="text-[12px] text-voima-500 hover:underline">ver todos</button>
              </div>
              {pedidos.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500 text-sm">Nenhum pedido ainda.</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {pedidos.slice(0, 5).map(p => (
                      <tr key={p.id} className="border-b border-[#1c2030]/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-mono text-voima-500 font-bold text-xs">{p.codigo}</td>
                        <td className="px-5 py-3 text-[12px] text-gray-400 max-w-[200px] truncate italic">"{p.mensagem_original}"</td>
                        <td className="px-5 py-3 text-[12px] text-gray-500">{p.obras?.nome || '—'}</td>
                        <td className="px-5 py-3 text-[13px] font-semibold text-white">{formatCurrency(p.valor_estimado || 0)}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Últimas OCs */}
            <div className="bg-[#0d1117] border border-[#1c2030] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1c2030] flex items-center justify-between">
                <span className="text-[13px] font-bold text-white">Ordens de Compra Recentes</span>
                <button onClick={() => setTab('ordens')} className="text-[12px] text-voima-500 hover:underline">ver todas</button>
              </div>
              {ordens.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500 text-sm">Nenhuma OC emitida ainda.</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {ordens.slice(0, 5).map(o => (
                      <tr key={o.id} className="border-b border-[#1c2030]/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-mono text-voima-500 font-bold text-xs">{o.codigo}</td>
                        <td className="px-5 py-3 text-[13px] text-white">{o.fornecedores?.nome_fantasia || '—'}</td>
                        <td className="px-5 py-3 text-[12px] text-gray-400">{o.obras?.nome || '—'}</td>
                        <td className="px-5 py-3 text-[13px] font-bold text-white">{formatCurrency(o.valor_total || 0)}</td>
                        <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* PEDIDOS */}
        {tab === 'pedidos' && (
          <div className="bg-[#0d1117] border border-[#1c2030] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1c2030]">
              <span className="text-[13px] font-bold text-white">Todos os Pedidos ({pedidos.length})</span>
            </div>
            {pedidos.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-500">Nenhum pedido encontrado.</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#1c2030]">{['Código','Solicitação','Obra','Valor','Status','Data'].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody>{pedidos.map((p,i)=>(
                  <tr key={p.id} className={`border-b border-[#1c2030]/50 hover:bg-white/[0.02] transition-colors ${i%2!==0?'bg-white/[0.01]':''}`}>
                    <td className="px-5 py-3 font-mono text-voima-500 font-bold text-xs">{p.codigo}</td>
                    <td className="px-5 py-3 text-[12px] text-gray-400 max-w-[220px] truncate italic">"{p.mensagem_original}"</td>
                    <td className="px-5 py-3 text-[12px] text-gray-400">{p.obras?.nome||'—'}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-white">{formatCurrency(p.valor_estimado||0)}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
                    <td className="px-5 py-3 text-[12px] text-gray-500">{formatDate(p.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {/* ORDENS */}
        {tab === 'ordens' && (
          <div className="bg-[#0d1117] border border-[#1c2030] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1c2030]">
              <span className="text-[13px] font-bold text-white">Ordens de Compra ({ordens.length})</span>
            </div>
            {ordens.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-500">Nenhuma OC emitida ainda.</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#1c2030]">{['OC','Fornecedor','Obra','Emissão','Valor','Status'].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody>{ordens.map((o,i)=>(
                  <tr key={o.id} className={`border-b border-[#1c2030]/50 hover:bg-white/[0.02] transition-colors ${i%2!==0?'bg-white/[0.01]':''}`}>
                    <td className="px-5 py-3 font-mono text-voima-500 font-bold text-xs">{o.codigo}</td>
                    <td className="px-5 py-3 text-[13px] text-white">{o.fornecedores?.nome_fantasia||'—'}</td>
                    <td className="px-5 py-3 text-[12px] text-gray-400">{o.obras?.nome||'—'}</td>
                    <td className="px-5 py-3 text-[12px] text-gray-400">{o.data_emissao?formatDate(o.data_emissao):'—'}</td>
                    <td className="px-5 py-3 text-[13px] font-bold text-white">{formatCurrency(o.valor_total||0)}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status}/></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {/* OBRAS */}
        {tab === 'obras' && (
          <div className="grid gap-4">
            {obras.length === 0 ? (
              <div className="bg-[#0d1117] border border-[#1c2030] rounded-xl px-5 py-12 text-center text-gray-500">Nenhuma obra cadastrada.</div>
            ) : obras.map(o => {
              const pct = o.percentual_executado || 0;
              const barColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={o.id} className="bg-[#0d1117] border border-[#1c2030] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-[15px] font-bold text-white">{o.nome}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">{[o.cidade, o.estado].filter(Boolean).join(', ')} · {o.tipo}</div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                      { label: 'Contrato', value: o.valor_contrato ? formatCurrency(o.valor_contrato) : '—' },
                      { label: 'Início', value: o.data_inicio ? formatDate(o.data_inicio) : '—' },
                      { label: 'Previsão Término', value: o.data_fim_prevista ? formatDate(o.data_fim_prevista) : '—' },
                    ].map(r => (
                      <div key={r.label}>
                        <div className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">{r.label}</div>
                        <div className="text-[13px] font-semibold text-white">{r.value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                      <span>Execução</span>
                      <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-[#1c2030] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-600">VOIMA · Sistema de Compras · Para suporte, entre em contato pelo WhatsApp</p>
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080b] flex items-center justify-center"><Loading /></div>}>
      <PortalContent />
    </Suspense>
  );
}
