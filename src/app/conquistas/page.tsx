"use client";

import { useMemo, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { AchievementEmblem } from '../../components/gamification/AchievementEmblem';
import { useFinance } from '../../context/FinanceContext';
import { getAchievementCollection } from '../../lib/achievements';
import { getLevelInfo } from '../../lib/gamification';
import { formatShortDate } from '../../lib/formatters';
import { Achievement, AchievementCategory } from '../../types';

const filters: Array<'Todas' | AchievementCategory> = ['Todas', 'Organização', 'Metas', 'Consistência', 'Economia', 'Exploração'];

const rarityStyles: Record<Achievement['rarity'], string> = {
  COMUM: 'border-[#B5C4BD] bg-[#E8EDEB] text-[#5A6B63]',
  RARO: 'border-[#6BA3BE] bg-[#E0EFF5] text-[#2A6F8E]',
  ÉPICO: 'border-[#7DBA45] bg-[#EAF5E0] text-[#3D7A10]',
  LENDÁRIO: 'border-brand-800 bg-brand-100 text-brand-900',
};

export default function ConquistasPage() {
  const { state } = useFinance();
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todas');

  const collection = useMemo(() => state ? getAchievementCollection(state) : [], [state]);
  if (!state) return <div className="p-4 md:p-8 animate-pulse"><div className="h-24 rounded-xl bg-border/50" /></div>;

  const unlocked = collection.filter(item => item.status === 'unlocked');
  const overallProgress = collection.length > 0 ? (unlocked.length / collection.length) * 100 : 0;
  const visible = filter === 'Todas' ? collection : collection.filter(item => item.category === filter);
  const nextAchievement = collection
    .filter(item => item.status === 'locked')
    .sort((a, b) => b.progress.percentage - a.progress.percentage || a.order - b.order)[0];
  const level = getLevelInfo(state.xp);
  const levelTarget = level.nextLevelMinXP ?? state.xp;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background p-4 md:p-8">
      <Header title="Conquistas" subtitle="Uma coleção que acompanha sua evolução no longo prazo." />

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.5fr_.75fr]">
        <Card className="flex flex-col justify-center">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="nivvo-kicker mb-2 text-brand-600">Coleção</p><h2 className="text-2xl font-extrabold text-brand-900">{unlocked.length} / {collection.length} conquistadas</h2></div>
            <span className="font-mono text-sm font-bold text-brand-600">{Math.round(overallProgress)}%</span>
          </div>
          <ProgressBar ariaLabel="Progresso geral da coleção de conquistas" progress={overallProgress} className="h-3 bg-border" barClassName="rounded-none bg-brand-500" />
          {nextAchievement && (
            <div className="mt-5 flex items-center gap-4 border-t border-border pt-5">
              <AchievementEmblem achievementId={nextAchievement.id} category={nextAchievement.category} locked className="h-12 w-12" />
              <div className="min-w-0 flex-1"><p className="nivvo-kicker mb-1 text-text-secondary">Próxima conquista</p><p className="font-bold">{nextAchievement.title}</p><p className="mt-1 font-mono text-xs text-text-secondary">{nextAchievement.progress.label}</p></div>
              <span className="font-mono text-xs font-bold text-brand-600">{Math.round(nextAchievement.progress.percentage)}%</span>
            </div>
          )}
        </Card>

        <Card className="nivvo-panel flex flex-col justify-center border-brand-800 bg-brand-900 text-white">
          <p className="nivvo-kicker mb-2 text-accent-500">Nível {level.number.toString().padStart(2, '0')}</p>
          <h2 className="text-2xl font-extrabold uppercase">{level.name}</h2>
          <p className="mb-2 mt-3 font-mono text-xs text-brand-100/80">{level.isMax ? 'NÍVEL MÁXIMO' : `${state.xp} / ${levelTarget} XP`}</p>
          <ProgressBar ariaLabel={`Progresso do nível ${level.name}`} progress={level.progress} className="h-2 bg-brand-800" barClassName="rounded-none bg-accent-500" />
        </Card>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrar conquistas por categoria">
        {filters.map(item => (
          <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${filter === item ? 'border-brand-900 bg-brand-900 text-white' : 'border-border bg-surface text-text-secondary hover:border-brand-500'}`}>{item}</button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div key={filter} className="achievement-grid-enter mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(achievement => {
            const isUnlocked = achievement.status === 'unlocked';
            return (
              <Card key={achievement.id} className={`nivvo-panel relative flex min-h-[260px] flex-col overflow-hidden ${isUnlocked ? 'border-brand-800 bg-surface' : 'border-[#CCD3D0] bg-[#F0F2F1]'}`}>
                {isUnlocked && <div className="absolute inset-y-0 left-0 w-1.5 bg-accent-500" />}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className={`nivvo-kicker border px-2 py-1 ${rarityStyles[achievement.rarity]}`}>{achievement.rarity}</span>
                  <span className={`nivvo-kicker ${isUnlocked ? 'text-brand-600' : 'text-text-secondary'}`}>{isUnlocked ? 'Conquistada' : 'Bloqueada'}</span>
                </div>
                <div className="mb-5 flex items-start gap-4">
                  <AchievementEmblem achievementId={achievement.id} category={achievement.category} locked={!isUnlocked} />
                  <div className="pt-1"><p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{achievement.category}</p><h3 className={`mt-1 font-bold ${isUnlocked ? 'text-text-primary' : 'text-text-secondary'}`}>{achievement.title}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{isUnlocked ? achievement.description : achievement.conditionDescription}</p></div>
                </div>

                {!isUnlocked && (
                  <div className="mt-auto">
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] font-semibold text-text-secondary"><span>{achievement.progress.label}</span><span>{Math.round(achievement.progress.percentage)}%</span></div>
                    <ProgressBar ariaLabel={`Progresso da conquista ${achievement.title}`} progress={achievement.progress.percentage} className="h-1.5 bg-border" barClassName="rounded-none bg-brand-500" />
                  </div>
                )}

                <div className={`${isUnlocked ? 'mt-auto' : 'mt-4'} flex items-center justify-between border-t border-border pt-4`}>
                  <span className="text-xs text-text-secondary">{isUnlocked && achievement.unlockedAt ? formatShortDate(achievement.unlockedAt) : `Nº ${achievement.order.toString().padStart(2, '0')}`}</span>
                  <span className={`font-mono text-xs font-bold ${isUnlocked ? 'text-brand-600' : 'text-text-secondary'}`}>+{achievement.rewardXP} XP</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Card className="py-12 text-center"><p className="font-bold">Nenhuma conquista nesta categoria.</p></Card>}

    </main>
  );
}
