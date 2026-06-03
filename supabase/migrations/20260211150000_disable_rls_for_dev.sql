-- TEMPORARY: Disable RLS for development testing
-- This allows the "Login Bypass" to write to the database without a real Auth Token.

ALTER TABLE public.content_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions DISABLE ROW LEVEL SECURITY;
