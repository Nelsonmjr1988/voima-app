'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/sidebar';
import { StatusBadge, Button, Loading, EmptyState, ProgressBar } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { HardHat, Plus, X, Edit2 } from 'lucide-react';

interface Obra {
  id: string; nome: string; status: string; tipo: string;
  cidade: string; estado: string; valor_contrato: number;
  percentual_executado: number; data_inicio: string;
  data_fim_prevista: string; numero_contrato: string;
  empresas?: { nome_fantasia: string; id: string };
}
interface Empresa { id: string; nome_fantasia: string; }

const EMPTY = { nome: '', empresa_id: '', tipo: 'publica', status: 'ativa', cidade: '', estado: '', numero_contrato: '', valor_contrato: '', percentual_executado: '0', data_inicio: '', data_fim_prevista: '' };

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'}|null>(null);

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const [{data:o},{data:e}] = await Promise.all([
      supabase.from('obras').select('*, empresas(nome_fantasia, id)').order('created_at',{ascending:false}),
      supabase.from('empresas').select('id, nome_fantasia'),
    ]);
    setObras(o||[]); setEmpresas(e||[]); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (o: Obra) => {
    setEditing(o);
    setForm({ nome:o.nome||'', empresa_id:o.empresas?.id||'', tipo:o.tipo||'publica', status:o.status||'ativa', cidade:o.cidade||'', estado:o.estado||'', numero_contrato:o.numero_contrato||'', valor_contrato:String(o.valor_contrato||''), percentual_executado:String(o.percentual_executado||0), data_inicio:o.data_inicio?.slice(0,10)||'', data_fim_prevista:o.data_fim_prevista?.slice(0,10)||'' });
    setModal(true);
  };

  const save = async () => {
    if (!form.nome || !form.empresa_id) { showToast('Nome e empresa são obrigatórios','err'); return; }
    setSaving(true);
    try {
      const payload = { nome:form.nome, empresa_id:form.empresa_id, tipo:form.tipo, status:form.status, cidade:form.cidade||null, estado:form.estado||null, numero_contrato:form.numero_contrato||null, valor_contrato:parseFloat(form.valor_contrato)||null, percentual_executado:parseFloat(form.percentual_executado)||0, data_inicio:form.data_inicio||null, data_fim_prevista:form.data_fim_prevista||null };
      const sb = supabase as any;
      if (editing) {
        const {error} = await sb.from('obras').update({...payload, updated_at:new Date().toISOString()}).eq('id',editing.id);
        if (error) throw error; showToast('Obra atualizada!');
      } else {
        const {error} = await sb.from('obras').insert(payload);
        if (error) throw error; showToast('Obra criada!');
      }
      setModal(false); await load();
    } catch(e:any){ showToast(e.message,'err'); } finally { setSaving(false); }
  };

  const s = { total:obras.length, ativas:obras.filter(o=>o.status==='ativa').length, valor:obras.reduce((a,o)=>a+(o.valor_contrato||0),0), media:obras.length?Math.round(obras.reduce((a,o)=>a+(o.percentual_executado||0),0)/obras.length):0 };

  const inp = 'w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-voima-500 transition-colors';
  const fld = (label: string, key: keyof typeof EMPTY, type='text') => (
    <div><label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
    <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} className={inp}/></div>
  );
  const sel = (label: string, key: keyof typeof EMPTY, opts: {v:string;l:string}[]) => (
    <div><label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
    <select value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} className={inp}>
      <option value="">Selecione...</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
  );

  return (
    <div className="p-6 space-y-6">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type==='ok'?'bg-voima-500 text-black':'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{toast.msg}</div>}
      <PageHeader title="Obras" subtitle="Gerencie canteiros e contratos" action={<Button variant="primary" onClick={openCreate}><Plus size={14} className="mr-1.5"/>Nova Obra</Button>}/>
      <div className="grid grid-cols-4 gap-4">
        {[{l:'Total',v:s.total,i:'🏗️',c:'text-white'},{l:'Ativas',v:s.ativas,i:'✅',c:'text-voima-500'},{l:'Exec. Média',v:`${s.media}%`,i:'📊',c:'text-blue-400'},{l:'Valor Contratos',v:formatCurrency(s.valor),i:'💰',c:'text-amber-400'}].map(x=>(
          <div key={x.l} className="bg-dark-surface border border-dark-border rounded-xl p-4 flex justify-between items-start">
            <div><div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">{x.l}</div><div className={`text-2xl font-extrabold ${x.c}`}>{x.v}</div></div>
            <span className="text-2xl opacity-40">{x.i}</span>
          </div>
        ))}
      </div>
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading?<div className="p-16"><Loading/></div>:obras.length===0?(
          <EmptyState icon={<HardHat size={32}/>} title="Nenhuma obra" description="Clique em Nova Obra para começar"/>
        ):(
          <table className="w-full text-sm">
            <thead><tr className="border-b border-dark-border">{['Obra','Empresa','Local','Contrato','Execução','Status',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>{obras.map((o,i)=>{
              const pct=o.percentual_executado||0;
              const bar=pct>=80?'bg-voima-500':pct>=40?'bg-amber-500':'bg-red-500';
              return(<tr key={o.id} className={`border-b border-dark-border/50 hover:bg-dark-surface2 transition-colors ${i%2!==0?'bg-white/[0.01]':''}`}>
                <td className="px-4 py-3"><div className="text-[13px] font-semibold text-white">{o.nome}</div>{o.numero_contrato&&<div className="text-[11px] text-gray-500 font-mono">#{o.numero_contrato}</div>}</td>
                <td className="px-4 py-3 text-[13px] text-gray-300">{o.empresas?.nome_fantasia||'—'}</td>
                <td className="px-4 py-3 text-[12px] text-gray-400">{[o.cidade,o.estado].filter(Boolean).join(' – ')||'—'}</td>
                <td className="px-4 py-3 text-[13px] font-semibold text-white whitespace-nowrap">{o.valor_contrato?formatCurrency(o.valor_contrato):'—'}</td>
                <td className="px-4 py-3 min-w-[140px]"><div className="flex items-center gap-2"><ProgressBar value={pct} color={bar} height="h-1.5"/><span className="text-[11px] font-bold text-gray-400 w-8 text-right">{pct}%</span></div></td>
                <td className="px-4 py-3"><StatusBadge status={o.status}/></td>
                <td className="px-4 py-3"><button onClick={()=>openEdit(o)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><Edit2 size={13}/></button></td>
              </tr>);
            })}</tbody>
          </table>
        )}
      </div>
      {modal&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setModal(false)}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <h2 className="text-lg font-bold text-white">{editing?'Editar Obra':'Nova Obra'}</h2>
              <button onClick={()=>setModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              {fld('Nome da Obra *','nome')}
              {sel('Empresa *','empresa_id',empresas.map(e=>({v:e.id,l:e.nome_fantasia})))}
              <div className="grid grid-cols-2 gap-4">
                {sel('Tipo','tipo',[{v:'publica',l:'Pública'},{v:'privada',l:'Privada'}])}
                {sel('Status','status',[{v:'ativa',l:'Ativa'},{v:'pausada',l:'Pausada'},{v:'concluida',l:'Concluída'},{v:'cancelada',l:'Cancelada'}])}
              </div>
              <div className="grid grid-cols-2 gap-4">{fld('Cidade','cidade')}{fld('Estado (UF)','estado')}</div>
              {fld('Nº Contrato','numero_contrato')}
              <div className="grid grid-cols-2 gap-4">{fld('Valor Contrato (R$)','valor_contrato','number')}{fld('% Executado','percentual_executado','number')}</div>
              <div className="grid grid-cols-2 gap-4">{fld('Data Início','data_inicio','date')}{fld('Previsão Término','data_fim_prevista','date')}</div>
              <div className="flex gap-3 pt-2">
                <Button variant="default" onClick={()=>setModal(false)} className="flex-1">Cancelar</Button>
                <Button variant="primary" onClick={save} className="flex-1">{saving?'Salvando...':(editing?'Salvar':'Criar Obra')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
