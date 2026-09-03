"use client";

import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChallenge = pathname.startsWith('/desafio');

  if (isChallenge) return <div className="min-h-screen w-full bg-brand-900">{children}</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div key={pathname} className="page-enter flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{children}</div>
      <BottomNav />
    </div>
  );
}
