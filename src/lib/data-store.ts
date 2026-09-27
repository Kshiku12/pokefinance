'use client';

import { APP_CATEGORIES, amountToExp, getLevelFromExp, checkEvolution, getCurrentEvolution } from './pokemon';
import { addTransaction as addTransactionServer, deleteTransaction as deleteTransactionServer, getUserPokemon as getUserPokemonServer, getTransactions as getTransactionsServer, type AddTransactionResult } from './actions';
import type { UserPokemon, Transaction } from './types';

const STORAGE_KEY_POKEMON = 'pokefinance_user_pokemon';
const STORAGE_KEY_TRANSACTIONS = 'pokefinance_transactions';
const UPDATE_EVENT_NAME = 'pokefinance_data_updated';

// Initialize default seed Pokemon data
function getInitialPokemon(): UserPokemon[] {
  return APP_CATEGORIES.map((cat, index) => {
    // Initial seeded levels so team is not empty
    const seedExps: Record<string, number> = {
      'food-delivery': 4096, // Lv 16 (Charmeleon)
      grocery: 2744,         // Lv 14 (Bulbasaur)
      ecommerce: 8000,       // Lv 20 (Wartortle)
      'upi-payments': 1728,  // Lv 12 (Pikachu)
      clothing: 3375,        // Lv 15 (Eevee)
      'trading-stocks': 512, // Lv 8 (Meowth)
      'gaming-entertainment': 6859, // Lv 19 (Haunter)
      'travel-booking': 1331,       // Lv 11 (Pidgeotto)
      'health-pharmacy': 800,
      'recharge-bills': 2197,
      'quick-commerce': 1000,
      education: 500,
      'web-purchases': 1728,
      'rent-housing': 15625,
      subscriptions: 3000,
      'cafe-dining': 2000,
      gifting: 700,
      'investments-mf': 10000,
    };

    const currentExp = seedExps[cat.id] ?? 0;
    const currentLevel = Math.max(1, getLevelFromExp(currentExp));
    const form = getCurrentEvolution(cat.pokemon, currentLevel);

    return {
      id: `local-pokemon-${cat.id}`,
      user_id: 'guest',
      category_id: cat.id,
      pokemon_id: cat.pokemon.id,
      current_exp: currentExp,
      current_level: currentLevel,
      evolution_stage: form.stage,
      total_spent: Math.round(currentExp * 2.8),
      transaction_count: Math.max(1, Math.floor(currentLevel * 1.8)),
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

// Initial seed transactions
function getInitialTransactions(): Transaction[] {
  return [
    {
      id: 'demo-tx-1',
      user_id: 'guest',
      category_id: 'food-delivery',
      app_name: 'Zomato',
      amount: 450,
      description: 'Dinner with friends',
      exp_earned: 450,
      source: 'manual',
      transaction_date: new Date(Date.now() - 2 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'demo-tx-2',
      user_id: 'guest',
      category_id: 'ecommerce',
      app_name: 'Amazon',
      amount: 2499,
      description: 'Wireless noise-cancelling earbuds',
      exp_earned: 2499,
      source: 'manual',
      transaction_date: new Date(Date.now() - 5 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: 'demo-tx-3',
      user_id: 'guest',
      category_id: 'grocery',
      app_name: 'Blinkit',
      amount: 380,
      description: 'Fresh fruits and dairy',
      exp_earned: 380,
      source: 'manual',
      transaction_date: new Date(Date.now() - 24 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
      id: 'demo-tx-4',
      user_id: 'guest',
      category_id: 'upi-payments',
      app_name: 'Google Pay',
      amount: 1200,
      description: 'Monthly electricity bill',
      exp_earned: 1200,
      source: 'manual',
      transaction_date: new Date(Date.now() - 36 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    },
    {
      id: 'demo-tx-5',
      user_id: 'guest',
      category_id: 'clothing',
      app_name: 'Myntra',
      amount: 1899,
      description: 'Casual hoodie',
      exp_earned: 1899,
      source: 'manual',
      transaction_date: new Date(Date.now() - 48 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
  ];
}

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
  }
}

export function subscribeToData(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(UPDATE_EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

export async function fetchUserPokemon(isAuth: boolean): Promise<UserPokemon[]> {
  if (isAuth) {
    try {
      const serverData = await getUserPokemonServer();
      if (serverData && serverData.length > 0) return serverData;
    } catch (e) {
      console.warn('Could not fetch server Pokemon, using local cache', e);
    }
  }

  if (typeof window === 'undefined') return getInitialPokemon();

  const stored = localStorage.getItem(STORAGE_KEY_POKEMON);
  if (!stored) {
    const initial = getInitialPokemon();
    localStorage.setItem(STORAGE_KEY_POKEMON, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return getInitialPokemon();
  }
}

export async function fetchTransactions(isAuth: boolean, limit = 50): Promise<Transaction[]> {
  if (isAuth) {
    try {
      const serverData = await getTransactionsServer(limit);
      if (serverData && serverData.length > 0) return serverData;
    } catch (e) {
      console.warn('Could not fetch server transactions, using local cache', e);
    }
  }

  if (typeof window === 'undefined') return getInitialTransactions();

  const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
  if (!stored) {
    const initial = getInitialTransactions();
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return getInitialTransactions();
  }
}

export async function recordTransaction(
  input: {
    categoryId: string;
    pokemonId: number;
    appName: string;
    amount: number;
    description?: string;
  },
  isAuth: boolean
): Promise<AddTransactionResult> {
  // If user is authenticated, call server action first
  if (isAuth) {
    try {
      const serverRes = await addTransactionServer(input);
      if (serverRes.success) {
        notifyDataChanged();
        return serverRes;
      }
    } catch (err) {
      console.warn('Server transaction failed, falling back to local recording', err);
    }
  }

  // Local storage execution (for guest / offline / dev mode)
  const expEarned = amountToExp(input.amount);
  const now = new Date().toISOString();

  const newTx: Transaction = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user_id: 'guest',
    category_id: input.categoryId,
    app_name: input.appName,
    amount: input.amount,
    description: input.description || null,
    exp_earned: expEarned,
    source: 'manual',
    transaction_date: now,
    created_at: now,
  };

  // Update transactions list
  const currentTxs = await fetchTransactions(false, 100);
  const updatedTxs = [newTx, ...currentTxs];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updatedTxs));
  }

  // Update Pokemon stats
  const allPokemon = await fetchUserPokemon(false);
  const cat = APP_CATEGORIES.find((c) => c.id === input.categoryId);
  let previousLevel = 1;
  let newLevel = 1;
  let evolved = false;
  let newEvolutionStage = 1;

  const updatedPokemon = allPokemon.map((p) => {
    if (p.category_id === input.categoryId) {
      previousLevel = p.current_level;
      const newExp = p.current_exp + expEarned;
      newLevel = Math.max(1, getLevelFromExp(newExp));

      if (cat) {
        const evoCheck = checkEvolution(cat.pokemon, previousLevel, newLevel);
        if (evoCheck) {
          evolved = true;
          newEvolutionStage = evoCheck.stage;
        } else {
          newEvolutionStage = getCurrentEvolution(cat.pokemon, newLevel).stage;
        }
      }

      return {
        ...p,
        current_exp: newExp,
        current_level: newLevel,
        evolution_stage: newEvolutionStage,
        total_spent: p.total_spent + input.amount,
        transaction_count: p.transaction_count + 1,
        updated_at: now,
      };
    }
    return p;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_POKEMON, JSON.stringify(updatedPokemon));
  }

  notifyDataChanged();

  return {
    success: true,
    transaction: newTx,
    expEarned,
    previousLevel,
    newLevel,
    evolved,
    newEvolutionStage: evolved ? newEvolutionStage : undefined,
  };
}

export async function deleteTransactionRecord(transactionId: string, isAuth: boolean): Promise<boolean> {
  if (isAuth) {
    try {
      const res = await deleteTransactionServer(transactionId);
      if (res.success) {
        notifyDataChanged();
        return true;
      }
    } catch (e) {
      console.warn('Server delete failed, updating local state', e);
    }
  }

  const txs = await fetchTransactions(false, 100);
  const target = txs.find((t) => t.id === transactionId);
  if (!target) return false;

  const remainingTxs = txs.filter((t) => t.id !== transactionId);

  const pokemonList = await fetchUserPokemon(false);
  const cat = APP_CATEGORIES.find((c) => c.id === target.category_id);

  const updatedPokemon = pokemonList.map((p) => {
    if (p.category_id === target.category_id) {
      const newExp = Math.max(0, p.current_exp - target.exp_earned);
      const newLevel = Math.max(1, getLevelFromExp(newExp));
      const newStage = cat ? getCurrentEvolution(cat.pokemon, newLevel).stage : 1;

      return {
        ...p,
        current_exp: newExp,
        current_level: newLevel,
        evolution_stage: newStage,
        total_spent: Math.max(0, p.total_spent - target.amount),
        transaction_count: Math.max(0, p.transaction_count - 1),
        updated_at: new Date().toISOString(),
      };
    }
    return p;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(remainingTxs));
    localStorage.setItem(STORAGE_KEY_POKEMON, JSON.stringify(updatedPokemon));
  }

  notifyDataChanged();
  return true;
}

export async function addExpToPokemon(categoryId: string, expBonus: number, isAuth: boolean): Promise<boolean> {
  const pokemonList = await fetchUserPokemon(false);
  const cat = APP_CATEGORIES.find((c) => c.id === categoryId);

  const updated = pokemonList.map((p) => {
    if (p.category_id === categoryId) {
      const newExp = p.current_exp + expBonus;
      const newLevel = Math.max(1, getLevelFromExp(newExp));
      const newStage = cat ? getCurrentEvolution(cat.pokemon, newLevel).stage : p.evolution_stage;
      return {
        ...p,
        current_exp: newExp,
        current_level: newLevel,
        evolution_stage: newStage,
        updated_at: new Date().toISOString(),
      };
    }
    return p;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_POKEMON, JSON.stringify(updated));
  }
  notifyDataChanged();
  return true;
}

