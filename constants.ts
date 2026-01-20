import { Category, TransactionType } from './types';
import { 
  Utensils, ShoppingBag, Car, Home, Zap, 
  HeartPulse, Clapperboard, GraduationCap, 
  Plane, Gift, Briefcase, Wallet, BadgeDollarSign,
  Coffee, Smartphone
} from 'lucide-react';

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'Utensils', color: 'bg-orange-100 text-orange-600', type: TransactionType.EXPENSE },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: 'bg-pink-100 text-pink-600', type: TransactionType.EXPENSE },
  { id: 'transport', name: 'Transport', icon: 'Car', color: 'bg-blue-100 text-blue-600', type: TransactionType.EXPENSE },
  { id: 'housing', name: 'Housing', icon: 'Home', color: 'bg-indigo-100 text-indigo-600', type: TransactionType.EXPENSE },
  { id: 'utilities', name: 'Utilities', icon: 'Zap', color: 'bg-yellow-100 text-yellow-600', type: TransactionType.EXPENSE },
  { id: 'health', name: 'Health', icon: 'HeartPulse', color: 'bg-red-100 text-red-600', type: TransactionType.EXPENSE },
  { id: 'entertainment', name: 'Entertainment', icon: 'Clapperboard', color: 'bg-purple-100 text-purple-600', type: TransactionType.EXPENSE },
  { id: 'education', name: 'Education', icon: 'GraduationCap', color: 'bg-cyan-100 text-cyan-600', type: TransactionType.EXPENSE },
  { id: 'travel', name: 'Travel', icon: 'Plane', color: 'bg-sky-100 text-sky-600', type: TransactionType.EXPENSE },
  { id: 'social', name: 'Social', icon: 'Gift', color: 'bg-rose-100 text-rose-600', type: TransactionType.EXPENSE },
  { id: 'coffee', name: 'Coffee', icon: 'Coffee', color: 'bg-amber-100 text-amber-700', type: TransactionType.EXPENSE },
  { id: 'tech', name: 'Digital', icon: 'Smartphone', color: 'bg-gray-100 text-gray-600', type: TransactionType.EXPENSE },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salary', icon: 'Briefcase', color: 'bg-emerald-100 text-emerald-600', type: TransactionType.INCOME },
  { id: 'investment', name: 'Investment', icon: 'BadgeDollarSign', color: 'bg-green-100 text-green-600', type: TransactionType.INCOME },
  { id: 'other_income', name: 'Other', icon: 'Wallet', color: 'bg-teal-100 text-teal-600', type: TransactionType.INCOME },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// Helper to get icon component by name string
export const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Utensils, ShoppingBag, Car, Home, Zap, 
    HeartPulse, Clapperboard, GraduationCap, 
    Plane, Gift, Briefcase, Wallet, BadgeDollarSign,
    Coffee, Smartphone
  };
  return icons[iconName] || Wallet;
};
