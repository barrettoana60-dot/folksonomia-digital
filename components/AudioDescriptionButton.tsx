'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from './UI';

interface AudioDescriptionButtonProps {
  text: string;
  className?: string;
}

export function AudioDescriptionButton({ text, className }: AudioDescriptionButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <button
      onClick={toggleAudio}
      className={cn(
        "p-2 rounded-full border transition-all duration-300",
        isPlaying 
          ? "bg-white text-black border-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
          : "bg-transparent text-gray-400 border-white/20 hover:text-white hover:border-white/50",
        className
      )}
      aria-label={isPlaying ? "Parar audiodescrição" : "Ouvir audiodescrição"}
      title={isPlaying ? "Parar audiodescrição" : "Ouvir audiodescrição"}
    >
      {isPlaying ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}
