import { UtensilsCrossed, Pizza, Car, ShoppingCart, HeartPulse, Gamepad2, FileText, PlusCircle } from 'lucide-react';

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#F59E0B',
  'Delivery': '#F97316',
  'Transporte': '#3B82F6',
  'Mercado': '#8B5CF6',
  'Saúde': '#14B8A6',
  'Lazer': '#EC4899',
  'Contas': '#64748B',
  'Outros': '#94A3B8'
};

export const CATEGORY_CSS_VARS: Record<string, string> = {
  'Alimentação': 'var(--color-cat-food)',
  'Delivery': 'var(--color-cat-delivery)',
  'Transporte': 'var(--color-cat-transport)',
  'Mercado': 'var(--color-cat-market)',
  'Saúde': 'var(--color-cat-health)',
  'Lazer': 'var(--color-cat-leisure)',
  'Contas': 'var(--color-cat-bills)',
  'Outros': 'var(--color-cat-others)'
};

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Alimentação': UtensilsCrossed,
  'Delivery': Pizza,
  'Transporte': Car,
  'Mercado': ShoppingCart,
  'Saúde': HeartPulse,
  'Lazer': Gamepad2,
  'Contas': FileText,
  'Outros': PlusCircle
};
