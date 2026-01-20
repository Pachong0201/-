import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Transaction, TransactionType, BudgetMap } from '../types';
import { ALL_CATEGORIES } from '../constants';

interface Props {
  transactions: Transaction[];
  budgets?: BudgetMap;
  t: (key: string) => string;
}

export const StatsChart: React.FC<Props> = ({ transactions, budgets = {}, t }) => {
  const currentYear = new Date().getFullYear();
  const currency = t('currency_symbol');

  // Aggregate expenses by category for Pie Chart
  const expenseData = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        const category = ALL_CATEGORIES.find(c => c.id === curr.categoryId);
        if (!category) return acc;
        
        const catName = t(`cat_${category.id}`) || category.name;
        const existing = acc.find(i => i.name === catName);
        if (existing) {
          existing.value += curr.amount;
        } else {
          acc.push({ name: catName, value: curr.amount, color: parseColorClass(category.color) });
        }
        return acc;
      }, [] as { name: string; value: number; color: string }[])
      .sort((a, b) => b.value - a.value);
  }, [transactions, t]);

  // Aggregate monthly data for Bar and Line charts
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; income: number; expense: number; surplus: number; sortKey: number }> = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.date);
      // Format: "MMM yy" e.g., "Oct 23"
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      // Start of month for sorting
      const sortKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime();

      if (!data[monthKey]) {
        data[monthKey] = { month: monthKey, income: 0, expense: 0, surplus: 0, sortKey };
      }

      if (tx.type === TransactionType.INCOME) {
        data[monthKey].income += tx.amount;
        data[monthKey].surplus += tx.amount;
      } else {
        data[monthKey].expense += tx.amount;
        data[monthKey].surplus -= tx.amount;
      }
    });

    return Object.values(data).sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions]);

  // Net Asset Data for Current Year
  const netAssetData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    
    // Calculate initial balance from previous years
    let runningBalance = transactions
      .filter(tx => new Date(tx.date).getFullYear() < currentYear)
      .reduce((acc, tx) => tx.type === TransactionType.INCOME ? acc + tx.amount : acc - tx.amount, 0);

    return months.map(monthIndex => {
      const monthDate = new Date(currentYear, monthIndex, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Calculate surplus for this specific month
      const monthlyTransactions = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === currentYear && d.getMonth() === monthIndex;
      });

      const monthlySurplus = monthlyTransactions.reduce((acc, tx) => 
        tx.type === TransactionType.INCOME ? acc + tx.amount : acc - tx.amount, 0);
      
      runningBalance += monthlySurplus;

      return {
        month: monthName,
        netAsset: runningBalance
      };
    });
  }, [transactions, currentYear]);

  // Budget Calculation
  const totalBudget = Object.values(budgets).reduce((a: number, b: number) => a + b, 0);
  const currentMonthExpense = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return tx.type === TransactionType.EXPENSE && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  // Helper to extract hex-like color from tailwind class roughly for the chart
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

  if (transactions.length === 0 && totalBudget === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500" role="status">
        <p>{t('no_transactions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      
      {/* Budget Card */}
      {totalBudget > 0 && (
        <div className="bg-black text-white rounded-3xl p-6 shadow-md relative overflow-hidden" role="region" aria-label={t('monthly_budget')}>
           <div className="flex justify-between items-end mb-2">
             <div>
               <p className="text-gray-400 text-sm">{t('monthly_budget')}</p>
               <h3 className="text-2xl font-bold">{currency}{currentMonthExpense.toFixed(0)} / {currency}{totalBudget.toFixed(0)}</h3>
             </div>
             <div className="text-right">
               <p className={`text-sm font-bold ${currentMonthExpense > totalBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                 {((currentMonthExpense / totalBudget) * 100).toFixed(1)}%
               </p>
             </div>
           </div>
           {/* Progress Bar */}
           <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min((currentMonthExpense / totalBudget) * 100, 100)} aria-valuemin={0} aria-valuemax={100}>
             <div 
                className={`h-full rounded-full ${currentMonthExpense > totalBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((currentMonthExpense / totalBudget) * 100, 100)}%` }}
             ></div>
           </div>
        </div>
      )}

      {/* Net Asset Line Chart */}
      <div className="w-full h-[300px] bg-white rounded-3xl p-4 shadow-sm border border-gray-100" role="img" aria-label={`${t('net_asset_trend')} chart for ${currentYear}`}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('net_asset_trend')} ({currentYear})</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={netAssetData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="colorNetAsset" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <Tooltip 
               formatter={(value: number) => `${currency}${value.toFixed(2)}`}
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="netAsset" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorNetAsset)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Surplus Bar Chart */}
      <div className="w-full h-[300px] bg-white rounded-3xl p-4 shadow-sm border border-gray-100" role="img" aria-label={`${t('monthly_surplus')} chart`}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('monthly_surplus')}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <Tooltip 
               formatter={(value: number) => `${currency}${value.toFixed(2)}`}
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" />
            <Bar dataKey="surplus" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.surplus >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Income vs Expense Line Chart */}
      <div className="w-full h-[300px] bg-white rounded-3xl p-4 shadow-sm border border-gray-100" role="img" aria-label={`${t('income_vs_expense')} chart`}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('income_vs_expense')}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <Tooltip 
               formatter={(value: number) => `${currency}${value.toFixed(2)}`}
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{r: 4}} name={t('income')} />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} name={t('expenses')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Pie Chart */}
      <div className="w-full h-[350px] bg-white rounded-3xl p-4 shadow-sm border border-gray-100" role="img" aria-label={`${t('expenses_by_category')} chart`}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('expenses_by_category')}</h3>
        {expenseData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${currency}${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('no_transactions')}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to extract a fallback color string if needed
const parseColorClass = (colorClass: string) => {
    return '#8884d8';
};