"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CirclePlay, Home, Map, Receipt, Target, Trophy } from 'lucide-react';
import { LogoLockup, LogoMark } from '../ui/logo';
import { cn } from '../../lib/utils';
import { useFinance } from '../../context/FinanceContext';
import { getLevelInfo } from '../../lib/gamification';

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/meta', label: 'Metas', icon: Target },
  { href: '/jornada', label: 'Jornada', icon: Map },
  { href: '/conquistas', label: 'Conquistas', icon: Trophy },
  { href: '/desafio', label: 'Desafio', icon: CirclePlay },
];

export function Sidebar() {
  const pathname = usePathname();
  const { state } = useFinance();
  const levelInfo = state ? getLevelInfo(state.xp) : null;

  return (
    <aside className="hidden md:flex flex-col w-[84px] lg:w-[240px] bg-brand-900 h-screen sticky top-0 border-r border-brand-800 transition-[width] duration-200 z-40">
      <div className="p-6 flex items-center justify-center lg:justify-start h-20">
        <div className="lg:hidden">
          <LogoMark variant="white" />
        </div>
        <div className="hidden lg:block">
          <LogoLockup variant="white" />
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-6 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl transition-colors relative group",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white"
              )}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-500 rounded-r-full" />
              )}
              <Icon size={22} className="shrink-0" />
              <span className="hidden lg:block font-bold text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-brand-800 mt-auto">
        <div className="flex items-center justify-center lg:justify-start gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shrink-0 border border-brand-500 text-white font-bold text-sm">
            GS
          </div>
          <div className="hidden lg:block overflow-hidden">
            <p className="text-sm font-bold text-white truncate">Gabriel Silva</p>
            <p className="text-xs text-brand-100/70 truncate">{levelInfo?.name || 'Carregando...'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
