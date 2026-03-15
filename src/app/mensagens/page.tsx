'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loading, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/sidebar';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: rows, count: total } = await supabase
        .from('mensagens_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(20);
      setData(rows || []);
      setCount(total || 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Central de Mensagens" subtitle={`${count} registros`} />
      {data.length === 0 ? (
        <EmptyState icon="💬" title="Nenhum registro" description="As mensagens aparecerão quando o Z-API for conectado." />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-dark-surface2 border-b border-dark-border">
            <span className="text-xs font-bold text-gray-400">{count} registros</span>
          </div>
          {data.map((row: any) => (
            <div key={row.id} className="px-4 py-3 border-b border-dark-border last:border-0 table-row-hover">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-blue-400 font-mono mr-2">{row.codigo || row.id?.slice(0, 8)}</span>
                  <span className="text-sm text-gray-300">{row.nome || row.razao_social || row.descricao || '—'}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase">{row.status || ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
