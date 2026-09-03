"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, Sparkles, Trophy, X } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { ToastEvent } from "../../types";
import { cn } from "../../lib/utils";

const toastStyles: Record<ToastEvent['variant'], string> = {
  success: 'border-brand-500',
  error: 'border-danger',
  info: 'border-info',
  xp: 'border-accent-500',
  achievement: 'border-accent-500',
  'level-up': 'border-accent-500',
};

function ToastIcon({ variant }: { variant: ToastEvent['variant'] }) {
  if (variant === 'achievement') return <Trophy size={20} />;
  if (variant === 'xp' || variant === 'level-up') return <Sparkles size={20} />;
  return <CheckCircle2 size={20} />;
}

export function Toaster() {
  const { state, toasts, dismissToast, levelUpInfo, dismissLevelUp } = useFinance();
  const seenToastIds = useRef(new Set<string>());
  const playedLevel = useRef<number | null>(null);

  useEffect(() => {
    const newSpecialToast = toasts.find(toast => {
      const unseen = !seenToastIds.current.has(toast.id);
      seenToastIds.current.add(toast.id);
      return unseen && (toast.variant === 'achievement' || toast.title === 'META CONCLUÍDA');
    });
    if (state?.settings.soundsEnabled && newSpecialToast) playFeedbackTone('reward');
  }, [state?.settings.soundsEnabled, toasts]);

  useEffect(() => {
    if (!levelUpInfo) {
      playedLevel.current = null;
      return;
    }
    if (state?.settings.soundsEnabled && playedLevel.current !== levelUpInfo.number) {
      playedLevel.current = levelUpInfo.number;
      playFeedbackTone('level');
    }
  }, [levelUpInfo, state?.settings.soundsEnabled]);

  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 pointer-events-none sm:bottom-4 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            data-testid="toast"
            data-toast-id={toast.id}
            className={cn(
              "toast-enter flex items-start gap-3 rounded-xl border border-l-4 bg-surface p-4 shadow-soft pointer-events-auto",
              toastStyles[toast.variant],
            )}
          >
            <div className="mt-0.5 shrink-0 text-brand-800">
              <ToastIcon variant={toast.variant} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-text-primary">{toast.title}</h4>
              {toast.description && (
                <p className={cn("mt-0.5 text-sm text-text-secondary", toast.variant === 'xp' && 'font-mono text-xs font-semibold')}>
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {levelUpInfo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-900/65 p-4" role="dialog" aria-modal="true" aria-label="Nível atualizado">
          <div className="level-up-enter nivvo-panel w-full max-w-md border border-accent-500 bg-brand-900 p-8 text-center text-white shadow-2xl">
            <p className="nivvo-kicker mb-5 text-accent-500">Nível atualizado</p>
            <p className="font-mono text-7xl font-bold leading-none text-white">{levelUpInfo.number.toString().padStart(2, '0')}</p>
            <h2 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">{levelUpInfo.name}</h2>
            {levelUpInfo.unlocks[0] && (
              <div className="mx-auto mt-6 border-y border-brand-800 py-4 text-left">
                <p className="nivvo-kicker mb-2 text-brand-100/70">Novo desbloqueio</p>
                <p className="font-bold text-accent-500">{levelUpInfo.unlocks[0].name}</p>
                <p className="mt-1 text-sm text-brand-100/70">{levelUpInfo.unlocks[0].description}</p>
              </div>
            )}
            <button onClick={dismissLevelUp} className="mt-7 min-h-11 w-full bg-accent-500 px-5 font-bold text-brand-900 transition-transform active:translate-y-px">
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function playFeedbackTone(kind: 'reward' | 'level') {
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(kind === 'level' ? 520 : 440, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'level' ? 780 : 620, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.19);
    setTimeout(() => void context.close(), 250);
  } catch {
    // Alguns navegadores bloqueiam áudio sem interação; o feedback visual permanece.
  }
}
