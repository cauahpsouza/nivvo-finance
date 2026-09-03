import { ChallengeBoss, ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG, CHALLENGE_XP } from './config';

const bossXP = CHALLENGE_XP.finalDecisionCompleted;

export const CHALLENGE_BOSSES: ChallengeBoss[] = [
  {
    id: 'unexpected-repair',
    title: 'O notebook parou',
    description: 'Você precisa dele amanhã. O conserto custa R$ 190.',
    context: 'Escolha de onde sai esse dinheiro.',
    choices: [
      { id: 'pay-now', label: 'Pagar o reparo agora', description: 'R$ 190,00 saem do saldo.', feedback: 'O notebook foi consertado. R$ 190,00 saíram do saldo.', allowShortfallAsCommitment: true, effects: { balanceDelta: -190, xp: bossXP, metrics: { commitments: 8, planning: 3 }, tags: ['boss-resolved', 'liquidity-impact'] } },
      { id: 'split-goal', label: 'Usar parte da meta', description: 'R$ 120,00 saem da meta e R$ 70,00 do saldo.', feedback: 'O notebook foi consertado. R$ 120,00 saíram da meta.', requiresGoalAmount: 120, effects: { balanceDelta: -70, goalDelta: -120, xp: bossXP, metrics: { commitments: 6, planning: 4 }, tags: ['boss-resolved', 'goal-impact'] } },
      { id: 'installment', label: 'Dar entrada e parcelar', description: 'R$ 55,00 agora e R$ 135,00 depois.', feedback: 'A urgência foi atendida, mas a próxima semana começa com um compromisso.', allowShortfallAsCommitment: true, effects: { balanceDelta: -55, commitmentDelta: 135, xp: bossXP, metrics: { commitments: -9, planning: 5 }, tags: ['boss-resolved', 'future-commitment'] } },
    ],
  },
  {
    id: 'month-end',
    title: 'Ainda há contas em aberto',
    description: 'Alguns pagamentos ficaram para depois durante a semana.',
    context: 'Escolha quanto pagar antes do mês virar.',
    choices: [
      { id: 'settle', label: 'Quitar o que cabe', description: 'Usar até R$ 180,00 para reduzir as contas abertas.', feedback: 'Você pagou o que cabia antes da virada.', commitmentPaymentRatio: 1, maxCommitmentPayment: 180, effects: { xp: bossXP, metrics: { commitments: 16, planning: 7 }, tags: ['boss-resolved', 'commitment-resolved'] } },
      { id: 'partial', label: 'Pagar metade', description: 'Pagar até R$ 90,00 e deixar o restante para depois.', feedback: 'Você pagou uma parte e manteve dinheiro disponível.', commitmentPaymentRatio: 0.5, maxCommitmentPayment: 90, effects: { xp: bossXP, metrics: { commitments: 9, planning: 9 }, tags: ['boss-resolved', 'commitment-resolved', 'balanced'] } },
      { id: 'replan', label: 'Renegociar os prazos', description: 'Manter o saldo e acrescentar R$ 25,00 à conta futura.', feedback: 'O dinheiro ficou disponível, mas a próxima semana começa mais apertada.', effects: { commitmentDelta: 25, xp: bossXP, metrics: { commitments: -8, planning: 6 }, tags: ['boss-resolved', 'future-commitment'] } },
    ],
  },
  {
    id: 'delivery-limit',
    title: 'Último jantar da semana',
    description: 'Você gastou mais com comida do que esperava.',
    context: 'Ainda falta resolver o jantar de hoje.',
    choices: [
      { id: 'meal-plan', label: 'Planejar refeições', description: 'Separar R$ 55,00 para uma compra básica.', feedback: 'A semana termina com um plano para as próximas refeições.', allowShortfallAsCommitment: true, effects: { balanceDelta: -55, xp: bossXP, metrics: { planning: 14, commitments: 5 }, tags: ['boss-resolved', 'planned', 'food'] } },
      { id: 'last-order', label: 'Fazer um pedido', description: 'R$ 42,00 · resolve rápido.', feedback: 'O pedido resolveu o jantar e tirou R$ 42,00 do saldo.', allowShortfallAsCommitment: true, effects: { balanceDelta: -42, xp: bossXP, metrics: { planning: -4 }, tags: ['boss-resolved', 'delivery', 'food'] } },
      { id: 'social-budget', label: 'Definir um limite para o encontro', description: 'Reservar R$ 28,00 e participar dentro do limite.', feedback: 'Você participou sem passar do valor definido.', allowShortfallAsCommitment: true, effects: { balanceDelta: -28, xp: bossXP, metrics: { planning: 10, commitments: 2 }, tags: ['boss-resolved', 'balanced', 'food'] } },
    ],
  },
  {
    id: 'goal-finish',
    title: 'A meta está perto',
    description: 'Falta pouco para guardar R$ 180.',
    context: 'Você pode completar a meta ou terminar com mais dinheiro disponível.',
    choices: [
      { id: 'complete-goal', label: 'Acelerar a meta', description: 'Aplicar até R$ 60,00 para tentar concluir a meta.', feedback: 'Você usou parte do dinheiro restante para avançar na meta.', effects: { balanceDelta: -60, goalDelta: 60, xp: bossXP, metrics: { planning: 8, commitments: 3 }, tags: ['boss-resolved', 'goal'] } },
      { id: 'steady-goal', label: 'Guardar R$ 30,00', description: 'A meta avança e ainda sobra mais no saldo.', feedback: 'Você guardou R$ 30,00 e manteve parte do dinheiro disponível.', effects: { balanceDelta: -30, goalDelta: 30, xp: bossXP, metrics: { planning: 11, commitments: 5 }, tags: ['boss-resolved', 'goal', 'balanced'] } },
      { id: 'hold-balance', label: 'Não guardar mais agora', description: 'A meta fica como está e o saldo não muda.', feedback: 'Você terminou a semana com o dinheiro disponível.', effects: { xp: bossXP, metrics: { planning: 5, commitments: 4 }, tags: ['boss-resolved', 'liquidity'] } },
    ],
  },
];

export function getChallengeBoss(bossId: string): ChallengeBoss | null {
  return CHALLENGE_BOSSES.find(boss => boss.id === bossId) ?? null;
}

export function selectFinalBoss(run: ChallengeRun): ChallengeBoss {
  const openEffects = run.scheduledEffects.filter(effect => !effect.applied).length;
  const foodSpend = run.decisions
    .filter(decision => decision.tags.includes('food') || decision.tags.includes('delivery'))
    .reduce((total, decision) => total + Math.abs(Math.min(0, decision.balanceDelta)), 0);
  const netBalance = Math.max(0, run.balance - run.commitments);
  const goalRatio = run.goalAmount / CHALLENGE_CONFIG.goalTarget;

  if (run.commitments > 0 || openEffects > 0) return getChallengeBoss('month-end') ?? CHALLENGE_BOSSES[0];
  if (netBalance <= 115) return getChallengeBoss('unexpected-repair') ?? CHALLENGE_BOSSES[0];
  if (goalRatio >= 0.65 && goalRatio < 1) return getChallengeBoss('goal-finish') ?? CHALLENGE_BOSSES[0];
  if (foodSpend >= 110) return getChallengeBoss('delivery-limit') ?? CHALLENGE_BOSSES[0];
  return getChallengeBoss('unexpected-repair') ?? CHALLENGE_BOSSES[0];
}
