'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Network, Cpu, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai'|'user', content: string, mathData?: any}[]>([
    { role: 'ai', content: 'Olá, curador. Sou o Cérebro Semântico da Folksonomia Digital. Minha inteligência matemática usa Transformers Locais para buscar correlações nas tags do acervo. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-5) })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply, mathData: data.mathData }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, meu motor semântico falhou ao processar a resposta.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Erro de conexão com o núcleo de Transformers.' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[380px] max-w-[90vw] h-[550px] max-h-[80vh] flex flex-col rounded-2xl glass-card overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="bg-[#1A1A1A]/80 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E85002]/20 border border-[#E85002]/50 flex items-center justify-center">
                  <Cpu size={16} className="text-[#E85002]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm tracking-wide">Folksonomia AI</h3>
                  <p className="text-[#E85002] text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
                    <Network size={10} /> Transformer Ativo
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
 
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 ${
                    msg.role === 'user' 
                      ? 'bg-white/10 text-white rounded-br-none border border-white/10' 
                      : 'bg-[#E85002]/10 text-white/90 rounded-bl-none border border-[#E85002]/20'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.mathData && (
                      <div className="mt-3 pt-3 border-t border-[#E85002]/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-[#E85002] font-semibold">Similaridade de Cosseno</span>
                          <span className="text-xs font-semibold text-orange-400">{Math.round(msg.mathData.similarity * 100)}%</span>
                        </div>
                        <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E85002]" style={{ width: `${Math.round(msg.mathData.similarity * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#E85002]/5 rounded-2xl rounded-bl-none p-3 border border-[#E85002]/10 flex items-center gap-2">
                    <Loader2 size={14} className="text-[#E85002] animate-spin" />
                    <span className="text-xs text-white/55 uppercase tracking-wider font-semibold">Processando vetores...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Input */}
            <div className="p-3 bg-[#1A1A1A]/90 backdrop-blur-md border-t border-white/10">
              <div className="flex relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte sobre conexões de tags..."
                  className="w-full bg-black/50 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#E85002]/50 transition-colors"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 top-1 bottom-1 w-10 bg-[#E85002] hover:bg-[#E85002]/80 disabled:bg-white/10 disabled:text-white/30 text-black flex items-center justify-center rounded-full transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#E85002] text-black hover:scale-105 transition-transform flex items-center justify-center rounded-full shadow-[0_0_20px_rgba(232,80,2,0.3)] border border-[#E85002]/50"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
}
