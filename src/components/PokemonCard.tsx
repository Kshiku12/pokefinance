'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { getCurrentEvolution, getLevelFromExp, getLevelProgress, type AppCategory } from '@/lib/pokemon';

interface PokemonCardProps {
  category: AppCategory;
  totalExp: number;
  totalSpent: number;
  transactionCount: number;
  onClick?: () => void;
}

export default function PokemonCard({
  category,
  totalExp,
  totalSpent,
  transactionCount,
  onClick,
}: PokemonCardProps) {
  const level = getLevelFromExp(totalExp);
  const progress = getLevelProgress(totalExp);
  const currentForm = getCurrentEvolution(category.pokemon, level);
  const nextEvolution = category.pokemon.evolutions.find((e) => e.minLevel > level);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="pokemon-card cursor-pointer group"
      style={{
        borderColor: `${category.color}15`,
      }}
    >
      <div className="pokemon-card-inner">
        {/* Header: Category & Level */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{category.icon}</span>
            <div>
              <div className="text-sm font-semibold">{category.name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="level-badge">
            <span className="font-pixel text-[10px]">Lv</span>
            <span>{level}</span>
          </div>
        </div>

        {/* Pokemon Image */}
        <div className="relative flex items-center justify-center py-4">
          <div
            className="absolute w-24 h-24 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-50"
            style={{ background: category.color }}
          />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src={currentForm.spriteUrl}
              alt={currentForm.name}
              width={120}
              height={120}
              className="drop-shadow-lg relative z-10"
              style={{
                filter: `drop-shadow(0 0 12px ${category.color}40)`,
              }}
            />
          </motion.div>
        </div>

        {/* Pokemon Name & Type */}
        <div className="text-center mb-4">
          <div className="text-lg font-bold">{currentForm.name}</div>
          <span
            className="type-badge text-xs mt-1"
            style={{ background: category.color }}
          >
            {category.pokemon.type}
          </span>
        </div>

        {/* EXP Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">EXP</span>
            <span className="text-[var(--exp-bar)] font-medium">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="exp-bar-container">
            <div
              className="exp-bar-fill"
              style={{ width: `${Math.max(progress * 100, 2)}%` }}
            />
          </div>
        </div>

        {/* Next Evolution */}
        {nextEvolution && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Image
              src={nextEvolution.spriteUrl}
              alt={nextEvolution.name}
              width={24}
              height={24}
              className="opacity-40"
            />
            <span className="text-xs text-[var(--text-muted)]">
              Evolves to <span className="text-[var(--text-secondary)]">{nextEvolution.name}</span> at Lv.{nextEvolution.minLevel}
            </span>
          </div>
        )}

        {/* Total Spent */}
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-center">
          <span className="text-xs text-[var(--text-muted)]">Total Spent: </span>
          <span className="text-sm font-bold text-[var(--accent-gold)]">
            ₹{totalSpent.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
