"use client";

import React, { useMemo, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { useFinance } from '../../context/FinanceContext';
import { Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { formatCurrency, formatShortDate } from '../../lib/formatters';
import { calculateTotalExpenses, calculateCategoryTotals, calculateAvailableBalance } from '../../lib/finance';
import { CATEGORY_CSS_VARS } from '../../lib/categories';
import { CategoryGlyph } from '../../components/finance/CategoryGlyph';
import { Modal } from '../../components/ui/Modal';
import { ExpenseForm } from '../../components/expenses/ExpenseForm';
import { Expense } from '../../types';
import { MOTION_MS } from '../../lib/motion';

export default function Gastos() {
  const { state, addExpense, updateExpense, removeExpense } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [editedExpenseId, setEditedExpenseId] = useState<string | null>(null);
  const [pendingExpense, setPendingExpense] = useState<Omit<Expense, 'id'> | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const handleAdd = (data: Omit<Expense, 'id'>) => {
    if (state && data.amount > calculateAvailableBalance(state)) {
      setPendingExpense(data);
      setIsModalOpen(false);
      return;
    }
    addExpense(data);
    setIsModalOpen(false);
  };

  const handleUpdate = (data: Omit<Expense, 'id'>) => {
    if (!editingExpense) return;
    setEditedExpenseId(editingExpense.id);
    updateExpense(editingExpense.id, data);
    setEditingExpense(null);
  };

  const handleRemove = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmRemove = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingExpenseId(id);
    window.setTimeout(() => {
      removeExpense(id);
      setDeletingExpenseId(current => current === id ? null : current);
    }, MOTION_MS.fast);
  };

  const filteredExpenses = useMemo(() => {
    if (!state) return [];
    let result = [...state.expenses];

    if (search) {
      result = result.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));
    }
    if (categoryFilter) {
      result = result.filter(e => e.category === categoryFilter);
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'highest') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.amount - b.amount);
    }

    return result;
  }, [state, search, categoryFilter, sortBy]);

  if (!state) {
    return <div className="p-4 md:p-8 animate-pulse"><div className="h-20 bg-border/50 rounded-xl" /></div>;
  }

  const total = calculateTotalExpenses(state.expenses);
  const count = state.expenses.length;
  const categories = calculateCategoryTotals(state.expenses);
  const biggestCategory = categories.length > 0 ? categories[0] : null;

  return (
    <main className="flex-1 p-4 md:p-8 bg-background max-w-[1440px] mx-auto w-full">
      <Header 
        title="Gastos" 
        subtitle="Registre e acompanhe para onde seu dinheiro está indo."
        action={
          <Button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto gap-2">
            <Plus size={18} /> Adicionar gasto
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="flex flex-col justify-center">
          <p className="text-sm font-bold text-text-secondary mb-1">Total registrado</p>
          <p className="text-3xl font-bold text-danger">{formatCurrency(total)}</p>
        </Card>
        <Card className="flex flex-col justify-center">
          <p className="text-sm font-bold text-text-secondary mb-1">Registros</p>
          <p className="text-3xl font-bold">{count}</p>
        </Card>
        <Card className="flex flex-col justify-center">
          <p className="text-sm font-bold text-text-secondary mb-1">Maior categoria</p>
          <p className="text-3xl font-bold">{biggestCategory ? biggestCategory.name : '-'}</p>
          {biggestCategory && <p className="text-xs text-text-secondary mt-1">{formatCurrency(biggestCategory.value)} ({Math.round(biggestCategory.percentage)}%)</p>}
        </Card>
      </div>

      <Card className="mb-8 p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <label htmlFor="expense-search" className="sr-only">Buscar gasto por descrição</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
            <input 
              id="expense-search"
              type="text" 
              placeholder="Buscar gasto..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-12 pr-4 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              options={[
                { value: 'Alimentação', label: 'Alimentação' },
                { value: 'Delivery', label: 'Delivery' },
                { value: 'Transporte', label: 'Transporte' },
                { value: 'Mercado', label: 'Mercado' },
                { value: 'Saúde', label: 'Saúde' },
                { value: 'Lazer', label: 'Lazer' },
                { value: 'Contas', label: 'Contas' },
                { value: 'Outros', label: 'Outros' }
              ]}
              className="w-full sm:w-48"
            />
            <Select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              options={[
                { value: 'recent', label: 'Mais recentes' },
                { value: 'highest', label: 'Maior valor' },
                { value: 'lowest', label: 'Menor valor' }
              ]}
              className="w-full sm:w-48"
            />
          </div>
          {(search || categoryFilter || sortBy !== 'recent') && (
            <Button variant="tertiary" onClick={() => { setSearch(''); setCategoryFilter(''); setSortBy('recent'); }}>
              Limpar
            </Button>
          )}
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-sm font-bold text-text-secondary">
              <div className="col-span-5">Descrição</div>
              <div className="col-span-3">Data</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-center">Ações</div>
            </div>
            
            <div className="flex flex-col gap-3 md:gap-0 mt-4 md:mt-0">
              {filteredExpenses.map((exp: Expense) => {
                return (
                  <div key={exp.id} className={`${deletingExpenseId === exp.id ? 'expense-row-exit pointer-events-none' : editedExpenseId === exp.id ? 'expense-row-edit' : 'expense-row-enter'} flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 md:px-4 md:py-4 border border-border md:border-none md:border-b md:last:border-none rounded-xl md:rounded-none bg-surface md:hover:bg-background transition-colors items-start md:items-center`}>
                    
                    <div className="md:col-span-5 flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: CATEGORY_CSS_VARS[exp.category] || CATEGORY_CSS_VARS['Outros'] }}>
                        <CategoryGlyph category={exp.category} size={19} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate">{exp.description}</p>
                        <p className="text-xs text-text-secondary md:hidden mt-0.5">{exp.category} • {formatShortDate(exp.date)}</p>
                        <p className="text-xs text-text-secondary hidden md:block mt-0.5">{exp.category}</p>
                      </div>
                      <div className="md:hidden shrink-0 text-right">
                        <p className="font-bold text-danger">− {formatCurrency(exp.amount)}</p>
                      </div>
                    </div>
                    
                    <div className="hidden md:block col-span-3 text-sm text-text-secondary">
                      {formatShortDate(exp.date)}
                    </div>
                    
                    <div className="hidden md:block col-span-2 text-right font-bold text-danger">
                      − {formatCurrency(exp.amount)}
                    </div>
                    
                    <div className="md:col-span-2 w-full md:w-auto flex justify-end gap-0.5 mt-2 md:mt-0 border-t md:border-none border-border pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => setEditingExpense(exp)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-100/60 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                        aria-label={`Editar ${exp.description}`}
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemove(exp.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-red-50 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                        aria-label={`Excluir ${exp.description}`}
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-4">
              <ReceiptText size={32} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Nenhum gasto encontrado</h3>
            <p className="text-sm text-text-secondary max-w-sm mb-6">
              {search || categoryFilter ? 'Nenhum resultado corresponde aos seus filtros.' : 'Você ainda não registrou nenhum gasto neste mês.'}
            </p>
            {search || categoryFilter ? (
              <Button variant="secondary" onClick={() => { setSearch(''); setCategoryFilter(''); }}>
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setIsModalOpen(true)}>
                Adicionar primeiro gasto
              </Button>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo gasto">
        <ExpenseForm onSave={handleAdd} onCancel={() => setIsModalOpen(false)} />
      </Modal>
      <Modal isOpen={Boolean(editingExpense)} onClose={() => setEditingExpense(null)} title="Editar gasto">
        {editingExpense && <ExpenseForm initialExpense={editingExpense} onSave={handleUpdate} onCancel={() => setEditingExpense(null)} />}
      </Modal>
      <Modal isOpen={Boolean(pendingExpense)} onClose={() => setPendingExpense(null)} title="Saldo insuficiente">
        <p className="text-sm text-text-secondary">O valor de {formatCurrency(pendingExpense?.amount ?? 0)} é maior que o saldo disponível. Deseja registrar mesmo assim?</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingExpense(null)}>Cancelar</Button>
          <Button fullWidth onClick={() => { if (pendingExpense) addExpense(pendingExpense); setPendingExpense(null); }}>Registrar</Button>
        </div>
      </Modal>
      <Modal isOpen={Boolean(pendingDeleteId)} onClose={() => setPendingDeleteId(null)} title="Excluir gasto?">
        <p className="text-sm text-text-secondary">O gasto será excluído. O XP de organização já recebido não será removido.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDeleteId(null)}>Cancelar</Button>
          <Button fullWidth className="bg-danger hover:bg-danger" onClick={confirmRemove}>Excluir</Button>
        </div>
      </Modal>
    </main>
  );
}
