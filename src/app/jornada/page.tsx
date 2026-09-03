"use client";

import { Check, LockKeyhole, Map, ShieldCheck } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useFinance } from '../../context/FinanceContext';
import { formatLevelNumber, getLevelInfo, LEVELS } from '../../lib/gamification';

export default function JornadaPage() {
  const { state } = useFinance();
  if (!state) return <div className="p-4 md:p-8 animate-pulse"><div className="h-32 rounded-xl bg-border/50" /></div>;

  const current = getLevelInfo(state.xp);
  const target = current.nextLevelMinXP ?? state.xp;
  const routeProgress = ((current.number - 1) / (LEVELS.length - 1)) * 100;

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 bg-background p-4 md:p-8">
      <Header title="Jornada" subtitle="Veja seu nível atual e o que falta para avançar." />

      <Card className="nivvo-panel mb-8 border-brand-800 bg-brand-900 text-white">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <div>
            <p className="nivvo-kicker mb-3 text-accent-500">Nível atual</p>
            <p className="font-mono text-sm font-semibold text-brand-100">NÍVEL {formatLevelNumber(current.number)}</p>
            <h2 className="mt-1 text-3xl font-extrabold uppercase tracking-tight">{current.name}</h2>
          </div>
          <div>
            <div className="mb-3 flex flex-col gap-1 font-mono text-xs font-semibold text-brand-100 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
              <span>{current.isMax ? 'NÍVEL MÁXIMO' : `${state.xp} / ${target} XP`}</span>
              {!current.isMax && <span className="sm:text-right">{current.remaining} XP para {current.nextLevelName}</span>}
            </div>
            <ProgressBar ariaLabel="Progresso do nível atual" progress={current.progress} className="h-3 bg-brand-800" barClassName="rounded-none bg-accent-500" />
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="nivvo-kicker mb-2 text-brand-600">Mapa de progressão</p>
          <h2 className="text-xl font-bold text-text-primary">Do Iniciante ao Mestre</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-brand-600">
          <Map aria-hidden="true" size={19} />
          <span className="nivvo-kicker">Marco {formatLevelNumber(current.number)} / {formatLevelNumber(LEVELS.length)}</span>
        </div>
      </div>

      <div className="relative">
        <div aria-hidden="true" className="absolute bottom-8 left-[1.625rem] top-8 z-10 w-px md:left-[2.375rem]">
          <span className="absolute inset-0 border-l border-dashed border-[#AAB5B0]" />
          <span className="journey-route-enter absolute left-0 top-0 w-px origin-top bg-brand-600 transition-[height] duration-500 motion-reduce:transition-none" style={{ height: `${routeProgress}%` }} />
        </div>
        <ol aria-label="Mapa dos níveis da Jornada" className="space-y-4">
          {LEVELS.map(level => {
            const isCompleted = level.number < current.number;
            const isCurrent = level.number === current.number;
            const isLocked = level.number > current.number;
            return (
              <li
                key={level.number}
                aria-current={isCurrent ? 'step' : undefined}
                className={`nivvo-panel relative ml-0 grid gap-4 border p-5 pl-16 transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none md:pl-24 lg:grid-cols-[180px_1fr_auto] lg:items-center ${isCurrent ? 'journey-current-enter' : ''} ${
                  isCurrent ? 'border-brand-800 border-l-4 border-l-accent-500 bg-surface shadow-soft' : isCompleted ? 'border-brand-100 bg-surface' : 'border-border bg-[#F0F2F1]'
                }`}
              >
                <div className={`absolute left-3 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center border md:left-6 ${
                  isCompleted ? 'border-brand-600 bg-brand-600 text-white' : isCurrent ? 'border-brand-800 bg-accent-500 text-brand-900' : 'border-[#B9C2BE] bg-surface text-[#56625D]'
                } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}>
                  {isCompleted ? <Check size={15} /> : isLocked ? <LockKeyhole size={13} /> : <ShieldCheck size={15} />}
                </div>

                <span
                  aria-hidden="true"
                  className={`absolute left-[2.75rem] top-1/2 z-10 hidden h-px w-7 origin-left lg:block ${isLocked ? 'bg-[#AAB5B0]' : 'bg-brand-100'} ${level.number % 2 === 0 ? 'rotate-[6deg]' : '-rotate-[6deg]'}`}
                />

                <div>
                  <p className={`nivvo-kicker mb-1 ${isCurrent ? 'text-brand-600' : isLocked ? 'text-[#56625D]' : 'text-text-secondary'}`}>Nível {formatLevelNumber(level.number)}</p>
                  <h3 className={`text-lg font-extrabold uppercase ${isLocked ? 'text-[#56625D]' : 'text-brand-900'}`}>{level.name}</h3>
                  <p className={`mt-1 font-mono text-xs ${isLocked ? 'text-[#56625D]' : 'text-text-secondary'}`}>A partir de {level.minXP} XP</p>
                </div>

                <div className="space-y-2">
                  {level.unlocks.map(unlock => (
                    <div key={unlock.id} className={`flex items-start gap-3 border-l-2 px-3 py-2 ${isLocked ? 'border-border bg-surface/50' : 'border-accent-500 bg-brand-100/35'}`}>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${isLocked ? 'text-[#56625D]' : 'text-text-primary'}`}>{unlock.name}</p>
                        <p className={`text-xs ${isLocked ? 'text-[#56625D]' : 'text-text-secondary'}`}>{unlock.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <span className={`nivvo-kicker justify-self-start lg:justify-self-end ${isCurrent ? 'text-brand-600' : isLocked ? 'text-[#56625D]' : 'text-text-secondary'}`}>
                  {isCompleted ? 'Concluído' : isCurrent ? 'Você está aqui' : 'Bloqueado'}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
