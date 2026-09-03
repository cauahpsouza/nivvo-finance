"use client";

import { Check, Flame, Medal, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { AchievementEmblem } from '../../components/gamification/AchievementEmblem';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useFinance } from '../../context/FinanceContext';
import { getAchievementCollection } from '../../lib/achievements';
import { calculateTotalAllocated } from '../../lib/finance';
import { formatCurrency } from '../../lib/formatters';
import { getLevelInfo, getUnlockedLevelRewards } from '../../lib/gamification';
import { cn } from '../../lib/utils';

export default function PerfilPage() {
  const { state, toggleEquippedBadge, setEquippedFrame, setSoundsEnabled } = useFinance();

  if (!state) return <div className="p-4 md:p-8"><div className="h-20 animate-pulse rounded-xl bg-border/50" /></div>;

  const level = getLevelInfo(state.xp);
  const achievements = getAchievementCollection(state);
  const unlocked = achievements.filter(item => item.status === 'unlocked');
  const activeGoals = state.goals.filter(goal => goal.status === 'active');
  const frames = getUnlockedLevelRewards(state.xp).filter(item => item.kind === 'frame');
  const initials = state.userName.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 bg-background p-4 md:p-8">
      <Header title="Perfil" subtitle="Seu histórico, seus emblemas e a identidade da sua jornada." />

      <Card className="nivvo-panel mb-6 overflow-hidden border-brand-800 bg-brand-900 text-white">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className={cn('relative flex h-24 w-24 shrink-0 items-center justify-center bg-brand-600 text-2xl font-black', frameClass(state.equippedFrameId))}>
            {initials}
            {state.equippedFrameId && <span className="absolute -bottom-2 bg-accent-500 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-brand-900">equipado</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="nivvo-kicker mb-2 text-accent-500">Nível {String(level.number).padStart(2, '0')} · {level.name}</p>
            <h2 className="text-2xl font-black sm:text-3xl">{state.userName}</h2>
            <p className="mt-1 text-sm text-brand-100/70">Organização financeira em progresso contínuo.</p>
            <div className="mt-4 max-w-xl">
              <div className="mb-2 flex justify-between font-mono text-xs font-bold text-brand-100"><span>{state.xp} XP</span><span>{level.nextLevelMinXP ? `${level.remaining} para ${level.nextLevelName}` : 'Jornada completa'}</span></div>
              <ProgressBar progress={level.progress} className="h-2 bg-brand-800" barClassName="rounded-none bg-accent-500" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {state.equippedBadgeIds.map(id => {
              const badge = achievements.find(item => item.id === id);
              return badge ? <AchievementEmblem key={id} achievementId={id} category={badge.category} className="h-14 w-14" /> : null;
            })}
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={Flame} label="Sequência" value={`${state.streak} dias`} />
        <Stat icon={Trophy} label="Conquistas" value={`${unlocked.length} / ${achievements.length}`} />
        <Stat icon={Sparkles} label="Missões concluídas" value={String(state.completedMissionIds.length)} />
        <Stat icon={Target} label="Metas ativas" value={String(activeGoals.length)} />
        <Stat icon={ShieldCheck} label="Total reservado" value={formatCurrency(calculateTotalAllocated(state.goals))} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="nivvo-kicker mb-1 text-brand-600">Emblemas favoritos</p><h2 className="text-lg font-bold">Escolha até três conquistas</h2></div>
            <Medal className="text-brand-600" />
          </div>
          {unlocked.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {unlocked.map(achievement => {
                const equipped = state.equippedBadgeIds.includes(achievement.id);
                return (
                  <button key={achievement.id} onClick={() => toggleEquippedBadge(achievement.id)} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-[border-color,background-color,transform] duration-200 active:translate-y-px', equipped ? 'border-brand-600 bg-brand-100/50' : 'border-border hover:border-brand-500')}>
                    <AchievementEmblem achievementId={achievement.id} category={achievement.category} className="h-12 w-12" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{achievement.title}</span><span className="block text-[10px] font-bold text-text-secondary">{achievement.rarity}</span></span>
                    {equipped && <Check size={17} className="shrink-0 text-brand-700" />}
                  </button>
                );
              })}
            </div>
          ) : <p className="py-8 text-center text-sm text-text-secondary">As conquistas desbloqueadas aparecerão aqui.</p>}
        </Card>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="nivvo-kicker mb-1 text-brand-600">Moldura do perfil</p><h2 className="text-lg font-bold">Recompensas de nível</h2></div>
            <Sparkles className="text-brand-600" />
          </div>
          <div className="space-y-3">
            <FrameOption id={null} name="Sem moldura" selected={state.equippedFrameId === null} onSelect={setEquippedFrame} />
            {frames.map(frame => <FrameOption key={frame.id} id={frame.id} name={frame.name} description={frame.description} selected={state.equippedFrameId === frame.id} onSelect={setEquippedFrame} />)}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
            <div><p className="text-sm font-bold">Sons de recompensa</p><p className="text-xs text-text-secondary">Desativados por padrão.</p></div>
            <button role="switch" aria-checked={state.settings.soundsEnabled} onClick={() => setSoundsEnabled(!state.settings.soundsEnabled)} className={cn('relative h-7 w-12 rounded-full transition-colors', state.settings.soundsEnabled ? 'bg-brand-600' : 'bg-border')}>
              <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', state.settings.soundsEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

function frameClass(frame: string | null) {
  if (frame === 'frame-master') return 'border-4 border-accent-500 outline outline-2 outline-offset-4 outline-brand-100';
  if (frame === 'frame-02') return 'border-4 border-accent-500 shadow-[8px_8px_0_#123A30]';
  if (frame === 'frame-01') return 'border-4 border-brand-100 outline outline-2 outline-brand-500';
  return 'rounded-full border-2 border-brand-500';
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return <Card className="p-4 sm:p-5"><Icon size={18} className="mb-3 text-brand-600" /><p className="text-xs font-bold text-text-secondary">{label}</p><p className="mt-1 font-mono text-base font-bold sm:text-lg">{value}</p></Card>;
}

function FrameOption({ id, name, description, selected, onSelect }: { id: string | null; name: string; description?: string; selected: boolean; onSelect: (id: string | null) => void }) {
  return <button onClick={() => onSelect(id)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors', selected ? 'border-brand-600 bg-brand-100/50' : 'border-border hover:border-brand-500')}><span className={cn('flex h-10 w-10 items-center justify-center bg-brand-600 text-xs font-black text-white', frameClass(id))}>GS</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{name}</span>{description && <span className="block text-xs text-text-secondary">{description}</span>}</span>{selected && <Check size={17} className="text-brand-700" />}</button>;
}
