import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Home, PieChart as PieChartIcon, 
  Sparkles, Settings, ArrowLeft, Mic, Send, X, Wallet,
  Download, Trash2, FileSpreadsheet, Calculator, CalendarClock, Globe,
  Target, Trophy, Medal, ArrowUpDown, WifiOff, CloudOff
} from 'lucide-react';
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getIconComponent } from './constants';
import { Transaction, TransactionType, AppView, DailyGroup, BudgetMap, Language, SortOption } from './types';
import { TransactionItem } from './components/TransactionItem';
import { StatsChart } from './components/StatsChart';
import { parseTransactionInput, getFinancialInsights } from './services/geminiService';
import { translations } from './translations';

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetMap>({});
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('en');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.DATE_DESC);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Online Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Add/Edit Transaction Form State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  
  // Date state initialized to current local time string for datetime-local input
  const [date, setDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showSettingsModal) setShowSettingsModal(false);
        if (showBudgetModal) setShowBudgetModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAddModal, showSettingsModal, showBudgetModal]);

  // Load data from local storage on mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }
    
    const savedBudgets = localStorage.getItem('budgets');
    if (savedBudgets) {
       try {
         setBudgets(JSON.parse(savedBudgets));
       } catch (e) {
         console.error("Failed to parse budgets", e);
       }
    }

    const savedGoal = localStorage.getItem('savingsGoal');
    if (savedGoal) {
       try {
         setSavingsGoal(parseFloat(savedGoal));
       } catch (e) {
         console.error("Failed to parse savings goal", e);
       }
    }

    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && ['en', 'de', 'zh'].includes(savedLanguage)) {
       setLanguage(savedLanguage as Language);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);
  
  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('savingsGoal', savingsGoal.toString());
  }, [savingsGoal]);
  
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Helper for translations
  const t = (key: string) => translations[language][key] || key;

  // Derived State: Summary
  const totalBalance = useMemo(() => transactions.reduce((acc, t) => t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount, 0), [transactions]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0), [transactions]);

  // Derived State: Monthly Savings for Goal Tracking
  const currentMonthSavings = useMemo(() => {
    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => {
       const d = new Date(t.date);
       return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const income = currentMonthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = currentMonthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
      
    return income - expense;
  }, [transactions]);

  // Derived State: Sorted Transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    switch(sortOption) {
      case SortOption.DATE_ASC:
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case SortOption.AMOUNT_DESC:
        return sorted.sort((a, b) => b.amount - a.amount);
      case SortOption.AMOUNT_ASC:
        return sorted.sort((a, b) => a.amount - b.amount);
      case SortOption.TYPE_EXPENSE:
        // Expenses first, then by date desc
        return sorted.sort((a, b) => {
          if (a.type === b.type) return new Date(b.date).getTime() - new Date(a.date).getTime();
          return a.type === TransactionType.EXPENSE ? -1 : 1;
        });
      case SortOption.TYPE_INCOME:
        // Income first, then by date desc
        return sorted.sort((a, b) => {
          if (a.type === b.type) return new Date(b.date).getTime() - new Date(a.date).getTime();
          return a.type === TransactionType.INCOME ? -1 : 1;
        });
      case SortOption.DATE_DESC:
      default:
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [transactions, sortOption]);

  // Derived State: Grouped Transactions (Only for Date Sorting)
  const groupedTransactions: DailyGroup[] = useMemo(() => {
    const groups: DailyGroup[] = [];
    
    // Iterate through sorted transactions to create groups
    // This relies on sortedTransactions being sorted by date (ASC or DESC)
    sortedTransactions.forEach(t => {
      const date = t.date;
      let group = groups.find(g => {
        const d1 = new Date(g.date);
        const d2 = new Date(date);
        return d1.getFullYear() === d2.getFullYear() && 
               d1.getMonth() === d2.getMonth() && 
               d1.getDate() === d2.getDate();
      });
      
      if (!group) {
        group = { date, transactions: [], totalExpense: 0, totalIncome: 0 };
        groups.push(group);
      }
      
      group.transactions.push(t);
      if (t.type === TransactionType.EXPENSE) {
        group.totalExpense += t.amount;
      } else {
        group.totalIncome += t.amount;
      }
    });
    return groups;
  }, [sortedTransactions]);

  // Sound Effect Generator
  const playCelebrationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Helper to play a tone
      const playTone = (freq: number, startTime: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        
        // Envelope: Attack, Decay
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      
      // Play "Ta-Da!" (Major Triad + High Octave: C5, E5, G5, C6)
      playTone(523.25, now, 0.4);       // C5
      playTone(659.25, now + 0.1, 0.4); // E5
      playTone(783.99, now + 0.2, 0.4); // G5
      playTone(1046.50, now + 0.3, 0.8); // C6
      
      // Simulate "Cheering/Applause" using filtered white noise
      const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5; // White noise
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      // Lowpass filter to make it sound less like static and more like a crowd
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800;
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      
      // Envelope for applause (swell in and fade out)
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.5); // Swell
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 2.5); // Fade out
      
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Simple Confetti Implementation
  const triggerConfetti = () => {
    playCelebrationSound();
    
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const emojis = ['🎉', '💰', '🏆', '⭐', '✨'];
    
    for (let i = 0; i < 50; i++) {
      const el = document.createElement('div');
      el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.position = 'fixed';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = '-50px';
      el.style.fontSize = Math.random() * 20 + 20 + 'px';
      el.style.zIndex = '1000';
      el.style.pointerEvents = 'none';
      el.style.transition = `top ${Math.random() * 2 + 1}s ease-in, transform ${Math.random() * 2 + 1}s linear`;
      
      document.body.appendChild(el);
      
      // Animate
      setTimeout(() => {
        el.style.top = '110vh';
        el.style.transform = `rotate(${Math.random() * 360}deg)`;
      }, 50);

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(el);
      }, 3000);
    }
  };

  // Handlers
  const handleTransactionClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setNote(transaction.note);
    setSelectedCategory(transaction.categoryId);
    setType(transaction.type);
    
    // Format date for input type="datetime-local"
    try {
      const d = new Date(transaction.date);
      // Adjust timezone offset to get local time string
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setDate(d.toISOString().slice(0, 16));
    } catch (e) {
      // Fallback if date is invalid
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDate(now.toISOString().slice(0, 16));
    }
    
    setShowAddModal(true);
  };

  const handleSaveTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    // Convert local input date back to ISO string for storage
    const timestamp = new Date(date).toISOString();

    if (editingTransaction) {
      // Update existing
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? {
          ...t,
          amount: parseFloat(amount),
          categoryId: selectedCategory,
          date: timestamp,
          note: note,
          type: type
      } : t));
    } else {
      // Create new
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        categoryId: selectedCategory,
        date: timestamp,
        note: note,
        type: type
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }
    
    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction) return;

    if(window.confirm(t('confirm_delete_one'))) {
      const idToDelete = editingTransaction.id;
      setTransactions(prev => prev.filter(t => t.id !== idToDelete));
      setShowAddModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setAmount('');
    setNote('');
    setType(TransactionType.EXPENSE);
    setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    setAiInput('');
    
    // Reset date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDate(now.toISOString().slice(0, 16));
  };

  const handleSmartParse = async () => {
    if (!isOnline) return;
    if (!aiInput.trim()) return;
    setIsAiProcessing(true);
    const result = await parseTransactionInput(aiInput);
    setIsAiProcessing(false);

    if (result && result.amount) {
      setAmount(result.amount.toString());
      if (result.categoryId) setSelectedCategory(result.categoryId);
      if (result.type) setType(result.type);
      if (result.note) setNote(result.note);
      if (result.date) {
        const d = new Date(result.date);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes());
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        try {
           setDate(d.toISOString().slice(0, 16));
        } catch(e) {}
      }
    }
  };

  const handleGenerateInsights = async () => {
    if (!isOnline) return;
    setIsLoadingInsight(true);
    const insight = await getFinancialInsights(transactions, language);
    setAiInsight(insight);
    setIsLoadingInsight(false);
  };

  const handleClearData = () => {
    if (window.confirm(t('confirm_delete'))) {
      setTransactions([]);
      setBudgets({});
      setSavingsGoal(0);
      localStorage.removeItem('transactions');
      localStorage.removeItem('budgets');
      localStorage.removeItem('savingsGoal');
      setAiInsight(null);
      setShowSettingsModal(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = transactions.map(t => {
      const d = new Date(t.date);
      const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      return [
        formattedDate,
        t.type,
        // We export the english name for consistency, or we could look up the translated name. 
        // Let's stick to the name in the data or translation.
        ALL_CATEGORIES.find(c => c.id === t.categoryId)?.name || t.categoryId,
        t.amount.toFixed(2),
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `ledger_export_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowSettingsModal(false);
  };

  // Render Helpers
  const renderHome = () => {
    // Goal Logic
    const hasGoal = savingsGoal > 0;
    const progressPercent = hasGoal ? Math.min(Math.max((currentMonthSavings / savingsGoal) * 100, 0), 100) : 0;
    const isGoalMet = hasGoal && currentMonthSavings >= savingsGoal;
    
    // Check if we are sorting by date (which enables grouping)
    const isDateSort = sortOption === SortOption.DATE_DESC || sortOption === SortOption.DATE_ASC;

    const currency = t('currency_symbol');

    return (
      <div className="pb-24">
        {/* Header Card */}
        <div className="bg-black text-white p-6 rounded-3xl mb-6 shadow-xl mx-4 mt-4 relative overflow-hidden" role="banner">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet size={120} aria-hidden="true" />
          </div>
          <p className="text-gray-400 text-sm mb-1">{t('total_balance')}</p>
          <h1 className="text-4xl font-bold mb-6">{currency}{totalBalance.toFixed(2)}</h1>
          <div className="flex gap-8">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-gray-400 text-xs">{t('income')}</span>
              </div>
              <p className="font-semibold text-lg">{currency}{totalIncome.toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                </div>
                <span className="text-gray-400 text-xs">{t('expenses')}</span>
              </div>
              <p className="font-semibold text-lg">{currency}{totalExpense.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Savings Goal Card */}
        {hasGoal && (
           <div 
             className={`mx-4 mb-6 p-5 rounded-3xl relative overflow-hidden transition-all duration-500 shadow-md ${isGoalMet ? 'bg-gradient-to-br from-yellow-100 to-amber-200 border border-amber-300' : 'bg-white border border-gray-100'}`}
             role="region"
             aria-label={t('savings_goal')}
           >
             
             {isGoalMet ? (
                // Achieved State (Reward)
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <Trophy className="text-amber-600" size={20} aria-hidden="true" />
                       <h3 className="font-bold text-amber-800">{t('goal_achieved')}</h3>
                    </div>
                    <p className="text-sm text-amber-700 mb-2">{t('reward_msg')}</p>
                    <p className="text-xs font-semibold text-amber-600">
                      {t('saved_so_far')}: {currency}{currentMonthSavings.toFixed(0)} / {currency}{savingsGoal.toFixed(0)}
                    </p>
                  </div>
                  <button 
                    onClick={triggerConfetti}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-500"
                    aria-label={t('celebrate')}
                  >
                    {t('celebrate')}
                  </button>
                </div>
             ) : (
                // Progress State
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="text-blue-500" size={18} aria-hidden="true" />
                        <span className="font-bold text-gray-800 text-sm">{t('goal_progress')}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">
                         {currency}{currentMonthSavings.toFixed(0)} / {currency}{savingsGoal.toFixed(0)}
                      </span>
                   </div>
                   
                   {/* Progress Bar */}
                   <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2" role="progressbar" aria-valuenow={Math.min(progressPercent, 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progressPercent > 80 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                   </div>
                   
                   <p className="text-xs text-gray-400 text-right">
                     {currentMonthSavings >= savingsGoal ? t('goal_achieved') : `${t('left_to_save')}: ${currency}${(savingsGoal - currentMonthSavings).toFixed(0)}`}
                   </p>
                </div>
             )}
           </div>
        )}

        {/* Transactions List */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">{t('recent_transactions')}</h2>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <label htmlFor="sort-options" className="sr-only">{t('acc_sort_options')}</label>
              <select 
                id="sort-options"
                value={sortOption} 
                onChange={e => setSortOption(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer shadow-sm"
              >
                <option value={SortOption.DATE_DESC}>{t('sort_date_newest')}</option>
                <option value={SortOption.DATE_ASC}>{t('sort_date_oldest')}</option>
                <option value={SortOption.AMOUNT_DESC}>{t('sort_amount_high')}</option>
                <option value={SortOption.AMOUNT_ASC}>{t('sort_amount_low')}</option>
                <option value={SortOption.TYPE_EXPENSE}>{t('sort_type_expense')}</option>
                <option value={SortOption.TYPE_INCOME}>{t('sort_type_income')}</option>
              </select>
              <ArrowUpDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {isDateSort ? (
            /* Grouped View for Date Sorting */
            groupedTransactions.map((group) => (
              <div key={group.date} className="mb-6">
                <div className="flex justify-between items-end mb-2 px-2">
                  <span className="text-sm font-medium text-gray-500">
                    {new Date(group.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-gray-400">
                    Out: {currency}{group.totalExpense.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {group.transactions.map(tx => (
                    <TransactionItem 
                      key={tx.id} 
                      transaction={tx} 
                      onClick={handleTransactionClick} 
                      t={t} 
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
             /* Flat View for Other Sorting */
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
               {sortedTransactions.map(tx => (
                 <TransactionItem 
                   key={tx.id} 
                   transaction={tx} 
                   onClick={handleTransactionClick} 
                   t={t}
                   showDate={true}
                 />
               ))}
             </div>
          )}

          {transactions.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>{t('no_transactions')}</p>
              <p className="text-sm">{t('tap_to_add')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="p-4 pb-24 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('analytics')}</h2>
      <StatsChart transactions={transactions} budgets={budgets} t={t} />
    </div>
  );

  const renderAIInsights = () => (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="mb-6">
         <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
           <Sparkles className="text-purple-600" aria-hidden="true" />
           {t('ai_advisor')}
         </h2>
         <p className="text-gray-500 text-sm mt-1">{t('advisor_desc')}</p>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-purple-100 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-500"></div>
        
        {/* Offline State for Insights */}
        {!isOnline ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CloudOff className="text-gray-400" size={32} aria-hidden="true" />
            </div>
            <p className="text-gray-800 font-semibold mb-2">You are offline</p>
            <p className="text-gray-500 text-sm mb-6">AI features require an internet connection.<br/>Please reconnect to use the Advisor.</p>
          </div>
        ) : isLoadingInsight ? (
           <div className="flex flex-col items-center justify-center h-full space-y-4" role="status">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" aria-label={t('analyzing')}></div>
             <p className="text-gray-500 animate-pulse">{t('analyzing')}</p>
           </div>
        ) : aiInsight ? (
          <div className="prose prose-purple max-w-none">
            <div className="markdown-body text-gray-700 leading-relaxed whitespace-pre-line">
              {aiInsight}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-purple-400" size={32} aria-hidden="true" />
            </div>
            <p className="text-gray-600 mb-6">{t('advisor_empty_state')}</p>
            <button 
              onClick={handleGenerateInsights}
              className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg shadow-purple-500/20 hover:bg-gray-800 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {t('generate_insights')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderBudgetModal = () => {
    const totalBudget = Object.values(budgets).reduce((a: number, b: number) => a + b, 0);
    const currency = t('currency_symbol');

    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none" role="dialog" aria-modal="true" aria-labelledby="budget-title">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowBudgetModal(false)} aria-hidden="true"></div>
        <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 pointer-events-auto transition-transform duration-300 h-[85vh] flex flex-col">
          
          <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
            <h3 id="budget-title" className="text-xl font-bold">{t('monthly_budget')}</h3>
            <button 
              onClick={() => setShowBudgetModal(false)} 
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
              aria-label={t('acc_close_modal')}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
             <p className="text-sm text-gray-500 mb-4">{t('set_budget_desc')}</p>
             {EXPENSE_CATEGORIES.map(cat => {
               const Icon = getIconComponent(cat.icon);
               return (
                 <div key={cat.id} className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cat.color}`}>
                     <Icon size={20} aria-hidden="true" />
                   </div>
                   <div className="flex-1">
                     <p className="font-medium text-sm text-gray-900">{t(`cat_${cat.id}`) || cat.name}</p>
                   </div>
                   <div className="relative w-32">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{currency}</span>
                     <input 
                       type="number" 
                       className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-right font-medium"
                       placeholder="0"
                       value={budgets[cat.id] || ''}
                       aria-label={`Budget for ${t(`cat_${cat.id}`) || cat.name}`}
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         setBudgets(prev => ({
                           ...prev,
                           [cat.id]: isNaN(val) ? 0 : val
                         }));
                       }}
                     />
                   </div>
                 </div>
               );
             })}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 sm:rounded-b-3xl shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-600">{t('total_monthly_budget')}</span>
              <span className="font-bold text-2xl text-black">{currency}{totalBudget.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => setShowBudgetModal(false)}
              className="w-full py-4 bg-black text-white text-lg font-bold rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const currency = t('currency_symbol');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="settings-title">
         <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} aria-hidden="true"></div>
         <div className="bg-white w-[85%] max-w-sm rounded-3xl shadow-2xl z-10 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
           <h3 id="settings-title" className="text-xl font-bold text-gray-900 mb-2">{t('settings')}</h3>
           
           {/* Language Selector */}
           <div className="flex flex-col gap-2 p-2 mb-2">
              <label id="lang-label" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{t('language')}</label>
              <div className="flex bg-gray-100 p-1 rounded-xl" role="group" aria-labelledby="lang-label">
                 {(['en', 'de', 'zh'] as Language[]).map(lang => (
                   <button
                     key={lang}
                     onClick={() => setLanguage(lang)}
                     className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-black ${language === lang ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-800'}`}
                     aria-pressed={language === lang}
                   >
                     {lang === 'en' ? 'EN' : lang === 'de' ? 'DE' : '中文'}
                   </button>
                 ))}
              </div>
           </div>
  
           {/* Savings Goal Input */}
           <div className="flex flex-col gap-2 p-2 mb-2">
              <label htmlFor="savings-goal-input" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{t('savings_goal')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">{currency}</span>
                <input 
                  id="savings-goal-input"
                  type="number"
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-gray-900"
                  value={savingsGoal || ''}
                  onChange={(e) => {
                     const val = parseFloat(e.target.value);
                     setSavingsGoal(isNaN(val) ? 0 : val);
                  }}
                />
              </div>
           </div>
  
           <button 
             onClick={() => {
               setShowSettingsModal(false);
               setShowBudgetModal(true);
             }}
             className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
           >
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
               <Calculator size={20} aria-hidden="true" />
             </div>
             <div>
               <p className="font-semibold text-gray-900">{t('budget_settings')}</p>
               <p className="text-xs text-gray-500">{t('set_limits')}</p>
             </div>
           </button>
  
           <button 
             onClick={handleExportCSV}
             className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-gray-500"
           >
             <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
               <FileSpreadsheet size={20} aria-hidden="true" />
             </div>
             <div>
               <p className="font-semibold text-gray-900">{t('export_excel')}</p>
               <p className="text-xs text-gray-500">{t('download_csv')}</p>
             </div>
           </button>
  
           <button 
             onClick={handleClearData}
             className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-red-500"
           >
             <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
               <Trash2 size={20} aria-hidden="true" />
             </div>
             <div>
               <p className="font-semibold text-red-700">{t('clear_data')}</p>
               <p className="text-xs text-red-400">{t('delete_permanent')}</p>
             </div>
           </button>
           
           <div className="pt-2">
             <button 
               onClick={() => setShowSettingsModal(false)}
               className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 focus:outline-none focus:underline"
             >
               {t('close')}
             </button>
           </div>
         </div>
      </div>
    );
  };

  const renderAddModal = () => {
    const currency = t('currency_symbol');
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowAddModal(false)} aria-hidden="true"></div>
        <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 pointer-events-auto transition-transform duration-300 max-h-[90vh] overflow-y-auto">
          
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h3 id="add-modal-title" className="text-xl font-bold">{editingTransaction ? t('edit_transaction') : t('new_transaction')}</h3>
            <div className="flex gap-2">
              {editingTransaction && (
                 <button 
                   type="button"
                   onClick={handleDeleteTransaction} 
                   className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                   aria-label={t('acc_delete_transaction')}
                 >
                    <Trash2 size={20} aria-hidden="true" />
                 </button>
              )}
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
                aria-label={t('acc_close_modal')}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
  
          <div className="p-6 space-y-6">
            
            {/* AI Smart Input */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="smart-input" className="text-xs font-bold text-purple-700 flex items-center gap-1">
                  <Sparkles size={12} aria-hidden="true" /> {t('smart_autofill')}
                </label>
                {!isOnline && (
                  <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-red-100">
                    <WifiOff size={10} /> Offline
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  id="smart-input"
                  type="text" 
                  placeholder={isOnline ? t('smart_placeholder') : "Unavailable offline"}
                  className="flex-1 bg-white border-0 rounded-xl px-4 py-3 text-sm shadow-sm ring-1 ring-purple-100 focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:bg-gray-100"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartParse()}
                  disabled={!isOnline}
                />
                <button 
                  onClick={handleSmartParse}
                  disabled={isAiProcessing || !aiInput.trim() || !isOnline}
                  className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-600"
                  aria-label="Send smart fill request"
                >
                  {isAiProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>
  
            {/* Type Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl" role="group" aria-label="Transaction Type">
              <button 
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-black ${type === TransactionType.EXPENSE ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                onClick={() => setType(TransactionType.EXPENSE)}
                aria-pressed={type === TransactionType.EXPENSE}
              >
                {t('expenses')}
              </button>
              <button 
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-black ${type === TransactionType.INCOME ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                onClick={() => setType(TransactionType.INCOME)}
                aria-pressed={type === TransactionType.INCOME}
              >
                {t('income')}
              </button>
            </div>
  
            {/* Date Picker */}
            <div>
              <label htmlFor="date-input" className="block text-sm font-medium text-gray-500 mb-2">{t('date_time')}</label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                   <CalendarClock size={20} />
                 </span>
                 <input 
                  id="date-input"
                  type="datetime-local"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
  
            {/* Amount */}
            <div>
              <label htmlFor="amount-input" className="block text-sm font-medium text-gray-500 mb-2">{t('amount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400" aria-hidden="true">{currency}</span>
                <input 
                  id="amount-input"
                  type="number" 
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-black outline-none"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
  
            {/* Categories Grid */}
            <div>
              <label id="category-label" className="block text-sm font-medium text-gray-500 mb-3">{t('category')}</label>
              <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-labelledby="category-label">
                {(type === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  const Icon = getIconComponent(cat.icon);
                  return (
                    <button 
                      key={cat.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-black ${isSelected ? `border-black bg-black text-white` : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                    >
                      <div className={`mb-1 p-2 rounded-full ${isSelected ? 'bg-white/20' : cat.color}`}>
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-medium truncate w-full text-center">{t(`cat_${cat.id}`) || cat.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
  
            {/* Note */}
            <div>
              <label htmlFor="note-input" className="block text-sm font-medium text-gray-500 mb-2">{t('note')}</label>
              <input 
                id="note-input"
                type="text" 
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-black outline-none"
                placeholder={t('note_placeholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
  
            {/* Submit */}
            <button 
              onClick={handleSaveTransaction}
              className="w-full py-4 bg-black text-white text-lg font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              {editingTransaction ? t('update_transaction') : t('save_transaction')}
            </button>
            
            {/* Spacer for mobile bottom safe area */}
            <div className="h-6"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 relative flex flex-col overflow-hidden shadow-2xl sm:rounded-3xl sm:h-[95vh] sm:mt-[2.5vh] sm:border border-gray-200">
      
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-100 z-10 shrink-0" role="banner">
        <div className="font-bold text-xl tracking-tight text-gray-900">Ledger<span className="text-emerald-500">AI</span></div>
        
        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 animate-pulse" title="Offline Mode">
              <WifiOff size={12} />
              <span>Offline</span>
            </div>
          )}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
            aria-label={t('acc_open_settings')}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth" role="main">
        {currentView === AppView.HOME && renderHome()}
        {currentView === AppView.STATS && renderStats()}
        {currentView === AppView.AI_INSIGHTS && renderAIInsights()}
      </main>

      {/* Bottom Navigation */}
      <div className="h-20 bg-white border-t border-gray-100 grid grid-cols-4 items-center z-20 absolute bottom-0 w-full rounded-b-3xl pb-2" role="navigation">
        <button 
          onClick={() => setCurrentView(AppView.HOME)}
          className={`flex flex-col items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-1 ${currentView === AppView.HOME ? 'text-black' : 'text-gray-400'}`}
          aria-pressed={currentView === AppView.HOME}
        >
          <Home size={24} strokeWidth={currentView === AppView.HOME ? 2.5 : 2} aria-hidden="true" />
          <span className="text-[10px] font-medium">{t('home')}</span>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.STATS)}
          className={`flex flex-col items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-1 ${currentView === AppView.STATS ? 'text-black' : 'text-gray-400'}`}
          aria-pressed={currentView === AppView.STATS}
        >
          <PieChartIcon size={24} strokeWidth={currentView === AppView.STATS ? 2.5 : 2} aria-hidden="true" />
          <span className="text-[10px] font-medium">{t('stats')}</span>
        </button>

        <button 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className={`flex flex-col items-center gap-1 transition-colors text-gray-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-1`}
          aria-label={t('acc_add_transaction')}
        >
          <div className="bg-black text-white p-2 rounded-xl mb-1 shadow-lg shadow-black/20" aria-hidden="true">
             <Plus size={20} />
          </div>
        </button>

        <button 
          onClick={() => setCurrentView(AppView.AI_INSIGHTS)}
          className={`flex flex-col items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-black rounded-lg p-1 ${currentView === AppView.AI_INSIGHTS ? 'text-purple-600' : 'text-gray-400'}`}
          aria-pressed={currentView === AppView.AI_INSIGHTS}
        >
          <Sparkles size={24} strokeWidth={currentView === AppView.AI_INSIGHTS ? 2.5 : 2} aria-hidden="true" />
          <span className="text-[10px] font-medium">{t('advisor')}</span>
        </button>
      </div>

      {/* Modals */}
      {showAddModal && renderAddModal()}
      {showSettingsModal && renderSettings()}
      {showBudgetModal && renderBudgetModal()}

    </div>
  );
};

export default App;