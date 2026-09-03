"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Receipt, Target, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/meta', label: 'Metas', icon: Target },
  { href: '/jornada', label: 'Jornada', icon: Map },
  { href: '/conquistas', label: 'Conquistas', icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                isActive ? "text-brand-600" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-600 rounded-b-full" />
              )}
              <Icon size={20} className={isActive ? "fill-brand-600/10" : ""} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
