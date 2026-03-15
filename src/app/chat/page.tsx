'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/layout/sidebar';

type Message = { id: number; from: 'user' | 'bot'; text: string; data?: any };

const EMPRESA_ID = '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';
const SOLICITANTE_ID = '33a3874f-dd4b-427d-81f4-ec86b6f14156';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'bot', text: 'E ai! Sou o comprador da Voima. Me fala o que precisa comprar que eu resolvo.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<any[]>([]);
  const [lastItens, setLastItens] = useState<any[]>([]);
  const [lastObraId, setLastObraId] = useState<string | null>(null);
  const [aguardandoCriacao, setAguardandoCriacao] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  function addMsg(from: 'user' | 'bot', text: string, data?: any) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), from, text, data }]);
  }

  async function criarPedido() {
    try {
      const obraId = lastObraId || '926f3c00-9405-4850-81e1-afc4f9729ac1';
      const res = await fetch('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirmar', itens: lastItens, obra_id: obraId,
          solicitante_id: SOLICITANTE_ID, empresa_id: EMPRESA_ID,
          mensagem_original: messages.find(m => m.from === 'user')?.text || '',
        }),
      });
      const data = await res.json();
      if (data.etapa === 'confirmado') { addMsg('bot', '\u2705 ' + data.mensagem, data); }
      else { addMsg('bot', 'Erro: ' + (data.error || 'tente de novo')); }
    } catch (err: any) { addMsg('bot', 'Erro: ' + err.message); }
    setConversation([]); setLastItens([]); setAguardandoCriacao(false); setLastObraId(null);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    addMsg('user', text);
    setLoading(true);

    try {
      // Se aguardando criacao, qualquer coisa que nao seja negativo = cria
      if (aguardandoCriacao) {
        const negativo = /^(nao|n|cancela|para|deixa|nada|desisto|nope|errado|refaz|negativo|trocar|mudar|alterar)/i.test(text);
        if (negativo) {
          addMsg('bot', 'Beleza, cancelei. Manda quando quiser comprar.');
          setConversation([]); setLastItens([]); setAguardandoCriacao(false);
          setLoading(false);
          return;
        }
        addMsg('bot', '\u23f3 Criando pedido...');
        await criarPedido();
        setLoading(false);
        return;
      }

      // Chamar agente
      const res = await fetch('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation, empresa_id: EMPRESA_ID }),
      });
      const data = await res.json();

      if (data.error) { addMsg('bot', 'Ops: ' + data.error); setLoading(false); return; }
      if (data.conversation) setConversation(data.conversation);
      if (data.itens) setLastItens(data.itens);
      if (data.obra_id) setLastObraId(data.obra_id);

      addMsg('bot', data.resposta || data.mensagem || 'Nao entendi, repete?');

      // Se agente disse pra criar direto (usuario ja confirmou na conversa)
      if (data.criar_pedido && !data.aguardando_confirmacao) {
        addMsg('bot', '\u23f3 Criando pedido...');
        await criarPedido();
        setLoading(false);
        return;
      }

      setAguardandoCriacao(data.criar_pedido || data.aguardando_confirmacao || false);

    } catch (err: any) { addMsg('bot', 'Erro: ' + (err.message || 'tenta de novo')); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <PageHeader title="Chat Voima" subtitle="Agente de compras inteligente" />
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={'flex mb-3 ' + (msg.from === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.from === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white text-xs font-black mr-2 mt-1 shrink-0">V</div>
            )}
            <div className={msg.from === 'user'
              ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm max-w-[70%] px-4 py-2.5'
              : 'bg-dark-surface2 border border-dark-border text-gray-200 rounded-2xl rounded-bl-sm max-w-[80%] px-4 py-2.5'}>
              {msg.text.split('\n').map((line, i) => (
                <div key={i} className={line === '' ? 'h-2' : 'text-sm leading-relaxed'}>{line}</div>
              ))}
              {msg.data?.pedido && (
                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-xs font-bold text-emerald-400">{msg.data.pedido.codigo}</span>
                  {msg.data.pedido.valor_estimado > 0 && (
                    <span className="text-xs text-gray-400 ml-2">R$ {msg.data.pedido.valor_estimado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white text-xs font-black mr-2 shrink-0">V</div>
            <div className="bg-dark-surface2 border border-dark-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {messages.length <= 1 && (
        <div className="px-2 pb-2 flex gap-2 flex-wrap">
          {['200 sc cimento e 5m3 brita 1', '3000 tijolos e 50 sc argamassa', '50 capacetes e 100 luvas'].map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs bg-dark-surface border border-dark-border rounded-full px-3 py-1.5 text-gray-400 hover:text-white hover:border-emerald-600 transition-colors cursor-pointer">{s}</button>
          ))}
        </div>
      )}
      <div className="border-t border-dark-border p-3 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={loading}
          placeholder={aguardandoCriacao ? 'Confirma? (ok, sim, bora...)' : 'O que precisa comprar?'}
          className="flex-1 bg-dark-surface2 border border-dark-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-50 text-white placeholder-gray-500" />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer">Enviar</button>
      </div>
    </div>
  );
}
