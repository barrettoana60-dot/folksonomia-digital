import React from "react";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1020 560" 
      className={className}
      fill="none"
    >
      {/* 
        S - Parte Superior (Azul)
      */}
      <path 
        d="M 48 240 
           C 48 140, 120 100, 220 100 
           H 310 
           C 335 100, 350 120, 350 145 
           C 350 200, 240 280, 180 330 
           C 170 340, 155 340, 145 330 
           L 55 255 
           C 50 250, 48 245, 48 240 
           Z" 
        fill="#193D87" 
      />

      {/* 
        S - Parte Inferior (Vermelho)
      */}
      <path 
        d="M 350 320 
           C 350 420, 278 460, 178 460 
           H 90 
           C 65 460, 50 440, 50 415 
           C 50 360, 160 280, 220 230 
           C 230 220, 245 220, 255 230 
           L 345 305 
           C 350 310, 350 315, 350 320 
           Z" 
        fill="#C71F28" 
      />

      {/* 
        F - Barra Superior (Laranja)
      */}
      <path 
        d="M 363 220 
           V 140 
           C 363 115, 385 100, 410 100 
           H 560 
           C 610 100, 637 120, 637 145 
           C 637 185, 590 220, 550 220 
           H 380 
           C 370 220, 363 220, 363 220 
           Z" 
        fill="#F17125" 
      />

      {/* 
        F - Barra do Meio (Amarelo)
      */}
      <path 
        d="M 363 370 
           V 270 
           C 363 265, 368 260, 373 260 
           H 540 
           C 573 260, 600 287, 600 320 
           C 600 353, 573 380, 540 380 
           H 373 
           C 368 380, 363 375, 363 370 
           Z" 
        fill="#F4B226" 
      />

      {/* 
        F - Ponto Inferior (Verde)
      */}
      <rect 
        x="363" 
        y="420" 
        width="110" 
        height="100" 
        rx="20" 
        fill="#128C4F" 
      />

      {/* 
        D - Corpo Externo (Azul)
      */}
      <path 
        d="M 663 200 
           C 663 214, 672 225, 683 225 
           H 740 
           C 790 225, 830 260, 830 310 
           C 830 360, 790 395, 740 395 
           H 683 
           C 672 395, 663 406, 663 420 
           V 480 
           C 663 502, 681 520, 703 520 
           H 830 
           C 920 520, 970 450, 970 310 
           C 970 170, 920 100, 830 100 
           H 703 
           C 681 100, 663 118, 663 140 
           Z" 
        fill="#193D87" 
      />

      {/* 
        D - Corpo Interno (Verde)
      */}
      <path 
        d="M 663 360 
           V 260 
           C 663 249, 672 240, 683 240 
           H 740 
           C 778 240, 800 270, 800 310 
           C 800 350, 778 380, 740 380 
           H 683 
           C 672 380, 663 371, 663 360 
           Z" 
        fill="#128C4F" 
      />
    </svg>
  );
}
