import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div className={cn("glass-card", className)} {...props}>
      {children}
    </div>
  );
}

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function LiquidButton({ children, className, ...props }: LiquidButtonProps) {
  return (
    <button className={cn("liquid-button px-6 py-3 font-bold text-sm", className)} {...props}>
      {children}
    </button>
  );
}
