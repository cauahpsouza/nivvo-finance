import { Goal, GoalCategory, GoalIcon } from '../types';

export const GOAL_CATEGORIES: Array<{ category: GoalCategory; icon: GoalIcon }> = [
  { category: 'Tecnologia', icon: 'monitor' },
  { category: 'Viagem', icon: 'plane' },
  { category: 'Educação', icon: 'book' },
  { category: 'Reserva', icon: 'shield' },
  { category: 'Casa', icon: 'home' },
  { category: 'Veículo', icon: 'vehicle' },
  { category: 'Lazer', icon: 'sparkles' },
  { category: 'Personalizada', icon: 'target' },
];

export interface GoalProgress {
  percentage: number;
  remaining: number;
  reachedMilestones: number[];
}

export interface GoalRoutePlan {
  remaining: number;
  weeksRemaining: number | null;
  monthsRemaining: number | null;
  weeklyRequired: number | null;
  monthlyRequired: number | null;
}

export function calculateGoalProgress(goal: Goal): GoalProgress {
  const target = Math.max(0, goal.targetAmount);
  const current = Math.max(0, goal.currentAmount);
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const milestones = [0, 25, 50, 75, 100];

  return {
    percentage,
    remaining: Math.max(0, target - current),
    reachedMilestones: milestones.filter(mark => percentage >= mark),
  };
}

export function calculateGoalRoute(goal: Goal, now = new Date()): GoalRoutePlan {
  const { remaining } = calculateGoalProgress(goal);
  if (!goal.deadline) {
    return { remaining, weeksRemaining: null, monthsRemaining: null, weeklyRequired: null, monthlyRequired: null };
  }

  const deadline = new Date(`${goal.deadline}T23:59:59`);
  const milliseconds = Math.max(0, deadline.getTime() - now.getTime());
  const weeksRemaining = Math.max(1, Math.ceil(milliseconds / (7 * 24 * 60 * 60 * 1000)));
  const monthsRemaining = Math.max(1, Math.ceil(milliseconds / (30.4375 * 24 * 60 * 60 * 1000)));

  return {
    remaining,
    weeksRemaining,
    monthsRemaining,
    weeklyRequired: remaining / weeksRemaining,
    monthlyRequired: remaining / monthsRemaining,
  };
}

export function estimateGoalCompletion(goal: Goal, weeklyAmount: number, now = new Date()): Date | null {
  const amount = Math.max(0, weeklyAmount);
  if (amount <= 0) return null;

  const { remaining } = calculateGoalProgress(goal);
  const weeks = Math.max(0, Math.ceil(remaining / amount));
  const result = new Date(now);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}
