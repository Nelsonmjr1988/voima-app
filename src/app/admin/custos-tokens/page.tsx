'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, DollarSign, AlertCircle, BarChart3 } from 'lucide-react';

interface CustoMensal {
  id: string;
  empresa_id: string;
  mes_referencia: string;
  total_material: number;
  total_mao_obra: number;
  total_impostos: number;
  total_frete: number;
  total_outros: number;
  tokens_ai_agent: number;
  tokens_email: number;
  tokens_whatsapp: number;
  total_tokens_custo: number;
  custo_operacional: number;
  custo_total_mes: number;
  quantidade_pedidos: number;
  quantidade_cotacoes: number;
}

interface Empresa {
  id: string;
  nome_fantasia: string;
  cnpj: string;
}

export default function DashboardCustosTokens() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [custos, setCustos] = useState<CustoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar empresas
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cnpj')
        .eq('status', 'ativo');

      setEmpresas(empresasData || []);

      // Carregar custos do mês
      const { data: custosData } = await supabase
        .from('custos_mensais_empresa')
        .select('*')
        .eq('mes_referencia', mesAtual);

      setCustos(custosData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [mesAtual]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Calcs
  const totalTokensCusto = custos.reduce((sum, c) => sum + (c.total_tokens_custo || 0), 0);
  const totalOperacional = custos.reduce((sum, c) => sum + (c.custo_operacional || 0), 0);
  const totalMes = custos.reduce((sum, c) => sum + (c.custo_total_mes || 0), 0);
  const totalPedidos = custos.reduce((sum, c) => sum + (c.quantidade_pedidos || 0), 0);
  const totalCotacoes = custos.reduce((sum, c) => sum + (c.quantidade_cotacoes || 0), 0);

  const customFiltered = selectedEmpresa
    ? custos.filter(c => c.empresa_id === selectedEmpresa)
    : custos;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Custos & Tokens"
        subtitle={`Monitoramento de consumo e gastos - ${mesAtual}`}
      />

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Custo Tokens</div>
              <div className="text-2xl font-extrabold mt-2">{formatCurrency(totalTokensCusto)}</div>
              <div className="text-xs text-gray-400 mt-1">Todos os canais</div>
            </div>
            <DollarSign className="w-8 h-8 opacity-30" />
          </div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Custo Operacional</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-2">{formatCurrency(totalOperacional)}</div>
              <div className="text-xs text-gray-400 mt-1">Material + Mão-obra</div>
            </div>
            <TrendingUp className="w-8 h-8 opacity-30" />
          </div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Mês</div>
              <div className="text-2xl font-extrabold text-indigo-400 mt-2">{formatCurrency(totalMes)}</div>
              <div className="text-xs text-gray-400 mt-1">Tokens + Operacional</div>
            </div>
            <BarChart3 className="w-8 h-8 opacity-30" />
          </div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Atividades</div>
              <div className="text-2xl font-extrabold text-green-400 mt-2">{totalPedidos + totalCotacoes}</div>
              <div className="text-xs text-gray-400 mt-1">{totalPedidos} pedidos • {totalCotacoes} cotações</div>
            </div>
            <AlertCircle className="w-8 h-8 opacity-30" />
          </div>
        </div>
      </div>

      {/* Filtro por empresa */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Filtrar por Empresa</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedEmpresa(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              !selectedEmpresa
                ? 'bg-green-600 text-white'
                : 'bg-dark-border text-gray-400 hover:bg-dark-border/50'
            }`}
          >
            Todas ({empresas.length})
          </button>
          {empresas.map(emp => {
            const custo = custos.find(c => c.empresa_id === emp.id);
            return (
              <button
                key={emp.id}
                onClick={() => setSelectedEmpresa(emp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedEmpresa === emp.id
                    ? 'bg-green-600 text-white'
                    : 'bg-dark-border text-gray-400 hover:bg-dark-border/50'
                }`}
              >
                {emp.nome_fantasia} {custo && `• ${formatCurrency(custo.custo_total_mes)}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de detalhes */}
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-dark-border">
          <div className="text-sm font-bold">Detalhamento por Empresa</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Empresa', 'Tokens (AI)', 'Email', 'WhatsApp', 'Total Tokens', 'Material', 'Mão-obra', 'Impostos', 'Total/Mês'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customFiltered.map((custo, i) => {
                const empresa = empresas.find(e => e.id === custo.empresa_id);
                return (
                  <tr
                    key={custo.id}
                    className={`border-b border-dark-border/50 ${i % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{empresa?.nome_fantasia || '—'}</td>
                    <td className="px-4 py-3 text-green-400">{formatCurrency(custo.tokens_ai_agent || 0)}</td>
                    <td className="px-4 py-3 text-blue-400">{formatCurrency(custo.tokens_email || 0)}</td>
                    <td className="px-4 py-3 text-purple-400">{formatCurrency(custo.tokens_whatsapp || 0)}</td>
                    <td className="px-4 py-3 font-bold text-yellow-400">{formatCurrency(custo.total_tokens_custo || 0)}</td>

                    <td className="px-4 py-3">{formatCurrency(custo.total_material || 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(custo.total_mao_obra || 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(custo.total_impostos || 0)}</td>
                    <td className="px-4 py-3 font-bold text-indigo-400 text-right pr-8">{formatCurrency(custo.custo_total_mes || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown de tokens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">🤖 Tokens AI (GPT)</div>
          <div className="text-lg font-bold text-green-400 mb-2">{formatCurrency(custos.reduce((s, c) => s + (c.tokens_ai_agent || 0), 0))}</div>
          <div className="text-xs text-gray-400">Interpretações de pedidos com IA</div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">📧 Emails com Anexo</div>
          <div className="text-lg font-bold text-blue-400 mb-2">{formatCurrency(custos.reduce((s, c) => s + (c.tokens_email || 0), 0))}</div>
          <div className="text-xs text-gray-400">OCs enviadas via Resend API</div>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">💬 WhatsApp</div>
          <div className="text-lg font-bold text-purple-400 mb-2">{formatCurrency(custos.reduce((s, c) => s + (c.tokens_whatsapp || 0), 0))}</div>
          <div className="text-xs text-gray-400">Via EvolutionAPI</div>
        </div>
      </div>

      {/* Alerta de custos altos */}
      {customFiltered.some(c => c.custo_total_mes > 5000) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-400">⚠️ Custo elevado detectado</div>
              <div className="text-sm text-gray-300 mt-1">
                Uma ou mais empresas ultrapassaram R$ 5.000 em gastos este mês. 
                Recomenda-se revisar gastos com material e otimizar processo de cotação.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
