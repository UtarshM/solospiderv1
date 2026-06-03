-- BlogForge Full Schema Migration
-- Run this in Supabase Dashboard → SQL Editor

-- 1. content_items
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed', 'published')),
  main_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  word_count_target INTEGER NOT NULL DEFAULT 1200,
  tone TEXT NOT NULL DEFAULT 'Professional',
  target_country TEXT NOT NULL DEFAULT 'India',
  h1 TEXT NOT NULL,
  h2_list TEXT[] NOT NULL DEFAULT '{}',
  h3_list TEXT[] DEFAULT '{}',
  internal_links TEXT[] DEFAULT '{}',
  featured_image_url TEXT,
  generate_image BOOLEAN DEFAULT false,
  generated_title TEXT,
  generated_content TEXT DEFAULT '',
  current_section TEXT,
  sections_completed INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,
  published_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. generation_logs
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. workspace_credits
CREATE TABLE IF NOT EXISTS public.workspace_credits (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 50,
  used_credits INTEGER NOT NULL DEFAULT 0,
  locked_credits INTEGER NOT NULL DEFAULT 0,
  reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. credit_transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('usage', 'refund', 'manual_adjustment', 'reset')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('locked', 'completed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. workspace_integrations
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress')),
  credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Disable RLS for dev
ALTER TABLE public.content_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_integrations DISABLE ROW LEVEL SECURITY;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_content_items_updated_at ON public.content_items;
CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create credits for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_credits (user_id, total_credits)
  VALUES (NEW.id, 50);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Credit functions
CREATE OR REPLACE FUNCTION public.lock_credits(
  p_user_id UUID, p_content_id UUID, p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_credits public.workspace_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_credits FROM public.workspace_credits WHERE user_id = p_user_id FOR UPDATE;
  IF (v_credits.total_credits - v_credits.used_credits - v_credits.locked_credits) < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE public.workspace_credits SET locked_credits = locked_credits + p_amount, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.credit_transactions (user_id, content_id, type, amount, status)
  VALUES (p_user_id, p_content_id, 'usage', p_amount, 'locked');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.finalize_credits(
  p_user_id UUID, p_content_id UUID, p_actual_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_locked_tx public.credit_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_locked_tx FROM public.credit_transactions
  WHERE user_id = p_user_id AND content_id = p_content_id AND status = 'locked'
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No locked credits found'; END IF;
  UPDATE public.workspace_credits SET locked_credits = locked_credits - v_locked_tx.amount,
    used_credits = used_credits + p_actual_amount, updated_at = now() WHERE user_id = p_user_id;
  UPDATE public.credit_transactions SET status = 'completed', amount = p_actual_amount WHERE id = v_locked_tx.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID, p_content_id UUID
) RETURNS VOID AS $$
DECLARE
  v_locked_tx public.credit_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_locked_tx FROM public.credit_transactions
  WHERE user_id = p_user_id AND content_id = p_content_id AND status = 'locked'
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    UPDATE public.workspace_credits SET locked_credits = locked_credits - v_locked_tx.amount, updated_at = now() WHERE user_id = p_user_id;
    UPDATE public.credit_transactions SET status = 'refunded', amount = 0 WHERE id = v_locked_tx.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.content_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
