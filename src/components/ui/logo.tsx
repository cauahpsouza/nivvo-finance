import React from "react";

export function LogoMark({ className = "w-8 h-8", variant = 'primary' }: { className?: string, variant?: 'primary' | 'white' }) {
  const mainColor = variant === 'primary' ? 'text-brand-900' : 'text-white';
  const accentColor = 'text-accent-500';

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Nivvo Mark">
      <path d="M6 20V6L18 18V8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={mainColor} />
      <path d="M18 7.5V3" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={accentColor} />
    </svg>
  );
}

export function LogoLockup({ className = "h-8", variant = 'primary' }: { className?: string, variant?: 'primary' | 'white' }) {
  const textColor = variant === 'primary' ? 'text-brand-900' : 'text-white';
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Nivvo">
      <LogoMark className="h-full w-auto" variant={variant} />
      <span className={`font-bold tracking-tight text-2xl ${textColor}`} style={{ lineHeight: 1, letterSpacing: '-0.02em', marginTop: '2px' }}>nivvo</span>
    </div>
  );
}
