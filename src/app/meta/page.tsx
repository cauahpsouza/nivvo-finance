"use client";

import { useMemo, useState } from 'react';
import { Archive, CalendarDays, MoreHorizontal, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { GoalEmblem } from '../../components/gamification/GoalEmblem';
import { GoalForm } from '../../components/goals/GoalForm';
import { useFinance } from '../../context/FinanceContext';
import { calculateAvailableBalance } from '../../lib/finance';
import { calculateGoalProgress, calculateGoalRoute, estimateGoalCompletion } from '../../lib/goals';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Goal } from '../../types';

const parseAmount = (value: string) => Number(value.replace(/\D/g, '')) / 100;
const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(digits) / 100) : '';
};

export default function MetaPage() {
  const {
    state,
    createGoal,
    updateGoal,
    archiveGoal,
    deleteGoal,
    setFeaturedGoal,
    addGoalFunds,
  } = useFinance();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [weeklyAmount, setWeeklyAmount] = useState(100);
  const [fundPulse, setFundPulse] = useState(0);
  const [pendingGoalAction, setPendingGoalAction] = useState<{ type: 'archive' | 'delete'; goal: Goal } | null>(null);

  const activeGoals = useMemo(() => state?.goals.filter(goal => goal.status !== 'archived') ?? [], [state]);
  const selectedGoal = activeGoals.find(goal => goal.id === selectedGoalId)
    ?? activeGoals.find(goal => goal.id === state?.featuredGoalId)
    ?? activeGoals[0]
    ?? null;

  if (!state) return <div className="p-4 md:p-8 animate-pulse"><div className="h-24 rounded-xl bg-border/50" /></div>;

  const availableBalance = calculateAvailableBalance(state);
  const selectedProgress = selectedGoal ? calculateGoalProgress(selectedGoal) : null;
  const routePlan = selectedGoal ? calculateGoalRoute(selectedGoal) : null;
  const estimatedDate = selectedGoal ? estimateGoalCompletion(selectedGoal, weeklyAmount) : null;

  const handleFund = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedGoal) return;
    const value = parseAmount(amount);
    if (!value || value <= 0) return setAmountError('Informe um valor maior que zero.');
    if (value > availableBalance) return setAmountError(`Saldo disponível: ${formatCurrency(availableBalance)}.`);
    addGoalFunds(selectedGoal.id, value);
    setFundPulse(value => value + 1);
    setAmount('');
    setAmountError('');
    setFundOpen(false);
  };

  const handleArchive = (goal: Goal) => {
    setMenuOpen(false);
    setPendingGoalAction({ type: 'archive', goal });
  };

  const handleDelete = (goal: Goal) => {
    setMenuOpen(false);
    setPendingGoalAction({ type: 'delete', goal });
  };

  const confirmGoalAction = () => {
    if (!pendingGoalAction) return;
    if (pendingGoalAction.type === 'archive') archiveGoal(pendingGoalAction.goal.id);
    else deleteGoal(pendingGoalAction.goal.id);
    setSelectedGoalId(null);
    setPendingGoalAction(null);
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background p-4 md:p-8">
      <Header
        title="Metas"
        subtitle="Crie objetivos, reserve dinheiro e acompanhe sua rota."
        action={<Button onClick={() => setCreateOpen(true)} className="w-full gap-2 md:w-auto"><Plus size={18} /> Nova meta</Button>}
      />

      {activeGoals.length === 0 ? (
        <Card className="mx-auto flex max-w-xl flex-col items-center py-14 text-center">
          <GoalEmblem icon="target" />
          <h2 className="mt-6 text-xl font-bold">Nenhuma meta criada ainda.</h2>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">Crie um objetivo financeiro para começar a acompanhar valores e prazos.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-6"><Plus size={18} className="mr-2" /> Criar primeira meta</Button>
        </Card>
      ) : (
        <>
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="nivvo-kicker mb-2 text-brand-600">Suas metas</p>
                <h2 className="text-xl font-bold">{activeGoals.filter(goal => goal.status === 'active').length} ativas</h2>
              </div>
              {state.goals.some(goal => goal.status === 'archived') && <span className="text-xs text-text-secondary">{state.goals.filter(goal => goal.status === 'archived').length} arquivadas</span>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeGoals.map(goal => {
                const progress = calculateGoalProgress(goal);
                const selected = selectedGoal?.id === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedGoalId(goal.id)}
                    className={`nivvo-panel border p-5 text-left transition-[background-color,border-color,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 motion-reduce:transition-none ${selected ? 'border-brand-800 bg-surface shadow-soft' : 'border-border bg-surface hover:border-brand-500'}`}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <span className="nivvo-kicker text-brand-600">{goal.id === state.featuredGoalId ? 'Meta em destaque' : goal.category}</span>
                      <span className="font-mono text-xs font-bold text-brand-800">{Math.round(progress.percentage)}%</span>
                    </div>
                    <h3 className="break-words font-bold text-text-primary">{goal.name}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</p>
                    <ProgressBar ariaLabel={`Progresso da meta ${goal.name}`} progress={progress.percentage} className="mt-4 h-2 bg-border" barClassName="rounded-none bg-accent-500" />
                  </button>
                );
              })}
            </div>
          </section>

          {selectedGoal && selectedProgress && routePlan && (
            <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
              <Card key={`${selectedGoal.id}:${fundPulse}`} className="goal-progress-react nivvo-panel border-brand-800 bg-surface p-7 md:p-9">
                <div className="mb-8 flex min-w-0 items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                    <GoalEmblem completed={selectedGoal.status === 'completed'} icon={selectedGoal.icon} />
                    <div className="min-w-0">
                      <p className="nivvo-kicker mb-2 text-brand-600">{selectedGoal.id === state.featuredGoalId ? 'Meta em destaque' : selectedGoal.category}</p>
                      <h2 className="break-words text-2xl font-extrabold text-text-primary md:text-3xl">{selectedGoal.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
                        <span>{selectedGoal.category}</span>
                        {selectedGoal.deadline && <span className="flex items-center gap-1"><CalendarDays size={13} /> {formatDate(selectedGoal.deadline)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                      aria-label={`Gerenciar meta ${selectedGoal.name}`}
                      aria-expanded={menuOpen}
                      aria-controls="goal-actions-menu"
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {menuOpen && (
                      <div id="goal-actions-menu" className="dropdown-enter absolute right-0 top-12 z-20 w-56 rounded-xl border border-border bg-surface p-2 shadow-soft">
                        {selectedGoal.id !== state.featuredGoalId && <button type="button" onClick={() => { setFeaturedGoal(selectedGoal.id); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Pin size={15} /> Definir como destaque</button>}
                        <button type="button" onClick={() => { setEditOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Pencil size={15} /> Editar</button>
                        {selectedGoal.status !== 'completed' && <button type="button" onClick={() => handleArchive(selectedGoal)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Archive size={15} /> Arquivar</button>}
                        <button type="button" onClick={() => handleDelete(selectedGoal)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"><Trash2 size={15} /> Excluir</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8 border-y border-border py-6">
                  <p className="font-mono text-3xl font-semibold text-brand-900 md:text-4xl">{formatCurrency(selectedGoal.currentAmount)}</p>
                  <p className="mt-1 text-sm font-semibold text-text-secondary">de {formatCurrency(selectedGoal.targetAmount)} · faltam {formatCurrency(selectedProgress.remaining)}</p>
                </div>

                <div className="mb-7">
                  <div className="mb-3 flex items-center justify-between"><span className="nivvo-kicker text-text-secondary">Progresso</span><span className="font-mono text-sm font-bold">{Math.round(selectedProgress.percentage)}%</span></div>
                  <div className="relative px-1">
                    <ProgressBar ariaLabel={`Progresso da meta ${selectedGoal.name}`} progress={selectedProgress.percentage} className="h-3 bg-border" barClassName="rounded-none bg-accent-500" />
                    <div className="pointer-events-none absolute inset-x-1 top-0 flex h-3 items-center justify-between">{[0, 25, 50, 75, 100].map(mark => <span key={mark} className={`h-3 w-px ${selectedProgress.percentage >= mark ? 'bg-brand-900' : 'bg-text-secondary/45'}`} />)}</div>
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] font-semibold text-text-secondary">{[0, 25, 50, 75, 100].map(mark => <span key={mark}>{mark}%</span>)}</div>
                </div>

                {selectedGoal.status === 'active' ? <Button onClick={() => setFundOpen(true)}><Plus size={18} className="mr-2" /> Adicionar dinheiro</Button> : <span className="nivvo-kicker text-brand-600">Meta concluída</span>}
              </Card>

              <Card className="nivvo-panel border-brand-800 bg-brand-900 text-white">
                <p className="nivvo-kicker mb-2 text-accent-500">Simulador de rota</p>
                <h3 className="text-xl font-bold">Planeje o ritmo</h3>
                {selectedGoal.deadline ? (
                  <div className="mt-5 space-y-2 text-sm text-brand-100/75">
                    <p>Prazo: <strong className="text-white">{routePlan.weeksRemaining} semanas</strong></p>
                    <p>Ritmo recomendado: <strong className="text-white">{formatCurrency(routePlan.weeklyRequired ?? 0)} por semana</strong></p>
                    <p>Ou {formatCurrency(routePlan.monthlyRequired ?? 0)} por mês.</p>
                  </div>
                ) : <p className="mt-4 text-sm text-brand-100/70">Sem data-alvo. Use o controle abaixo para simular uma chegada.</p>}

                <div className="mt-7 border-t border-brand-800 pt-6">
                  <label htmlFor="weekly-route" className="text-sm font-bold">Se eu guardar por semana</label>
                  <p className="mt-2 font-mono text-2xl font-bold text-accent-500">{formatCurrency(weeklyAmount)}</p>
                  <input id="weekly-route" type="range" min="10" max={Math.max(500, Math.ceil(selectedProgress.remaining / 4))} step="10" value={weeklyAmount} onChange={event => setWeeklyAmount(Number(event.target.value))} className="mt-4 w-full accent-[#A3E635]" />
                  <p className="mt-5 text-sm text-brand-100/75">Previsão: <strong className="text-white">{estimatedDate ? formatDate(estimatedDate.toISOString()) : 'informe um valor'}</strong></p>
                </div>
              </Card>
            </section>
          )}
        </>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nova meta">
        <GoalForm onCancel={() => setCreateOpen(false)} onSave={draft => { createGoal(draft); setCreateOpen(false); }} />
      </Modal>
      {selectedGoal && <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar meta"><GoalForm initialGoal={selectedGoal} onCancel={() => setEditOpen(false)} onSave={draft => { updateGoal(selectedGoal.id, draft); setEditOpen(false); }} /></Modal>}
      <Modal isOpen={fundOpen} onClose={() => { setFundOpen(false); setAmountError(''); }} title="Adicionar dinheiro">
        <form onSubmit={handleFund} className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-100/40 p-4 text-sm"><span className="text-text-secondary">Saldo disponível</span><strong>{formatCurrency(availableBalance)}</strong></div>
          <Input label="Valor da contribuição" value={amount} onChange={event => { setAmount(formatAmountInput(event.target.value)); setAmountError(''); }} error={amountError} inputMode="numeric" placeholder="R$ 0,00" />
          <div className="grid grid-cols-3 gap-2">{[50, 100, 200].map(value => <button type="button" key={value} onClick={() => setAmount(formatAmountInput(String(value * 100)))} className="min-h-10 rounded-lg border border-border text-sm font-bold transition-colors hover:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">+ R$ {value}</button>)}</div>
          <Button type="submit" fullWidth>Confirmar contribuição</Button>
        </form>
      </Modal>
      <Modal isOpen={Boolean(pendingGoalAction)} onClose={() => setPendingGoalAction(null)} title={pendingGoalAction?.type === 'archive' ? 'Arquivar meta?' : 'Excluir meta?'}>
        <p className="text-sm text-text-secondary">
          {pendingGoalAction?.type === 'archive' ? 'Arquivar' : 'Excluir'} <strong>“{pendingGoalAction?.goal.name}”</strong>? Os {formatCurrency(pendingGoalAction?.goal.currentAmount ?? 0)} reservados voltarão ao saldo disponível.
        </p>
        {pendingGoalAction?.type === 'delete' && <p className="mt-3 text-sm font-bold text-danger">A meta será removida permanentemente.</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingGoalAction(null)}>Cancelar</Button>
          <Button fullWidth className={pendingGoalAction?.type === 'delete' ? 'bg-danger hover:bg-danger' : ''} onClick={confirmGoalAction}>{pendingGoalAction?.type === 'archive' ? 'Arquivar' : 'Excluir'}</Button>
        </div>
      </Modal>
    </main>
  );
}
