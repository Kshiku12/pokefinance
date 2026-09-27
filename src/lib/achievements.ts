// PokeFinance Gym Badges & Achievements System
import type { UserPokemon, Transaction } from './types';
import type { BudgetConfig } from './budget';
import { getLevelFromExp, getCurrentEvolution, APP_CATEGORIES } from './pokemon';

export interface Achievement {
  id: string;
  badgeName: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
  progressText: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export const ACHIEVEMENT_DEFINITIONS: Array<Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress' | 'progressText'>> = [
  {
    id: 'boulder-badge',
    badgeName: 'Boulder Badge',
    title: 'First Step to Greatness',
    description: 'Log your very first expense transaction in the PokéFinance ledger.',
    icon: '🪨',
    color: '#9ca3af',
    rarity: 'Common',
  },
  {
    id: 'cascade-badge',
    badgeName: 'Cascade Badge',
    title: 'Hydrated Ledger',
    description: 'Track a cumulative total of ₹5,000 or more in recorded expenses.',
    icon: '💧',
    color: '#38bdf8',
    rarity: 'Common',
  },
  {
    id: 'thunder-badge',
    badgeName: 'Thunder Badge',
    title: 'Voltage Surge',
    description: 'Train any Pokémon companion to Level 16 or higher.',
    icon: '⚡',
    color: '#facc15',
    rarity: 'Rare',
  },
  {
    id: 'rainbow-badge',
    badgeName: 'Rainbow Badge',
    title: 'Prismatic Portfolio',
    description: 'Log transactions across at least 5 different application categories.',
    icon: '🌈',
    color: '#ec4899',
    rarity: 'Rare',
  },
  {
    id: 'soul-badge',
    badgeName: 'Soul Badge',
    title: 'Zen Discipline',
    description: 'Maintain healthy spending habits with over 50% remaining in your monthly HP budget.',
    icon: '💖',
    color: '#f43f5e',
    rarity: 'Rare',
  },
  {
    id: 'marsh-badge',
    badgeName: 'Marsh Badge',
    title: 'Metamorphosis',
    description: 'Successfully evolve any starter Pokémon into their Stage 2 evolution form.',
    icon: '🥇',
    color: '#a855f7',
    rarity: 'Rare',
  },
  {
    id: 'volcano-badge',
    badgeName: 'Volcano Badge',
    title: 'High Roller Eruption',
    description: 'Accumulate over 10,000 Total EXP across your entire Pokémon sanctuary.',
    icon: '🌋',
    color: '#f97316',
    rarity: 'Epic',
  },
  {
    id: 'earth-badge',
    badgeName: 'Earth Badge',
    title: "Champion's Pinnacle",
    description: 'Ascend any Pokémon to their final Stage 3 form (e.g. Charizard, Blastoise, Venusaur).',
    icon: '🌍',
    color: '#10b981',
    rarity: 'Epic',
  },
  {
    id: 'silph-badge',
    badgeName: 'Silph Co. Badge',
    title: 'High-Tech Ingestion',
    description: 'Use the Smart Bank Statement CSV Importer or AI Receipt Scanner to record expenses.',
    icon: '🤖',
    color: '#06b6d4',
    rarity: 'Epic',
  },
  {
    id: 'masterball-badge',
    badgeName: 'Master Ball Badge',
    title: 'Grandmaster Trainer',
    description: 'Reach Level 36 or higher on any single Pokémon companion.',
    icon: '🎯',
    color: '#8b5cf6',
    rarity: 'Legendary',
  },
  {
    id: 'pewter-shield',
    badgeName: 'Pewter Shield',
    title: 'Budget Guardian',
    description: 'Configure and save a custom monthly budget target for your Pokémon team.',
    icon: '🛡️',
    color: '#64748b',
    rarity: 'Common',
  },
  {
    id: 'indigo-legend',
    badgeName: 'Indigo League Legend',
    title: 'Fintech Hall of Fame',
    description: 'Train and evolve at least 6 different Pokémon companions to Stage 2 or above.',
    icon: '👑',
    color: '#fbbf24',
    rarity: 'Legendary',
  },
];

const STORAGE_KEY = 'pokefinance_badges_unlocked';

export function getUnlockedBadges(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUnlockedBadge(id: string, dateStr?: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getUnlockedBadges();
    if (!current[id]) {
      current[id] = dateStr || new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('pokefinance-badge-unlocked', { detail: { badgeId: id } }));
    }
  } catch (err) {
    console.error('Failed to save badge', err);
  }
}

/**
 * Evaluate all 12 Gym Badges against current transactions, Pokémon squad, and budget.
 */
