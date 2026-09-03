import React, { useState } from 'react';
import { Goal, GoalCategory, GoalDraft, GoalIcon } from '../../types';
import { GOAL_CATEGORIES } from '../../lib/goals';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface GoalFormProps {
  initialGoal?: Goal;
  onSave: (goal: GoalDraft) => void;
  onCancel: () => void;
}

interface GoalFormErrors {
  name?: string;
  target?: string;
  current?: string;
}

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(digits) / 100);
};

const parseCurrencyInput = (value: string) => Number(value.replace(/\D/g, '')) / 100;
const toInputValue = (value: number) => formatCurrencyInput(String(Math.round(value * 100)));

export function GoalForm({ initialGoal, onSave, onCancel }: GoalFormProps) {
  const initialCategory = initialGoal?.category ?? 'Tecnologia';
  const [name, setName] = useState(initialGoal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(initialGoal ? toInputValue(initialGoal.targetAmount) : '');
  const [currentAmount, setCurrentAmount] = useState(initialGoal ? toInputValue(initialGoal.currentAmount) : '');
  const [deadline, setDeadline] = useState(initialGoal?.deadline ?? '');
  const [category, setCategory] = useState<GoalCategory>(initialCategory);
  const [icon, setIcon] = useState<GoalIcon>(initialGoal?.icon ?? GOAL_CATEGORIES.find(item => item.category === initialCategory)?.icon ?? 'target');
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [pendingClamp, setPendingClamp] = useState<GoalDraft | null>(null);

  const handleCategory = (nextCategory: GoalCategory) => {
    setCategory(nextCategory);
    setIcon(GOAL_CATEGORIES.find(item => item.category === nextCategory)?.icon ?? 'target');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = parseCurrencyInput(targetAmount);
    const current = currentAmount ? parseCurrencyInput(currentAmount) : 0;
    const nextErrors: GoalFormErrors = {};

    if (!name.trim()) nextErrors.name = 'Informe um nome para a meta.';
    if (!target || target <= 0) nextErrors.target = 'O valor desejado deve ser maior que zero.';
    if (current < 0) nextErrors.current = 'O valor guardado não pode ser negativo.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (current > target) {
      setPendingClamp({
        name: name.trim(), targetAmount: target, currentAmount: target, category, icon, deadline: deadline || undefined,
      });
      return;
    }

    onSave({
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      category,
      icon,
      deadline: deadline || undefined,
    });
  };

  if (pendingClamp) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-warning bg-[#FFF8E8] p-4">
          <p className="font-bold text-text-primary">Ajustar valor guardado?</p>
          <p className="mt-2 text-sm text-text-secondary">O valor guardado é maior que o objetivo. Ele será ajustado para o total da meta.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={() => setPendingClamp(null)}>Voltar</Button>
          <Button type="button" fullWidth onClick={() => onSave(pendingClamp)}>Ajustar e salvar</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input label="Nome da meta" value={name} onChange={event => { setName(event.target.value); setErrors(previous => ({ ...previous, name: undefined })); }} error={errors.name} placeholder="Ex.: Viagem para Florianópolis" />
      <Input label="Valor desejado" value={targetAmount} onChange={event => { setTargetAmount(formatCurrencyInput(event.target.value)); setErrors(previous => ({ ...previous, target: undefined })); }} error={errors.target} inputMode="numeric" placeholder="R$ 0,00" />
      <Input label={initialGoal ? 'Valor guardado (use Adicionar dinheiro para alterar)' : 'Já tenho guardado (opcional)'} value={currentAmount} onChange={event => { setCurrentAmount(formatCurrencyInput(event.target.value)); setErrors(previous => ({ ...previous, current: undefined })); }} error={errors.current} inputMode="numeric" placeholder="R$ 0,00" disabled={Boolean(initialGoal)} />
      <Input label="Data-alvo (opcional)" type="date" value={deadline} onChange={event => setDeadline(event.target.value)} />
      <Select
        label="Categoria"
        value={category}
        onChange={event => handleCategory(event.target.value as GoalCategory)}
        options={GOAL_CATEGORIES.map(item => ({ value: item.category, label: item.category }))}
      />
      <Select
        label="Ícone"
        value={icon}
        onChange={event => setIcon(event.target.value as GoalIcon)}
        options={[
          { value: 'monitor', label: 'Computador' },
          { value: 'plane', label: 'Viagem' },
          { value: 'book', label: 'Educação' },
          { value: 'shield', label: 'Reserva' },
          { value: 'home', label: 'Casa' },
          { value: 'vehicle', label: 'Veículo' },
          { value: 'sparkles', label: 'Lazer' },
          { value: 'target', label: 'Personalizada' },
        ]}
      />
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancelar</Button>
        <Button type="submit" fullWidth>{initialGoal ? 'Salvar alterações' : 'Criar meta'}</Button>
      </div>
    </form>
  );
}
