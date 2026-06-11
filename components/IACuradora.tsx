'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Brain, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function IACuradora() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Sou o cérebro do Folksonomia Digital. Tenho acesso a todas as tags, obras e conexões do sistema. Pergunte-me qualquer coisa sobre o acervo, as correlações semânticas ou o estado dos modelos de ML.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/admin/ia-curadora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Erro ao processar resposta.'
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Falha na conexão com o motor de IA. Tente novamente.'
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center shadow-lg shadow-[#10B981]/30 hover:scale-110 transition-transform group"
        >
          <Brain size={24} className="text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-black" />
        </button>
      )}

      {/* Painel do chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-black/50 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                <Brain size={16} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm font-bold">IA Curadora</p>
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">ModernBERT + RotatE + GAT — Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#10B981] text-white rounded-br-md'
                    : 'bg-white/5 text-white/80 border border-white/5 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-white/5 border border-white/5 rounded-bl-md">
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Pensando...</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Consultando banco de dados, motores ML e barramento de eventos...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Pergunte sobre tags, obras, conexões..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#10B981]/50 placeholder:text-white/20"
                disabled={isThinking}
              />
              <button
                onClick={sendMessage}
                disabled={isThinking || !input.trim()}
                className="w-11 h-11 rounded-xl bg-[#10B981] flex items-center justify-center hover:bg-[#10B981]/80 transition-colors disabled:opacity-30"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
