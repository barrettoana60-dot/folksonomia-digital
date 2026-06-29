import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── GlassCard ────────────────────────────────────────────────────────────────
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── LiquidButton ─────────────────────────────────────────────────────────────
interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function LiquidButton({ children, className, ...props }: LiquidButtonProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 font-bold text-sm bg-[#E8490A] text-white rounded-xl hover:opacity-90 transition-opacity',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}