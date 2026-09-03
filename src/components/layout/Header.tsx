"use client";

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FlaskConical, Gauge, ReceiptText, RotateCcw, UserRound } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { cn } from '../../lib/utils';
import { LogoLockup } from '../ui/logo';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { state, restoreDemo, simulateExpense, simulateMissionCompletion, setXPNearNextLevel } = useFinance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideMobile = mobileMenuRef.current?.contains(target);
      const insideDesktop = desktopMenuRef.current?.contains(target);
      if (!insideMobile && !insideDesktop) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const runAndClose = (actionToRun: () => void) => {
    setMenuOpen(false);
    actionToRun();
  };

  const handleRestore = () => {
    setRestoreOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface p-4 md:hidden">
        <LogoLockup className="h-6" />
        <div ref={mobileMenuRef} className="relative">
          <UserButton compact open={menuOpen} name={state?.userName ?? 'Gabriel Silva'} onClick={() => setMenuOpen(value => !value)} />
          {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} onRestore={() => runAndClose(handleRestore)} onExpense={() => runAndClose(simulateExpense)} onMission={() => runAndClose(simulateMissionCompletion)} onXP={() => runAndClose(setXPNearNextLevel)} />}
        </div>
      </header>

      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {action && <div className="mr-2">{action}</div>}
          <div ref={desktopMenuRef} className="relative">
            <UserButton open={menuOpen} name={state?.userName ?? 'Gabriel Silva'} onClick={() => setMenuOpen(value => !value)} />
            {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} onRestore={() => runAndClose(handleRestore)} onExpense={() => runAndClose(simulateExpense)} onMission={() => runAndClose(simulateMissionCompletion)} onXP={() => runAndClose(setXPNearNextLevel)} />}
          </div>
        </div>
      </div>

      <div className="mb-6 mt-4 flex flex-col gap-4 px-4 md:hidden">
        <div>
          <h1 className="text-[23px] font-bold leading-tight text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <Modal isOpen={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restaurar apresentação?">
        <p className="text-sm text-text-secondary">Os dados financeiros voltarão aos valores preparados para a feira.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={() => setRestoreOpen(false)}>Cancelar</Button>
          <Button type="button" fullWidth onClick={() => { restoreDemo(); setRestoreOpen(false); }}>Restaurar</Button>
        </div>
      </Modal>
    </>
  );
}

function UserButton({ name, open, compact = false, onClick }: { name: string; open: boolean; compact?: boolean; onClick: () => void }) {
  const initials = name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return (
    <button onClick={onClick} className={cn('flex items-center gap-2 rounded-full border bg-surface transition-colors hover:border-brand-500', compact ? 'border-transparent p-0.5' : 'h-10 border-border px-2.5', open && 'border-brand-500 bg-brand-100/40')} aria-expanded={open} aria-label="Abrir perfil e modo demonstração">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-500 bg-brand-600 text-xs font-bold text-white">{initials}</span>
      {!compact && <><span className="text-xs font-bold text-text-primary">{name.split(' ')[0]}</span><ChevronDown size={14} className={cn('text-text-secondary transition-transform', open && 'rotate-180')} /></>}
    </button>
  );
}

function UserMenu({ onClose, onRestore, onExpense, onMission, onXP }: { onClose: () => void; onRestore: () => void; onExpense: () => void; onMission: () => void; onXP: () => void }) {
  return (
    <div className="dropdown-enter absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-surface p-2 shadow-soft">
      <Link href="/perfil" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-background">
        <UserRound size={17} className="text-brand-600" /> Ver perfil
      </Link>
      <div className="my-2 border-t border-border" />
      <p className="px-3 pb-1 pt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-text-secondary">Modo demonstração</p>
      <MenuButton icon={RotateCcw} label="Carregar dados da feira" onClick={onRestore} />
      <MenuButton icon={ReceiptText} label="Simular novo gasto" onClick={onExpense} />
      <MenuButton icon={FlaskConical} label="Concluir missão" onClick={onMission} />
      <MenuButton icon={Gauge} label="Preparar próximo nível" onClick={onXP} />
      <MenuButton icon={RotateCcw} label="Restaurar apresentação" onClick={onRestore} danger />
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger = false }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-background', danger ? 'text-danger' : 'text-text-primary')}><Icon size={16} />{label}</button>;
}
