'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import AppNavigation from '@/components/AppNavigation';
import PokemonCard from '@/components/PokemonCard';
import BankStatementModal from '@/components/BankStatementModal';
import ReceiptParserModal from '@/components/ReceiptParserModal';
import AchievementToast from '@/components/AchievementToast';
import { APP_CATEGORIES, getLevelFromExp, getCurrentEvolution, TYPE_COLORS } from '@/lib/pokemon';
import { getDashboardData, type DashboardData } from '@/lib/actions';
import { fetchUserPokemon, fetchTransactions, subscribeToData, deleteTransactionRecord } from '@/lib/data-store';
import { getBudgetConfig, saveBudgetConfig, computeMonthlyStats, exportTransactionsCSV, type BudgetConfig } from '@/lib/budget';
import { evaluateAchievements } from '@/lib/achievements';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';
import type { UserPokemon, Transaction } from '@/lib/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string; name: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-xs border border-[var(--border-accent)]" style={{ background: 'var(--bg-card)' }}>
        <p className="font-semibold mb-1 text-[var(--text-primary)]">{label}</p>
        {payload.map((item, i) => (
          <p key={i} style={{ color: item.color }}>
            {item.name}: ₹{Number(item.value || 0).toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [pokemonList, setPokemonList] = useState<UserPokemon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trainerName, setTrainerName] = useState('Trainer');
  const [loading, setLoading] = useState(true);

  // Phase 3 & 4 State
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(getBudgetConfig());
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState<string>('35000');
  const [timeframe, setTimeframe] = useState<'month' | 'halfyear' | 'all'>('month');
  const [txSearch, setTxSearch] = useState('');
  const [selectedTxCategory, setSelectedTxCategory] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const isAuth = !!user;
      const [pokemonRes, txRes] = await Promise.all([
        fetchUserPokemon(isAuth),
        fetchTransactions(isAuth, 100),
      ]);

      setPokemonList(pokemonRes);
      setTransactions(txRes);
      const bConfig = getBudgetConfig();
      setBudgetConfig(bConfig);

      // Evaluate any newly achieved Gym Badges
      evaluateAchievements({
        transactions: txRes,
        pokemonList: pokemonRes,
        budgetConfig: bConfig,
      });

      if (user) {
        try {
          const dash = await getDashboardData();
          if (dash.profile?.display_name) {
            setTrainerName(dash.profile.display_name);
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    fetchData();
    const unsubscribe = subscribeToData(fetchData);
    return () => unsubscribe();
  }, [fetchData]);

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? EXP and stats will be reversed.')) {
      return;
    }
    sounds.playClick();
    await deleteTransactionRecord(txId, !!user);
    await fetchData();
  };

  const handleExportCSV = () => {
    sounds.playExpGain();
    exportTransactionsCSV(transactions);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newBudgetAmount);
    if (isNaN(amt) || amt <= 0) return;

    sounds.playClick();
    const updated: BudgetConfig = {
      ...budgetConfig,
      totalMonthlyBudget: amt,
    };
    saveBudgetConfig(updated);
    setBudgetConfig(updated);
    setShowBudgetModal(false);
  };

  // Map pokemonList with APP_CATEGORIES
  const pokemonData = useMemo(() => {
    return pokemonList
      .map((p) => {
        const cat = APP_CATEGORIES.find((c) => c.id === p.category_id);
        return cat
          ? {
              category: cat,
              totalExp: p.current_exp,
              totalSpent: p.total_spent,
              transactionCount: p.transaction_count,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      category: (typeof APP_CATEGORIES)[0];
      totalExp: number;
      totalSpent: number;
      transactionCount: number;
    }>;
  }, [pokemonList]);

  // Overall statistics
  const totalSpent = useMemo(() => pokemonData.reduce((s, d) => s + d.totalSpent, 0), [pokemonData]);
  const totalTransactions = useMemo(() => transactions.length || pokemonData.reduce((s, d) => s + d.transactionCount, 0), [transactions, pokemonData]);
  const avgPerTransaction = totalTransactions > 0 ? Math.round(totalSpent / totalTransactions) : 0;
  const highestLevel = useMemo(() => (pokemonData.length > 0 ? Math.max(...pokemonData.map((d) => getLevelFromExp(d.totalExp))) : 1), [pokemonData]);

  // Phase 3: Budget & Month-over-Month calculation
  const monthlyMetrics = useMemo(() => {
    return computeMonthlyStats(transactions, budgetConfig);
  }, [transactions, budgetConfig]);

  // Monthly spending trend
  const monthlySpending = useMemo(() => {
    const monthMap = new Map<string, { month: string; amount: number; transactions: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleDateString('en-US', { month: 'short' });
      monthMap.set(mName, { month: mName, amount: 0, transactions: 0 });
    }

    transactions.forEach((tx) => {
      const mName = new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short' });
      const existing = monthMap.get(mName) || { month: mName, amount: 0, transactions: 0 };
      existing.amount += tx.amount;
      existing.transactions += 1;
      monthMap.set(mName, existing);
    });

    return Array.from(monthMap.values());
  }, [transactions]);

  // Category spending for pie chart
  const categorySpending = useMemo(() => {
    return pokemonData
      .filter((d) => d.totalSpent > 0)
      .map((d) => ({
        name: d.category.name,
        value: d.totalSpent,
        color: d.category.color,
        icon: d.category.icon,
      }))
      .sort((a, b) => b.value - a.value);
  }, [pokemonData]);

  // Top spending categories leaderboard (Phase 3)
  const topCategories = useMemo(() => {
    return categorySpending.slice(0, 5);
  }, [categorySpending]);

  // Day-of-week breakdown
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyMap = new Map<string, { day: string; food: number; grocery: number; ecommerce: number; other: number }>();
    days.forEach((day) => weeklyMap.set(day, { day, food: 0, grocery: 0, ecommerce: 0, other: 0 }));

    transactions.forEach((tx) => {
      const txDate = new Date(tx.transaction_date);
      const dayName = txDate.toLocaleDateString('en-US', { weekday: 'short' });
      if (weeklyMap.has(dayName)) {
        const entry = weeklyMap.get(dayName)!;
        if (tx.category_id === 'food-delivery') entry.food += tx.amount;
        else if (tx.category_id === 'grocery') entry.grocery += tx.amount;
        else if (tx.category_id === 'ecommerce') entry.ecommerce += tx.amount;
        else entry.other += tx.amount;
      }
    });

    const hasWeeklyTransactions = transactions.some((t) => t.amount > 0);
    return hasWeeklyTransactions
      ? Array.from(weeklyMap.values())
      : [
          { day: 'Mon', food: 450, grocery: 0, ecommerce: 1200, other: 300 },
          { day: 'Tue', food: 280, grocery: 850, ecommerce: 0, other: 150 },
          { day: 'Wed', food: 0, grocery: 0, ecommerce: 500, other: 200 },
          { day: 'Thu', food: 620, grocery: 1200, ecommerce: 0, other: 0 },
          { day: 'Fri', food: 350, grocery: 0, ecommerce: 2800, other: 450 },
          { day: 'Sat', food: 900, grocery: 650, ecommerce: 0, other: 1200 },
          { day: 'Sun', food: 550, grocery: 0, ecommerce: 0, other: 300 },
        ];
  }, [transactions]);

  // Filtered recent transactions list
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const matchesCat = selectedTxCategory === 'all' || tx.category_id === selectedTxCategory;
        const matchesSearch =
          tx.app_name.toLowerCase().includes(txSearch.toLowerCase()) ||
          (tx.description && tx.description.toLowerCase().includes(txSearch.toLowerCase()));
        return matchesCat && matchesSearch;
      })
      .slice(0, 15)
      .map((tx) => {
        const cat = APP_CATEGORIES.find((c) => c.id === tx.category_id);
        return {
          id: tx.id,
          app: tx.app_name,
          amount: tx.amount,
          description: tx.description || '',
          date: timeAgo(tx.transaction_date),
          pokemon: cat?.pokemon.displayName || 'Pokémon',
          pokemonId: cat?.pokemon.id || 1,
        };
      });
  }, [transactions, txSearch, selectedTxCategory]);

  const hasRealData = !!user || pokemonData.length > 0;

  // HP Bar color calculation
  const hpColor =
    monthlyMetrics.percentUsed > 100
      ? 'var(--pokeball-red)'
      : monthlyMetrics.percentUsed > 75
      ? 'var(--accent-gold)'
      : 'var(--grass)';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="pokemon-bg" />
      <AppNavigation />
      <AchievementToast />

      <div className="main-content relative z-10">
        {/* Header */}
        <header className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="page-title flex items-center gap-2"
            >
              <span>📊</span> {greeting}, {trainerName}!
            </motion.h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {hasRealData
                ? `Financial Analytics & Pokémon Team Growth`
                : '🎮 Trainer Mode — Live spending metrics, budgets & reports'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowBankModal(true);
              }}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--electric)] hover:text-[var(--electric)] transition-all"
              title="Upload bank CSV statement"
            >
              <span>📄</span> Bank CSV
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowReceiptModal(true);
              }}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--psychic)] hover:text-[var(--psychic)] transition-all"
              title="Scan email order confirmation or SMS text"
            >
              <span>🧾</span> Scan Receipt
            </button>
            <Link
              href="/badges"
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all"
              title="View your Gym Badges & Official Trainer Card"
            >
              <span>🏆</span> Badges
            </Link>
            <button
              type="button"
              onClick={handleExportCSV}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-white transition-all"
              title="Download CSV statement of all expenses"
            >
              <span>📥</span> Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setNewBudgetAmount(budgetConfig.totalMonthlyBudget.toString());
                setShowBudgetModal(true);
              }}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all"
            >
              <span>🎯</span> Budget
            </button>
            <Link
              href="/add-transaction"
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>⚡</span> + Add Transaction
            </Link>
          </div>
        </header>

        <div className="px-4 md:px-6 pb-12 space-y-6">
          {/* Phase 3: Budget Tracking & Trainer Health Meter Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 md:p-6 border relative overflow-hidden"
            style={{
              borderColor: monthlyMetrics.percentUsed > 100 ? 'rgba(255, 75, 75, 0.4)' : 'rgba(255, 215, 0, 0.25)',
              background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.9), rgba(15, 20, 35, 0.95))',
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Budget Progress & HP Bar */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❤️</span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      Monthly Budget Health
                    </span>
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        background: `${hpColor}25`,
                        color: hpColor,
                        border: `1px solid ${hpColor}60`,
                      }}
                    >
                      {monthlyMetrics.percentUsed}% Used
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[var(--text-muted)] mr-1">Target:</span>
                    <span className="text-xs font-bold text-white">
                      ₹{budgetConfig.totalMonthlyBudget.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* HP Gauge Bar */}
                <div className="w-full bg-[rgba(255,255,255,0.06)] h-3.5 rounded-full overflow-hidden p-0.5 border border-[rgba(255,255,255,0.1)] relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(monthlyMetrics.percentUsed, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full transition-all"
                    style={{
                      background: hpColor,
                      boxShadow: `0 0 12px ${hpColor}`,
                    }}
                  />
                </div>

                {/* Spent vs Remaining */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[var(--text-muted)]">This Month Spent: </span>
                    <span className="font-bold text-white">
                      ₹{monthlyMetrics.thisMonthSpent.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">
                      {monthlyMetrics.percentUsed > 100 ? 'Over Budget by: ' : 'Remaining HP: '}
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        color: monthlyMetrics.percentUsed > 100 ? 'var(--pokeball-red)' : 'var(--grass)',
                      }}
                    >
                      ₹{Math.abs(budgetConfig.totalMonthlyBudget - monthlyMetrics.thisMonthSpent).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial Health Rank & Month-over-Month Comparison */}
              <div className="flex items-center gap-4 lg:pl-6 lg:border-l lg:border-[var(--border-subtle)]">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-gold)]/20 border border-[var(--border-accent)] flex flex-col items-center justify-center flex-shrink-0">
                  <span className="font-pixel text-xl text-[var(--accent-gold)] leading-none">
                    {monthlyMetrics.healthRating}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">RANK</span>
                </div>

                <div>
                  <div className="text-xs font-bold text-white">{monthlyMetrics.healthTitle}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                    <span>MoM Spend:</span>
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        monthlyMetrics.momPercentage > 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {monthlyMetrics.momPercentage > 0 ? '▲ +' : '▼ '}
                      {monthlyMetrics.momPercentage}%
                    </span>
                    <span>vs last month</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 4 Stat Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              {
                label: 'Total Spent',
                value: `₹${totalSpent.toLocaleString('en-IN')}`,
                icon: '💰',
                color: 'var(--accent-gold)',
                subtext: `${totalTransactions} total purchases`,
              },
              {
                label: 'This Month',
                value: `₹${monthlyMetrics.thisMonthSpent.toLocaleString('en-IN')}`,
                icon: '📅',
                color: 'var(--accent-primary)',
                subtext: `${monthlyMetrics.thisMonthCount} orders in current month`,
              },
              {
                label: 'Avg/Transaction',
                value: `₹${avgPerTransaction.toLocaleString('en-IN')}`,
                icon: '📈',
                color: 'var(--grass)',
                subtext: 'Mean spending velocity',
              },
              {
                label: 'Highest Level',
                value: `Lv. ${highestLevel}`,
                icon: '⭐',
                color: 'var(--electric)',
                subtext: 'Top trained companion',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="stat-card shine-effect"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div
                  className="stat-value text-xl md:text-2xl"
                  style={{ backgroundImage: `linear-gradient(135deg, var(--text-primary), ${stat.color})` }}
                >
                  {stat.value}
                </div>
                <div className="stat-label text-xs mt-1">{stat.label}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate">{stat.subtext}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts Row: Monthly Trend & Category Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Trend Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>📈</span> Monthly Spending Trend
                </h3>
                <span className="text-xs text-[var(--text-muted)]">Last 6 Months</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlySpending}>
                  <defs>
                    <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--accent-primary)"
                    strokeWidth={2.5}
                    fill="url(#spendingGradient)"
                    name="Spending"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Category Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>🥧</span> Spending by Category
                </h3>
                <span className="text-xs text-[var(--text-muted)]">{categorySpending.length} Active Categories</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={210} className="sm:w-1/2">
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      dataKey="value"
                      stroke="none"
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, 'Spent']}
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full sm:w-1/2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categorySpending.slice(0, 5).map((cat) => {
                    const percent = totalSpent > 0 ? Math.round((cat.value / totalSpent) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center justify-between text-xs p-1 rounded hover:bg-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                          <span className="text-[var(--text-secondary)] truncate">
                            {cat.icon} {cat.name}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="font-bold text-white">₹{cat.value.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Secondary Analytics Row: Top Categories Leaderboard & Weekly Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Categories Leaderboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="chart-container"
            >
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <span>🏆</span> Top Spending Habits
              </h3>
              {topCategories.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] text-xs">
                  No categorical spending recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((item, idx) => {
                    const share = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
                    return (
                      <div key={item.name} className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-[11px] text-[var(--accent-gold)]">#{idx + 1}</span>
                            <span className="font-semibold text-white">
                              {item.icon} {item.name}
                            </span>
                          </div>
                          <div className="font-bold text-[var(--accent-gold)]">
                            ₹{item.value.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] text-[var(--text-muted)] font-normal">({share}% of total)</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Weekly Breakdown Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="chart-container"
            >
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <span>📊</span> Day-of-Week Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                  <Bar dataKey="food" name="🍔 Food" fill="var(--fire)" radius={[2, 2, 0, 0]} stackId="stack" />
                  <Bar dataKey="grocery" name="🛒 Grocery" fill="var(--grass)" radius={[2, 2, 0, 0]} stackId="stack" />
                  <Bar dataKey="ecommerce" name="📦 E-Com" fill="var(--water)" radius={[2, 2, 0, 0]} stackId="stack" />
                  <Bar dataKey="other" name="💎 Other" fill="var(--ghost)" radius={[2, 2, 0, 0]} stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Pokemon Team Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>🐾</span> Trained Pokémon Companions
              </h3>
              <Link href="/pokedex" className="text-xs text-[var(--accent-primary)] hover:underline font-semibold">
                View Full Pokédex →
              </Link>
            </div>
            <div className="pokemon-grid">
              {pokemonData.slice(0, 8).map((data, i) => (
                <motion.div
                  key={data.category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.03 }}
                >
                  <PokemonCard
                    category={data.category}
                    totalExp={data.totalExp}
                    totalSpent={data.totalSpent}
                    transactionCount={data.transactionCount}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Transactions with Filter & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-card p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>🕐</span> Expense Ledger &amp; XP Gains
              </h3>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Filter by app or note..."
                  className="poke-input text-xs py-1.5 px-3 max-w-[170px]"
                />
                <select
                  value={selectedTxCategory}
                  onChange={(e) => setSelectedTxCategory(e.target.value)}
                  className="poke-input text-xs py-1.5 px-2 max-w-[140px]"
                >
                  <option value="all">All Categories</option>
                  {APP_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/add-transaction"
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:text-white px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all whitespace-nowrap"
                >
                  + Add
                </Link>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-muted)]">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-xs">No transactions match your search.</p>
                <Link href="/add-transaction" className="btn-primary inline-block mt-4 text-xs py-2 px-4">
                  Log First Expense
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="transaction-item group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.04)] flex-shrink-0">
                      <Image
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${tx.pokemonId}.png`}
                        alt={tx.pokemon}
                        width={28}
                        height={28}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{tx.app}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">via {tx.pokemon}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{tx.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--pokeball-red)]">
                          -₹{tx.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">{tx.date}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTx(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                        title="Delete transaction and reverse EXP"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Budget Configuration Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowBudgetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md p-6 border border-[var(--border-accent)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎯</span> Set Monthly Budget Target
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Total Monthly Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    className="poke-input text-lg font-bold"
                    min="1000"
                    step="500"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    Your Pokémon companions will track your spending against this target like an HP bar.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="glass-card w-1/2 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary w-1/2 py-2.5 text-xs font-semibold">
                    Save Budget
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 4: Bank Statement CSV Modal */}
      <BankStatementModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Phase 4: Order Receipt / Email Parser Modal */}
      <ReceiptParserModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
