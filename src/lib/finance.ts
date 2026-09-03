import { AppState, Expense, Goal } from '../types';

export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + Math.max(0, expense.amount), 0);
}

export function calculateTotalAllocated(goals: Goal[]): number {
  return goals
    .filter(goal => goal.status !== 'archived')
    .reduce((total, goal) => total + Math.max(0, goal.currentAmount), 0);
}

export function calculateAvailableBalance(state: AppState): number {
  return state.initialIncome - calculateTotalExpenses(state.expenses) - calculateTotalAllocated(state.goals);
}

export function getFeaturedGoal(state: AppState): Goal | null {
  const featured = state.goals.find(goal => goal.id === state.featuredGoalId && goal.status !== 'archived');
  return featured ?? state.goals.find(goal => goal.status === 'active') ?? null;
}

export function calculateCategoryTotals(expenses: Expense[]): { name: string; value: number; percentage: number }[] {
  const totals: Record<string, number> = {};
  let total = 0;

  for (const expense of expenses) {
    const amount = Math.max(0, expense.amount);
    totals[expense.category] = (totals[expense.category] ?? 0) + amount;
    total += amount;
  }

  return Object.entries(totals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function getExpensesSince(expenses: Expense[], since: Date): Expense[] {
  const timestamp = since.getTime();
  return expenses.filter(expense => new Date(expense.date).getTime() >= timestamp);
}
