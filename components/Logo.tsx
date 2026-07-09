import React from "react";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
      fill="none"
    >
      {/* Círculo Laranja (Topo Esquerdo) */}
      <circle cx="22" cy="22" r="18" fill="#E8490A" />

      {/* Pílula Verde (Baixo Esquerdo) */}
      <rect x="4" y="40" width="36" height="56" rx="18" fill="#0A7C4B" />

      {/* Forma Azul Escura (Topo Direito com cantos arredondados customizados) */}
      <path 
        d="M 40 4 
           H 80 
           C 91 4, 96 9, 96 20 
           V 64 
           C 96 64, 96 64, 96 64 
           H 56 
           C 47 64, 40 57, 40 48 
           Z" 
        fill="#0D3A85" 
      />

      {/* Forma Amarela (Centro Baixo) */}
      <path 
        d="M 40 68 
           H 58 
           C 66 68, 70 72, 70 80 
           V 96 
           H 40 
           Z" 
        fill="#F2A922" 
      />

      {/* Círculo Vermelho (Baixo Direito) */}
      <circle cx="82" cy="82" r="17" fill="#C62228" />
    </svg>
  );
}
