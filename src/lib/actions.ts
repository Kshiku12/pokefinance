'use server';

import { createClient } from '@/lib/supabase/server';
import { amountToExp, getLevelFromExp } from '@/lib/pokemon';
import type { Profile, UserPokemon, Transaction } from '@/lib/types';

// ============================================
// PROFILE ACTIONS
// ============================================

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ============================================
// POKEMON ACTIONS
// ============================================

export async function getUserPokemon(): Promise<UserPokemon[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('user_pokemon')
    .select('*')
    .eq('user_id', user.id)
    .order('total_spent', { ascending: false });

  return data || [];
}

export async function getOrCreatePokemon(
  categoryId: string,
  pokemonId: number
): Promise<UserPokemon | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try to get existing
  const { data: existing } = await supabase
    .from('user_pokemon')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .single();

  if (existing) return existing;

  // Create new
  const { data: created } = await supabase
    .from('user_pokemon')
    .insert({
      user_id: user.id,
      category_id: categoryId,
      pokemon_id: pokemonId,
      current_exp: 0,
      current_level: 1,
      evolution_stage: 1,
      total_spent: 0,
      transaction_count: 0,
    })
    .select()
    .single();

  return created;
}

// ============================================
// TRANSACTION ACTIONS
// ============================================

export interface AddTransactionInput {
  categoryId: string;
  pokemonId: number;
  appName: string;
  amount: number;
  description?: string;
}

export interface AddTransactionResult {
  success?: boolean;
  error?: string;
  transaction?: Transaction;
  expEarned?: number;
  previousLevel?: number;
  newLevel?: number;
  evolved?: boolean;
  newEvolutionStage?: number;
}

export async function addTransaction(
  input: AddTransactionInput
): Promise<AddTransactionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get XP multiplier from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_multiplier')
    .eq('id', user.id)
    .single();

  const multiplier = profile?.xp_multiplier || 1.0;
  const expEarned = Math.round(amountToExp(input.amount) * multiplier);

  // Insert transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      category_id: input.categoryId,
      app_name: input.appName,
      amount: input.amount,
      description: input.description || null,
      exp_earned: expEarned,
      source: 'manual',
    })
    .select()
    .single();

  if (txError) return { error: txError.message };

  // Get or create the Pokemon for this category
  const pokemon = await getOrCreatePokemon(input.categoryId, input.pokemonId);
  if (!pokemon) return { error: 'Failed to get Pokemon data' };

  const previousLevel = pokemon.current_level;
  const newExp = pokemon.current_exp + expEarned;
  const newLevel = getLevelFromExp(newExp);

  // Determine evolution stage based on level
  // Stage 1 = base, Stage 2 = evolution 1, Stage 3 = evolution 2
  let newEvolutionStage = pokemon.evolution_stage;
  if (newLevel >= 36) newEvolutionStage = 3;
  else if (newLevel >= 16) newEvolutionStage = 2;

  const evolved = newEvolutionStage > pokemon.evolution_stage;

  // Update Pokemon stats
  const { error: updateError } = await supabase
    .from('user_pokemon')
    .update({
      current_exp: newExp,
      current_level: newLevel,
      evolution_stage: newEvolutionStage,
      total_spent: pokemon.total_spent + input.amount,
      transaction_count: pokemon.transaction_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pokemon.id);

  if (updateError) return { error: updateError.message };

  return {
    success: true,
    transaction: transaction as Transaction,
    expEarned,
    previousLevel,
    newLevel,
    evolved,
    newEvolutionStage: evolved ? newEvolutionStage : undefined,
  };
}

export async function getTransactions(
  limit = 20,
  offset = 0
): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1);

  return data || [];
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get the transaction first to reverse the XP
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (!tx) return { error: 'Transaction not found' };

  // Delete the transaction
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) return { error: error.message };

  // Update Pokemon stats (reverse the XP & amount)
  const { data: pokemon } = await supabase
    .from('user_pokemon')
    .select('*')
    .eq('user_id', user.id)
    .eq('category_id', tx.category_id)
    .single();

  if (pokemon) {
    const newExp = Math.max(0, pokemon.current_exp - tx.exp_earned);
    const newLevel = getLevelFromExp(newExp);
    let newEvolutionStage = 1;
    if (newLevel >= 36) newEvolutionStage = 3;
    else if (newLevel >= 16) newEvolutionStage = 2;

    await supabase
      .from('user_pokemon')
      .update({
        current_exp: newExp,
        current_level: newLevel,
        evolution_stage: newEvolutionStage,
        total_spent: Math.max(0, pokemon.total_spent - tx.amount),
        transaction_count: Math.max(0, pokemon.transaction_count - 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pokemon.id);
  }

  return { success: true };
}

// ============================================
// DASHBOARD DATA
// ============================================

export interface DashboardData {
  profile: Profile | null;
  pokemon: UserPokemon[];
  recentTransactions: Transaction[];
  monthlySpending: Array<{ month: string; amount: number; transactions: number }>;
  categorySpending: Array<{ category_id: string; total: number; count: number }>;
  totalSpent: number;
  totalTransactions: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const emptyResult: DashboardData = {
    profile: null,
    pokemon: [],
    recentTransactions: [],
    monthlySpending: [],
    categorySpending: [],
    totalSpent: 0,
    totalTransactions: 0,
  };

  if (!user) return emptyResult;

  // Run all queries in parallel
  const [profileRes, pokemonRes, transactionsRes, monthlyRes, categoryRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('user_pokemon')
        .select('*')
        .eq('user_id', user.id)
        .order('total_spent', { ascending: false }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(10),
      supabase
        .from('monthly_spending')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: true })
        .limit(6),
      supabase
        .from('category_spending')
        .select('*')
        .eq('user_id', user.id),
    ]);

  const pokemon = pokemonRes.data || [];
  const totalSpent = pokemon.reduce((sum, p) => sum + (p.total_spent || 0), 0);
  const totalTransactions = pokemon.reduce((sum, p) => sum + (p.transaction_count || 0), 0);

  return {
    profile: profileRes.data,
    pokemon,
    recentTransactions: (transactionsRes.data || []) as Transaction[],
    monthlySpending: (monthlyRes.data || []).map((m: Record<string, unknown>) => ({
      month: new Date(m.month as string).toLocaleDateString('en-US', { month: 'short' }),
      amount: m.total_amount as number,
      transactions: m.transaction_count as number,
    })),
    categorySpending: (categoryRes.data || []).map((c: Record<string, unknown>) => ({
      category_id: c.category_id as string,
      total: c.total_amount as number,
      count: c.transaction_count as number,
    })),
    totalSpent,
    totalTransactions,
  };
}
