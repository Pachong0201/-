import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ALL_CATEGORIES, getIconComponent } from '../constants';

interface Props {
  transaction: Transaction;
  onClick: (t: Transaction) => void;
  t: (key: string) => string;
  showDate?: boolean;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onClick, t, showDate = false }) => {
  const category = ALL_CATEGORIES.find(c => c.id === transaction.categoryId) || ALL_CATEGORIES[0];
  const Icon = getIconComponent(category.icon);
  const isExpense = transaction.type === TransactionType.EXPENSE;
  const currency = t('currency_symbol');
  
  // Dynamically resolve translation key for category, e.g., 'cat_food'
  const categoryName = t(`cat_${category.id}`) || category.name;
  
  const formattedDate = new Date(transaction.date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <button 
      onClick={() => onClick(transaction)}
      className="w-full text-left flex items-center justify-between p-4 bg-white hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black/5 transition-colors border-b border-gray-100 last:border-0 cursor-pointer group"
      aria-label={`${categoryName}, ${isExpense ? 'Expense' : 'Income'}, ${transaction.amount}, ${showDate ? formattedDate : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${category.color} group-focus:ring-2 group-focus:ring-offset-1`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{categoryName}</span>
          <div className="flex flex-col">
            {showDate && <span className="text-xs text-gray-500 mb-0.5">{formattedDate}</span>}
            <span className="text-sm text-gray-600 truncate max-w-[150px]">{transaction.note || categoryName}</span>
          </div>
        </div>
      </div>
      <div className={`font-semibold ${isExpense ? 'text-gray-900' : 'text-emerald-700'}`}>
        {isExpense ? '-' : '+'}{currency}{transaction.amount.toFixed(2)}
      </div>
    </button>
  );
};