'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils';
import { StatCard, StatusBadge, ProgressBar, Loading, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/sidebar';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    empresas: 0,
    obras: 0,
    pedidosPendentes: 0,
    fornecedores: 0,
  });
  const [obras, setObras] = useState<any[]>([]);
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Contar empresas ativas
      const { count: empresasCount } = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // Contar obras ativas
      const { count: obrasCount } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativa');

      // Contar pedidos pendentes
      const { count: pedidosCount } = await supabase
        .from('pedidos_compra')
        .select('*', { count: 'exact', head: true })
        .in('status', ['aguardando_aprovacao', 'cotando']);

      // Contar fornecedores
      const { count: fornecCount } = await supabase
        .from('fornecedores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      setStats({
        empresas: empresasCount || 0,
        obras: obrasCount || 0,
        pedidosPendentes: pedidosCount || 0,
        fornecedores: fornecCount || 0,
      });

      // Carregar obras com dados
      const { data: obrasData } = await supabase
        .from('obras')
        .select('*, empresas(nome_fantasia)')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(6);

      setObras(obrasData || []);

      // Carregar pedidos recentes
      const { data: pedidosData } = await supabase
        .from('pedidos_compra')
        .select('*, empresas(nome_fantasia), obras(nome), usuarios!pedidos_compra_solicitante_id_fkey(nome)')
        .order('created_at', { ascending: false })
        .limit(5);

      setPedidosRecentes(pedidosData || []);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading />;

  const hasData = stats.empresas > 0 || stats.obras > 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação Voima" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Empresas ativas" value={stats.empresas.toString()} icon="🏢" />
        <StatCard label="Obras ativas" value={stats.obras.toString()} icon="🏗️" color="text-blue-400" />
        <StatCard label="Pedidos pendentes" value={stats.pedidosPendentes.toString()} icon="🛒" color="text-amber-400" />
        <StatCard label="Fornecedores" value={stats.fornecedores.toString()} icon="🏭" color="text-voima-400" />
      </div>

      {!hasData ? (
        <EmptyState
          icon="🚀"
          title="Bem-vindo ao Voima!"
          description="Seu banco de dados está pronto. Comece cadastrando sua primeira empresa em Empresas → Nova Empresa, ou importe os dados do SINAPI."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Obras */}
          <div className="col-span-2 bg-dark-surface border border-dark-border rounded-xl p-5">
            <h2 className="text-sm font-bold mb-4">Saúde das Obras</h2>
            {obras.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhuma obra ativa</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {obras.map((obra) => {
                  const pctCusto = obra.valor_contrato > 0 ? 0 : 0; // Será calculado com lançamentos
                  const diff = obra.percentual_executado - pctCusto;
                  const saudeColor = diff >= 0 ? 'text-emerald-400' : diff > -5 ? 'text-amber-400' : 'text-red-400';
                  const barColor = diff >= 0 ? 'bg-emerald-500' : diff > -5 ? 'bg-amber-500' : 'bg-red-500';

                  return (
                    <div key={obra.id} className="bg-dark-surface2 rounded-lg p-3 border-l-2 border-voima-600">
                      <div className="text-xs font-bold mb-0.5 truncate">{obra.nome}</div>
                      <div className="text-[10px] text-gray-500 mb-3">
                        {(obra.empresas as any)?.nome_fantasia || '—'} • {formatCurrencyShort(obra.valor_contrato)}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Executado: {obra.percentual_executado}%</span>
                        <span>Prazo: {obra.data_fim_prevista ? new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}</span>
                      </div>
                      <ProgressBar value={obra.percentual_executado} color="bg-blue-500" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pedidos recentes */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
            <h2 className="text-sm font-bold mb-4">Pedidos Recentes</h2>
            {pedidosRecentes.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum pedido ainda</p>
            ) : (
              <div className="space-y-3">
                {pedidosRecentes.map((pc) => (
                  <div key={pc.id} className="border-b border-dark-border pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-400 font-mono">{pc.codigo}</span>
                      <StatusBadge status={pc.status} />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {(pc.empresas as any)?.nome_fantasia} • {(pc.obras as any)?.nome}
                    </div>
                    {pc.mensagem_original && (
                      <div className="text-[11px] text-gray-600 italic mt-1 truncate">
                        &ldquo;{pc.mensagem_original}&rdquo;
                      </div>
                    )}
                    {pc.valor_estimado && (
                      <div className="text-xs font-bold mt-1">{formatCurrency(pc.valor_estimado)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
