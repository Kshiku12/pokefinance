-- PokeFinance Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ebhauafhidmiobfxksfq/sql

-- ============================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  starter_pokemon INTEGER DEFAULT 4,  -- Charmander default
  currency TEXT DEFAULT 'INR',
  xp_multiplier REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Trainer'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. USER_POKEMON TABLE (tracks each user's Pokemon progress)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_pokemon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,           -- e.g. 'food-delivery', 'grocery'
  pokemon_id INTEGER NOT NULL,         -- Pokedex ID of the base Pokemon
  current_exp BIGINT DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  evolution_stage INTEGER DEFAULT 1,
  total_spent REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- ============================================
-- 3. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,           -- e.g. 'food-delivery'
  app_name TEXT NOT NULL,              -- e.g. 'Zomato'
  amount REAL NOT NULL,
  description TEXT,
  exp_earned INTEGER NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual',        -- 'manual', 'email', 'sms', 'bank'
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_pokemon_user_id ON public.user_pokemon(user_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Pokemon: users can only access their own Pokemon
CREATE POLICY "Users can view own pokemon" ON public.user_pokemon
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pokemon" ON public.user_pokemon
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pokemon" ON public.user_pokemon
  FOR UPDATE USING (auth.uid() = user_id);

-- Transactions: users can only access their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. HELPER VIEWS
-- ============================================

-- Monthly spending summary
CREATE OR REPLACE VIEW public.monthly_spending AS
SELECT
  user_id,
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count,
  SUM(exp_earned) AS total_exp
FROM public.transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date)
ORDER BY month DESC;

-- Category spending summary
CREATE OR REPLACE VIEW public.category_spending AS
SELECT
  user_id,
  category_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count,
  SUM(exp_earned) AS total_exp
FROM public.transactions
GROUP BY user_id, category_id;
