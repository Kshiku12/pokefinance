'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AppNavigation from '@/components/AppNavigation';
import {
  APP_CATEGORIES,
  getLevelFromExp,
  getLevelProgress,
  getCurrentEvolution,
  TYPE_COLORS,
  type AppCategory,
} from '@/lib/pokemon';
import { fetchUserPokemon, fetchTransactions, subscribeToData } from '@/lib/data-store';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';
import type { UserPokemon, Transaction } from '@/lib/types';

export default function PokedexPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pokemonList, setPokemonList] = useState<UserPokemon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const isAuth = !!user;
      const [pRes, tRes] = await Promise.all([
        fetchUserPokemon(isAuth),
        fetchTransactions(isAuth, 100),
      ]);
      setPokemonList(pRes);
      setTransactions(tRes);
    } catch (e) {
      console.error('Failed to load pokedex data', e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(loadData);
    return () => unsub();
  }, [loadData]);

  const pokemonMap = new Map<string, UserPokemon>();
  pokemonList.forEach((p) => {
    pokemonMap.set(p.category_id, p);
  });

  const allTypes = ['all', ...Array.from(new Set(APP_CATEGORIES.map((c) => c.pokemon.type)))];

  const filteredCategories = APP_CATEGORIES.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.pokemon.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.apps.some((app) => app.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || cat.pokemon.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCardClick = (cat: AppCategory) => {
    sounds.playCry(cat.pokemon.type);
    setSelectedCategory(cat);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="pokemon-bg" />
      <AppNavigation />

      <div className="main-content relative z-10">
        <header className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Pokédex</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {user
                ? 'All your finance Pokémon, levels, and evolution progress'
                : '🎮 Trainer Pokédex — Tap any Pokémon to view stats and evolution progress'}
            </p>
          </div>
          <Link
            href="/add-transaction"
            className="btn-primary self-start sm:self-auto text-xs py-2 px-4"
          >
            + Add Transaction
          </Link>
        </header>

        <div className="px-4 md:px-6 pb-8">
          {/* Search & Type Filter */}
          <div className="mb-6 space-y-3">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pokémon, apps, or categories..."
                className="poke-input pl-11"
              />
            </div>

            {/* Type Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {allTypes.map((type) => {
                const isSelected = selectedType === type;
                const typeStyle = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedType(type);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap"
                    style={{
                      background: isSelected
                        ? typeStyle?.bg || 'var(--accent-primary)'
                        : 'rgba(255,255,255,0.04)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'transparent' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="pokemon-grid">
            {filteredCategories.map((cat, i) => {
              const userPoke = pokemonMap.get(cat.id);
              const exp = userPoke ? userPoke.current_exp : 0;
              const level = userPoke ? userPoke.current_level : Math.max(1, getLevelFromExp(exp));
              const progress = getLevelProgress(exp);
              const currentForm = getCurrentEvolution(cat.pokemon, level);
              const typeColor = TYPE_COLORS[cat.pokemon.type] || TYPE_COLORS.normal;

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(cat)}
                  className="pokemon-card cursor-pointer"
                  style={{ borderColor: `${cat.color}25` }}
                >
                  <div className="pokemon-card-inner">
                    {/* Pokedex number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        #{String(cat.pokemon.id).padStart(3, '0')}
                      </span>
                      <div className="level-badge">
                        <span className="font-pixel text-[10px]">Lv</span>
                        {level}
                      </div>
                    </div>

                    {/* Pokemon sprite */}
                    <div className="relative flex items-center justify-center py-3">
                      <div
                        className="absolute w-20 h-20 rounded-full blur-xl opacity-20"
                        style={{ background: cat.color }}
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Image
                          src={currentForm.spriteUrl}
                          alt={currentForm.name}
                          width={96}
                          height={96}
                          className="relative z-10 drop-shadow-lg"
                          style={{ filter: `drop-shadow(0 0 10px ${cat.color}40)` }}
                        />
                      </motion.div>
                    </div>

                    {/* Name & Type */}
                    <div className="text-center mb-3">
                      <div className="font-bold text-base">{currentForm.name}</div>
                      <span
                        className="type-badge mt-1 text-[10px]"
                        style={{ background: typeColor.bg, color: typeColor.text }}
                      >
                        {cat.pokemon.type}
                      </span>
                    </div>

                    {/* Category & Apps */}
                    <div className="text-center mb-3">
                      <div className="text-xs text-[var(--text-secondary)]">
                        {cat.icon} {cat.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 truncate">
                        {cat.apps.slice(0, 3).join(' • ')}
                      </div>
                    </div>

                    {/* EXP Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-muted)]">EXP</span>
                        <span className="text-[var(--exp-bar)] font-medium">
                          {exp.toLocaleString()} ({Math.round(progress * 100)}%)
                        </span>
                      </div>
                      <div className="exp-bar-container">
                        <div
                          className="exp-bar-fill"
                          style={{ width: `${Math.max(progress * 100, 2)}%` }}
                        />
                      </div>
                    </div>

                    {/* Evolution Chain Preview */}
                    <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      {cat.pokemon.evolutions.map((evo, ei) => {
                        const isReached = level >= evo.minLevel;
                        return (
                          <div key={evo.pokedexId} className="flex items-center gap-1">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: isReached ? `${cat.color}20` : 'rgba(255,255,255,0.04)',
                                opacity: isReached ? 1 : 0.4,
                              }}
                            >
                              <Image
                                src={evo.spriteUrl}
                                alt={evo.name}
                                width={18}
                                height={18}
                                style={{ opacity: isReached ? 1 : 0.3 }}
                              />
                            </div>
                            {ei < cat.pokemon.evolutions.length - 1 && (
                              <svg width="8" height="8" viewBox="0 0 8 8" className="text-[var(--text-muted)] opacity-40">
                                <path d="M2 4h4M4.5 2l2 2-2 2" stroke="currentColor" strokeWidth="1" fill="none" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedCategory(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: `${selectedCategory.color}40` }}
            >
              <DetailView
                category={selectedCategory}
                userPokemon={pokemonMap.get(selectedCategory.id)}
                categoryTransactions={transactions.filter(
                  (t) => t.category_id === selectedCategory.id
                )}
                onClose={() => setSelectedCategory(null)}
                onAddExpense={() => {
                  router.push('/add-transaction');
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailView({
  category,
  userPokemon,
  categoryTransactions,
  onClose,
  onAddExpense,
}: {
  category: AppCategory;
  userPokemon?: UserPokemon;
  categoryTransactions: Transaction[];
  onClose: () => void;
  onAddExpense: () => void;
}) {
  const exp = userPokemon ? userPokemon.current_exp : 0;
  const level = userPokemon ? userPokemon.current_level : Math.max(1, getLevelFromExp(exp));
  const progress = getLevelProgress(exp);
  const currentForm = getCurrentEvolution(category.pokemon, level);
  const typeColor = TYPE_COLORS[category.pokemon.type] || TYPE_COLORS.normal;
  const totalSpent = userPokemon?.total_spent ?? categoryTransactions.reduce((s, t) => s + t.amount, 0);
  const txCount = userPokemon?.transaction_count ?? categoryTransactions.length;

  return (
    <div className="relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center hover:bg-[rgba(255,255,255,0.15)] transition-colors"
      >
        ✕
      </button>

      {/* Pokemon Display */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-25"
            style={{ background: category.color }}
          />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src={currentForm.spriteUrl}
              alt={currentForm.name}
              width={160}
              height={160}
              className="relative z-10 mx-auto"
              style={{ filter: `drop-shadow(0 0 24px ${category.color}50)` }}
            />
          </motion.div>
        </div>
        <h2 className="text-2xl font-black mt-3 text-white">{currentForm.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className="type-badge"
            style={{ background: typeColor.bg, color: typeColor.text }}
          >
            {category.pokemon.type}
          </span>
          <div className="level-badge text-sm">
            <span className="font-pixel text-[10px]">Lv</span>
            {level}
          </div>
        </div>
      </div>

      {/* Stats summary row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-3 text-center border border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)]">Total Spent</div>
          <div className="text-base font-bold text-[var(--accent-gold)] mt-0.5">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="glass-card p-3 text-center border border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)]">Orders / Spends</div>
          <div className="text-base font-bold text-white mt-0.5">{txCount}</div>
        </div>
      </div>

      {/* Category Info */}
      <div className="glass-card p-3.5 mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
          <span>{category.icon}</span> Tracked Apps & Services
        </div>
        <div className="flex flex-wrap gap-1.5">
          {category.apps.map((app) => (
            <span
              key={app}
              className="px-2.5 py-1 rounded-lg text-xs bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              {app}
            </span>
          ))}
        </div>
      </div>

      {/* EXP Progress */}
      <div className="mb-5 glass-card p-3.5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[var(--text-secondary)]">Experience Progress</span>
          <span className="font-bold text-[var(--exp-bar)]">{exp.toLocaleString()} XP</span>
        </div>
        <div className="exp-bar-container h-2.5">
          <div
            className="exp-bar-fill"
            style={{ width: `${Math.max(progress * 100, 2)}%` }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-1.5 flex justify-between">
          <span>{Math.round(progress * 100)}% complete</span>
          <span>Next level: Lv. {level + 1}</span>
        </div>
      </div>

      {/* Evolution Chain */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
          Evolution Chain
        </h3>
        <div className="flex items-center justify-center gap-2">
          {category.pokemon.evolutions.map((evo, i) => {
            const isReached = level >= evo.minLevel;
            const isCurrent = currentForm.pokedexId === evo.pokedexId;

            return (
              <div key={evo.pokedexId} className="flex items-center gap-2">
                <div
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
                  style={{
                    background: isCurrent
                      ? `${category.color}25`
                      : 'rgba(255,255,255,0.03)',
                    border: isCurrent
                      ? `1.5px solid ${category.color}`
                      : '1px solid var(--border-subtle)',
                    opacity: isReached ? 1 : 0.45,
                  }}
                >
                  <Image
                    src={evo.spriteUrl}
                    alt={evo.name}
                    width={44}
                    height={44}
                    style={{
                      filter: isReached ? 'none' : 'grayscale(100%) brightness(0.6)',
                    }}
                  />
                  <span className="text-xs font-medium text-white">{evo.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Lv. {evo.minLevel}
                  </span>
                </div>
                {i < category.pokemon.evolutions.length - 1 && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    className="text-[var(--text-muted)]"
                    style={{ opacity: 0.3 }}
                  >
                    <path
                      d="M6 10h8M12 7l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent transactions for this category */}
      {categoryTransactions.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Recent Purchases in {category.name}
          </h3>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {categoryTransactions.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{t.app_name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                    {t.description || 'Expense'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[var(--pokeball-red)]">
                    -₹{t.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[var(--exp-bar)]">
                    +{t.exp_earned} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action CTA */}
      <button
        type="button"
        onClick={() => {
          sounds.playClick();
          onAddExpense();
        }}
        className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
      >
        <span>⚡</span> Log Expense to Level Up {currentForm.name}
      </button>
    </div>
  );
}
