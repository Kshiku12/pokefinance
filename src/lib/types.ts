// Database types matching our Supabase schema

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  starter_pokemon: number;
  currency: string;
  xp_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface UserPokemon {
  id: string;
  user_id: string;
  category_id: string;
  pokemon_id: number;
  current_exp: number;
  current_level: number;
  evolution_stage: number;
  total_spent: number;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  app_name: string;
  amount: number;
  description: string | null;
  exp_earned: number;
  source: 'manual' | 'email' | 'sms' | 'bank';
  transaction_date: string;
  created_at: string;
}

export interface MonthlySpending {
  month: string;
  total_amount: number;
  transaction_count: number;
  total_exp: number;
}

export interface CategorySpending {
  category_id: string;
  total_amount: number;
  transaction_count: number;
  total_exp: number;
}
