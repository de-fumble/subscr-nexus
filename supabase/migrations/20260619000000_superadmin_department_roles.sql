-- Superadmin department role delegation (Auditor, IT Admin, Marketing)

CREATE TYPE public.superadmin_department AS ENUM ('auditor', 'it_admin', 'marketing');

CREATE TABLE public.superadmin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department superadmin_department NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, department)
);

ALTER TABLE public.superadmin_role_assignments ENABLE ROW LEVEL SECURITY;

-- Check if user is a full superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'superadmin')
$$;

-- Check if user has a delegated superadmin department
CREATE OR REPLACE FUNCTION public.has_superadmin_department(_user_id UUID, _department superadmin_department)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.superadmin_role_assignments
    WHERE user_id = _user_id
      AND department = _department
  )
$$;

-- Full superadmin OR any delegated department
CREATE OR REPLACE FUNCTION public.has_superadmin_panel_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.superadmin_role_assignments WHERE user_id = _user_id
    )
$$;

-- RLS policies
CREATE POLICY "Full superadmins manage department roles"
ON public.superadmin_role_assignments
FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own department roles"
ON public.superadmin_role_assignments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Full superadmins can view all department roles"
ON public.superadmin_role_assignments
FOR SELECT
USING (public.is_superadmin(auth.uid()));

-- Marketing can read email logs
DROP POLICY IF EXISTS "Superadmins can view all email logs" ON public.email_logs;
CREATE POLICY "Superadmins and marketing can view email logs"
  ON public.email_logs FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR public.has_superadmin_department(auth.uid(), 'marketing')
  );

-- Restrict referral_sources read to marketing + full superadmin (replace open policy)
DROP POLICY IF EXISTS "Authenticated users can read referral sources" ON public.referral_sources;
CREATE POLICY "Superadmins and marketing can read referral sources"
  ON public.referral_sources
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR public.has_superadmin_department(auth.uid(), 'marketing')
  );
