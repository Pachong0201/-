export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME'
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO string
  note: string;
  type: TransactionType;
}

export interface DailyGroup {
  date: string;
  transactions: Transaction[];
  totalExpense: number;
  totalIncome: number;
}

export type BudgetMap = Record<string, number>;

export enum AppView {
  HOME = 'HOME',
  STATS = 'STATS',
  ADD = 'ADD',
  AI_INSIGHTS = 'AI_INSIGHTS'
}

export type Language = 'en' | 'de' | 'zh';

export enum SortOption {
  DATE_DESC = 'DATE_DESC',
  DATE_ASC = 'DATE_ASC',
  AMOUNT_DESC = 'AMOUNT_DESC',
  AMOUNT_ASC = 'AMOUNT_ASC',
  TYPE_EXPENSE = 'TYPE_EXPENSE',
  TYPE_INCOME = 'TYPE_INCOME'
}