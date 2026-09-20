import React from 'react';
import { cn } from './UI';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'glass';
}

export function LiquidButton({ children, variant = 'primary', className, ...props }: LiquidButtonProps) {
  const baseStyles = "relative overflow-hidden group font-bold tracking-wide transition-all duration-300 ease-out rounded-lg px-6 py-3 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]",
    secondary: "bg-transparent border border-white/40 text-white hover:bg-white/10 hover:border-white",
    glass: "bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      )}
    </button>
  );
}
