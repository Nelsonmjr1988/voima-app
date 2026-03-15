'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { Button, Loading } from '@/components/ui';
import { ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';

interface Empresa { id: string; nome_fantasia: string; cidade: string; estado: string; }
interface LinkGerado { empresa: string; url: string; token: string; }

export default function PortalAdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, LinkGerado>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('empresas').select('id, nome_fantasia, cidade, estado').then(({ data }) => {
      setEmpresas(data || []);
      setLoading(false);
    });
  }, []);

  const gerarLink = async (empresa: Empresa) => {
    setGerandoId(empresa.id);
    try {
      const res = await fetch('/api/portal/gerar-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresa.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLinks(prev => ({ ...prev, [empresa.id]: json }));
      setToast(`Link gerado para ${empresa.nome_fantasia}`);
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast('Erro: ' + e.message);
      setTimeout(() => setToast(null), 3000);
    }
    setGerandoId(null);
  };

  const copiar = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const abrirPortal = (url: string) => window.open(url, '_blank');

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl bg-voima-500 text-black">
          {toast}
        </div>
      )}

      <PageHeader
        title="Portal do Cliente"
        subtitle="Gere links de acesso para seus clientes visualizarem pedidos, OCs e obras"
      />

      <div className="bg-dark-surface border border-voima-500/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-voima-500 mt-0.5">💡</span>
        <div className="text-[13px] text-gray-400">
          Gere um link exclusivo para cada empresa e envie via WhatsApp. O cliente acessa o portal web e vê pedidos, ordens de compra e obras em tempo real — sem precisar de login ou senha.
        </div>
      </div>

      {loading ? <div className="p-16"><Loading /></div> : (
        <div className="space-y-3">
          {empresas.map(emp => {
            const link = links[emp.id];
            const isGerando = gerandoId === emp.id;
            return (
              <div key={emp.id} className="bg-dark-surface border border-dark-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-bold text-white">{emp.nome_fantasia}</div>
                    <div className="text-[12px] text-gray-500">{[emp.cidade, emp.estado].filter(Boolean).join(', ')}</div>
                  </div>
                  <Button variant={link ? 'default' : 'primary'} size="sm" onClick={() => gerarLink(emp)}>
                    <RefreshCw size={12} className={`mr-1.5 ${isGerando ? 'animate-spin' : ''}`} />
                    {isGerando ? 'Gerando...' : (link ? 'Novo Link' : 'Gerar Link')}
                  </Button>
                </div>

                {link && (
                  <div className="mt-4 bg-dark-surface2 border border-dark-border rounded-lg p-3">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Link de Acesso</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] text-voima-500 font-mono truncate bg-black/20 px-2 py-1.5 rounded-md">
                        {link.url}
                      </code>
                      <button onClick={() => copiar(emp.id, link.url)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Copiar">
                        {copiado === emp.id ? <Check size={14} className="text-voima-500" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => abrirPortal(link.url)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Abrir portal">
                        <ExternalLink size={14} />
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-600 flex items-center gap-1">
                      <span>Mensagem WhatsApp sugerida:</span>
                    </div>
                    <div className="mt-1 bg-black/20 rounded-md p-2 text-[11px] text-gray-400 italic">
                      Olá! Seu portal de acompanhamento de compras está disponível: {link.url} — Acesse para ver pedidos, ordens e obras em tempo real.
                    </div>
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
