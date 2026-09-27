'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Volume2, VolumeX, Maximize2, Move } from 'lucide-react';

interface ObraZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  titulo: string;
  artista?: string;
  ano?: string;
  descricao?: string;
  audiodescricao?: string;
}

export default function ObraZoomModal({
  isOpen,
  onClose,
  imageUrl,
  titulo,
  artista,
  ano,
  descricao,
  audiodescricao,
}: ObraZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [speaking, setSpeaking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Resetar zoom ao abrir
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSpeaking(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        changeZoom(scale + 0.25);
      } else if (e.key === '-') {
        e.preventDefault();
        changeZoom(scale - 0.25);
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scale, onClose]);

  // Audio descrição
  const handleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = `Obra: ${titulo}. Artista: ${artista || 'Autor não informado'}. ${
      audiodescricao || descricao || 'Visualização ampliada da obra de arte.'
    }`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.onend = () => setSpeaking(false);

    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const changeZoom = (newScale: number) => {
    const clamped = Math.min(4, Math.max(1, Math.round(newScale * 100) / 100));
    setScale(clamped);
    if (clamped === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom pelo mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    changeZoom(scale + delta);
  };

  // Alternar com double-click
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      changeZoom(2);
    }
  };

  // Drag / Pan com mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const percentZoom = Math.round(scale * 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-xl text-white select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Barra Superior */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E8490A]/20 border border-[#E8490A]/40 flex items-center justify-center text-[#E8490A]">
            <ZoomIn size={16} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-normal serif-title text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
              {titulo}
            </h2>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">
              {artista || 'Autor não informado'} {ano ? `· ${ano}` : ''}
            </p>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Preset buttons */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 border border-white/15">
            {[1, 1.5, 2, 3].map(preset => (
              <button
                key={preset}
                onClick={() => changeZoom(preset)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  Math.abs(scale - preset) < 0.05
                    ? 'bg-[#E8490A] text-white shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>

          {/* Menos zoom */}
          <button
            onClick={() => changeZoom(scale - 0.25)}
            disabled={scale <= 1}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Reduzir zoom (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Indicador atual */}
          <span className="text-[11px] font-mono font-bold text-white px-1 sm:px-2 min-w-[50px] text-center">
            {percentZoom}%
          </span>

          {/* Mais zoom */}
          <button
            onClick={() => changeZoom(scale + 0.25)}
            disabled={scale >= 4}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Aumentar zoom (+)"
          >
            <ZoomIn size={16} />
          </button>

          {/* Resetar */}
          <button
            onClick={resetZoom}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all text-white/80 hover:text-white"
            title="Restaurar tamanho original (0)"
          >
            <RotateCcw size={15} />
          </button>

          {/* Áudio */}
          <button
            onClick={handleSpeech}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all ${
              speaking
                ? 'bg-[#E8490A] text-white border-[#E8490A]'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
            }`}
            title={speaking ? 'Parar áudio' : 'Ouvir audiodescrição'}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Fechar */}
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 hover:bg-red-500/80 border border-white/20 flex items-center justify-center transition-all text-white ml-2"
            title="Fechar (ESC)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Área da Imagem */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${
          scale > 1
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-100 ease-out flex items-center justify-center will-change-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={imageUrl}
            alt={titulo}
            draggable={false}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-none"
          />
        </div>

        {/* Dica flutuante quando ampliado */}
        {scale > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 flex items-center gap-2 pointer-events-none text-[10px] text-white/70">
            <Move size={12} className="text-[#E8490A]" />
            <span>Arraste para explorar detalhes da obra</span>
          </div>
        )}
      </div>

      {/* Rodapé Informativo */}
      <div
        className="px-6 py-3 border-t border-white/10 bg-black/50 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-white/60"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-white/70">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          <span>Zoom exclusivo da obra · A interface permanece intacta</span>
        </div>

        <div className="text-[10px] text-white/40 flex items-center gap-3">
          <span>Scroll do mouse: Zoom</span>
          <span>·</span>
          <span>Dois cliques: 200%</span>
          <span>·</span>
          <span>ESC: Fechar</span>
        </div>
      </div>
    </div>
  );
}
