export type Category =
  | 'Alimentação'
  | 'Delivery'
  | 'Transporte'
  | 'Mercado'
  | 'Saúde'
  | 'Lazer'
  | 'Contas'
  | 'Outros';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
}

export type GoalCategory =
  | 'Tecnologia'
  | 'Viagem'
  | 'Educação'
  | 'Reserva'
  | 'Casa'
  | 'Veículo'
  | 'Lazer'
  | 'Personalizada';

export type GoalIcon = 'monitor' | 'plane' | 'book' | 'shield' | 'home' | 'vehicle' | 'sparkles' | 'target';
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  category: GoalCategory;
  icon: GoalIcon;
  deadline?: string;
  createdAt: string;
  status: GoalStatus;
}

export type GoalDraft = Omit<Goal, 'id' | 'createdAt' | 'status'>;

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
}

export interface XPEvent {
  id: string;
  reason: string;
  amount: number;
  date: string;
  key: string;
}

export type LevelName =
  | 'Iniciante'
  | 'Aprendiz'
  | 'Organizado'
  | 'Controlado'
  | 'Estrategista'
  | 'Especialista'
  | 'Mestre';

export type UnlockKind = 'badge' | 'frame' | 'progress-style';

export interface LevelUnlock {
  id: string;
  kind: UnlockKind;
  name: string;
  description: string;
}

export interface LevelDefinition {
  number: number;
  name: LevelName;
  minXP: number;
  unlocks: LevelUnlock[];
}

export interface LevelInfo {
  number: number;
  name: LevelName;
  minXP: number;
  nextLevelMinXP: number | null;
  progress: number;
  remaining: number;
  nextLevelName: LevelName | null;
  isMax: boolean;
  unlocks: LevelUnlock[];
}

export type Rarity = 'COMUM' | 'RARO' | 'ÉPICO' | 'LENDÁRIO';
export type AchievementCategory = 'Organização' | 'Metas' | 'Consistência' | 'Economia' | 'Exploração';
export type AchievementStatus = 'locked' | 'unlocked';

export interface AchievementState {
  id: string;
  status: AchievementStatus;
  unlockedAt?: string;
}

export interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
  label: string;
}

export interface Achievement {
  id: string;
  order: number;
  title: string;
  description: string;
  conditionDescription: string;
  category: AchievementCategory;
  rarity: Rarity;
  rewardXP: number;
  secret?: boolean;
  status: AchievementStatus;
  unlockedAt?: string;
  progress: AchievementProgress;
}

export type MissionStatus = 'available' | 'active' | 'completed' | 'failed';

export interface Mission {
  id: string;
  title: string;
  description: string;
  objective: string;
  rewardXP: number;
  status: MissionStatus;
  progress: number;
  target: number;
  progressLabel: string;
  ruleId: string;
  durationHours: number;
  startedAt?: string;
  expiresAt?: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  current: number;
  limit: number;
  unit: 'currency' | 'count';
  percentage: number;
  rewardXP: number;
}

export type ToastVariant = 'success' | 'error' | 'info' | 'xp' | 'achievement' | 'level-up';

export interface ToastEvent {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export interface DemoSettings {
  soundsEnabled: boolean;
}

export interface AppState {
  schemaVersion: number;
  userName: string;
  expenses: Expense[];
  goals: Goal[];
  featuredGoalId: string | null;
  goalContributions: GoalContribution[];
  xp: number;
  xpHistory: XPEvent[];
  activeMissionId: string | null;
  activeMissionStartedAt: string | null;
  activeMissionExpiresAt: string | null;
  availableMissionIds: string[];
  completedMissionIds: string[];
  failedMissionIds: string[];
  achievements: AchievementState[];
  initialIncome: number;
  grantedRewardIds: string[];
  streak: number;
  lastActivityDate: string | null;
  equippedBadgeIds: string[];
  equippedFrameId: string | null;
  settings: DemoSettings;
}
