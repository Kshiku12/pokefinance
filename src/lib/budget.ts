'use client';

import type { Transaction } from './types';
import { APP_CATEGORIES } from './pokemon';

export interface BudgetConfig {
  totalMonthlyBudget: number;
  categoryLimits: Record<string, number>;
}

const STORAGE_KEY_BUDGET = 'pokefinance_budget_config';

export const DEFAULT_BUDGET: BudgetConfig = {
  totalMonthlyBudget: 35000,
  categoryLimits: {
    'food-delivery': 6000,
    grocery: 8000,
    ecommerce: 7000,
    'upi-payments': 5000,
    clothing: 4000,
    'gaming-entertainment': 3000,
    'travel-booking': 4000,
    'cafe-dining': 2500,
  },
};

export function getBudgetConfig(): BudgetConfig {
  if (typeof window === 'undefined') return DEFAULT_BUDGET;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
    if (!raw) return DEFAULT_BUDGET;
    return { ...DEFAULT_BUDGET, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BUDGET;
  }
}

export function saveBudgetConfig(config: BudgetConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('pokefinance_budget_updated'));
}

export function computeMonthlyStats(transactions: Transaction[], budget: BudgetConfig) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Current month transactions
  const thisMonthTxs = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Last month transactions
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthNum = lastMonthDate.getMonth();

  const lastMonthTxs = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthNum;
  });

  const thisMonthSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);
  const lastMonthSpent = lastMonthTxs.reduce((sum, t) => sum + t.amount, 0);

  // Month-over-month growth percentage
  let momPercentage = 0;
  if (lastMonthSpent > 0) {
    momPercentage = Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100);
  }

  // Budget remaining
  const budgetRemaining = Math.max(0, budget.totalMonthlyBudget - thisMonthSpent);
  const percentUsed = budget.totalMonthlyBudget > 0
    ? Math.round((thisMonthSpent / budget.totalMonthlyBudget) * 100)
    : 0;

  // Category breakdown for current month
  const categorySpentMap: Record<string, number> = {};
  thisMonthTxs.forEach((t) => {
    categorySpentMap[t.category_id] = (categorySpentMap[t.category_id] || 0) + t.amount;
  });

  // Financial health score
  let healthRating = 'S';
  let healthTitle = 'Pokémon Champion';
  if (percentUsed > 100) {
    healthRating = 'D';
    healthTitle = 'Overbudget! Team is Exhausted';
  } else if (percentUsed > 85) {
    healthRating = 'B';
    healthTitle = 'Gym Leader (Caution: HP Low)';
  } else if (percentUsed > 60) {
    healthRating = 'A';
    healthTitle = 'Elite Trainer (Great Balance)';
  }

  return {
    thisMonthSpent,
    lastMonthSpent,
    thisMonthCount: thisMonthTxs.length,
    lastMonthCount: lastMonthTxs.length,
    momPercentage,
    budgetRemaining,
    percentUsed,
    categorySpentMap,
    healthRating,
    healthTitle,
  };
}

// Export transactions to downloadable CSV
export function exportTransactionsCSV(transactions: Transaction[]) {
  if (typeof window === 'undefined') return;

  const headers = ['Transaction ID', 'Date', 'Category', 'App / Website', 'Amount (INR)', 'EXP Earned', 'Source', 'Description'];

  const rows = transactions.map((t) => {
    const cat = APP_CATEGORIES.find((c) => c.id === t.category_id);
    const dateFormatted = new Date(t.transaction_date).toLocaleDateString('en-IN');
    return [
      t.id,
      dateFormatted,
      cat ? cat.name : t.category_id,
      `"${t.app_name.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.exp_earned,
      t.source || 'manual',
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PokeFinance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
