'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { StatusBadge, Loading, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface OC {
  id: string; codigo: string; valor_total: number; status: string;
  data_emissao: string; data_entrega_prevista: string;
  fornecedores?: { nome_fantasia: string };
  obras?: { nome: string };
  pedidos_compra?: { codigo: string };
}

export default function FinanceiroPage() {
  const [ordens, setOrdens] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ordens_compra')
      .select('*, fornecedores(nome_fantasia), obras(nome), pedidos_compra(codigo)')
      .order('data_emissao', { ascending: false })
      .limit(200);
    setOrdens(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const meses = Array.from(new Set(ordens.map(o => o.data_emissao?.slice(0, 7)).filter((x): x is string => !!x))).sort().reverse();

  const filtradas = ordens.filter(o => {
    if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false;
    if (filtroMes !== 'todos' && !o.data_emissao?.startsWith(filtroMes)) return false;
    return true;
  });

  const total = filtradas.reduce((s, o) => s + (o.valor_total || 0), 0);
  const pagas = filtradas.filter(o => o.status === 'paga').reduce((s, o) => s + (o.valor_total || 0), 0);
  const pendentes = filtradas.filter(o => !['paga'].includes(o.status)).reduce((s, o) => s + (o.valor_total || 0), 0);
  const emEntrega = filtradas.filter(o => o.status === 'em_entrega').length;

  const statusOpts = ['todos','emitida','confirmada','em_entrega','entregue','paga'];

  const sel = 'bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-voima-500 transition-colors';

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Financeiro" subtitle="Acompanhe pagamentos e fluxo das ordens de compra" />

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total OCs', value: formatCurrency(total), icon: <DollarSign size={20}/>, color: 'text-white', bg: 'bg-white/5' },
          { label: 'Pago', value: formatCurrency(pagas), icon: <TrendingUp size={20}/>, color: 'text-voima-500', bg: 'bg-voima-500/10' },
          { label: 'A Pagar', value: formatCurrency(pendentes), icon: <TrendingDown size={20}/>, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Em Entrega', value: emEntrega, icon: <Clock size={20}/>, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-dark-surface border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-500 uppercase tracking-widest">{s.label}</span>
              <span className={`p-1.5 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</span>
            </div>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de barras por mês (simples) */}
      {meses.length > 0 && (
        <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
          <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-4">Valor por mês</div>
          <div className="flex items-end gap-3 h-28">
            {meses.slice(0, 8).map(mes => {
              const val = ordens.filter(o => o.data_emissao?.startsWith(mes)).reduce((s, o) => s + (o.valor_total || 0), 0);
              const max = Math.max(...meses.slice(0, 8).map(m => ordens.filter(o => o.data_emissao?.startsWith(m)).reduce((s, o) => s + (o.valor_total || 0), 0)));
              const pct = max > 0 ? Math.round((val / max) * 100) : 0;
              const [ano, m] = mes.split('-');
              const nomes = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return (
                <div key={mes} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[10px] text-gray-500">{formatCurrency(val).replace('R$\u00a0', '').replace(/\.000$/, 'k')}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                    <div className="w-full rounded-t-md bg-voima-500/70 hover:bg-voima-500 transition-colors" style={{ height: `${pct}%`, minHeight: val > 0 ? 4 : 0 }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{nomes[parseInt(m)]}/{ano.slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={sel}>
          {statusOpts.map(s => <option key={s} value={s}>{s === 'todos' ? 'Todos os status' : s}</option>)}
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={sel}>
          <option value="todos">Todos os meses</option>
          {meses.map(m => {
            const [ano, mes] = m.split('-');
            const nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            return <option key={m} value={m}>{nomes[parseInt(mes)]}/{ano}</option>;
          })}
        </select>
        <span className="text-[12px] text-gray-500 ml-auto">{filtradas.length} registros · {formatCurrency(total)}</span>
      </div>

      {/* Tabela */}
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading ? <div className="p-16"><Loading /></div> : filtradas.length === 0 ? (
          <EmptyState icon={<DollarSign size={32} />} title="Nenhum lançamento" description="Os lançamentos aparecerão quando OCs forem emitidas" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['OC','Pedido','Fornecedor','Obra','Emissão','Entrega Prev.','Valor','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o, i) => (
                <tr key={o.id} className={`border-b border-dark-border/50 hover:bg-dark-surface2 transition-colors ${i % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="px-4 py-3 font-mono text-voima-500 font-bold text-xs whitespace-nowrap">{o.codigo}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{o.pedidos_compra?.codigo || '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-white">{o.fornecedores?.nome_fantasia || '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400">{o.obras?.nome || '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{o.data_emissao ? formatDate(o.data_emissao) : '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{o.data_entrega_prevista ? formatDate(o.data_entrega_prevista) : '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-white whitespace-nowrap">{formatCurrency(o.valor_total || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
