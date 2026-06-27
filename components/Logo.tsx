import React from 'react';

/**
 * Nova logo institucional — formas geométricas coloridas
 * representando comunidade/pessoas (conforme imagem de referência)
 */
const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 85" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Quadrado azul arredondado — esquerda (principal) */}
        <rect x="2" y="2" width="40" height="40" rx="10" ry="10" fill="#1E3A8A" />

        {/* Píula verde — centro superior */}
        <rect x="48" y="2" width="18" height="44" rx="9" ry="9" fill="#1A6B3A" />

        {/* Círculo amarelo — direita superior */}
        <circle cx="83" cy="18" r="15" fill="#E8A920" />

        {/* Laranja arredondado — baixo esquerda */}
        <rect x="2" y="46" width="40" height="30" rx="10" ry="10" fill="#E8490A" />

        {/* Vermelho blob — baixo direita */}
        <path
          d="M50 52 Q50 46 60 46 L84 46 Q94 46 94 56 L94 72 Q94 82 80 82 Q62 82 54 76 Q50 72 50 66 Z"
          fill="#C0252B"
        />
      </svg>
    </div>
  );
};

export default Logo;
