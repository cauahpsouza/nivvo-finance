'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Coins, ScanLine, Target } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { displayPublicUrl } from '../../config/externalLinks';
import { LogoLockup } from '../ui/logo';

export function ChallengeLanding({ challengeUrl }: { challengeUrl: string | null }) {
  return (
    <div className="fair-landing challenge-grid min-h-screen overflow-hidden bg-brand-900 text-white">
      <header className="relative z-20 flex h-16 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <LogoLockup className="h-7" variant="white" />
        <Link href="/" className="flex min-h-11 items-center gap-2 text-xs font-bold text-brand-100/65 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"><ArrowLeft size={16} /> Voltar ao Nivvo</Link>
      </header>
      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1320px] items-center gap-8 px-5 py-7 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:py-8">
        <section className="fair-copy">
          <p className="nivvo-kicker text-accent-500">Desafio Nivvo</p>
          <h1 className="mt-5 text-5xl font-black uppercase leading-[.88] tracking-[-.055em] sm:text-7xl xl:text-[6.25rem]">Você faria<br /><span className="text-accent-500">melhor?</span></h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-100/70 sm:text-lg">Uma semana inteira. Escolhas reais. Seu resultado em dois minutos.</p>
          <div className="mt-7 grid max-w-xl grid-cols-3 border-y border-white/10 py-5">
            <FairFact icon={Coins} value="R$ 680" label="disponíveis" />
            <FairFact icon={Target} value="7 dias" label="uma meta" />
            <FairFact icon={Clock3} value="02:00" label="para decidir" />
          </div>
          <p className="mt-6 flex items-center gap-3 text-sm font-bold text-white sm:text-base"><ScanLine className="text-accent-500" /> Pegue seu celular e descubra seu resultado.</p>
        </section>

        <section className="fair-qr-panel nivvo-panel justify-self-center border border-accent-500/60 bg-[#102B24] p-5 text-center shadow-2xl sm:p-7 lg:justify-self-end" data-testid="challenge-qr-panel">
          <p className="nivvo-kicker text-accent-500">Jogue no seu celular</p>
          {challengeUrl ? (
            <>
              <div className="fair-qr-static mt-4 bg-white p-3" data-testid="challenge-qr" data-qr-value={challengeUrl} aria-label={`QR Code para ${challengeUrl}`}>
                <QRCodeSVG value={challengeUrl} size={320} level="M" marginSize={3} bgColor="#FFFFFF" fgColor="#0B1F1A" title="Abrir Desafio Nivvo" />
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-wide">Aponte a câmera para o código</p>
              <a href={challengeUrl} target="_blank" rel="noreferrer" className="mt-2 block max-w-[340px] truncate font-mono text-xs font-bold text-accent-500 underline decoration-accent-500/40 underline-offset-4">{displayPublicUrl(challengeUrl)}</a>
              <p className="mt-3 text-xs text-brand-100/55">Não precisa instalar nada.</p>
            </>
          ) : (
            <div className="mt-5 flex aspect-square w-[min(320px,72vw)] flex-col items-center justify-center border border-dashed border-brand-600 bg-brand-900/50 p-8">
              <ScanLine size={52} className="text-brand-100/35" />
              <p className="mt-5 text-sm font-bold">QR Code ainda não configurado</p>
              <p className="mt-2 text-xs leading-relaxed text-brand-100/55">Configure NEXT_PUBLIC_CHALLENGE_URL para gerar o código.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FairFact({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number }>; value: string; label: string }) {
  return <div className="flex flex-col border-r border-white/10 px-3 first:pl-0 last:border-r-0"><Icon size={17} /><strong className="mt-3 font-mono text-sm sm:text-lg">{value}</strong><span className="mt-1 text-[10px] text-brand-100/50 sm:text-xs">{label}</span></div>;
}
