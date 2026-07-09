'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Globe, Users, Database, Heart, Play, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [activeSolutionTab, setActiveSolutionTab] = useState(0);

  useEffect(() => {
    try {
      const hash = localStorage.getItem('visitante_hash') || '';
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina: '/', hash })
      });
    } catch { /* silencioso */ }
  }, []);

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] relative overflow-hidden pt-32 pb-24 font-sans selection:bg-[#0D3A85] selection:text-white">
      
      {/* ─── ELEMENTOS GEOMÉTRICOS DE FUNDO (CULTIVA BRAND) ─── */}
      <div className="absolute top-10 left-[-80px] w-64 h-64 rounded-full bg-[#E8490A] opacity-95 pointer-events-none" />
      <div className="absolute top-[340px] left-[-90px] w-48 h-80 rounded-full bg-[#0A7C4B] opacity-95 pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 rounded-full bg-[#F2A922] opacity-90 pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[#0D3A85] opacity-95 pointer-events-none" />
      <div className="absolute top-[380px] right-[-60px] w-36 h-36 rounded-full bg-[#0D3A85] opacity-90 pointer-events-none" />
      <div className="absolute bottom-[240px] right-[240px] w-64 h-64 rounded-full bg-[#E8490A] opacity-95 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-50px] w-[450px] h-[450px] rounded-full bg-[#0D3A85] opacity-95 pointer-events-none" />
      <div className="absolute bottom-10 left-[40%] w-[320px] h-[120px] rounded-full bg-[#C62228] opacity-[0.92] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 space-y-16">
        
        {/* ─── HERO SECTION + MAPA RAG DE CONEXÕES ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LADO ESQUERDO: Chamada principal */}
          <div className="lg:col-span-6 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#0A7C4B] animate-pulse"></span>
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70">
                TECNOLOGIA · CULTURA · CONEXÃO
              </span>
            </div>

            <h1 className="text-4xl md:text-[3.6rem] font-extrabold tracking-tight leading-[1.08] text-[#1A1A1A] font-sans max-w-xl">
              Conectamos culturas.<br />
              <span className="text-[#0D3A85]">Transformamos</span> realidades<span className="text-[#E8490A]">.</span>
            </h1>

            <p className="text-[#1A1A1A]/70 text-sm md:text-base leading-relaxed max-w-lg font-normal">
              CULTIVA é uma plataforma que utiliza tecnologia para impulsionar o intercâmbio cultural, o acesso a oportunidades e a colaboração entre pessoas e instituições do mundo todo.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => router.push('/questionario')}
                className="liquid-button !bg-[#0D3A85] !border-[#0D3A85]/20 !text-white !px-10 !py-4 !rounded-full !text-[12px] !font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                Conheça o projeto <ArrowRight size={16} />
              </button>
              <button
                onClick={() => alert('Assista à apresentação do projeto CULTIVA. Carregando player semântico...')}
                className="liquid-button !bg-white/45 !border-white/50 !text-[#1A1A1A] !px-8 !py-4 !rounded-full !text-[12px] !font-bold flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0D3A85] shadow-sm"><Play size={10} fill="#0D3A85" className="ml-0.5" /></div>
                Assista ao vídeo
              </button>
            </div>
          </div>

          {/* LADO DIREITO: Painel de Vidro Líquido do Mapa RAG */}
          <div className="lg:col-span-6 space-y-6">
            <div className="glass-card !bg-white/50 border border-white/55 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between h-[380px]">
              
              {/* Mapa de Fundo SVG Pontilhado */}
              <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M150 120 C180 90, 220 180, 300 130 C380 80, 420 220, 500 160 C580 100, 680 180, 750 140" stroke="#0D3A85" strokeWidth="2" strokeDasharray="5 5" />
                  <path d="M100 280 C180 260, 240 380, 350 300 C460 220, 520 360, 640 280 C760 200, 720 380, 780 340" stroke="#E8490A" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="150" cy="120" r="4" fill="#0D3A85" />
                  <circle cx="300" cy="130" r="4" fill="#E8490A" />
                  <circle cx="500" cy="160" r="4" fill="#0A7C4B" />
                  <circle cx="750" cy="140" r="4" fill="#F2A922" />
                  <circle cx="350" cy="300" r="4" fill="#C62228" />
                  <circle cx="640" cy="280" r="4" fill="#0D3A85" />
                </svg>
              </div>

              {/* Conexões de Arco com Avatars */}
              <div className="absolute inset-0 z-10">
                <svg className="w-full h-full" viewBox="0 0 500 300" fill="none">
                  {/* Arcos */}
                  <path d="M100 100 Q200 40 320 110" stroke="#E8490A" strokeWidth="1.5" className="animate-pulse" />
                  <path d="M220 180 Q270 120 320 110" stroke="#0A7C4B" strokeWidth="1.5" />
                  <path d="M320 110 Q360 160 410 190" stroke="#F2A922" strokeWidth="1.5" />
                  <path d="M100 100 Q220 160 220 180" stroke="#0D3A85" strokeWidth="1.5" />
                </svg>

                {/* Participante 1 */}
                <div className="absolute top-[80px] left-[80px] group cursor-pointer">
                  <div className="w-10 h-10 rounded-full border-2 border-[#E8490A] overflow-hidden bg-white shadow-md transition-transform group-hover:scale-110">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" alt="Ana" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Participante 2 (Centro) */}
                <div className="absolute top-[160px] left-[200px] group cursor-pointer">
                  <div className="w-10 h-10 rounded-full border-2 border-[#0A7C4B] overflow-hidden bg-white shadow-md transition-transform group-hover:scale-110">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" alt="João" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Participante 3 (Topo-Direito) */}
                <div className="absolute top-[90px] right-[140px] group cursor-pointer">
                  <div className="w-10 h-10 rounded-full border-2 border-[#0D3A85] overflow-hidden bg-white shadow-md transition-transform group-hover:scale-110">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" alt="Mariana" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Participante 4 (Baixo-Direito) */}
                <div className="absolute top-[170px] right-[60px] group cursor-pointer">
                  <div className="w-10 h-10 rounded-full border-2 border-[#F2A922] overflow-hidden bg-white shadow-md transition-transform group-hover:scale-110">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" alt="Pedro" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Título do Box */}
              <div className="relative z-20">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#0D3A85] bg-[#0D3A85]/10 px-3 py-1 rounded-full">Rede Global de Projetos</span>
              </div>

              {/* Rodapé Estatísticas do Box */}
              <div className="grid grid-cols-4 gap-2 relative z-20 pt-4 border-t border-black/05">
                {[
                  { value: '120+', label: 'Países conectados', icon: <Globe size={12} />, color: '#0D3A85' },
                  { value: '8.500+', label: 'Participantes', icon: <Users size={12} />, color: '#C62228' },
                  { value: '650+', label: 'Instituições', icon: <Database size={12} />, color: '#F2A922' },
                  { value: '1.200+', label: 'Projetos criados', icon: <Heart size={12} />, color: '#0A7C4B' },
                ].map((stat, i) => (
                  <div key={i} className="text-center space-y-1">
                    <div className="w-6 h-6 rounded-full mx-auto flex items-center justify-center text-white" style={{ background: stat.color }}>
                      {stat.icon}
                    </div>
                    <p className="text-xs md:text-sm font-black leading-none pt-0.5 text-[#1A1A1A]">{stat.value}</p>
                    <p className="text-[8px] text-[#1A1A1A]/45 leading-tight tracking-tight uppercase font-bold">{stat.label}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

        {/* ─── NOSSAS SOLUÇÕES & CHAMADA DE PARTICIPAÇÃO ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CARDS ESQUERDOS: Nossas Soluções */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-bold text-[#1A1A1A] tracking-tight">Nossas soluções</h2>
              <div className="flex gap-2">
                <button onClick={() => setActiveSolutionTab(p => Math.max(0, p - 1))} className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-[#1A1A1A]/60 hover:bg-black/5 transition-all"><ArrowLeft size={14} /></button>
                <button onClick={() => setActiveSolutionTab(p => Math.min(3, p + 1))} className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-[#1A1A1A]/60 hover:bg-black/5 transition-all"><ArrowRight size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Conexão cultural', desc: 'Conectamos artistas, coletivos e instituições para criar colaborações reais.', icon: <Users size={18} />, color: '#0D3A85' },
                { title: 'Intercâmbio global', desc: 'Promovemos experiências de intercâmbio e aprendizado entre culturas.', icon: <Globe size={18} />, color: '#C62228' },
                { title: 'Eventos e experiências', desc: 'Divulgamos eventos, festivais e workshops que impulsionam a cultura.', icon: <Database size={18} />, color: '#E8490A' },
                { title: 'Dados e impacto', desc: 'Utilizamos dados para medir impactos e gerar transformação social através da cultura.', icon: <Heart size={18} />, color: '#0A7C4B' },
              ].map((sol, i) => (
                <div key={i} 
                  className={`glass-card p-6 rounded-[1.8rem] border transition-all duration-300 flex flex-col justify-between h-[210px] cursor-pointer ${
                    activeSolutionTab === i ? 'border-[#0D3A85] shadow-lg scale-[1.02] bg-white/70' : 'border-white/50 bg-white/40 hover:bg-white/60'
                  }`}
                  onClick={() => setActiveSolutionTab(i)}
                >
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: sol.color }}>
                      {sol.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#1A1A1A] leading-tight">{sol.title}</h3>
                      <p className="text-[11px] text-[#1A1A1A]/60 leading-relaxed">{sol.desc}</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center text-[#1A1A1A]/60 group-hover:bg-[#0D3A85] group-hover:text-white transition-all"><ArrowRight size={12} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD DIREITO: Quero Participar */}
          <div className="lg:col-span-4">
            <div className="glass-card !bg-white/45 border border-white/55 rounded-[2.2rem] p-8 shadow-lg flex flex-col justify-between h-[255px] relative overflow-hidden group">
              
              {/* Imagem de Fundo do Card com Overlay Escuro */}
              <div className="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500" alt="Comunidade" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25" />
              </div>

              <div className="relative z-10 space-y-2">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[#F2A922]">Fazer Parte</span>
                <h3 className="text-base md:text-lg font-bold text-white leading-tight">Faça parte deste movimento global.</h3>
                <p className="text-[11px] text-white/70 leading-relaxed font-light max-w-xs">
                  Junte-se a uma comunidade que acredita no poder da cultura para construir um mundo mais humano e conectado.
                </p>
              </div>

              <div className="relative z-10 pt-4">
                <button 
                  onClick={() => router.push('/questionario')}
                  className="liquid-button !bg-white !text-[#1A1A1A] !py-2.5 !px-6 !rounded-full !text-[11px] !font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow"
                >
                  Quero participar <ArrowRight size={12} className="text-black/60" />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
