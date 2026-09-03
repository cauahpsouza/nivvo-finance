import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Category, Expense } from '../../types';

interface ExpenseFormProps {
  onSave: (data: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
  initialExpense?: Expense;
}

interface FormErrors {
  amount?: string;
  description?: string;
  category?: string;
  date?: string;
}

const categories: Category[] = ['Alimentação', 'Delivery', 'Transporte', 'Mercado', 'Saúde', 'Lazer', 'Contas', 'Outros'];

function formatCurrencyInput(value: string | number) {
  const cents = typeof value === 'number' ? Math.round(value * 100).toString() : value.replace(/\D/g, '');
  if (!cents) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents) / 100);
}

export function ExpenseForm({ onSave, onCancel, initialExpense }: ExpenseFormProps) {
  const [amount, setAmount] = useState(() => initialExpense ? formatCurrencyInput(initialExpense.amount) : '');
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [category, setCategory] = useState<Category | ''>(initialExpense?.category ?? '');
  const [date, setDate] = useState(() => initialExpense?.date.split('T')[0] ?? new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/\D/g, '')) / 100;
    const nextErrors: FormErrors = {};

    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) nextErrors.amount = 'Informe um valor válido maior que zero.';
    if (!description.trim()) nextErrors.description = 'A descrição é obrigatória.';
    else if (description.trim().length > 60) nextErrors.description = 'Máximo de 60 caracteres.';
    if (!category) nextErrors.category = 'Selecione uma categoria.';
    if (!date) nextErrors.date = 'A data é obrigatória.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      amount: parsedAmount,
      description: description.trim(),
      category: category as Category,
      date: new Date(`${date}T12:00:00`).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input label="Valor" placeholder="R$ 0,00" value={amount} onChange={event => setAmount(formatCurrencyInput(event.target.value))} error={errors.amount} inputMode="numeric" />
      <Input label="Descrição" placeholder="Ex.: almoço no restaurante" value={description} onChange={event => setDescription(event.target.value)} error={errors.description} maxLength={60} />
      <Select label="Categoria" value={category} onChange={event => setCategory(event.target.value as Category)} options={categories.map(item => ({ value: item, label: item }))} error={errors.category} />
      <Input label="Data" type="date" value={date} onChange={event => setDate(event.target.value)} error={errors.date} />
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancelar</Button>
        <Button type="submit" fullWidth>{initialExpense ? 'Salvar alterações' : 'Salvar gasto'}</Button>
      </div>
    </form>
  );
}
