-- Create generation_logs table
CREATE TABLE public.generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_credits table
CREATE TABLE public.workspace_credits (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 50,
  used_credits INTEGER NOT NULL DEFAULT 0,
  locked_credits INTEGER NOT NULL DEFAULT 0,
  reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('usage', 'refund', 'manual_adjustment', 'reset')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('locked', 'completed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies

-- generation_logs
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own logs" ON public.generation_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content_items 
      WHERE content_items.id = generation_logs.content_id 
      AND content_items.user_id = auth.uid()
    )
  );

-- workspace_credits
ALTER TABLE public.workspace_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" ON public.workspace_credits 
  FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions 
  FOR SELECT USING (auth.uid() = user_id);

-- Functions for Credit Logic

-- Function to initialize credits for new user
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_credits (user_id, total_credits)
  VALUES (NEW.id, 50); -- Give 50 free credits on sign up
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Function to check and lock credits
CREATE OR REPLACE FUNCTION public.lock_credits(
  p_user_id UUID,
  p_content_id UUID,
  p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_credits public.workspace_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_credits FROM public.workspace_credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF (v_credits.total_credits - v_credits.used_credits - v_credits.locked_credits) < p_amount THEN
    RETURN FALSE; -- Insufficient credits
  END IF;

  -- Update locked credits
  UPDATE public.workspace_credits 
  SET locked_credits = locked_credits + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, content_id, type, amount, status)
  VALUES (p_user_id, p_content_id, 'usage', p_amount, 'locked');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finalize credit usage (deduct form locked, refund difference if any)
CREATE OR REPLACE FUNCTION public.finalize_credits(
  p_user_id UUID,
  p_content_id UUID,
  p_actual_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_locked_tx public.credit_transactions%ROWTYPE;
BEGIN
  -- Find the specific locked transaction for this content
  -- Note: In a real app we might need more robust matching if multiple locks exist, 
  -- but for MVP we assume one active lock per content generation flow.
  SELECT * INTO v_locked_tx 
  FROM public.credit_transactions 
  WHERE user_id = p_user_id AND content_id = p_content_id AND status = 'locked'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No locked credits found for this content';
  END IF;

  -- Update credits table
  UPDATE public.workspace_credits
  SET locked_credits = locked_credits - v_locked_tx.amount,
      used_credits = used_credits + p_actual_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Update transaction to completed with actual amount
  UPDATE public.credit_transactions
  SET status = 'completed',
      amount = p_actual_amount
  WHERE id = v_locked_tx.id;

  -- If actual < locked, technically the difference is just released from "locked" 
  -- which is handled by the math above (reducing locked by full original amount).

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund credits (e.g. on failure)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_content_id UUID
) RETURNS VOID AS $$
DECLARE
  v_locked_tx public.credit_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_locked_tx 
  FROM public.credit_transactions 
  WHERE user_id = p_user_id AND content_id = p_content_id AND status = 'locked'
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    -- Remove lock
    UPDATE public.workspace_credits
    SET locked_credits = locked_credits - v_locked_tx.amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Update tx status
    UPDATE public.credit_transactions
    SET status = 'refunded',
        amount = 0
    WHERE id = v_locked_tx.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
