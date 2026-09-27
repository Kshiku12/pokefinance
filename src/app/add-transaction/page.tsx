'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AppNavigation from '@/components/AppNavigation';
import BankStatementModal from '@/components/BankStatementModal';
import ReceiptParserModal from '@/components/ReceiptParserModal';
import AchievementToast from '@/components/AchievementToast';
import { APP_CATEGORIES, amountToExp } from '@/lib/pokemon';
import { recordTransaction, fetchTransactions, fetchUserPokemon } from '@/lib/data-store';
import { evaluateAchievements } from '@/lib/achievements';
import { getBudgetConfig } from '@/lib/budget';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';

export default function AddTransactionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const [customApp, setCustomApp] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Phase 4 Smart Tracking Modals
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Animation states
  const [showXpGain, setShowXpGain] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ from: number; to: number } | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{
    from: string;
    to: string;
    toSprite: string;
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setSoundEnabled(sounds.isEnabled());
  }, []);

  const toggleSound = () => {
    const val = sounds.toggle();
    setSoundEnabled(val);
  };

  const category = APP_CATEGORIES.find((c) => c.id === selectedCategory);
  const appName = selectedApp === 'Other' ? customApp : selectedApp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount || !appName) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return;

    setSubmitting(true);
    sounds.playClick();

    try {
      const result = await recordTransaction(
        {
          categoryId: category.id,
          pokemonId: category.pokemon.id,
          appName,
          amount: amountNum,
          description: description || undefined,
        },
        !!user
      );

      if (result.error) {
        alert(`Error: ${result.error}`);
        setSubmitting(false);
        return;
      }

      const xp = result.expEarned || amountToExp(amountNum);
      setEarnedXp(xp);
      setShowXpGain(true);
      sounds.playCoin();
      setTimeout(() => sounds.playExpGain(), 150);

      // Evaluate any newly achieved Gym Badges
      setTimeout(async () => {
        try {
          const isAuth = !!user;
          const [allTx, allPoke] = await Promise.all([
            fetchTransactions(isAuth, 100),
            fetchUserPokemon(isAuth),
          ]);
          evaluateAchievements({
            transactions: allTx,
            pokemonList: allPoke,
            budgetConfig: getBudgetConfig(),
          });
        } catch {
          // ignore
        }
      }, 1200);

      const didLevelUp = !!(result.newLevel && result.previousLevel && result.newLevel > result.previousLevel);
      const didEvolve = !!(result.evolved && result.newEvolutionStage);

      if (didLevelUp) {
        setTimeout(() => {
          setLevelUpData({ from: result.previousLevel!, to: result.newLevel! });
          setShowLevelUp(true);
          sounds.playLevelUp();
        }, 1000);
      }

      if (didEvolve) {
        const evolutions = category.pokemon.evolutions;
        const newForm = evolutions[result.newEvolutionStage! - 1];
        const oldForm = evolutions[result.newEvolutionStage! - 2];
        if (newForm && oldForm) {
          setTimeout(() => {
            setEvolutionData({
              from: oldForm.name,
              to: newForm.name,
              toSprite: newForm.spriteUrl,
            });
            setShowEvolution(true);
            sounds.playEvolution();
          }, didLevelUp ? 2800 : 1200);
        }
      }

      const totalAnimationTime = didEvolve ? 6500 : didLevelUp ? 3500 : 2000;
      setTimeout(() => {
        setShowSuccess(true);
      }, totalAnimationTime - 400);

      setTimeout(() => {
        resetForm();
      }, totalAnimationTime + 1000);
    } catch (err) {
      console.error(err);
      alert('Failed to log transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowXpGain(false);
    setShowLevelUp(false);
    setShowEvolution(false);
    setShowSuccess(false);
    setLevelUpData(null);
    setEvolutionData(null);
    setAmount('');
    setDescription('');
    setSelectedApp('');
    setCustomApp('');
  };

  const quickAmounts = [50, 100, 250, 500, 1000, 2500];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="pokemon-bg" />
      <AppNavigation />
      <AchievementToast />

      {/* Level Up Overlay */}
      <AnimatePresence>
        {showLevelUp && levelUpData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-4"
              >
                ⬆️
              </motion.div>
              <div className="font-pixel text-2xl text-[var(--accent-gold)] mb-2" style={{ textShadow: '0 0 30px var(--accent-gold)' }}>
                LEVEL UP!
              </div>
              <div className="text-xl font-bold text-white">
                Lv. {levelUpData.from} → Lv. {levelUpData.to}
              </div>
              {category && (
                <div className="text-sm text-[var(--text-secondary)] mt-2">
                  {category.pokemon.displayName} grew stronger!
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evolution Overlay */}
      <AnimatePresence>
        {showEvolution && evolutionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  filter: [
                    'brightness(1)',
                    'brightness(3) drop-shadow(0 0 40px white)',
                    'brightness(1.5)',
                    'brightness(1)',
                  ],
                }}
                transition={{ duration: 2.5 }}
              >
                <Image
                  src={evolutionData.toSprite}
                  alt={evolutionData.to}
                  width={220}
                  height={220}
                  className="mx-auto"
                  style={{ filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.5))' }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="mt-6"
              >
                <div className="font-pixel text-xl text-[var(--accent-gold)] mb-3" style={{ textShadow: '0 0 30px var(--accent-gold)' }}>
                  ✨ EVOLUTION! ✨
                </div>
                <div className="text-xl font-bold text-white">
                  {evolutionData.from} evolved into{' '}
                  <span className="text-[var(--accent-primary)]">{evolutionData.to}</span>!
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[9997] glass-card px-6 py-4 flex items-center gap-3 border border-green-500/30"
          >
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold text-green-400">Transaction Logged!</div>
              <div className="text-xs text-[var(--text-muted)]">+{earnedXp} XP earned for {category?.pokemon.displayName}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="main-content relative z-10">
        <header className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Add Transaction</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {user
                ? '⚡ Log a purchase and earn EXP for your Pokémon!'
                : '🎮 Trainer Mode — Transactions immediately level up your team & update your Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSound}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border border-[var(--border-subtle)] hover:border-[var(--border-accent)] transition-all"
            >
              <span>{soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="glass-card px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] transition-all"
            >
              📊 Go to Dashboard
            </button>
          </div>
        </header>

        <div className="px-4 md:px-6 pb-8 max-w-2xl">
          {/* Smart Tracking Methods Banner */}
          <div className="mb-6 p-4 rounded-2xl glass-card border border-[var(--border-accent)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>⚡</span> Smart Tracking Ingestion (Phase 4)
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Automatically parse bank CSV statements or paste order receipts
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowReceiptModal(true);
                }}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-semibold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-white transition-all whitespace-nowrap"
              >
                ✉️ Parse Email
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowStatementModal(true);
                }}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-semibold bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] text-white transition-all whitespace-nowrap"
              >
                📁 Bank CSV
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="poke-input-label text-base mb-3 block">
                Select App Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {APP_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.id}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedApp('');
                      setCustomApp('');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{
                      background: selectedCategory === cat.id ? `${cat.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${selectedCategory === cat.id ? cat.color : 'var(--border-subtle)'}`,
                      boxShadow: selectedCategory === cat.id ? `0 0 20px ${cat.color}20` : 'none',
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}20` }}>
                      <Image src={cat.pokemon.spriteUrl} alt={cat.pokemon.displayName} width={28} height={28} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{cat.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{cat.pokemon.displayName}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* App Selection */}
            <AnimatePresence>
              {category && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="poke-input-label text-base mb-3 block">Select App</label>
                  <div className="flex flex-wrap gap-2">
                    {category.apps.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => { setSelectedApp(app); setCustomApp(''); }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: selectedApp === app ? category.color : 'rgba(255,255,255,0.04)',
                          color: selectedApp === app ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${selectedApp === app ? category.color : 'var(--border-subtle)'}`,
                        }}
                      >
                        {app}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedApp('Other')}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: selectedApp === 'Other' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                        color: selectedApp === 'Other' ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      + Other
                    </button>
                  </div>
                  {selectedApp === 'Other' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                      <input
                        type="text"
                        value={customApp}
                        onChange={(e) => setCustomApp(e.target.value)}
                        placeholder="Enter app/website name..."
                        className="poke-input"
                        required
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Amount Input */}
            <div>
              <label className="poke-input-label text-base mb-3 block">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--text-muted)]">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="poke-input pl-10 text-2xl font-bold"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa.toString())}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.08)] transition-all"
                  >
                    ₹{qa}
                  </button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-[var(--exp-bar)]">⚡</span>
                  <span className="text-[var(--text-secondary)]">
                    This will earn <span className="text-[var(--exp-bar)] font-bold">+{amountToExp(parseFloat(amount))} XP</span>
                  </span>
                </motion.div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="poke-input-label text-base mb-3 block">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you buy?"
                className="poke-input"
              />
            </div>

            {/* Submit Button */}
            <div className="relative">
              <button
                type="submit"
                disabled={!selectedCategory || !appName || !amount || submitting}
                className="btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="pokeball-spinner w-5 h-5" />
                    Logging...
                  </span>
                ) : category ? (
                  <span className="flex items-center justify-center gap-2">
                    <Image src={category.pokemon.spriteUrl} alt="" width={24} height={24} />
                    Log Transaction & Earn XP
                  </span>
                ) : (
                  'Select a category first'
                )}
              </button>

              {/* Floating XP Animation */}
              <AnimatePresence>
                {showXpGain && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -80 }}
                    transition={{ duration: 2 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                  >
                    <div
                      className="text-3xl font-bold text-[var(--exp-bar)] font-pixel"
                      style={{ textShadow: '0 0 20px var(--exp-bar-glow)' }}
                    >
                      +{earnedXp} XP!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>

      {/* Phase 4 Smart Tracking Modals */}
      <BankStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        onSuccess={() => router.push('/dashboard')}
      />

      <ReceiptParserModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}
