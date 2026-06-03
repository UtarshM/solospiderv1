-- Disable RLS for all tables to allow mock auth to work in development
-- This overrides any previous settings or re-enabled policies

ALTER TABLE public.content_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs DISABLE ROW LEVEL SECURITY;