export function evaluateAchievements(params: {
  transactions: Transaction[];
  pokemonList: UserPokemon[];
  budgetConfig?: BudgetConfig | null;
}): {
  achievements: Achievement[];
  newUnlocks: Achievement[];
} {
  const { transactions, pokemonList, budgetConfig } = params;
  const stored = getUnlockedBadges();
  const newUnlocks: Achievement[] = [];

  // Metrics calculation
  const totalSpent = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const categoriesUsed = new Set(transactions.map((tx) => tx.category_id)).size;
  const totalExp = pokemonList.reduce((sum, p) => sum + (Number(p.current_exp) || 0), 0);

  // Highest level among pokemon
  const highestLevel = pokemonList.reduce((max, p) => {
    const lvl = p.current_level || getLevelFromExp(p.current_exp || 0);
    return Math.max(max, lvl);
  }, 1);

  // Evolved count & stage 3 check
  let evolvedCount = 0;
  let hasStage3 = false;
  let hasStage2 = false;

  pokemonList.forEach((p) => {
    const lvl = p.current_level || getLevelFromExp(p.current_exp || 0);
    const cat = APP_CATEGORIES.find((c) => c.id === p.category_id);
    if (cat) {
      const evo = getCurrentEvolution(cat.pokemon, lvl);
      if (evo.stage >= 2) {
        evolvedCount++;
        hasStage2 = true;
      }
      if (evo.stage >= 3) {
        hasStage3 = true;
      }
    }
  });

  // Check if bank statement or receipt scanner was used
  const usedAutomation = transactions.some((tx) => {
    const desc = (tx.description || '').toLowerCase();
    const app = tx.app_name.toLowerCase();
    return desc.includes('bank statement') || desc.includes('csv') || desc.includes('receipt') || desc.includes('email') || app.includes('bank');
  });

  // Budget remaining percentage
  const totalBudget = budgetConfig?.totalMonthlyBudget || 35000;
  const budgetHpPercent = Math.max(0, 100 - Math.round((totalSpent / totalBudget) * 100));

  const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    let unlocked = !!stored[def.id];
    let progress = 0;
    let progressText = '0%';

    switch (def.id) {
      case 'boulder-badge':
        progress = transactions.length > 0 ? 100 : 0;
        progressText = transactions.length > 0 ? '1 / 1 Logged' : '0 / 1 Logged';
        break;

      case 'cascade-badge':
        progress = Math.min(100, Math.round((totalSpent / 5000) * 100));
        progressText = `₹${Math.min(totalSpent, 5000).toLocaleString('en-IN')} / ₹5,000`;
        break;

      case 'thunder-badge':
        progress = Math.min(100, Math.round((highestLevel / 16) * 100));
        progressText = `Lv. ${highestLevel} / Lv. 16`;
        break;

      case 'rainbow-badge':
        progress = Math.min(100, Math.round((categoriesUsed / 5) * 100));
        progressText = `${categoriesUsed} / 5 Categories`;
        break;

      case 'soul-badge':
        progress = budgetHpPercent >= 50 ? 100 : Math.round((budgetHpPercent / 50) * 100);
        progressText = `${budgetHpPercent}% HP Remaining`;
        break;

      case 'marsh-badge':
        progress = hasStage2 ? 100 : 0;
        progressText = hasStage2 ? 'Stage 2 Evolved!' : 'Starter Stage';
        break;

      case 'volcano-badge':
        progress = Math.min(100, Math.round((totalExp / 10000) * 100));
        progressText = `${totalExp.toLocaleString()} / 10,000 EXP`;
        break;

      case 'earth-badge':
        progress = hasStage3 ? 100 : 0;
        progressText = hasStage3 ? 'Final Form Reached!' : 'Awaiting Stage 3';
        break;

      case 'silph-badge':
        progress = usedAutomation ? 100 : 0;
        progressText = usedAutomation ? 'Smart Import Used!' : 'Manual Entry Only';
        break;

      case 'masterball-badge':
        progress = Math.min(100, Math.round((highestLevel / 36) * 100));
        progressText = `Lv. ${highestLevel} / Lv. 36`;
        break;

      case 'pewter-shield':
        const hasBudget = !!budgetConfig?.totalMonthlyBudget;
        progress = hasBudget ? 100 : 0;
        progressText = hasBudget ? 'Budget Set!' : 'Default Target';
        break;

      case 'indigo-legend':
        progress = Math.min(100, Math.round((evolvedCount / 6) * 100));
        progressText = `${evolvedCount} / 6 Evolved`;
        break;
    }

    if (progress >= 100 && !unlocked) {
      unlocked = true;
      saveUnlockedBadge(def.id);
      newUnlocks.push({
        ...def,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
        progress: 100,
        progressText,
      });
    }

    return {
      ...def,
      unlocked,
      unlockedAt: stored[def.id],
      progress,
      progressText,
    };
  });

  return { achievements, newUnlocks };
}
