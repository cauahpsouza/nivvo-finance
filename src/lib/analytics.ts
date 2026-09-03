import { AppState, WeeklyChallenge } from '../types';
import { calculateCategoryTotals, getExpensesSince, getFeaturedGoal } from './finance';
import { calculateGoalProgress, calculateGoalRoute } from './goals';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklySummary {
  totalSpent: number;
  recordCount: number;
  biggestCategory: string | null;
  allocatedToGoals: number;
  completedMissions: number;
  earnedXP: number;
  comparisonPercentage: number | null;
  grade: 'S' | 'A' | 'B' | 'C';
  gradeScore: number;
}

export function updateActivityStreak(state: AppState, now = new Date()): Pick<AppState, 'streak' | 'lastActivityDate'> {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!state.lastActivityDate) return { streak: Math.max(1, state.streak), lastActivityDate: today.toISOString() };

  const last = new Date(state.lastActivityDate);
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const difference = Math.round((today.getTime() - lastDay.getTime()) / DAY_MS);

  if (difference <= 0) return { streak: state.streak, lastActivityDate: state.lastActivityDate };
  if (difference === 1) return { streak: state.streak + 1, lastActivityDate: today.toISOString() };
  return { streak: 1, lastActivityDate: today.toISOString() };
}

export function calculateOrganizationGrade(state: AppState, now = new Date()): { grade: WeeklySummary['grade']; score: number } {
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const records = getExpensesSince(state.expenses, weekStart).length;
  const contributions = state.goalContributions.filter(item => new Date(item.date).getTime() >= weekStart.getTime()).length;
  const missionRewards = state.xpHistory.filter(item => item.reason.includes('Missão') && new Date(item.date).getTime() >= weekStart.getTime()).length;

  let score = 0;
  score += records >= 5 ? 35 : records >= 2 ? 22 : records > 0 ? 12 : 0;
  score += contributions > 0 ? 25 : state.goals.some(goal => goal.status === 'active') ? 12 : 0;
  score += state.streak >= 7 ? 25 : state.streak >= 3 ? 16 : state.streak > 0 ? 8 : 0;
  score += missionRewards > 0 ? 15 : state.activeMissionId ? 8 : 0;
  score = Math.min(100, score);

  if (score >= 90) return { grade: 'S', score };
  if (score >= 75) return { grade: 'A', score };
  if (score >= 55) return { grade: 'B', score };
  return { grade: 'C', score };
}

export function calculateWeeklySummary(state: AppState, now = new Date()): WeeklySummary {
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const previousStart = new Date(now.getTime() - 14 * DAY_MS);
  const currentExpenses = getExpensesSince(state.expenses, weekStart);
  const previousExpenses = state.expenses.filter(item => {
    const timestamp = new Date(item.date).getTime();
    return timestamp >= previousStart.getTime() && timestamp < weekStart.getTime();
  });
  const totalSpent = currentExpenses.reduce((sum, item) => sum + item.amount, 0);
  const previousTotal = previousExpenses.reduce((sum, item) => sum + item.amount, 0);
  const categories = calculateCategoryTotals(currentExpenses);
  const grade = calculateOrganizationGrade(state, now);

  return {
    totalSpent,
    recordCount: currentExpenses.length,
    biggestCategory: categories[0]?.name ?? null,
    allocatedToGoals: state.goalContributions
      .filter(item => new Date(item.date).getTime() >= weekStart.getTime())
      .reduce((sum, item) => sum + item.amount, 0),
    completedMissions: state.xpHistory.filter(item => item.reason.includes('Missão') && new Date(item.date).getTime() >= weekStart.getTime()).length,
    earnedXP: state.xpHistory
      .filter(item => new Date(item.date).getTime() >= weekStart.getTime())
      .reduce((sum, item) => sum + item.amount, 0),
    comparisonPercentage: previousTotal > 0 ? ((totalSpent - previousTotal) / previousTotal) * 100 : null,
    grade: grade.grade,
    gradeScore: grade.score,
  };
}

export function getSmartInsights(state: AppState): string[] {
  const insights: string[] = [];
  const recent = getExpensesSince(state.expenses, new Date(Date.now() - 7 * DAY_MS));
  const categories = calculateCategoryTotals(recent);
  const delivery = categories.find(item => item.name === 'Delivery');
  const featuredGoal = getFeaturedGoal(state);

  if (delivery && delivery.percentage >= 15) {
    insights.push(`Delivery representa ${Math.round(delivery.percentage)}% dos seus gastos dos últimos 7 dias.`);
  } else if (categories[0]) {
    insights.push(`${categories[0].name} é atualmente sua maior categoria, com ${Math.round(categories[0].percentage)}% do período.`);
  }

  if (featuredGoal) {
    const goalProgress = calculateGoalProgress(featuredGoal);
    const route = calculateGoalRoute(featuredGoal);
    if (route.weeklyRequired && route.weeksRemaining) {
      insights.push(`Guardando R$ ${Math.ceil(route.weeklyRequired)} por semana, ${featuredGoal.name} pode ser concluída no prazo.`);
    } else {
      insights.push(`${featuredGoal.name} está ${Math.round(goalProgress.percentage)}% concluída.`);
    }
  }

  return insights.slice(0, 2);
}

export function getWeeklyChallenge(state: AppState): WeeklyChallenge {
  const recent = getExpensesSince(state.expenses, new Date(Date.now() - 7 * DAY_MS));
  const deliveryTotal = recent.filter(item => item.category === 'Delivery').reduce((sum, item) => sum + item.amount, 0);

  if (deliveryTotal > 0) {
    const limit = 250;
    return {
      id: 'boss-delivery',
      title: 'Delivery',
      description: 'Mantenha os gastos de delivery abaixo de R$ 250,00 nesta semana.',
      current: deliveryTotal,
      limit,
      unit: 'currency',
      percentage: Math.min(100, (deliveryTotal / limit) * 100),
      rewardXP: 100,
    };
  }

  const smallCount = recent.filter(item => item.amount < 30).length;
  const limit = 8;
  return {
    id: 'boss-small-expenses',
    title: 'Pequenos gastos',
    description: 'Mantenha os pequenos registros abaixo do limite semanal.',
    current: smallCount,
    limit,
    unit: 'count',
    percentage: Math.min(100, (smallCount / limit) * 100),
    rewardXP: 80,
  };
}

export function getWeeklyChallengeRewardKey(challengeId: string, now = new Date()): string {
  const day = now.getDay() || 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  const period = [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, '0'), String(monday.getDate()).padStart(2, '0')].join('-');
  return `weekly_challenge:${challengeId}:${period}`;
}
