"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CirclePlay, Flame, Gauge, Lightbulb, Sparkles, Target, TrendingDown, WalletCards } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Header } from '../components/layout/Header';
import { CategoryGlyph } from '../components/finance/CategoryGlyph';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useActiveMission, useFinance } from '../context/FinanceContext';
import { calculateWeeklySummary, getSmartInsights, getWeeklyChallenge, getWeeklyChallengeRewardKey } from '../lib/analytics';
import { calculateAvailableBalance, calculateCategoryTotals, calculateTotalExpenses, getFeaturedGoal } from '../lib/finance';
import { formatCurrency, formatShortDate } from '../lib/formatters';
import { getLevelInfo } from '../lib/gamification';
import { calculateGoalProgress } from '../lib/goals';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': 'var(--color-cat-food)',
  Delivery: 'var(--color-cat-delivery)',
  Transporte: 'var(--color-cat-transport)',
  Mercado: 'var(--color-cat-market)',
  'Saúde': 'var(--color-cat-health)',
  Lazer: 'var(--color-cat-leisure)',
  Contas: 'var(--color-cat-bills)',
  Outros: 'var(--color-cat-others)',
};

export default function Home() {
  const { state, startMission, completeMission, claimWeeklyChallenge } = useFinance();
  const mission = useActiveMission();
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);

  if (!state) {
    return <div className="flex flex-col gap-6 p-4 md:p-8"><div className="h-20 animate-pulse rounded-xl bg-border/50" /></div>;
  }

  const availableBalance = calculateAvailableBalance(state);
  const totalExpenses = calculateTotalExpenses(state.expenses);
  const categoryData = calculateCategoryTotals(state.expenses).filter(category => category.value > 0);
  const activeCategory = categoryData.find(category => category.name === activeCategoryName) ?? null;
  const level = getLevelInfo(state.xp);
  const featuredGoal = getFeaturedGoal(state);
  const goalProgress = featuredGoal ? calculateGoalProgress(featuredGoal) : null;
  const recentExpenses = [...state.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const summary = calculateWeeklySummary(state);
  const insights = getSmartInsights(state);
  const challenge = getWeeklyChallenge(state);
  const challengeClaimed = state.grantedRewardIds.includes(getWeeklyChallengeRewardKey(challenge.id));
  const nextLevelTarget = level.nextLevelMinXP ?? state.xp;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background p-4 md:p-8">
      <Header title="Visão geral" subtitle="Saldo, gastos e metas em um só lugar." action={<Link href="/desafio" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-800 bg-surface px-4 text-sm font-bold text-brand-900 transition-[background-color,border-color] duration-200 hover:bg-brand-100/60 md:w-auto"><CirclePlay size={18} /> Experimentar desafio</Link>} />

      <div className="mb-6 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
        <Card className="flex flex-col justify-between border-none bg-brand-900 text-white lg:col-span-4">
          <div className="mb-2 flex items-center gap-3 text-brand-100/80">
            <WalletCards size={20} />
            <h2 className="text-sm font-bold">Saldo disponível</h2>
          </div>
          <AnimatedNumber value={availableBalance} format={formatCurrency} className="mb-1 text-3xl font-bold md:text-4xl" />
          <p className="text-xs text-brand-100/60">Após gastos e valores reservados nas metas</p>
        </Card>

        <Card className="flex flex-col justify-between lg:col-span-3">
          <div className="mb-2 flex items-center gap-3 text-text-secondary">
            <TrendingDown size={20} className="text-danger" />
            <h2 className="text-sm font-bold">Gastos registrados</h2>
          </div>
          <AnimatedNumber value={totalExpenses} format={formatCurrency} className="mb-1 text-3xl font-bold md:text-4xl" />
          <p className="text-xs text-text-secondary">{state.expenses.length} {state.expenses.length === 1 ? 'registro' : 'registros'}</p>
        </Card>

        <Card className="nivvo-panel min-w-0 flex flex-col justify-between border-brand-800 bg-surface lg:col-span-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="nivvo-kicker mb-2 text-brand-600">Nível {String(level.number).padStart(2, '0')}</p>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-brand-900">{level.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4DA] px-2.5 py-1 text-xs font-bold text-[#8A5A00]">
                <Flame size={14} /> {state.streak} dias
              </span>
              <Sparkles size={21} className="text-brand-600" />
            </div>
          </div>
          <p className="mb-3 font-mono text-lg font-semibold text-text-primary"><AnimatedNumber value={state.xp} /> / {nextLevelTarget} XP</p>
          <ProgressBar progress={level.progress} className="nivvo-segments mb-2 h-2.5 bg-border" barClassName="rounded-none bg-accent-500" />
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-text-secondary">
            <span>{level.nextLevelName ? `${level.remaining} XP para ${level.nextLevelName}` : 'Nível máximo alcançado'}</span>
            <Link href="/jornada" className="font-bold text-brand-700 hover:text-brand-900">Ver jornada</Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <h3 className="mb-6 text-base font-bold">Gastos por categoria</h3>
            {categoryData.length ? (
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                <div className="flex w-full shrink-0 flex-col items-center md:w-52">
                  <div className="relative h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false} onMouseEnter={(_, index) => setActiveCategoryName(categoryData[index]?.name ?? null)} onMouseLeave={() => setActiveCategoryName(null)}>
                        {categoryData.map(category => <Cell key={category.name} fill={CATEGORY_COLORS[category.name] ?? CATEGORY_COLORS.Outros} />)}
                      </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-bold uppercase text-text-secondary">Total</span><AnimatedNumber value={totalExpenses} format={formatCurrency} className="text-sm font-bold" /></div>
                  </div>
                  <div className="mt-2 flex min-h-12 w-full items-center justify-center border border-border bg-background px-3 text-center" aria-live="polite">{activeCategory ? <p className="text-xs"><strong className="block text-text-primary">{activeCategory.name}</strong><span className="text-text-secondary">{formatCurrency(activeCategory.value)} · {Math.round(activeCategory.percentage)}%</span></p> : <p className="text-xs text-text-secondary">Passe o mouse ou selecione uma categoria.</p>}</div>
                </div>
                <div className="grid w-full flex-1 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {categoryData.map(category => (
                    <button type="button" key={category.name} onMouseEnter={() => setActiveCategoryName(category.name)} onMouseLeave={() => setActiveCategoryName(null)} onFocus={() => setActiveCategoryName(category.name)} onBlur={() => setActiveCategoryName(null)} className="flex items-center justify-between gap-3 rounded-lg p-1 text-left text-sm outline-none transition-colors duration-200 hover:bg-background focus-visible:ring-2 focus-visible:ring-brand-500">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category.name] ?? CATEGORY_COLORS.Outros }} />
                        <span className="truncate font-medium text-text-secondary">{category.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-bold">{formatCurrency(category.value)}</span>
                        <span className="w-8 text-right text-xs text-text-secondary">{Math.round(category.percentage)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <p className="py-10 text-center text-sm text-text-secondary">Registre o primeiro gasto para visualizar a distribuição.</p>}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Atividade recente</h3>
              <Link href="/gastos" className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-800">Ver todos <ArrowRight size={16} /></Link>
            </div>
            {recentExpenses.length ? (
              <div className="flex flex-col gap-2">
                {recentExpenses.map(expense => (
                  <div key={expense.id} className="expense-row-enter flex items-center justify-between gap-4 rounded-xl p-3 transition-colors hover:bg-background">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.Outros }}>
                        <CategoryGlyph category={expense.category} size={19} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-primary">{expense.description}</p>
                        <p className="text-xs text-text-secondary">{expense.category} · {formatShortDate(expense.date)}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-danger">− {formatCurrency(expense.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="py-4 text-center text-sm text-text-secondary">Nenhuma atividade recente.</p>}
          </Card>

          <Card>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="nivvo-kicker mb-1 text-brand-600">Resumo semanal</p>
                <h3 className="text-lg font-bold">Resumo da semana</h3>
              </div>
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-900 text-white">
                <span className="text-[9px] font-bold uppercase text-brand-100">Nota</span>
                <span className="text-2xl font-black text-accent-500">{summary.grade}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryValue label="Gastos" value={formatCurrency(summary.totalSpent)} />
              <SummaryValue label="Registros" value={String(summary.recordCount)} />
              <SummaryValue label="Maior categoria" value={summary.biggestCategory ?? '—'} />
              <SummaryValue label="Para metas" value={formatCurrency(summary.allocatedToGoals)} />
              <SummaryValue label="Missões" value={String(summary.completedMissions)} />
              <SummaryValue label="XP ganho" value={`+${summary.earnedXP}`} />
            </div>
            {summary.comparisonPercentage !== null && <p className="mt-3 text-xs font-medium text-text-secondary">Gastos {Math.abs(Math.round(summary.comparisonPercentage))}% {summary.comparisonPercentage <= 0 ? 'abaixo' : 'acima'} da semana anterior.</p>}
            {insights.length > 0 && (
              <div className="mt-4 space-y-2">
                {insights.map(insight => <p key={insight} className="flex gap-2 text-sm text-text-secondary"><Lightbulb size={16} className="mt-0.5 shrink-0 text-brand-600" />{insight}</p>)}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          {featuredGoal && goalProgress ? (
            <Card className="nivvo-panel relative overflow-hidden border-brand-800 bg-brand-900 text-white">
              <div className="relative mb-4 flex items-center gap-3 text-brand-100"><Target size={20} /><h3 className="nivvo-kicker">Meta ativa</h3></div>
              <p className="relative mb-1 text-lg font-bold">{featuredGoal.name}</p>
              <div className="relative mb-4 flex items-end justify-between gap-3">
                <p className="text-sm text-brand-100/70"><span className="font-mono font-semibold text-white">{formatCurrency(featuredGoal.currentAmount)}</span> de {formatCurrency(featuredGoal.targetAmount)}</p>
                <span className="font-mono text-lg font-bold text-accent-500">{Math.round(goalProgress.percentage)}%</span>
              </div>
              <ProgressBar progress={goalProgress.percentage} className="relative mb-4 bg-brand-800" barClassName="rounded-none bg-accent-500" />
              <Link href={`/meta?goal=${featuredGoal.id}`} className="relative inline-flex items-center gap-2 text-sm font-bold text-accent-500 hover:text-white">Adicionar dinheiro <ArrowRight size={16} /></Link>
            </Card>
          ) : (
            <Card className="nivvo-panel border-brand-800">
              <Target className="mb-4 text-brand-600" />
              <h3 className="mb-1 font-bold">Defina sua primeira meta</h3>
              <p className="mb-4 text-sm text-text-secondary">Defina um valor e acompanhe o que falta.</p>
              <Link href="/meta" className="text-sm font-bold text-brand-700">Criar meta <ArrowRight className="inline" size={15} /></Link>
            </Card>
          )}

          {mission ? (
            <Card className="nivvo-panel relative overflow-hidden border-brand-800 bg-surface pl-8">
              <div className="absolute inset-y-0 left-0 w-2 bg-accent-500" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="nivvo-kicker text-brand-800">Missão da semana</span>
                <span className="font-mono text-xs font-bold text-brand-600">+{mission.rewardXP} XP</span>
              </div>
              <h3 className="mb-1 text-lg font-bold">{mission.title}</h3>
              <p className="text-sm text-text-secondary">{mission.description}</p>
              <p className="mb-5 mt-1 text-sm font-semibold text-brand-900">{mission.objective}</p>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-text-secondary">{mission.progressLabel}</span>
                <span className="nivvo-kicker text-brand-600">{mission.status === 'active' ? 'Em andamento' : 'Disponível'}</span>
              </div>
              <ProgressBar progress={(mission.progress / mission.target) * 100} className="nivvo-segments mb-4 h-2 bg-border" barClassName="rounded-none bg-accent-500" />
              {mission.status === 'active' && mission.expiresAt && <p className="mb-3 text-xs text-text-secondary">Prazo: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(mission.expiresAt))}</p>}
              {mission.status !== 'active' && <button onClick={() => startMission(mission.id)} className="min-h-10 w-full rounded-lg bg-brand-900 text-sm font-bold text-white transition hover:bg-brand-800 active:translate-y-px">Aceitar missão</button>}
              {mission.status === 'active' && mission.progress >= mission.target && <button onClick={completeMission} className="min-h-10 w-full rounded-lg bg-accent-500 text-sm font-bold text-brand-900 transition active:translate-y-px">Concluir missão</button>}
            </Card>
          ) : (
            <Card><p className="nivvo-kicker mb-2 text-brand-600">Missões</p><h3 className="font-bold">Nenhuma missão disponível</h3><p className="mt-1 text-sm text-text-secondary">Continue registrando seus gastos.</p></Card>
          )}

          <Card className="border-brand-800 bg-[#F7F9F7]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="nivvo-kicker mb-1 text-brand-600">Desafio da semana</p><h3 className="text-lg font-bold">{challenge.title}</h3></div>
              <Gauge className="text-brand-700" size={22} />
            </div>
            <p className="mb-4 text-sm text-text-secondary">{challenge.description}</p>
            <ProgressBar progress={challenge.percentage} className="mb-2 h-2.5 bg-border" barClassName={challenge.percentage >= 90 ? 'rounded-none bg-danger' : 'rounded-none bg-brand-600'} />
            <div className="flex justify-between text-xs font-bold text-text-secondary">
              <span>{challenge.unit === 'currency' ? formatCurrency(challenge.current) : challenge.current}</span>
              <span>Limite {challenge.unit === 'currency' ? formatCurrency(challenge.limit) : challenge.limit} · +{challenge.rewardXP} XP</span>
            </div>
            <button onClick={claimWeeklyChallenge} disabled={challengeClaimed || challenge.current >= challenge.limit} className="mt-4 min-h-10 w-full rounded-lg border border-brand-800 text-sm font-bold text-brand-900 transition hover:bg-brand-100/60 disabled:cursor-not-allowed disabled:border-border disabled:text-text-secondary disabled:opacity-70">
              {challengeClaimed ? 'Desafio concluído' : challenge.current >= challenge.limit ? 'Limite atingido' : 'Concluir desafio'}
            </button>
          </Card>
        </div>
      </div>
    </main>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-text-secondary">{label}</p><p className="mt-1 font-mono text-sm font-bold text-text-primary">{value}</p></div>;
}
