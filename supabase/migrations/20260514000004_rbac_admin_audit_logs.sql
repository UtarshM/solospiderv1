-- ====================================================================
-- SOLOSPIDER ENTERPRISE RBAC & AUDIT LOGS SCHEMA
-- Purpose: Hybrid Role + Permission Governance & Compliance Tracking
-- ====================================================================

-- 1. ADMIN_USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'support')),
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Super admins can access and manage admin_users; support can view
CREATE POLICY "Super admins can manage admin_users" ON public.admin_users
    FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can read their own admin profile" ON public.admin_users
    FOR SELECT USING (id = auth.uid());


-- 2. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins and support can insert and read audit logs
CREATE POLICY "Admins and support can read audit_logs" ON public.audit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins and support can insert audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Insert seed super_admin if not existing (for development convenience)
-- In production, super_admin is assigned upon initial deployment
