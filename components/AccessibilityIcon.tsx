'use client';

import React from 'react';

interface AccessibilityIconProps {
  className?: string;
  size?: number;
}

export default function AccessibilityIcon({ className = '', size = 20 }: AccessibilityIconProps) {
  return (
    <img
      src="/icone-acessibilidade.png"
      alt="Símbolo Universal de Acessibilidade"
      width={size}
      height={size}
      className={`object-contain rounded-full inline-block shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
