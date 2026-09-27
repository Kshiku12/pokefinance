'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AppNavigation from '@/components/AppNavigation';
import AchievementToast from '@/components/AchievementToast';
import { APP_CATEGORIES, getCurrentEvolution, getLevelFromExp } from '@/lib/pokemon';
import { fetchUserPokemon, fetchTransactions, subscribeToData } from '@/lib/data-store';
import { getBudgetConfig } from '@/lib/budget';
import { evaluateAchievements, type Achievement } from '@/lib/achievements';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';
import type { UserPokemon, Transaction } from '@/lib/types';

export default function BadgesPage() {
  const { user } = useAuth();
  const [pokemonList, setPokemonList] = useState<UserPokemon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [trainerTitle, setTrainerTitle] = useState('Fintech Champion');
  const [selectedPartnerId, setSelectedPartnerId] = useState('food-delivery'); // Charmander default
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const budgetConfig = useMemo(() => getBudgetConfig(), []);

  const loadData = useCallback(async () => {
    try {
      const isAuth = !!user;
      const [pokemonRes, txRes] = await Promise.all([
        fetchUserPokemon(isAuth),
        fetchTransactions(isAuth, 100),
      ]);
      setPokemonList(pokemonRes);
      setTransactions(txRes);
    } catch (err) {
      console.error('Failed to load badge data', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(loadData);
    return () => unsub();
  }, [loadData]);

  // Compute live achievements and progress
  const { achievements } = useMemo(() => {
    return evaluateAchievements({
      transactions,
      pokemonList,
      budgetConfig,
    });
  }, [transactions, pokemonList, budgetConfig]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  const filteredBadges = useMemo(() => {
    if (filter === 'unlocked') return achievements.filter((a) => a.unlocked);
    if (filter === 'locked') return achievements.filter((a) => !a.unlocked);
    return achievements;
  }, [achievements, filter]);

  // Trainer metrics
  const totalSpent = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

  const totalExp = useMemo(() => {
    return pokemonList.reduce((sum, p) => sum + (Number(p.current_exp) || 0), 0);
  }, [pokemonList]);

  // Partner Pokemon details
  const partnerCategory = APP_CATEGORIES.find((c) => c.id === selectedPartnerId) || APP_CATEGORIES[0];
  const partnerPokemon = pokemonList.find((p) => p.category_id === selectedPartnerId);
  const partnerLevel = partnerPokemon?.current_level || (partnerPokemon ? getLevelFromExp(partnerPokemon.current_exp) : 5);
  const partnerEvolution = getCurrentEvolution(partnerCategory.pokemon, partnerLevel);

  const handleShareTrainerCard = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      const shareText = `🎮 PokeFinance Trainer Card: ${unlockedCount}/12 Gym Badges Unlocked | Partner: ${partnerEvolution.name} (Lv. ${partnerLevel}) | Total Spent: ₹${totalSpent.toLocaleString('en-IN')}`;
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="pokemon-bg" />
      <AppNavigation />
      <AchievementToast />

      <div className="main-content relative z-10 pb-20">
        {/* Header */}
        <header className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="page-title flex items-center gap-2"
            >
              <span>🏆</span> Gym Badges & Trainer Card
            </motion.h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Honor your financial milestones with official Indigo League Gym Badges
            </p>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-2 border border-[var(--border-accent)] flex items-center gap-3">
              <span className="text-2xl">🎖️</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Badges Unlocked</p>
                <p className="text-sm font-black text-white">
                  <span className="text-[var(--accent-gold)]">{unlockedCount}</span> / {achievements.length} ({progressPercent}%)
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-6 space-y-8">
          {/* Holographic Trainer Card Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8 rounded-3xl border relative overflow-hidden shadow-2xl"
            style={{
              borderColor: 'rgba(255, 215, 0, 0.35)',
              background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95), rgba(15, 20, 35, 0.98))',
            }}
          >
            {/* Holographic foil shimmer effect */}
            <div
              className="absolute inset-0 pointer-events-none opacity-15"
              style={{
                background: 'linear-gradient(120deg, transparent 20%, rgba(255,215,0,0.4) 40%, rgba(56,189,248,0.4) 60%, transparent 80%)',
              }}
            />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              {/* Left Column: Trainer Identity & Partner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Partner Pokemon Avatar Stand */}
                <div className="relative group cursor-pointer" onClick={() => sounds.playPokemonCry(partnerEvolution.pokedexId)}>
                  <div
                    className="w-28 h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center p-3 relative shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${partnerCategory.color}25, rgba(0,0,0,0.6))`,
                      border: `2px solid ${partnerCategory.color}80`,
                    }}
                  >
                    <Image
                      src={partnerEvolution.spriteUrl}
                      alt={partnerEvolution.name}
                      width={100}
                      height={100}
                      className="object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                      unoptimized
                    />
                    <div className="absolute -bottom-2 -right-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
                      Lv. {partnerLevel}
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-[var(--text-muted)] mt-1.5 flex items-center justify-center gap-1">
                    <span>🔊</span> Click for Cry
                  </p>
                </div>

                {/* Trainer Info & Title Selector */}
                <div className="text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--accent-gold)]">
                      OFFICIAL TRAINER CARD
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 font-mono">
                      ID #PF-892401
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {user?.email?.split('@')[0] || 'Pokémon Trainer'}
                  </h2>

                  {/* Title Select */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-xs text-[var(--text-muted)]">Title:</span>
                    <select
                      value={trainerTitle}
                      onChange={(e) => setTrainerTitle(e.target.value)}
                      className="text-xs bg-black/40 border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-[var(--accent-gold)] font-bold focus:outline-none focus:border-[var(--accent-gold)]"
                    >
                      <option value="Fintech Champion">Fintech Champion</option>
                      <option value="Ace Saver">Ace Saver</option>
                      <option value="Budget Gym Leader">Budget Gym Leader</option>
                      <option value="Dragon Tamer">Dragon Tamer</option>
                      <option value="Expense Grandmaster">Expense Grandmaster</option>
                    </select>
                  </div>

                  {/* Partner Pokemon Selector */}
                  <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                    <span className="text-xs text-[var(--text-muted)]">Partner:</span>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => {
                        setSelectedPartnerId(e.target.value);
                        sounds.playClick();
                      }}
                      className="text-xs bg-black/40 border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-white font-semibold focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                      {APP_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.pokemon.displayName} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Key Metrics & Share Button */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="glass-card p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Spent</p>
                    <p className="text-sm font-black text-white mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="glass-card p-3 rounded-xl border border-[var(--border-subtle)] text-center">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Team EXP</p>
                    <p className="text-sm font-black text-[var(--accent-gold)] mt-0.5">{totalExp.toLocaleString()}</p>
                  </div>
                  <div className="glass-card p-3 rounded-xl border border-[var(--border-subtle)] text-center col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">League Rank</p>
                    <p className="text-sm font-black text-[var(--grass)] mt-0.5">
                      {unlockedCount >= 10 ? 'Master' : unlockedCount >= 6 ? 'Veteran' : 'Rookie'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareTrainerCard}
                  className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 w-full"
                >
                  <span>{copied ? '✅' : '📋'}</span>
                  {copied ? 'Trainer Card Copied!' : 'Share Trainer Card'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Kanto Velvet Gym Badge Case */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎖️</span> Official Indigo League Badge Case
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Click on any badge to inspect lore, requirements, and unlock progress
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-[var(--border-subtle)] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'all' ? 'bg-[var(--accent-primary)] text-white shadow' : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  All ({achievements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unlocked')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'unlocked' ? 'bg-[var(--accent-gold)] text-black shadow' : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('locked')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'locked' ? 'bg-white/10 text-white shadow' : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  Locked ({achievements.length - unlockedCount})
                </button>
              </div>
            </div>

            {/* Badges Grid (12 Badges) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {filteredBadges.map((badge, idx) => {
                const isSelected = selectedBadge?.id === badge.id;

                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedBadge(badge);
                    }}
                    className={`glass-card p-4 rounded-2xl border flex flex-col items-center text-center cursor-pointer relative overflow-hidden transition-all ${
                      badge.unlocked
                        ? 'border-[var(--border-accent)] hover:border-[var(--accent-gold)] shadow-lg'
                        : 'border-white/5 opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      background: badge.unlocked
                        ? `linear-gradient(145deg, ${badge.color}15, rgba(15, 20, 35, 0.9))`
                        : 'rgba(15, 20, 35, 0.7)',
                    }}
                  >
                    {/* Glowing aura if unlocked */}
                    {badge.unlocked && (
                      <div
                        className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-xl pointer-events-none opacity-40"
                        style={{ background: badge.color }}
                      />
                    )}

                    {/* Badge Icon Emblem */}
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2.5 transition-transform ${
                        badge.unlocked ? 'shadow-md group-hover:rotate-6' : 'grayscale contrast-50'
                      }`}
                      style={{
                        background: badge.unlocked ? `${badge.color}25` : 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${badge.unlocked ? badge.color : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {badge.icon}
                    </div>

                    <h4 className="text-xs font-bold text-white truncate w-full">
                      {badge.badgeName}
                    </h4>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 ${
                        badge.unlocked
                          ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]/40'
                          : 'bg-white/5 text-[var(--text-muted)]'
                      }`}
                    >
                      {badge.unlocked ? '★ Unlocked' : `${badge.progress}%`}
                    </span>

                    {/* Progress Bar for locked badges */}
                    {!badge.unlocked && (
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-[var(--accent-primary)] rounded-full"
                          style={{ width: `${badge.progress}%` }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Badge Inspection Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md p-6 border-2 relative overflow-hidden shadow-2xl"
              style={{
                borderColor: selectedBadge.unlocked ? selectedBadge.color : 'rgba(255,255,255,0.15)',
                background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95), rgba(15, 20, 35, 0.98))',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white/70"
              >
                ✕
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                {/* Emblem */}
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-2xl relative ${
                    selectedBadge.unlocked ? 'animate-bounce-subtle' : 'grayscale opacity-70'
                  }`}
                  style={{
                    background: `${selectedBadge.color}30`,
                    border: `2px solid ${selectedBadge.color}`,
                    boxShadow: `0 10px 30px ${selectedBadge.color}40`,
                  }}
                >
                  {selectedBadge.icon}
                </div>

                <div>
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                    style={{
                      background: `${selectedBadge.color}20`,
                      color: selectedBadge.color,
                      border: `1px solid ${selectedBadge.color}50`,
                    }}
                  >
                    {selectedBadge.rarity} Badge
                  </span>
                  <h3 className="text-xl font-black text-white mt-1.5">
                    {selectedBadge.badgeName}
                  </h3>
                  <p className="text-xs text-[var(--accent-gold)] font-semibold">
                    {selectedBadge.title}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-4">
                  {selectedBadge.description}
                </p>

                {/* Progress / Status Block */}
                <div className="w-full glass-card p-3 rounded-xl border border-[var(--border-subtle)] text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-semibold">Progress</span>
                    <span className="font-bold text-white">{selectedBadge.progressText}</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${selectedBadge.progress}%`,
                        background: selectedBadge.unlocked ? selectedBadge.color : 'var(--accent-primary)',
                      }}
                    />
                  </div>
                  {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                    <p className="text-[10px] text-[var(--text-muted)] pt-1">
                      Unlocked on: {new Date(selectedBadge.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
